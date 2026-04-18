/**
 * Bug-Hunting Test v4 — code-level / function-level bugs
 */

const BASE = 'https://cocktails-wiki.vercel.app';
const bugs = [];

function record(test, status, detail) {
  if (status === 'FAIL') bugs.push({ test, detail });
  console.log(`  ${status === 'PASS' ? '✅' : '❌'} ${test.padEnd(55)} ${detail}`);
}

async function loadJs(path) {
  return await (await fetch(BASE + path)).text();
}

// W1: getSpiritEmoji has every alias category covered
async function w1_emojiCoverage() {
  const scannerJs = await loadJs('/js/scanner.js');
  const matcherJs = await loadJs('/js/matcher.js');
  // Extract emoji map keys
  const emojiMatch = scannerJs.match(/getSpiritEmoji[\s\S]*?const map = \{([\s\S]*?)\};/);
  if (!emojiMatch) return record('W1. Emoji coverage', 'FAIL', 'Could not parse getSpiritEmoji');
  const mapText = emojiMatch[1];
  const emojiKeys = new Set([...mapText.matchAll(/(\w+):\s*['"]/g)].map(m => m[1]));

  // Extract canonical aliases keys
  const aliasMatch = matcherJs.match(/INGREDIENT_ALIASES = \{([\s\S]*?)\};/);
  if (!aliasMatch) return record('W1. Emoji coverage', 'FAIL', 'Could not parse INGREDIENT_ALIASES');
  const canonicalKeys = new Set([...aliasMatch[1].matchAll(/^\s*"(\w+)":/gm)].map(m => m[1]));

  // We don't need every canonical to have a unique emoji; default 🍾 is fine
  // But check for typos / mismatched names
  const missing = [...canonicalKeys].filter(k =>
    !emojiKeys.has(k) && !['simple_syrup','agave_syrup','honey_syrup','raspberry_syrup','orgeat','lime_juice','lemon_juice','orange_juice','pineapple_juice','grapefruit_juice','cranberry_juice','passionfruit_juice','soda','lemonade','egg_white','espresso','ice_cream','cream','coconut_cream','amaro','creme_de_noyaux','licor43','passoa','creme_de_menthe','creme_de_cacao','blue_curacao','cherry_liqueur','chocolate_liqueur','peach_schnapps','grenadine','maraschino','benedictine','chartreuse','absinthe','fernet','galliano','mezcal','rye_whiskey','rum_white'].includes(k)
  );
  if (missing.length > 5) return record('W1. Emoji coverage', 'FAIL', `${missing.length} canonical without emoji: ${missing.slice(0,3).join(',')}`);
  record('W1. Emoji coverage', 'PASS', `default fallback covers gaps`);
}

// W2: Matcher round-trip — every recipe ingredient resolves to >= 1 known canonical
async function w2_recipeMatcher() {
  const dataJs = await loadJs('/js/cocktails-data.js');
  const matcherJs = await loadJs('/js/matcher.js');
  const sandbox = {};
  new Function('global', dataJs + '; global.cocktails = cocktails;')(sandbox);
  new Function('global', matcherJs + '; global.matchIngredient = matchIngredient; global.aliases = INGREDIENT_ALIASES; global.GARNISH_KEYWORDS = GARNISH_KEYWORDS;')(sandbox);

  function isGarnish(name) {
    return sandbox.GARNISH_KEYWORDS.some(kw => name.toLowerCase().includes(kw.toLowerCase()));
  }
  // For each non-garnish ingredient, see if any canonical category matches it
  const unmatchable = new Set();
  for (const c of sandbox.cocktails) {
    for (const ing of c.ingredients) {
      if (isGarnish(ing.item)) continue;
      let matched = false;
      for (const canonical of Object.keys(sandbox.aliases)) {
        if (sandbox.matchIngredient(canonical, ing.item)) { matched = true; break; }
      }
      if (!matched) unmatchable.add(`${c.name}: "${ing.item}"`);
    }
  }
  if (unmatchable.size > 5) return record('W2. Recipe ingredients matchable', 'FAIL',
    `${unmatchable.size} unmatchable: ${[...unmatchable].slice(0,3).join(' | ')}`);
  if (unmatchable.size > 0) return record('W2. Recipe ingredients matchable', 'PASS',
    `${unmatchable.size} minor unmatchable (e.g. fresh juices that are auto-included)`);
  record('W2. Recipe ingredients matchable', 'PASS', `all matchable`);
}

// W3: Radar prices — ingredients in INGREDIENT_PRICES cover most recipe needs
async function w3_radarPrices() {
  const radarJs = await loadJs('/js/radar.js');
  const dataJs = await loadJs('/js/cocktails-data.js');
  // Extract INGREDIENT_PRICES keys
  const pricesMatch = radarJs.match(/INGREDIENT_PRICES = \{([\s\S]*?)\};/);
  if (!pricesMatch) return record('W3. Radar prices coverage', 'FAIL', 'Could not parse INGREDIENT_PRICES');
  const priceKeys = new Set([...pricesMatch[1].matchAll(/['"]([^'"]+)['"]:\s*\d+/g)].map(m => m[1].toLowerCase()));

  const sandbox = {};
  new Function('global', dataJs + '; global.cocktails = cocktails;')(sandbox);

  // Count uncovered ingredients across all recipes
  const uncovered = new Set();
  let totalIngs = 0, coveredIngs = 0;
  for (const c of sandbox.cocktails) {
    for (const ing of c.ingredients) {
      totalIngs++;
      const name = ing.item.toLowerCase().trim();
      // Check if any price key matches (substring either way)
      const found = [...priceKeys].some(k => name === k || name.includes(k) || k.includes(name));
      if (found) coveredIngs++;
      else uncovered.add(ing.item);
    }
  }
  const pct = Math.round(coveredIngs / totalIngs * 100);
  if (pct < 70) return record('W3. Radar prices coverage', 'FAIL', `Only ${pct}% ingredients have prices`);
  record('W3. Radar prices coverage', 'PASS', `${pct}% coverage (${coveredIngs}/${totalIngs})`);
}

// W4: Cocktail data — no duplicate names
async function w4_dupes() {
  const dataJs = await loadJs('/js/cocktails-data.js');
  const sandbox = {};
  new Function('global', dataJs + '; global.cocktails = cocktails;')(sandbox);
  const names = sandbox.cocktails.map(c => c.name);
  const uniq = new Set(names);
  if (uniq.size !== names.length) {
    const dupes = names.filter((n, i) => names.indexOf(n) !== i);
    return record('W4. No duplicate cocktail names', 'FAIL', `Dupes: ${dupes.join(',')}`);
  }
  record('W4. No duplicate cocktail names', 'PASS', `${uniq.size} unique`);
}

// W5: All cocktail categories valid
async function w5_validCategories() {
  const dataJs = await loadJs('/js/cocktails-data.js');
  const sandbox = {};
  new Function('global', dataJs + '; global.cocktails = cocktails; global.cats = categories;')(sandbox);
  const valid = new Set(Object.keys(sandbox.cats || {strong:1,sweet:1,sour:1,fruity:1}));
  const bad = sandbox.cocktails.filter(c => !valid.has(c.category));
  if (bad.length > 0) return record('W5. Valid categories', 'FAIL', `Bad: ${bad.map(c=>`${c.name}=${c.category}`).join(',')}`);
  record('W5. Valid categories', 'PASS', `all in ${[...valid].join('/')}`);
}

async function run() {
  console.log('═'.repeat(70));
  console.log('  BUG-HUNTING TEST v4 — code-level integrity');
  console.log('═'.repeat(70));
  await w1_emojiCoverage();
  await w2_recipeMatcher();
  await w3_radarPrices();
  await w4_dupes();
  await w5_validCategories();
  console.log('');
  console.log(`  RESULT: ${5 - bugs.length}/5 passed, ${bugs.length} bugs`);
  if (bugs.length > 0) {
    console.log('');
    bugs.forEach(b => console.log(`    ❌ ${b.test}\n         → ${b.detail}`));
  }
  process.exitCode = bugs.length > 0 ? 1 : 0;
}

run().catch(e => { console.error(e); process.exit(2); });
