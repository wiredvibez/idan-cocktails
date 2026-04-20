/**
 * Feature test for 6 UX improvements — static-analysis version.
 * Fetches the live site and verifies each feature's code/markup
 * is present and correctly wired. Doesn't drive a real browser
 * (we don't have a headless browser available here), but catches
 * broken deploys, missing elements, regressions, and missing hooks.
 *
 * Usage: node tests/features-v2.js
 */
// @ts-check
const BASE = 'https://cocktails-wiki.vercel.app';

const checks = [];
function check(name, cond, detail = '') {
  checks.push({ name, pass: !!cond, detail });
  const icon = cond ? '✅' : '❌';
  console.log(`  ${icon} ${name.padEnd(55)} ${detail}`);
}

async function fetchText(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url} HTTP ${r.status}`);
  return await r.text();
}

(async () => {
  console.log('═'.repeat(75));
  console.log(`  FEATURE TEST v2 — 6 UX improvements`);
  console.log(`  Target: ${BASE}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log('═'.repeat(75));

  const html = await fetchText(BASE);
  const scannerHtml = await fetchText(`${BASE}/bar-scanner.html`);

  // ─── Feature 1: Gold contrast ───
  console.log('\n  ─ Feature 1: Gold contrast bump ─');
  check('1a. index.html --gold is #D4B575',
        /--gold\s*:\s*#D4B575/.test(html),
        'Must be lifted from #C8A96E for WCAG AA');
  check('1b. bar-scanner.html --gold is #D4B575',
        /--gold\s*:\s*#D4B575/.test(scannerHtml));
  check('1c. Old #C8A96E not present in primary CSS variables',
        !/--gold\s*:\s*#C8A96E/.test(html) && !/--gold\s*:\s*#C8A96E/.test(scannerHtml));

  // ─── Feature 2: Sort dropdown ───
  console.log('\n  ─ Feature 2: Sort dropdown ─');
  check('2a. sortSelect element present',
        /id="sortSelect"/.test(html));
  check('2b. Has all 7 sort options (default + 6 metrics)',
        /value="default"/.test(html) &&
        /value="difficulty-asc"/.test(html) &&
        /value="difficulty-desc"/.test(html) &&
        /value="sweet-desc"/.test(html) &&
        /value="sour-desc"/.test(html) &&
        /value="complex-desc"/.test(html) &&
        /value="name-asc"/.test(html));
  check('2c. sortComparator function defined',
        /function sortComparator/.test(html));
  check('2d. sortSelect change handler bound',
        /sortSelect"\)\.addEventListener\("change"/.test(html) ||
        /getElementById\("sortSelect"\).addEventListener\("change"/.test(html));

  // ─── Feature 3: Surprise me ───
  console.log('\n  ─ Feature 3: Surprise me button ─');
  check('3a. surpriseBtn element present',
        /id="surpriseBtn"/.test(html));
  check('3b. Hebrew label "הפתע אותי"',
        /הפתע אותי/.test(html));
  check('3c. Click handler scrolls to + expands a random card',
        /surpriseBtn"\)\.addEventListener\("click"/.test(html) &&
        /Math\.random\(\)/.test(html) &&
        /scrollIntoView/.test(html));

  // ─── Feature 4: Favorites ───
  console.log('\n  ─ Feature 4: Favorites ─');
  check('4a. FAV_KEY defined for localStorage',
        /FAV_KEY\s*=\s*"cocktailFavs/.test(html));
  check('4b. loadFavorites/saveFavorites functions exist',
        /function loadFavorites/.test(html) && /function saveFavorites/.test(html));
  check('4c. toggleFavorite function exists',
        /function toggleFavorite/.test(html));
  check('4d. Favorites pill present with data-filter="favorites"',
        /data-filter="favorites"/.test(html));
  check('4e. favCount badge present',
        /id="favCount"/.test(html));
  check('4f. Card fav heart button with handleFavClick',
        /class="card-fav/.test(html) && /handleFavClick/.test(html));
  check('4g. updateFavCount called on init',
        /updateFavCount\(\);\s*\n\s*\/\/ Initial render/.test(html) ||
        /updateFavCount\(\);[\s\n]*\/\/ Initial render/.test(html));
  check('4h. .favorited red state CSS',
        /\.card-fav\.favorited/.test(html));

  // ─── Feature 5: Empty state ───
  console.log('\n  ─ Feature 5: Improved empty state ─');
  check('5a. Empty-state shows search query in message',
        /לא נמצאו תוצאות עבור/.test(html));
  check('5b. Favorites-view empty state',
        /עוד לא שמרת קוקטיילים/.test(html));
  check('5c. "Clear all filters" button in empty state',
        /נקה את כל הסינונים/.test(html));
  check('5d. resetAllFilters function exists',
        /function resetAllFilters/.test(html));

  // ─── Feature 6: Animated prep step icons ───
  console.log('\n  ─ Feature 6: Animated prep icons ─');
  check('6a. stepIcon helper function exists',
        /function stepIcon/.test(html));
  check('6b. All 5 verb categories detected (shake/stir/muddle/strain/pour)',
        /נער.*שייק|שייק.*נער/s.test(html) &&
        /ערבב/.test(html) &&
        /כתוש/.test(html) &&
        /סנן/.test(html) &&
        /מוזג/.test(html));
  check('6c. @keyframes shake-anim defined',
        /@keyframes shake-anim/.test(html));
  check('6d. @keyframes stir-anim defined',
        /@keyframes stir-anim/.test(html));
  check('6e. @keyframes muddle-anim defined',
        /@keyframes muddle-anim/.test(html));
  check('6f. .step-icon CSS class',
        /\.step-icon\b/.test(html));
  check('6g. Steps are rendered with icon-ready structure',
        /c\.steps\.map\(s\s*=>\s*\{[\s\S]*stepIcon\(s\)/.test(html));

  // ─── Regressions: core functionality still intact ───
  console.log('\n  ─ Regression checks ─');
  check('R1. Scanner API still responds',
        await fetch(`${BASE}/api/scan-bar`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: 'x' })
        }).then(r => [200, 400, 502].includes(r.status)).catch(() => false),
        '200/400/502 all indicate alive endpoint (502 = upstream rejected bad base64)');
  check('R2. Nearby-stores API still responds',
        await fetch(`${BASE}/api/nearby-stores`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({})
        }).then(r => r.status === 400).catch(() => false),
        'Expects 400 on missing coords (endpoint alive)');
  check('R3. cocktails-data.js still served',
        await fetch(`${BASE}/js/cocktails-data.js`).then(r => r.ok).catch(() => false));
  check('R4. Original 4 category pills still present',
        /data-filter="strong"/.test(html) &&
        /data-filter="sweet"/.test(html) &&
        /data-filter="sour"/.test(html) &&
        /data-filter="fruity"/.test(html));
  check('R5. Existing radar feature still present',
        /findNearbyStores/.test(html) &&
        /מצא חנויות קרובות/.test(html));
  check('R6. Analytics (New Relic + Clarity) still loaded',
        /NREUM\.loader_config/.test(html) &&
        /clarity\.ms/.test(html));

  // Summary
  const passed = checks.filter(c => c.pass).length;
  const failed = checks.length - passed;
  console.log('\n' + '═'.repeat(75));
  console.log(`  RESULT: ${passed}/${checks.length} checks passed`);
  console.log('═'.repeat(75));
  if (failed > 0) {
    console.log('\n  FAILED CHECKS:');
    checks.filter(c => !c.pass).forEach(c => console.log(`    ❌ ${c.name}`));
  }
  process.exit(failed > 0 ? 1 : 0);
})().catch(err => {
  console.error('Test crashed:', err);
  process.exit(2);
});
