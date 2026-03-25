/**
 * Bar Scanner Stress Test — 50 Images
 *
 * Tests the scan-bar API with 50 diverse alcohol images.
 * For each image: sends to API, logs what was detected, flags failures.
 * Generates a summary report at the end.
 *
 * Usage: node tests/stress-test-50.js
 */

const API_URL = 'https://cocktails-wiki.vercel.app/api/scan-bar';

// 50 diverse test images with expected results
const TEST_IMAGES = [
  // ─── CLEAR BAR SHELVES (should detect multiple bottles) ───
  { url: 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800', desc: 'Well-lit bar shelf', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800', desc: 'Bar interior bottles on shelves', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=800', desc: 'Bar with liquor wall', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=800', desc: 'Assorted liquor bottles', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800', desc: 'Bar shelf assortment', expectMin: 2, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=800', desc: 'Backlit bar shelf', expectMin: 2, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=800', desc: 'Liquor store stocked', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1583898350903-99fa829dad3a?w=800', desc: 'Bar with neon and bottles', expectMin: 1, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=800', desc: 'Cocktail bar shelves', expectMin: 3, category: 'bar-shelf' },
  { url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', desc: 'Classic bar setup', expectMin: 2, category: 'bar-shelf' },

  // ─── SINGLE BOTTLE CLOSEUPS (should detect 1 specific bottle) ───
  { url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800', desc: 'Macallan whisky closeup', expectMin: 1, expectCategory: 'scotch', category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800', desc: 'Whiskey bottle on bar', expectMin: 1, category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800', desc: 'Whiskey bottle closeup', expectMin: 1, category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=800', desc: 'Single bottle dark bg', expectMin: 1, category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1586993451228-09818021e309?w=800', desc: 'Gin bottle closeup', expectMin: 1, expectCategory: 'gin', category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1516535794938-6063878f08cc?w=800', desc: 'Tequila bottle', expectMin: 1, category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=800', desc: 'Vodka bottle', expectMin: 1, category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=800', desc: 'Rum bottle closeup', expectMin: 1, expectCategory: 'rum', category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800', desc: 'Hennessy cognac', expectMin: 1, expectCategory: 'cognac', category: 'single-bottle' },
  { url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800', desc: 'Campari bottle', expectMin: 1, expectCategory: 'campari', category: 'single-bottle' },

  // ─── DARK / DIM BAR PHOTOS (tests enhancement + retry) ───
  { url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=600', desc: 'Dim bar atmosphere', expectMin: 1, category: 'dark' },
  { url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800', desc: 'Dark cocktail bar', expectMin: 1, category: 'dark' },
  { url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800', desc: 'Moody bar lighting', expectMin: 1, category: 'dark' },
  { url: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800', desc: 'Nightclub bar dark', expectMin: 0, category: 'dark' },
  { url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800', desc: 'Dimly lit spirits', expectMin: 1, category: 'dark' },

  // ─── SPECIFIC SPIRITS (test correct categorization) ───
  { url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800', desc: 'Bourbon/whisky collection', expectMin: 1, category: 'spirits' },
  { url: 'https://images.unsplash.com/photo-1619451050621-83cb7aada2d7?w=800', desc: 'Scotch whisky lineup', expectMin: 1, category: 'spirits' },
  { url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800', desc: 'Spirit bottles behind bar', expectMin: 1, category: 'spirits' },
  { url: 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=800', desc: 'Vodka brands lineup', expectMin: 1, expectCategory: 'vodka', category: 'spirits' },
  { url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=800', desc: 'Cocktail with bottles behind', expectMin: 1, category: 'spirits' },

  // ─── LIQUEURS & SPECIALTY (test non-spirit detection) ───
  { url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', desc: 'Aperol spritz bottles', expectMin: 1, expectCategory: 'aperol', category: 'liqueur' },
  { url: 'https://images.unsplash.com/photo-1595981267035-7b04ca84a82d?w=800', desc: 'Campari negroni setup', expectMin: 1, category: 'liqueur' },
  { url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=800', desc: 'Liqueur bottles collection', expectMin: 1, category: 'liqueur' },
  { url: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=800', desc: 'Baileys Irish Cream', expectMin: 1, expectCategory: 'baileys', category: 'liqueur' },
  { url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800', desc: 'Cocktails with bottles', expectMin: 1, category: 'liqueur' },

  // ─── WINE & BEER (should detect but as limited categories) ───
  { url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=800', desc: 'Wine bottles on rack', expectMin: 0, category: 'wine-beer' },
  { url: 'https://images.unsplash.com/photo-1553361371-9b22f78e8b1d?w=800', desc: 'Wine collection', expectMin: 0, category: 'wine-beer' },
  { url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800', desc: 'Beer bottles lineup', expectMin: 0, category: 'wine-beer' },
  { url: 'https://images.unsplash.com/photo-1571613316887-6f8d5cbf7ef7?w=800', desc: 'Craft beer bottles', expectMin: 0, category: 'wine-beer' },
  { url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=800', desc: 'Champagne/Prosecco', expectMin: 1, expectCategory: 'prosecco', category: 'wine-beer' },

  // ─── EDGE CASES ───
  { url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', desc: 'Food plate (no bottles)', expectMin: 0, expectMax: 0, category: 'edge-no-bottles' },
  { url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', desc: 'Coffee cup (no alcohol)', expectMin: 0, expectMax: 0, category: 'edge-no-bottles' },
  { url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800', desc: 'Restaurant interior', expectMin: 0, category: 'edge-ambiguous' },
  { url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=800', desc: 'Cocktail glass closeup', expectMin: 0, category: 'edge-ambiguous' },
  { url: 'https://images.unsplash.com/photo-1582819509237-d5b75f20ff7a?w=800', desc: 'Blurry bar photo', expectMin: 0, category: 'edge-blurry' },

  // ─── MIXED / COMPLEX SCENES ───
  { url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=800', desc: 'Home bar setup', expectMin: 2, category: 'mixed' },
  { url: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800', desc: 'Bar counter with bottles', expectMin: 1, category: 'mixed' },
  { url: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=800', desc: 'Party bar setup', expectMin: 1, category: 'mixed' },
  { url: 'https://images.unsplash.com/photo-1587740896339-96a76170508d?w=800', desc: 'Mini bar hotel room', expectMin: 1, category: 'mixed' },
  { url: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?w=800', desc: 'Store shelf variety', expectMin: 2, category: 'mixed' },
];

// ─── HELPERS ───

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching ${url}`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function scanImage(base64) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text.substring(0, 200)}`);
  }

  return response.json();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ─── MAIN TEST RUNNER ───

async function runStressTest() {
  console.log('='.repeat(70));
  console.log('  BAR SCANNER STRESS TEST — 50 IMAGES');
  console.log('  API: ' + API_URL);
  console.log('  Date: ' + new Date().toISOString());
  console.log('='.repeat(70));
  console.log('');

  const results = [];
  let passed = 0;
  let failed = 0;
  let errors = 0;
  const failures = [];

  for (let i = 0; i < TEST_IMAGES.length; i++) {
    const test = TEST_IMAGES[i];
    const num = String(i + 1).padStart(2, '0');
    process.stdout.write(`[${num}/50] ${test.desc.padEnd(35)} `);

    try {
      // Fetch image
      const base64 = await fetchImageAsBase64(test.url);

      // Scan
      const data = await scanImage(base64);
      const bottles = data.bottles || [];
      const count = bottles.length;
      const categories = bottles.map(b => b.category);
      const confidences = bottles.map(b => b.confidence);

      // Evaluate
      let status = 'PASS';
      let failReason = '';

      // Check minimum bottles
      if (count < test.expectMin) {
        status = 'FAIL';
        failReason = `Expected min ${test.expectMin} bottles, got ${count}`;
      }

      // Check maximum (for edge cases like food photos)
      if (test.expectMax !== undefined && count > test.expectMax) {
        status = 'FAIL';
        failReason = `Expected max ${test.expectMax} bottles, got ${count} (false positives: ${categories.join(', ')})`;
      }

      // Check specific category if expected
      if (test.expectCategory && count > 0) {
        const hasExpected = categories.includes(test.expectCategory) ||
          categories.includes(test.expectCategory.replace('_', ''));
        if (!hasExpected) {
          status = 'FAIL';
          failReason = `Expected "${test.expectCategory}", got: ${categories.join(', ')}`;
        }
      }

      const confSummary = confidences.length > 0
        ? `[${confidences.map(c => c[0]).join('')}]` // h/m/l first letters
        : '[-]';

      if (status === 'PASS') {
        console.log(`✅ ${count} bottles ${confSummary} ${categories.slice(0, 5).join(', ')}${categories.length > 5 ? '...' : ''}`);
        passed++;
      } else {
        console.log(`❌ ${failReason}`);
        failed++;
        failures.push({
          index: i + 1,
          desc: test.desc,
          category: test.category,
          reason: failReason,
          detected: categories,
          confidences: confidences,
          count: count
        });
      }

      results.push({
        index: i + 1,
        desc: test.desc,
        category: test.category,
        status,
        bottleCount: count,
        categories,
        confidences,
        failReason
      });

      // Rate limit — 1.5s between requests to avoid hitting Gemini limits
      await sleep(1500);

    } catch (err) {
      console.log(`💥 ERROR: ${err.message.substring(0, 80)}`);
      errors++;
      results.push({
        index: i + 1,
        desc: test.desc,
        category: test.category,
        status: 'ERROR',
        error: err.message,
        failReason: err.message
      });
      failures.push({
        index: i + 1,
        desc: test.desc,
        category: test.category,
        reason: `ERROR: ${err.message}`,
        detected: [],
        confidences: [],
        count: 0
      });

      // Longer wait on error (might be rate limit)
      await sleep(3000);
    }
  }

  // ─── REPORT ───
  console.log('');
  console.log('='.repeat(70));
  console.log('  RESULTS SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total:   ${TEST_IMAGES.length}`);
  console.log(`  Passed:  ${passed} (${Math.round(passed/TEST_IMAGES.length*100)}%)`);
  console.log(`  Failed:  ${failed} (${Math.round(failed/TEST_IMAGES.length*100)}%)`);
  console.log(`  Errors:  ${errors}`);
  console.log('');

  // Category breakdown
  const byCategory = {};
  for (const r of results) {
    if (!byCategory[r.category]) byCategory[r.category] = { pass: 0, fail: 0, error: 0, total: 0 };
    byCategory[r.category].total++;
    if (r.status === 'PASS') byCategory[r.category].pass++;
    else if (r.status === 'FAIL') byCategory[r.category].fail++;
    else byCategory[r.category].error++;
  }

  console.log('  BY CATEGORY:');
  for (const [cat, stats] of Object.entries(byCategory)) {
    const pct = Math.round(stats.pass / stats.total * 100);
    const bar = '█'.repeat(Math.round(pct / 5)) + '░'.repeat(20 - Math.round(pct / 5));
    console.log(`    ${cat.padEnd(20)} ${bar} ${pct}% (${stats.pass}/${stats.total})`);
  }
  console.log('');

  // Confidence distribution
  const allConfs = results.flatMap(r => r.confidences || []);
  const highCount = allConfs.filter(c => c === 'high').length;
  const medCount = allConfs.filter(c => c === 'medium').length;
  const lowCount = allConfs.filter(c => c === 'low').length;
  console.log('  CONFIDENCE DISTRIBUTION:');
  console.log(`    High:   ${highCount} (${allConfs.length > 0 ? Math.round(highCount/allConfs.length*100) : 0}%)`);
  console.log(`    Medium: ${medCount} (${allConfs.length > 0 ? Math.round(medCount/allConfs.length*100) : 0}%)`);
  console.log(`    Low:    ${lowCount} (${allConfs.length > 0 ? Math.round(lowCount/allConfs.length*100) : 0}%)`);
  console.log(`    Total bottles detected: ${allConfs.length}`);
  console.log('');

  // Failure details
  if (failures.length > 0) {
    console.log('='.repeat(70));
    console.log('  FAILURE DETAILS');
    console.log('='.repeat(70));
    for (const f of failures) {
      console.log(`  [#${String(f.index).padStart(2, '0')}] ${f.desc}`);
      console.log(`         Category: ${f.category}`);
      console.log(`         Reason:   ${f.reason}`);
      if (f.detected.length > 0) {
        console.log(`         Detected: ${f.detected.join(', ')}`);
        console.log(`         Conf:     ${f.confidences.join(', ')}`);
      }
      console.log('');
    }
  }

  // Most commonly detected categories
  const catCounts = {};
  for (const r of results) {
    for (const cat of (r.categories || [])) {
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    }
  }
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  console.log('  TOP DETECTED CATEGORIES:');
  for (const [cat, cnt] of sortedCats.slice(0, 15)) {
    console.log(`    ${cat.padEnd(20)} ${cnt}x`);
  }
  console.log('');

  console.log('='.repeat(70));
  console.log('  TEST COMPLETE');
  console.log('='.repeat(70));

  return { results, failures, passed, failed, errors };
}

runStressTest().catch(err => {
  console.error('Test runner failed:', err);
  process.exit(1);
});
