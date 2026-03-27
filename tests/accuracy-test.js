/**
 * Bar Scanner API - Comprehensive Accuracy Test
 * Tests the scan-bar endpoint with 50 diverse alcohol/bar images
 */

const API_URL = 'https://cocktails-wiki.vercel.app/api/scan-bar';

// 50 diverse image URLs from Unsplash (direct image links via their CDN)
// Mix of: bar shelves, single bottles, wine cellars, dark/blurry, beer, liquor stores
const TEST_IMAGES = [
  // --- Bar shelves (clear, well-lit) ---
  { url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', desc: 'Bar shelf with bottles (clear)' },
  { url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', desc: 'Bar interior with bottles on shelves' },
  { url: 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800', desc: 'Bar with liquor bottles on wall' },
  { url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800', desc: 'Assorted liquor bottles in bar shelves' },
  { url: 'https://images.unsplash.com/photo-1574006852726-31d1e4e58f13?w=800', desc: 'Bar shelf assortment' },
  { url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800', desc: 'Backlit bar shelf' },
  { url: 'https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800', desc: 'Liquor store stocked shelves' },
  { url: 'https://images.unsplash.com/photo-1569924256650-2ef22e005a39?w=800', desc: 'Bar with neon and bottles' },
  { url: 'https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=800', desc: 'Cocktail bar shelves' },
  { url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', desc: 'Classic bar setup' },

  // --- Single bottle closeups ---
  { url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800', desc: 'Macallan whisky bottle closeup' },
  { url: 'https://images.unsplash.com/photo-1608885898957-a559228e4b62?w=800', desc: 'Jack Daniels bottle' },
  { url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800', desc: 'Whiskey bottle closeup' },
  { url: 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=800', desc: 'Single bottle on dark background' },
  { url: 'https://images.unsplash.com/photo-1586993451228-09818021e309?w=800', desc: 'Gin bottle closeup' },
  { url: 'https://images.unsplash.com/photo-1613063088645-d0b3e6ecb2d4?w=800', desc: 'Tequila bottle' },
  { url: 'https://images.unsplash.com/photo-1585975754950-b5a5567171e9?w=800', desc: 'Vodka bottle' },
  { url: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=800', desc: 'Rum bottle closeup' },
  { url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800', desc: 'Hennessy cognac bottle' },
  { url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800', desc: 'Campari bottle' },

  // --- Wine bottles and cellars ---
  { url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800', desc: 'Wine bottles on rack' },
  { url: 'https://images.unsplash.com/photo-1516594915697-87eb3b1c14ea?w=800', desc: 'Wine cellar' },
  { url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800', desc: 'Wine bottles collection' },
  { url: 'https://images.unsplash.com/photo-1586370434639-0fe43b2d32e6?w=800', desc: 'Red wine bottles' },
  { url: 'https://images.unsplash.com/photo-1474722883778-792e7990302f?w=800', desc: 'Wine cellar rows' },
  { url: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800', desc: 'Wine glasses and bottles' },
  { url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800', desc: 'Wine store shelves' },
  { url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800', desc: 'Champagne bottles' },

  // --- Beer bottles ---
  { url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800', desc: 'Beer bottles lineup' },
  { url: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800', desc: 'Craft beer bottles' },
  { url: 'https://images.unsplash.com/photo-1618183479302-1e0aa382c36b?w=800', desc: 'Beer bottle on dark background' },
  { url: 'https://images.unsplash.com/photo-1608270586620-248524c67de9?w=800', desc: 'Corona beer bottles' },
  { url: 'https://images.unsplash.com/photo-1600788886242-5c96aabe3757?w=800', desc: 'Beer fridge' },

  // --- Dark / blurry / challenging images ---
  { url: 'https://images.unsplash.com/photo-1575444758702-4a6b9222c016?w=800', desc: 'Blurry bar photo with bottles' },
  { url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=400&q=30', desc: 'Low quality bar image' },
  { url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800', desc: 'Dark restaurant bar' },
  { url: 'https://images.unsplash.com/photo-1590846406792-0adc7f938f1d?w=800', desc: 'Dimly lit bar scene' },
  { url: 'https://images.unsplash.com/photo-1560840067-ddcaeb7831d2?w=800', desc: 'Neon-lit bar' },
  { url: 'https://images.unsplash.com/photo-1559628129-67cf63b72248?w=800', desc: 'Moody dark cocktail bar' },

  // --- Cocktail / drink focused (fewer visible bottles) ---
  { url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800', desc: 'Cocktail glass in hand' },
  { url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800', desc: 'Cocktail on bar counter' },
  { url: 'https://images.unsplash.com/photo-1536935338788-846bb9981813?w=800', desc: 'Multiple cocktails' },
  { url: 'https://images.unsplash.com/photo-1587223962930-cb7f31384c19?w=800', desc: 'Bartender making cocktail' },

  // --- Liquor store / display ---
  { url: 'https://images.unsplash.com/photo-1524236700695-ebbe5e7b0fab?w=800', desc: 'Liquor store display' },
  { url: 'https://images.unsplash.com/photo-1567696153798-9111f9cd3d0d?w=800', desc: 'Bottles display various types' },
  { url: 'https://images.unsplash.com/photo-1585975754950-b5a5567171e9?w=400', desc: 'Small resolution bottle image' },

  // --- Edge cases ---
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', desc: 'Food plate (no bottles - negative test)' },
  { url: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800', desc: 'Mountain landscape (no bottles - negative test)' },
  { url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=800', desc: 'Portrait photo (no bottles - negative test)' },
];

// --- Helpers ---

async function fetchImageAsBase64(url) {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status} fetching ${url}`);
  const arrayBuf = await resp.arrayBuffer();
  const buf = Buffer.from(arrayBuf);
  return buf.toString('base64');
}

async function callScanBar(base64) {
  const resp = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 }),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`API ${resp.status}: ${text.substring(0, 200)}`);
  }
  return resp.json();
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// --- Main test runner ---

async function runTests() {
  console.log('='.repeat(70));
  console.log('  BAR SCANNER API - ACCURACY TEST');
  console.log('  Endpoint:', API_URL);
  console.log('  Images to test:', TEST_IMAGES.length);
  console.log('  Started:', new Date().toISOString());
  console.log('='.repeat(70));
  console.log('');

  const results = [];
  let completed = 0;

  for (const img of TEST_IMAGES) {
    completed++;
    const prefix = `[${String(completed).padStart(2, '0')}/${TEST_IMAGES.length}]`;

    try {
      process.stdout.write(`${prefix} ${img.desc}... `);
      const base64 = await fetchImageAsBase64(img.url);
      const data = await callScanBar(base64);

      const bottles = data.bottles || [];
      console.log(`${bottles.length} bottle(s) found`);

      results.push({
        url: img.url,
        desc: img.desc,
        success: true,
        bottles,
        bottleCount: bottles.length,
        error: null,
      });
    } catch (err) {
      console.log(`ERROR: ${err.message}`);
      results.push({
        url: img.url,
        desc: img.desc,
        success: false,
        bottles: [],
        bottleCount: 0,
        error: err.message,
      });
    }

    // Small delay to avoid rate limiting
    await sleep(1500);
  }

  // --- Generate Report ---
  console.log('\n');
  console.log('='.repeat(70));
  console.log('  DETAILED RESULTS REPORT');
  console.log('='.repeat(70));

  const totalImages = results.length;
  const successfulRequests = results.filter(r => r.success);
  const errorRequests = results.filter(r => !r.success);
  const withBottles = successfulRequests.filter(r => r.bottleCount > 0);
  const withoutBottles = successfulRequests.filter(r => r.bottleCount === 0);

  // 1. Overall stats
  console.log('\n--- OVERALL STATISTICS ---');
  console.log(`Total images tested:      ${totalImages}`);
  console.log(`Successful API calls:     ${successfulRequests.length} / ${totalImages} (${pct(successfulRequests.length, totalImages)})`);
  console.log(`API errors:               ${errorRequests.length} / ${totalImages} (${pct(errorRequests.length, totalImages)})`);

  // 2. Detection rate
  console.log('\n--- DETECTION RATE ---');
  console.log(`Images with 1+ bottle:    ${withBottles.length} / ${successfulRequests.length} (${pct(withBottles.length, successfulRequests.length)})`);
  console.log(`Images with 0 bottles:    ${withoutBottles.length} / ${successfulRequests.length} (${pct(withoutBottles.length, successfulRequests.length)})`);

  // 3. Bottles per image
  const allBottleCounts = successfulRequests.map(r => r.bottleCount);
  const totalBottles = allBottleCounts.reduce((a, b) => a + b, 0);
  const avgBottles = totalBottles / (successfulRequests.length || 1);
  const maxBottles = Math.max(...allBottleCounts, 0);
  const minBottles = Math.min(...allBottleCounts, 0);

  console.log('\n--- BOTTLES PER IMAGE ---');
  console.log(`Total bottles detected:   ${totalBottles}`);
  console.log(`Average per image:        ${avgBottles.toFixed(2)}`);
  console.log(`Max in single image:      ${maxBottles}`);
  console.log(`Min in single image:      ${minBottles}`);

  // Distribution
  const distribution = {};
  allBottleCounts.forEach(c => { distribution[c] = (distribution[c] || 0) + 1; });
  console.log(`Distribution:             ${JSON.stringify(distribution)}`);

  // 4. Categories detected
  const allBottles = successfulRequests.flatMap(r => r.bottles);
  const categoryCounts = {};
  allBottles.forEach(b => {
    const cat = b.category || 'unknown';
    categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
  });
  const sortedCategories = Object.entries(categoryCounts).sort((a, b) => b[1] - a[1]);

  console.log('\n--- CATEGORIES DETECTED ---');
  if (sortedCategories.length === 0) {
    console.log('  (none)');
  } else {
    for (const [cat, count] of sortedCategories) {
      console.log(`  ${cat.padEnd(25)} ${count} (${pct(count, allBottles.length)})`);
    }
  }

  // 5. Confidence distribution
  let highConf = 0, medConf = 0, lowConf = 0, noConf = 0;
  allBottles.forEach(b => {
    const c = b.confidence;
    if (c === undefined || c === null) { noConf++; return; }
    if (typeof c === 'string') {
      if (c === 'high') highConf++;
      else if (c === 'medium') medConf++;
      else if (c === 'low') lowConf++;
      else noConf++;
    } else if (typeof c === 'number') {
      if (c >= 0.8) highConf++;
      else if (c >= 0.5) medConf++;
      else lowConf++;
    }
  });

  console.log('\n--- CONFIDENCE DISTRIBUTION ---');
  console.log(`  High (>=0.8):           ${highConf} (${pct(highConf, allBottles.length)})`);
  console.log(`  Medium (0.5-0.79):      ${medConf} (${pct(medConf, allBottles.length)})`);
  console.log(`  Low (<0.5):             ${lowConf} (${pct(lowConf, allBottles.length)})`);
  console.log(`  Unknown/missing:        ${noConf} (${pct(noConf, allBottles.length)})`);

  // 6. Most common bottle names
  const nameCounts = {};
  allBottles.forEach(b => {
    const name = (b.name_en || 'unnamed').toLowerCase();
    nameCounts[name] = (nameCounts[name] || 0) + 1;
  });
  const sortedNames = Object.entries(nameCounts).sort((a, b) => b[1] - a[1]).slice(0, 15);

  console.log('\n--- TOP 15 DETECTED BOTTLE NAMES ---');
  for (const [name, count] of sortedNames) {
    console.log(`  ${name.padEnd(35)} ${count}`);
  }

  // 7. Failed images
  console.log('\n--- FAILED IMAGES (0 bottles detected) ---');
  if (withoutBottles.length === 0) {
    console.log('  (none - all images returned at least 1 bottle)');
  } else {
    for (const r of withoutBottles) {
      console.log(`  - ${r.desc}`);
      console.log(`    ${r.url}`);
    }
  }

  // 8. Error responses
  console.log('\n--- ERROR RESPONSES ---');
  if (errorRequests.length === 0) {
    console.log('  (none - all API calls succeeded)');
  } else {
    for (const r of errorRequests) {
      console.log(`  - ${r.desc}`);
      console.log(`    ${r.url}`);
      console.log(`    Error: ${r.error}`);
    }
  }

  // 9. Per-image detail table
  console.log('\n--- PER-IMAGE RESULTS ---');
  console.log(`${'#'.padStart(3)} | ${'Bottles'.padStart(7)} | Description`);
  console.log('-'.repeat(70));
  results.forEach((r, i) => {
    const status = r.success ? String(r.bottleCount).padStart(7) : ' ERROR ';
    console.log(`${String(i + 1).padStart(3)} | ${status} | ${r.desc}`);
  });

  console.log('\n' + '='.repeat(70));
  console.log('  TEST COMPLETE:', new Date().toISOString());
  console.log('='.repeat(70));
}

function pct(num, denom) {
  if (denom === 0) return '0.0%';
  return (num / denom * 100).toFixed(1) + '%';
}

runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
