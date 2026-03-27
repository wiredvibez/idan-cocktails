/**
 * Mixologist's Radar Stress Test — 20 Locations
 *
 * Tests the nearby-stores API with 20 different real-world coordinates.
 * Checks: API response, store count, distance sorting, data completeness.
 *
 * Usage: node tests/radar-test-20.js
 */

const API_URL = 'https://cocktails-wiki.vercel.app/api/nearby-stores';

const TEST_LOCATIONS = [
  // ─── ISRAEL (primary market) ───
  { lat: 32.0853, lng: 34.7818, city: 'Tel Aviv - Rothschild', country: 'IL' },
  { lat: 32.0741, lng: 34.7724, city: 'Tel Aviv - Florentin', country: 'IL' },
  { lat: 32.0632, lng: 34.7731, city: 'Jaffa', country: 'IL' },
  { lat: 31.7683, lng: 35.2137, city: 'Jerusalem - City Center', country: 'IL' },
  { lat: 32.7940, lng: 34.9896, city: 'Haifa - Carmel Center', country: 'IL' },
  { lat: 31.2530, lng: 34.7915, city: 'Beer Sheva', country: 'IL' },
  { lat: 32.3215, lng: 34.8532, city: 'Netanya', country: 'IL' },
  { lat: 32.0167, lng: 34.7500, city: 'Bat Yam', country: 'IL' },
  { lat: 32.1093, lng: 34.8555, city: 'Ramat Gan - Diamond Exchange', country: 'IL' },
  { lat: 29.5577, lng: 34.9519, city: 'Eilat', country: 'IL' },

  // ─── INTERNATIONAL (should still work) ───
  { lat: 40.7580, lng: -73.9855, city: 'New York - Times Square', country: 'US' },
  { lat: 51.5074, lng: -0.1278, city: 'London - Westminster', country: 'UK' },
  { lat: 48.8566, lng: 2.3522, city: 'Paris - Center', country: 'FR' },
  { lat: 41.3851, lng: 2.1734, city: 'Barcelona', country: 'ES' },
  { lat: 52.5200, lng: 13.4050, city: 'Berlin', country: 'DE' },

  // ─── EDGE CASES ───
  { lat: 0.0, lng: 0.0, city: 'Null Island (middle of ocean)', country: 'EDGE' },
  { lat: 90.0, lng: 0.0, city: 'North Pole', country: 'EDGE' },
  { lat: -33.8688, lng: 151.2093, city: 'Sydney (far away)', country: 'AU' },
  { lat: 35.6762, lng: 139.6503, city: 'Tokyo', country: 'JP' },
  { lat: 25.2048, lng: 55.2708, city: 'Dubai', country: 'AE' },
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testLocation(loc, index) {
  const num = String(index + 1).padStart(2, '0');
  process.stdout.write(`[${num}/20] ${loc.city.padEnd(35)} `);

  const result = {
    index: index + 1,
    city: loc.city,
    country: loc.country,
    status: 'PASS',
    storeCount: 0,
    issues: [],
    stores: []
  };

  try {
    const startTime = Date.now();
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: loc.lat, lng: loc.lng })
    });
    const elapsed = Date.now() - startTime;

    // Check HTTP status
    if (!res.ok) {
      const errText = await res.text();
      result.status = 'FAIL';
      result.issues.push(`HTTP ${res.status}: ${errText.substring(0, 100)}`);
      console.log(`❌ HTTP ${res.status} (${elapsed}ms)`);
      return result;
    }

    const data = await res.json();

    // Check response structure
    if (!data.stores) {
      result.status = 'FAIL';
      result.issues.push('Missing "stores" field in response');
      console.log(`❌ Bad response structure (${elapsed}ms)`);
      return result;
    }

    if (!Array.isArray(data.stores)) {
      result.status = 'FAIL';
      result.issues.push(`"stores" is not an array: ${typeof data.stores}`);
      console.log(`❌ stores not array (${elapsed}ms)`);
      return result;
    }

    result.storeCount = data.stores.length;
    result.stores = data.stores;

    // For edge cases (ocean, north pole), 0 stores is expected
    if (loc.country === 'EDGE' && data.stores.length === 0) {
      console.log(`✅ 0 stores (expected for edge case) (${elapsed}ms)`);
      return result;
    }

    // For real cities, check we got results (warning if 0, not failure)
    if (data.stores.length === 0 && loc.country !== 'EDGE') {
      result.issues.push('0 stores found in populated area');
      // Not a failure — Google might not have data for this radius
      console.log(`⚠️  0 stores found (${elapsed}ms)`);
      return result;
    }

    // Validate each store's data completeness
    for (let i = 0; i < data.stores.length; i++) {
      const store = data.stores[i];

      if (!store.name || store.name === 'Unknown') {
        result.issues.push(`Store ${i}: missing name`);
      }
      if (!store.mapsUrl) {
        result.issues.push(`Store ${i}: missing mapsUrl`);
      }
      if (store.distance === null || store.distance === undefined) {
        result.issues.push(`Store ${i}: missing distance`);
      }
      if (store.isOpen === undefined) {
        // Not a hard failure — some stores don't have hours
      }
    }

    // Check distance sorting (should be ascending)
    const distances = data.stores.map(s => s.distance).filter(d => d !== null);
    let sortedCorrectly = true;
    for (let i = 1; i < distances.length; i++) {
      if (distances[i] < distances[i - 1]) {
        sortedCorrectly = false;
        result.issues.push(`Distance not sorted: ${distances[i - 1]}m → ${distances[i]}m`);
        break;
      }
    }

    // Check max 5 stores returned
    if (data.stores.length > 5) {
      result.issues.push(`Too many stores: ${data.stores.length} (max should be 5)`);
    }

    // Check distances are reasonable (< 2000m given 1500m radius)
    const maxDist = Math.max(...distances);
    if (maxDist > 3000) {
      result.issues.push(`Store too far: ${maxDist}m (radius is 1500m)`);
    }

    if (result.issues.length > 0) {
      result.status = 'WARN';
    }

    // Format output
    const storeNames = data.stores.slice(0, 3).map(s => s.name).join(', ');
    const distRange = distances.length > 0
      ? `${distances[0]}m-${distances[distances.length - 1]}m`
      : 'n/a';
    const sortIcon = sortedCorrectly ? '↑' : '⚠️';

    if (result.issues.length > 0) {
      console.log(`⚠️  ${data.stores.length} stores ${sortIcon} [${distRange}] (${elapsed}ms) — ${result.issues[0]}`);
    } else {
      console.log(`✅ ${data.stores.length} stores ${sortIcon} [${distRange}] (${elapsed}ms) ${storeNames}`);
    }

  } catch (err) {
    result.status = 'ERROR';
    result.issues.push(`Exception: ${err.message}`);
    console.log(`💥 ERROR: ${err.message.substring(0, 80)}`);
  }

  return result;
}

async function runRadarTest() {
  console.log('='.repeat(70));
  console.log('  MIXOLOGIST\'S RADAR STRESS TEST — 20 LOCATIONS');
  console.log('  API: ' + API_URL);
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(70));
  console.log('');

  const results = [];

  for (let i = 0; i < TEST_LOCATIONS.length; i++) {
    const result = await testLocation(TEST_LOCATIONS[i], i);
    results.push(result);
    await sleep(500); // Small delay between requests
  }

  // ─── REPORT ───
  console.log('');
  console.log('='.repeat(70));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(70));

  const passed = results.filter(r => r.status === 'PASS').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;

  console.log(`  Total:    ${results.length}`);
  console.log(`  Passed:   ${passed} (${Math.round(passed / results.length * 100)}%)`);
  console.log(`  Warnings: ${warned}`);
  console.log(`  Failed:   ${failed}`);
  console.log(`  Errors:   ${errors}`);
  console.log('');

  // By country
  const byCountry = {};
  for (const r of results) {
    if (!byCountry[r.country]) byCountry[r.country] = { pass: 0, warn: 0, fail: 0, total: 0, stores: 0 };
    byCountry[r.country].total++;
    byCountry[r.country].stores += r.storeCount;
    if (r.status === 'PASS') byCountry[r.country].pass++;
    else if (r.status === 'WARN') byCountry[r.country].warn++;
    else byCountry[r.country].fail++;
  }

  console.log('  BY REGION:');
  for (const [country, stats] of Object.entries(byCountry)) {
    console.log(`    ${country.padEnd(8)} ${stats.pass}/${stats.total} pass, ${stats.stores} stores total`);
  }
  console.log('');

  // Issues
  const allIssues = results.filter(r => r.issues.length > 0);
  if (allIssues.length > 0) {
    console.log('  ISSUES FOUND:');
    for (const r of allIssues) {
      console.log(`    [#${String(r.index).padStart(2, '0')}] ${r.city}`);
      for (const issue of r.issues) {
        console.log(`           ${issue}`);
      }
    }
    console.log('');
  }

  // Store type distribution
  const typeCount = { liquor_store: 0, supermarket: 0, convenience_store: 0 };
  for (const r of results) {
    for (const s of r.stores) {
      if (typeCount[s.storeType] !== undefined) typeCount[s.storeType]++;
    }
  }
  console.log('  STORE TYPES FOUND:');
  for (const [type, count] of Object.entries(typeCount)) {
    console.log(`    ${type.padEnd(20)} ${count}x`);
  }

  console.log('');
  console.log('='.repeat(70));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(70));

  return { results, passed, warned, failed, errors };
}

runRadarTest().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
