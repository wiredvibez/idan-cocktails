/**
 * Bug-Hunting End-to-End Test
 *
 * Runs 10 different test scenarios against the live cocktails-wiki.
 * Each scenario probes a different potential bug source.
 * Reports all failures with diagnostic info.
 *
 * Usage: node tests/bug-hunt.js
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
  const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${icon} ${test.padEnd(45)} ${detail}`);
}

async function fetchSafely(url, options = {}, label) {
  try {
    const start = Date.now();
    const r = await fetch(url, options);
    const ms = Date.now() - start;
    return { ok: r.ok, status: r.status, ms, response: r };
  } catch (e) {
    return { ok: false, status: 0, ms: 0, error: e.message };
  }
}

// ─── SCENARIO 1: Main page loads ───
async function test1_indexLoads() {
  const r = await fetchSafely(BASE, {}, 'index');
  if (!r.ok) return record('1. Index page loads', 'FAIL', `HTTP ${r.status} ${r.error || ''}`);
  const html = await r.response.text();
  if (!html.includes('Cocktails Wiki')) return record('1. Index page loads', 'FAIL', 'Missing title');
  if (!html.includes('cocktails-data.js')) return record('1. Index page loads', 'FAIL', 'Missing data script');
  if (r.ms > 3000) return record('1. Index page loads', 'FAIL', `Slow: ${r.ms}ms`);
  record('1. Index page loads', 'PASS', `${r.ms}ms, ${Math.round(html.length / 1024)}KB`);
}

// ─── SCENARIO 2: Bar scanner page loads ───
async function test2_scannerLoads() {
  const r = await fetchSafely(`${BASE}/bar-scanner.html`, {}, 'scanner');
  if (!r.ok) return record('2. Bar scanner loads', 'FAIL', `HTTP ${r.status}`);
  const html = await r.response.text();
  if (!html.includes('scanner.js')) return record('2. Bar scanner loads', 'FAIL', 'Missing scanner.js');
  if (!html.includes('matcher.js')) return record('2. Bar scanner loads', 'FAIL', 'Missing matcher.js');
  record('2. Bar scanner loads', 'PASS', `${r.ms}ms`);
}

// ─── SCENARIO 3: All JS assets load ───
async function test3_jsAssets() {
  const assets = ['/js/cocktails-data.js', '/js/matcher.js', '/js/scanner.js', '/js/radar.js'];
  for (const a of assets) {
    const r = await fetchSafely(BASE + a, {}, a);
    if (!r.ok) {
      record(`3. JS asset ${a}`, 'FAIL', `HTTP ${r.status}`);
    } else {
      const text = await r.response.text();
      if (text.length < 100) {
        record(`3. JS asset ${a}`, 'FAIL', `Empty/tiny: ${text.length}b`);
      } else {
        record(`3. JS asset ${a}`, 'PASS', `${Math.round(text.length / 1024)}KB`);
      }
    }
  }
}

// ─── SCENARIO 4: Scan API empty body (should reject) ───
async function test4_scanApiValidation() {
  const r = await fetchSafely(SCAN_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (r.status !== 400) return record('4. Scan API rejects empty', 'FAIL', `Expected 400, got ${r.status}`);
  record('4. Scan API rejects empty', 'PASS', `400 as expected`);
}

// ─── SCENARIO 5: Scan API GET (should reject) ───
async function test5_scanApiMethod() {
  const r = await fetchSafely(SCAN_API);
  if (r.status !== 405) return record('5. Scan API rejects GET', 'FAIL', `Expected 405, got ${r.status}`);
  record('5. Scan API rejects GET', 'PASS', `405 as expected`);
}

// ─── SCENARIO 6: Scan API with real bottle photo ───
async function test6_scanApiReal() {
  try {
    const imgUrl = 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=600';
    const imgResp = await fetch(imgUrl);
    const buf = await imgResp.arrayBuffer();
    const b64 = Buffer.from(buf).toString('base64');

    const start = Date.now();
    const r = await fetch(SCAN_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image: b64 })
    });
    const ms = Date.now() - start;

    if (!r.ok) return record('6. Scan API real photo', 'FAIL', `HTTP ${r.status}`);
    const data = await r.json();
    if (!Array.isArray(data.bottles)) return record('6. Scan API real photo', 'FAIL', 'No bottles array');
    if (data.bottles.length === 0) return record('6. Scan API real photo', 'FAIL', 'Returned 0 bottles for clear photo', 'high');

    // Check field structure
    const b = data.bottles[0];
    const required = ['name_en', 'name_he', 'category', 'confidence'];
    const missing = required.filter(f => b[f] === undefined);
    if (missing.length > 0) {
      return record('6. Scan API real photo', 'FAIL', `Missing fields: ${missing.join(',')}`, 'high');
    }
    if (ms > 30000) return record('6. Scan API real photo', 'FAIL', `Slow: ${ms}ms`);
    record('6. Scan API real photo', 'PASS', `${ms}ms, ${data.bottles.length} bottles`);
  } catch (e) {
    record('6. Scan API real photo', 'FAIL', `Error: ${e.message}`);
  }
}

// ─── SCENARIO 7: Nearby stores valid coords ───
async function test7_storesApi() {
  // Tel Aviv center
  const r = await fetchSafely(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 32.0853, lng: 34.7818 })
  });
  if (!r.ok) return record('7. Stores API Tel Aviv', 'FAIL', `HTTP ${r.status}`);
  const data = await r.response.json();
  if (!Array.isArray(data.stores)) return record('7. Stores API Tel Aviv', 'FAIL', 'No stores array');
  if (data.stores.length === 0) return record('7. Stores API Tel Aviv', 'FAIL', '0 stores in Tel Aviv center');

  // Check no bars/cafes leaked through
  const bars = data.stores.filter(s =>
    /\b(bar|pub|café|cafe|kafe)\b/i.test(s.name)
  );
  if (bars.length > 0) {
    return record('7. Stores API Tel Aviv', 'FAIL', `Bars not filtered: ${bars.map(b=>b.name).join(',')}`, 'high');
  }
  record('7. Stores API Tel Aviv', 'PASS', `${r.ms}ms, ${data.stores.length} stores`);
}

// ─── SCENARIO 8: Nearby stores invalid coords ───
async function test8_storesApiInvalid() {
  const r = await fetchSafely(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: 'invalid', lng: 'data' })
  });
  if (r.status !== 400) return record('8. Stores API rejects bad input', 'FAIL', `Expected 400, got ${r.status}`);
  record('8. Stores API rejects bad input', 'PASS', `400 as expected`);
}

// ─── SCENARIO 9: Nearby stores missing coords ───
async function test9_storesApiMissing() {
  const r = await fetchSafely(STORES_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({})
  });
  if (r.status !== 400) return record('9. Stores API rejects missing', 'FAIL', `Expected 400, got ${r.status}`);
  record('9. Stores API rejects missing', 'PASS', `400 as expected`);
}

// ─── SCENARIO 10: Cocktails data integrity ───
async function test10_cocktailsData() {
  const r = await fetchSafely(`${BASE}/js/cocktails-data.js`);
  if (!r.ok) return record('10. Cocktails data integrity', 'FAIL', `HTTP ${r.status}`);
  const text = await r.response.text();

  // Extract cocktails array as JS
  const sandbox = {};
  try {
    new Function('global', text + '; global.cocktails = cocktails; global.cocktailImages = cocktailImages;')(sandbox);
  } catch (e) {
    return record('10. Cocktails data integrity', 'FAIL', `JS parse: ${e.message}`, 'high');
  }
  const cocktails = sandbox.cocktails;
  if (!Array.isArray(cocktails)) return record('10. Cocktails data integrity', 'FAIL', 'No cocktails array');
  if (cocktails.length < 50) return record('10. Cocktails data integrity', 'FAIL', `Expected 50+, got ${cocktails.length}`);

  // Validate each cocktail
  const issues = [];
  for (const c of cocktails) {
    if (!c.name) issues.push(`Missing name in cocktail ${cocktails.indexOf(c)}`);
    if (!c.category) issues.push(`Missing category in ${c.name}`);
    if (!Array.isArray(c.ingredients) || c.ingredients.length === 0) issues.push(`Bad ingredients in ${c.name}`);
    if (!Array.isArray(c.steps) || c.steps.length === 0) issues.push(`Bad steps in ${c.name}`);
    if (c.ingredients) {
      for (const ing of c.ingredients) {
        if (!ing.item) issues.push(`Empty ingredient item in ${c.name}`);
      }
    }
  }
  if (issues.length > 0) return record('10. Cocktails data integrity', 'FAIL', `${issues.length} issues: ${issues.slice(0,2).join('; ')}`, 'high');

  // Check images map matches
  const noImage = cocktails.filter(c => !sandbox.cocktailImages[c.name]);
  if (noImage.length > 5) return record('10. Cocktails data integrity', 'FAIL', `${noImage.length} cocktails without image`);

  record('10. Cocktails data integrity', 'PASS', `${cocktails.length} cocktails, ${cocktails.length - noImage.length} images`);
}

// ─── BONUS: Matcher logic edge cases ───
async function test11_matcher() {
  const r = await fetchSafely(`${BASE}/js/matcher.js`);
  if (!r.ok) return record('11. Matcher logic', 'FAIL', `Cannot fetch matcher.js`);
  const text = await r.response.text();
  // Load matcher in a sandbox
  const sandbox = {};
  try {
    new Function('global', text + `;
      global.matchIngredient = matchIngredient;
      global.findCocktailMatches = findCocktailMatches;
      global.INGREDIENT_ALIASES = INGREDIENT_ALIASES;
    `)(sandbox);
  } catch (e) {
    return record('11. Matcher logic', 'FAIL', `Parse: ${e.message}`);
  }

  const issues = [];
  // Test cases
  const tests = [
    ['vodka', 'וודקה', true],
    ['gin', "ג'ין", true],
    ['vodka', 'gin', false],
    ['rum', 'rum_dark', false], // Should NOT cross-match rum and rum_dark
    ['bourbon', 'בורבון', true],
  ];
  for (const [a, b, expected] of tests) {
    const got = sandbox.matchIngredient(a, b);
    if (got !== expected) issues.push(`matchIngredient("${a}", "${b}") = ${got}, expected ${expected}`);
  }
  if (issues.length > 0) return record('11. Matcher logic', 'FAIL', issues.join('; '), 'high');
  record('11. Matcher logic', 'PASS', `${tests.length} cases passed`);
}

// ─── BONUS: Favicon loads ───
async function test12_favicon() {
  const r = await fetchSafely(`${BASE}/favicon.svg`);
  if (!r.ok) return record('12. Favicon loads', 'FAIL', `HTTP ${r.status}`);
  record('12. Favicon loads', 'PASS', `${r.ms}ms`);
}

// ─── BONUS: Background video loads ───
async function test13_bgVideo() {
  const r = await fetchSafely(`${BASE}/bg-video.mp4`, { method: 'HEAD' });
  if (!r.ok) return record('13. Background video', 'FAIL', `HTTP ${r.status}`);
  record('13. Background video', 'PASS', `${r.ms}ms`);
}

// ─── MAIN ───
async function run() {
  console.log('═'.repeat(70));
  console.log('  BUG-HUNTING TEST');
  console.log('  Target: ' + BASE);
  console.log('  ' + new Date().toISOString());
  console.log('═'.repeat(70));

  await test1_indexLoads();
  await test2_scannerLoads();
  await test3_jsAssets();
  await test4_scanApiValidation();
  await test5_scanApiMethod();
  await test6_scanApiReal();
  await test7_storesApi();
  await test8_storesApiInvalid();
  await test9_storesApiMissing();
  await test10_cocktailsData();
  await test11_matcher();
  await test12_favicon();
  await test13_bgVideo();

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = bugs.length;

  console.log('');
  console.log('═'.repeat(70));
  console.log(`  RESULT: ${passed} passed, ${failed} bugs found`);
  console.log('═'.repeat(70));

  if (bugs.length > 0) {
    console.log('');
    console.log('  🐛 BUGS FOUND:');
    for (const b of bugs) {
      console.log(`    [${b.severity.toUpperCase()}] ${b.test}`);
      console.log(`         → ${b.detail}`);
    }
  }

  // Exit code reflects bug count for scripting
  process.exitCode = bugs.length > 0 ? 1 : 0;
  return { passed, failed, bugs };
}

run().catch(e => { console.error('Runner crashed:', e); process.exit(2); });
