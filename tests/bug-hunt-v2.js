/**
 * Bug-Hunting Test v2 — edge cases, concurrency, large/small inputs
 * For runs after basic functionality is solid.
 */

const BASE = 'https://cocktails-wiki.vercel.app';
const SCAN_API = `${BASE}/api/scan-bar`;
const STORES_API = `${BASE}/api/nearby-stores`;

const results = [];
const bugs = [];

function record(test, status, detail, severity = 'medium') {
  const r = { test, status, detail, severity };
  results.push(r);
  if (status === 'FAIL') bugs.push(r);
  const icon = status === 'PASS' ? '✅' : '❌';
  console.log(`  ${icon} ${test.padEnd(50)} ${detail}`);
}

async function safeFetch(url, options = {}) {
  try {
    const start = Date.now();
    const r = await fetch(url, options);
    return { ok: r.ok, status: r.status, ms: Date.now() - start, response: r };
  } catch (e) {
    return { ok: false, status: 0, ms: 0, error: e.message };
  }
}

// ─── E1: CORS OPTIONS preflight on scan-bar ───
async function e1_corsScan() {
  const r = await safeFetch(SCAN_API, {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://cocktails-wiki.vercel.app', 'Access-Control-Request-Method': 'POST' }
  });
  if (r.status !== 200) return record('E1. CORS preflight scan-bar', 'FAIL', `Expected 200, got ${r.status}`);
  const allowOrigin = r.response.headers.get('access-control-allow-origin');
  if (!allowOrigin) return record('E1. CORS preflight scan-bar', 'FAIL', 'Missing Access-Control-Allow-Origin');
  record('E1. CORS preflight scan-bar', 'PASS', `${r.status}, origin=${allowOrigin}`);
}

// ─── E2: CORS OPTIONS preflight on nearby-stores ───
async function e2_corsStores() {
  const r = await safeFetch(STORES_API, {
    method: 'OPTIONS',
    headers: { 'Origin': 'https://cocktails-wiki.vercel.app', 'Access-Control-Request-Method': 'POST' }
  });
  if (r.status !== 200) return record('E2. CORS preflight stores', 'FAIL', `Expected 200, got ${r.status}`);
  record('E2. CORS preflight stores', 'PASS', `${r.status}`);
}

// ─── E3: Out-of-range lat/lng (lat=200) ───
async function e3_outOfRange() {
  const r = await safeFetch(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 200, lng: 500 })
  });
  if (r.status !== 400) return record('E3. Stores out-of-range coords', 'FAIL', `Expected 400, got ${r.status}`);
  record('E3. Stores out-of-range coords', 'PASS', `400 as expected`);
}

// ─── E4: Negative lat/lng (Sydney coords) ───
async function e4_southHemi() {
  const r = await safeFetch(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: -33.8688, lng: 151.2093 })
  });
  if (!r.ok) return record('E4. Stores Sydney (south hemi)', 'FAIL', `HTTP ${r.status}`);
  const data = await r.response.json();
  if (!Array.isArray(data.stores)) return record('E4. Stores Sydney (south hemi)', 'FAIL', 'No stores array');
  record('E4. Stores Sydney (south hemi)', 'PASS', `${data.stores.length} stores in Sydney`);
}

// ─── E5: Middle of ocean (no stores) ───
async function e5_ocean() {
  const r = await safeFetch(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 0, lng: -150 }) // Pacific ocean
  });
  if (!r.ok) return record('E5. Stores in middle of ocean', 'FAIL', `HTTP ${r.status} (should be 200 with empty array)`);
  const data = await r.response.json();
  if (!Array.isArray(data.stores)) return record('E5. Stores in middle of ocean', 'FAIL', 'No stores array');
  // Expect 0 stores, not an error
  record('E5. Stores in middle of ocean', 'PASS', `${data.stores.length} stores (empty OK)`);
}

// ─── E6: Scan with 1x1 transparent PNG (smallest valid image) ───
async function e6_tinyImage() {
  // 1x1 transparent PNG
  const tiny = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkAAIAAAoAAv/lxKUAAAAASUVORK5CYII=';
  const r = await safeFetch(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: tiny })
  });
  if (!r.ok && r.status !== 502) return record('E6. Scan tiny 1x1 PNG', 'FAIL', `HTTP ${r.status} (should handle gracefully)`);
  if (r.ok) {
    const data = await r.response.json();
    if (data.bottles?.length > 0) return record('E6. Scan tiny 1x1 PNG', 'FAIL', `Hallucinated ${data.bottles.length} bottles from blank image`);
    record('E6. Scan tiny 1x1 PNG', 'PASS', `${r.status}, 0 bottles`);
  } else {
    record('E6. Scan tiny 1x1 PNG', 'PASS', `${r.status} graceful upstream rejection`);
  }
}

// ─── E7: Scan with malformed base64 ───
async function e7_badBase64() {
  const r = await safeFetch(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: 'not-a-real-base64-image!!!' })
  });
  // Should return 502 (upstream error) or 400 (we caught it)
  if (r.status !== 400 && r.status !== 502 && r.status !== 200) {
    return record('E7. Scan bad base64', 'FAIL', `HTTP ${r.status} (expected 400/502/200)`);
  }
  record('E7. Scan bad base64', 'PASS', `${r.status} handled`);
}

// ─── E8: Scan with malformed JSON body ───
async function e8_malformedJson() {
  const r = await safeFetch(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{not json}'
  });
  if (r.status >= 500) return record('E8. Malformed JSON body', 'FAIL', `HTTP ${r.status} (should be 4xx, got 5xx crash)`);
  record('E8. Malformed JSON body', 'PASS', `${r.status}`);
}

// ─── E9: Concurrent scans (3 in parallel) ───
async function e9_concurrent() {
  const imgUrl = 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=400';
  const imgResp = await fetch(imgUrl);
  const buf = await imgResp.arrayBuffer();
  const b64 = Buffer.from(buf).toString('base64');

  const start = Date.now();
  const promises = [1, 2, 3].map(() =>
    safeFetch(SCAN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: b64 })
    })
  );
  const responses = await Promise.all(promises);
  const ms = Date.now() - start;

  const failed = responses.filter(r => !r.ok);
  if (failed.length > 0) {
    return record('E9. 3 concurrent scans', 'FAIL', `${failed.length}/3 failed (${failed.map(r=>r.status).join(',')})`);
  }
  record('E9. 3 concurrent scans', 'PASS', `all 3 OK in ${ms}ms`);
}

// ─── E10: Multiple cities for stores API ───
async function e10_cities() {
  const cities = [
    { name: 'Jerusalem', lat: 31.7683, lng: 35.2137 },
    { name: 'Haifa', lat: 32.7940, lng: 34.9896 },
    { name: 'Eilat', lat: 29.5577, lng: 34.9519 },
  ];
  let okCount = 0;
  const results = [];
  for (const c of cities) {
    const r = await safeFetch(STORES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: c.lat, lng: c.lng })
    });
    if (r.ok) {
      const data = await r.response.json();
      results.push(`${c.name}:${data.stores?.length || 0}`);
      okCount++;
    } else {
      results.push(`${c.name}:HTTP${r.status}`);
    }
  }
  if (okCount < cities.length) return record('E10. Multiple cities', 'FAIL', results.join(', '));
  record('E10. Multiple cities', 'PASS', results.join(', '));
}

// ─── E11: Repeated calls for rate-limit / caching behavior ───
async function e11_rateLimit() {
  const start = Date.now();
  const promises = [1,2,3,4,5].map(() =>
    safeFetch(STORES_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat: 32.0853, lng: 34.7818 })
    })
  );
  const responses = await Promise.all(promises);
  const ms = Date.now() - start;
  const fails = responses.filter(r => !r.ok);
  if (fails.length > 1) return record('E11. 5 rapid stores requests', 'FAIL', `${fails.length}/5 failed`);
  record('E11. 5 rapid stores requests', 'PASS', `${responses.length - fails.length}/5 OK in ${ms}ms`);
}

// ─── E12: Cocktails data — orphan ingredients (in recipes but not in matcher aliases) ───
async function e12_orphanIngredients() {
  const dataResp = await fetch(`${BASE}/js/cocktails-data.js`);
  const dataText = await dataResp.text();
  const matcherResp = await fetch(`${BASE}/js/matcher.js`);
  const matcherText = await matcherResp.text();

  const sandbox = {};
  new Function('global', dataText + '; global.cocktails = cocktails;')(sandbox);
  new Function('global', matcherText + '; global.aliases = INGREDIENT_ALIASES; global.GARNISH_KEYWORDS = GARNISH_KEYWORDS;')(sandbox);

  // Build a flat set of all alias values (lowercase, normalized)
  const allAliases = new Set();
  for (const [canonical, aliases] of Object.entries(sandbox.aliases)) {
    allAliases.add(canonical.toLowerCase());
    for (const a of aliases) allAliases.add(a.toLowerCase().trim());
  }
  const garnishKw = sandbox.GARNISH_KEYWORDS;
  function isGarnish(name) {
    return garnishKw.some(kw => name.toLowerCase().includes(kw.toLowerCase()));
  }

  const orphans = new Set();
  for (const c of sandbox.cocktails) {
    for (const ing of c.ingredients) {
      const name = ing.item.toLowerCase().trim();
      if (isGarnish(name)) continue;
      // Check if the ingredient is in any alias group
      const found = [...allAliases].some(a =>
        a === name || a.includes(name) || name.includes(a)
      );
      if (!found) orphans.add(`${c.name}: "${ing.item}"`);
    }
  }
  if (orphans.size > 5) return record('E12. Orphan ingredients in recipes', 'FAIL',
    `${orphans.size} ingredients without matcher aliases (e.g. ${[...orphans].slice(0,2).join(' | ')})`);
  if (orphans.size > 0) return record('E12. Orphan ingredients in recipes', 'PASS',
    `Only ${orphans.size} minor orphans (acceptable)`);
  record('E12. Orphan ingredients in recipes', 'PASS', `0 orphans`);
}

// ─── E13: HTML must include New Relic + Clarity scripts ───
async function e13_analyticsScripts() {
  const html = await (await fetch(BASE)).text();
  const hasNR = html.includes('newrelic.com') || html.includes('NREUM');
  const hasClarity = html.includes('clarity.ms');
  if (!hasNR) return record('E13. Analytics scripts present', 'FAIL', 'Missing New Relic');
  if (!hasClarity) return record('E13. Analytics scripts present', 'FAIL', 'Missing Clarity');
  record('E13. Analytics scripts present', 'PASS', 'NR + Clarity present');
}

// ─── E14: HTML cards have align-items:start fix ───
async function e14_cssAlignFix() {
  const html = await (await fetch(BASE)).text();
  const hasFix = html.includes('align-items:start') || html.includes('align-items: start');
  if (!hasFix) return record('E14. Cards align-items:start CSS fix', 'FAIL',
    'Missing align-items:start — clicking one card pushes the row down');
  record('E14. Cards align-items:start CSS fix', 'PASS', 'CSS fix present');
}

// ─── MAIN ───
async function run() {
  console.log('═'.repeat(70));
  console.log('  BUG-HUNTING TEST v2 — edge cases & stress');
  console.log('  ' + new Date().toISOString());
  console.log('═'.repeat(70));

  await e1_corsScan();
  await e2_corsStores();
  await e3_outOfRange();
  await e4_southHemi();
  await e5_ocean();
  await e6_tinyImage();
  await e7_badBase64();
  await e8_malformedJson();
  await e9_concurrent();
  await e10_cities();
  await e11_rateLimit();
  await e12_orphanIngredients();
  await e13_analyticsScripts();
  await e14_cssAlignFix();

  const passed = results.filter(r => r.status === 'PASS').length;
  console.log('');
  console.log('═'.repeat(70));
  console.log(`  RESULT: ${passed}/${results.length} passed, ${bugs.length} bugs`);
  console.log('═'.repeat(70));

  if (bugs.length > 0) {
    console.log('\n  🐛 BUGS:');
    for (const b of bugs) {
      console.log(`    ❌ ${b.test}`);
      console.log(`         → ${b.detail}`);
    }
  }
  process.exitCode = bugs.length > 0 ? 1 : 0;
}

run().catch(e => { console.error(e); process.exit(2); });
