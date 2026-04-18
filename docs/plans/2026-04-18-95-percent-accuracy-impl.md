# 95% Scanner Accuracy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Raise `/api/scan-bar` category accuracy to ≥95% on a verified 50-image test set without changing model or infrastructure.

**Architecture:** Three-phase workflow — (1) build a clean, manually verified test set with ground-truth annotations; (2) run baseline measurement to find real starting accuracy; (3) iterate the Gemini prompt with targeted fixes, keeping each change only if it lifts accuracy by ≥2%.

**Tech Stack:** Node.js test runner, Vercel serverless function (`api/scan-bar.js`), `gemini-2.5-flash-lite` (unchanged), plain JSON for ground truth.

**Design doc:** `docs/plans/2026-04-18-95-percent-accuracy-design.md`

---

## Task 1: Create Clean Test Set Directory Structure

**Files:**
- Create: `tests/clean-set/` (directory)
- Create: `tests/clean-set/ground-truth.json`
- Create: `tests/clean-set/README.md`

**Step 1: Create directory and empty ground truth**

```bash
mkdir -p tests/clean-set/images
```

Then create `tests/clean-set/ground-truth.json` with empty object:

```json
{}
```

**Step 2: Document the format**

Create `tests/clean-set/README.md`:

```markdown
# Clean Test Set

50 manually verified images for measuring scanner category accuracy.

## Structure

- `images/` — verified JPEG files
- `ground-truth.json` — `{ filename: { category, alt_categories, bottles, brand, notes } }`

## Ground truth schema

- `category` — expected primary category key (null for edge cases)
- `alt_categories` — list of also-acceptable categories (e.g. scotch accepts `whiskey`)
- `bottles` — expected count (0 for edge cases)
- `brand` — brand name for reference
- `notes` — why this image is here

## Verification rule

Every image must be visually inspected before being added. Do not trust
the source filename or URL label — Unsplash lies constantly.
```

**Step 3: Commit**

```bash
git add tests/clean-set/
git commit -m "scaffold: clean test set directory + ground truth schema"
```

---

## Task 2: Build Test Set Source List

**Files:**
- Create: `tests/clean-set/sources.json`

**Step 1: Write the source list**

Create `tests/clean-set/sources.json`. This is the list of candidate images to fetch and verify. Each has a proposed ground truth that must be confirmed by visual inspection.

Because Wikipedia/Wikimedia bottle image URLs change frequently, we source from `upload.wikimedia.org` and Unsplash directly. For each entry, `candidate` is the URL; the test-set builder will fetch, save, and prompt for visual confirmation.

```json
{
  "single_bottles": [
    { "slug": "macallan-12",      "url": "https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1200", "category": "scotch",        "alt_categories": ["whiskey"],  "bottles": 1, "brand": "Macallan 12" },
    { "slug": "hennessy-vs",      "url": "https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1200", "category": "cognac",        "alt_categories": [],           "bottles": 1, "brand": "Hennessy VS" },
    { "slug": "jack-daniels",     "url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=1200", "category": "bourbon",       "alt_categories": ["whiskey"],  "bottles": 1, "brand": "Jack Daniel's" },
    { "slug": "absolut-vodka",    "url": "https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=1200", "category": "vodka",         "alt_categories": [],           "bottles": 1, "brand": "Absolut" },
    { "slug": "rum-closeup",      "url": "https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=1200", "category": "rum",           "alt_categories": ["rum_dark"], "bottles": 1, "brand": "rum" },
    { "slug": "tanqueray-gin",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Tanqueray%20Gin.jpg?width=1000", "category": "gin", "alt_categories": [], "bottles": 1, "brand": "Tanqueray" },
    { "slug": "bombay-sapphire",  "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Bombay%20Sapphire%20bottle%20front.jpg?width=1000", "category": "gin", "alt_categories": [], "bottles": 1, "brand": "Bombay Sapphire" },
    { "slug": "campari-bottle",   "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Campari%20bottle.jpg?width=1000", "category": "campari", "alt_categories": [], "bottles": 1, "brand": "Campari" },
    { "slug": "aperol-bottle",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Aperol%20bottle.jpg?width=1000", "category": "aperol", "alt_categories": [], "bottles": 1, "brand": "Aperol" },
    { "slug": "baileys-bottle",   "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Baileys%20Irish%20Cream.jpg?width=1000", "category": "baileys", "alt_categories": [], "bottles": 1, "brand": "Baileys" },
    { "slug": "kahlua-bottle",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Kahl%C3%BAa.jpg?width=1000", "category": "kahlua", "alt_categories": [], "bottles": 1, "brand": "Kahlúa" },
    { "slug": "cointreau-bottle", "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Cointreau%20bottle.jpg?width=1000", "category": "triple_sec", "alt_categories": [], "bottles": 1, "brand": "Cointreau" },
    { "slug": "disaronno",        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Disaronno%20bottle.jpg?width=1000", "category": "amaretto", "alt_categories": [], "bottles": 1, "brand": "Disaronno" },
    { "slug": "jagermeister",     "url": "https://commons.wikimedia.org/wiki/Special:FilePath/J%C3%A4germeister%20flasche.jpg?width=1000", "category": "fernet", "alt_categories": ["liqueur"], "bottles": 1, "brand": "Jägermeister" },
    { "slug": "chartreuse",       "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Chartreuse%20verte.jpg?width=1000", "category": "chartreuse", "alt_categories": [], "bottles": 1, "brand": "Chartreuse" },
    { "slug": "fernet-branca",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Fernet-Branca%20bottle.jpg?width=1000", "category": "fernet", "alt_categories": [], "bottles": 1, "brand": "Fernet Branca" },
    { "slug": "martini-rosso",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Martini%20Rosso.jpg?width=1000", "category": "sweet_vermouth", "alt_categories": [], "bottles": 1, "brand": "Martini Rosso" },
    { "slug": "angostura",        "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Angostura%20bitters%20bottle.jpg?width=1000", "category": "bitters", "alt_categories": [], "bottles": 1, "brand": "Angostura" },
    { "slug": "patron-silver",    "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Patron%20Silver%20bottle.jpg?width=1000", "category": "tequila", "alt_categories": [], "bottles": 1, "brand": "Patron Silver" },
    { "slug": "grey-goose",       "url": "https://commons.wikimedia.org/wiki/Special:FilePath/Grey%20Goose%20vodka%20bottle.jpg?width=1000", "category": "vodka", "alt_categories": [], "bottles": 1, "brand": "Grey Goose" }
  ],
  "bar_shelves": [
    { "slug": "liquor-wall-1",    "url": "https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=1400", "category": "multi", "min_bottles": 3, "notes": "Confirmed busy shelf" },
    { "slug": "busy-shelves-1",   "url": "https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1400", "category": "multi", "min_bottles": 3 },
    { "slug": "backlit-shelf-1",  "url": "https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1400", "category": "multi", "min_bottles": 1, "notes": "May be bartender pouring, verify" },
    { "slug": "bar-shelves-1",    "url": "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1400", "category": "multi", "min_bottles": 2 },
    { "slug": "liquor-store-1",   "url": "https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=1400", "category": "multi", "min_bottles": 3 },
    { "slug": "bar-shelves-2",    "url": "https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=1400", "category": "multi", "min_bottles": 2, "notes": "Verify — may be cocktails" },
    { "slug": "nightclub-shelf",  "url": "https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=1400", "category": "multi", "min_bottles": 2 },
    { "slug": "home-bar-1",       "url": "https://images.unsplash.com/photo-1560512823-829485b8bf24?w=1400", "category": "multi", "min_bottles": 1, "notes": "Verify" },
    { "slug": "bar-behind-1",     "url": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1400", "category": "multi", "min_bottles": 1, "notes": "Verify" },
    { "slug": "bottles-lineup",   "url": "https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=1400", "category": "multi", "min_bottles": 2, "notes": "Verify" },
    { "slug": "bar-counter-1",    "url": "https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=1400", "category": "multi", "min_bottles": 1 },
    { "slug": "cocktail-bar-1",   "url": "https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=1400", "category": "multi", "min_bottles": 1, "notes": "Verify" },
    { "slug": "shelves-wide-1",   "url": "https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=1400", "category": "multi", "min_bottles": 2 },
    { "slug": "spirits-shelf",    "url": "https://images.unsplash.com/photo-1546171753-97d7676e4602?w=1400", "category": "multi", "min_bottles": 1 },
    { "slug": "bottles-varied",   "url": "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=1400", "category": "multi", "min_bottles": 1, "notes": "Verify" }
  ],
  "edge_cases": [
    { "slug": "food-plate",       "url": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200", "category": null, "bottles": 0 },
    { "slug": "coffee-cup",       "url": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200", "category": null, "bottles": 0 },
    { "slug": "restaurant-int",   "url": "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200", "category": null, "bottles": 0 },
    { "slug": "cocktail-glass-1", "url": "https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=1200", "category": null, "bottles": 0 },
    { "slug": "wine-glasses-1",   "url": "https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200", "category": null, "bottles": 0, "notes": "Wine bottles in rack — out-of-scope, expect 0" },
    { "slug": "empty-glasses-1",  "url": "https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200", "category": null, "bottles": 0, "notes": "Beer lineup out-of-scope" },
    { "slug": "cocktail-iced",    "url": "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=1200", "category": null, "bottles": 0, "notes": "Iced cocktail, no bottle" },
    { "slug": "cocktail-pink",    "url": "https://images.unsplash.com/photo-1609951651556-5334e2706168?w=1200", "category": null, "bottles": 0, "notes": "Pink cocktail, no bottle" },
    { "slug": "beer-taps",        "url": "https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=1200", "category": null, "bottles": 0, "notes": "Beer taps, no bottle" },
    { "slug": "beer-mug",         "url": "https://images.unsplash.com/photo-1586993451228-09818021e309?w=1200", "category": null, "bottles": 0, "notes": "Beer mug splash, no bottle" },
    { "slug": "wine-friends",     "url": "https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200", "category": null, "bottles": 0, "notes": "People with wine glasses" },
    { "slug": "cocktail-top",     "url": "https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=1200", "category": null, "bottles": 0, "notes": "Top-down cocktails" },
    { "slug": "bartender-pour",   "url": "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200", "category": null, "bottles": 0, "notes": "Cocktail closeup" },
    { "slug": "cocktail-single",  "url": "https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200", "category": null, "bottles": 0, "notes": "Cocktail scene" },
    { "slug": "bar-empty-glass",  "url": "https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=1200", "category": null, "bottles": 0, "notes": "Verify — may overlap with single_bottles" }
  ]
}
```

**Step 2: Commit**

```bash
git add tests/clean-set/sources.json
git commit -m "scaffold: candidate sources for 50-image clean test set"
```

---

## Task 3: Build the Fetch-and-Verify Script

**Files:**
- Create: `tests/build-clean-set.js`

**Step 1: Write the fetcher**

Create `tests/build-clean-set.js`:

```javascript
/**
 * Fetches candidate images from sources.json, saves them to
 * tests/clean-set/images/<slug>.jpg, skipping any that 404.
 *
 * Does NOT populate ground-truth.json — that happens in Task 4
 * after the human (you) visually inspects each saved image.
 */

import fs from 'fs';
import path from 'path';

const SOURCES = JSON.parse(fs.readFileSync('tests/clean-set/sources.json', 'utf8'));
const OUT_DIR = 'tests/clean-set/images';
fs.mkdirSync(OUT_DIR, { recursive: true });

async function saveImage(slug, url) {
  const outPath = path.join(OUT_DIR, `${slug}.jpg`);
  if (fs.existsSync(outPath)) {
    console.log(`  ⏭  ${slug} already exists, skipping`);
    return true;
  }
  try {
    const r = await fetch(url);
    if (!r.ok) {
      console.log(`  ✗  ${slug}: HTTP ${r.status}`);
      return false;
    }
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(outPath, buf);
    console.log(`  ✓  ${slug} (${Math.round(buf.length / 1024)}KB)`);
    return true;
  } catch (e) {
    console.log(`  ✗  ${slug}: ${e.message}`);
    return false;
  }
}

(async () => {
  const allCandidates = [
    ...SOURCES.single_bottles,
    ...SOURCES.bar_shelves,
    ...SOURCES.edge_cases,
  ];
  console.log(`Fetching ${allCandidates.length} candidate images...`);
  let ok = 0;
  for (const c of allCandidates) {
    const success = await saveImage(c.slug, c.url);
    if (success) ok++;
    await new Promise(r => setTimeout(r, 400)); // be polite
  }
  console.log(`\nDone: ${ok}/${allCandidates.length} saved to ${OUT_DIR}`);
})();
```

**Step 2: Run the fetcher**

```bash
node tests/build-clean-set.js
```

Expected: 40-50 images saved. Some Wikimedia URLs may 404 — that's OK, we'll replace them in Task 4.

**Step 3: Commit**

```bash
git add tests/build-clean-set.js
git commit -m "feat: fetch script for clean test set images"
```

*(Do NOT commit the `images/` directory yet — Task 4 will verify and prune them first.)*

---

## Task 4: Visually Verify Each Image and Build Ground Truth

This task is **manual** but uses the Read tool to let Claude see each saved image. For each file in `tests/clean-set/images/`:

**Step 1: Open each image and decide**

For each file (alphabetical order), Claude uses the `Read` tool on the JPEG to view it. Based on what's actually in the image:

- If it matches the proposed category → add entry to `ground-truth.json`
- If the content is wrong (e.g. slug says "tanqueray-gin" but image shows a beer mug) → delete the file
- If the image is low-quality, blurry beyond recognition → delete the file

**Step 2: Write verified ground truth**

After inspection, `tests/clean-set/ground-truth.json` must have **at least 40 verified entries** in this exact format:

```json
{
  "hennessy-vs.jpg": {
    "category": "cognac",
    "alt_categories": [],
    "bottles": 1,
    "brand": "Hennessy VS",
    "notes": "Verified — clear amber bottle with gold label"
  },
  "food-plate.jpg": {
    "category": null,
    "alt_categories": [],
    "bottles": 0,
    "brand": null,
    "notes": "Edge case — no bottle visible"
  }
}
```

**Rules:**
- `category: null` + `bottles: 0` → edge case (scanner must return `[]`)
- `category: "multi"` → bar shelf (scanner must return ≥ `min_bottles`, categories not scored)
- Any other `category` → single-bottle photo (scanner must return that category)

**Step 3: Minimum set size check**

If fewer than 40 images survive verification, the human must manually add replacement images (take photos, source from web). Do not proceed to Task 5 until ground-truth has ≥40 entries.

**Step 4: Commit verified images + ground truth**

```bash
git add tests/clean-set/images/
git add tests/clean-set/ground-truth.json
git commit -m "data: verified clean test set (N images with ground truth)"
```

---

## Task 5: Build the Accuracy Scoring Runner

**Files:**
- Create: `tests/accuracy-95.js`

**Step 1: Write the scoring logic**

Create `tests/accuracy-95.js`:

```javascript
/**
 * Scores scanner accuracy against the verified clean test set.
 *
 *   - Category accuracy: for single-bottle photos, did scanner return the right category?
 *   - Hallucination rate: for edge cases, did scanner correctly return []?
 *   - Shelf recall: for bar-shelf photos, did scanner meet min_bottles?
 *
 * Prints overall + per-category breakdown.
 */

import fs from 'fs';
import path from 'path';

const API = process.env.API_URL || 'https://cocktails-wiki.vercel.app/api/scan-bar';
const GT  = JSON.parse(fs.readFileSync('tests/clean-set/ground-truth.json', 'utf8'));
const IMG_DIR = 'tests/clean-set/images';

function classify(filename, truth, apiResult) {
  const bottles = apiResult?.bottles || [];
  const count = bottles.length;

  // Edge case: must return zero bottles
  if (truth.bottles === 0) {
    if (count === 0) return { kind: 'edge_correct', detail: 'correctly returned []' };
    return { kind: 'edge_hallucination', detail: `${count} fake bottles: ${bottles.map(b=>b.category).join(',')}` };
  }

  // Multi-bottle shelf: check min_bottles
  if (truth.category === 'multi') {
    if (count >= (truth.min_bottles || 1)) return { kind: 'shelf_pass', detail: `${count} bottles (≥${truth.min_bottles})` };
    return { kind: 'shelf_underreport', detail: `${count} < min ${truth.min_bottles}` };
  }

  // Single-bottle: category match
  const cats = bottles.map(b => b.category);
  const acceptable = new Set([truth.category, ...(truth.alt_categories || [])]);
  const hit = cats.some(c => acceptable.has(c));
  if (hit) return { kind: 'single_correct', detail: `got ${cats.join(',')} (expected ${truth.category})` };
  if (count === 0) return { kind: 'single_miss', detail: 'returned 0 bottles' };
  return { kind: 'single_wrong_category', detail: `got ${cats.join(',')} but expected ${truth.category}` };
}

async function scanImage(filepath) {
  const buf = fs.readFileSync(filepath);
  const b64 = buf.toString('base64');
  const start = Date.now();
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: b64 })
  });
  const ms = Date.now() - start;
  const data = await r.json().catch(() => null);
  return { status: r.status, ms, data };
}

(async () => {
  const files = Object.keys(GT);
  console.log('═'.repeat(70));
  console.log(`  ACCURACY TEST — ${files.length} images`);
  console.log(`  API: ${API}`);
  console.log('═'.repeat(70));

  const results = [];
  for (const f of files) {
    const filepath = path.join(IMG_DIR, f);
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠  ${f} — missing from disk`);
      continue;
    }
    const truth = GT[f];
    const { status, ms, data } = await scanImage(filepath);
    if (status !== 200) {
      console.log(`  💥 ${f} — HTTP ${status}`);
      results.push({ file: f, truth, kind: 'api_error' });
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const result = classify(f, truth, data);
    console.log(`  ${result.kind.startsWith('edge_correct') || result.kind.endsWith('_correct') || result.kind === 'shelf_pass' ? '✅' : '❌'} ${f.padEnd(28)} ${ms.toString().padStart(5)}ms — ${result.kind}`);
    results.push({ file: f, truth, kind: result.kind, detail: result.detail, ms });
    await new Promise(r => setTimeout(r, 1500));
  }

  // Scoring
  const single    = results.filter(r => r.truth.category && r.truth.category !== 'multi');
  const edge      = results.filter(r => r.truth.bottles === 0);
  const shelf     = results.filter(r => r.truth.category === 'multi');

  const singleCorrect = single.filter(r => r.kind === 'single_correct').length;
  const edgeCorrect   = edge.filter(r => r.kind === 'edge_correct').length;
  const shelfCorrect  = shelf.filter(r => r.kind === 'shelf_pass').length;

  const categoryAccuracy = single.length > 0 ? (singleCorrect / single.length * 100).toFixed(1) : 'N/A';
  const edgeAccuracy     = edge.length   > 0 ? (edgeCorrect / edge.length * 100).toFixed(1)     : 'N/A';
  const shelfAccuracy    = shelf.length  > 0 ? (shelfCorrect / shelf.length * 100).toFixed(1)   : 'N/A';

  console.log('');
  console.log('═'.repeat(70));
  console.log(`  CATEGORY ACCURACY: ${categoryAccuracy}% (${singleCorrect}/${single.length})  ← target ≥ 95%`);
  console.log(`  EDGE ACCURACY:     ${edgeAccuracy}% (${edgeCorrect}/${edge.length})  ← target 100%`);
  console.log(`  SHELF RECALL:      ${shelfAccuracy}% (${shelfCorrect}/${shelf.length})`);
  console.log('═'.repeat(70));

  // Per-category breakdown
  const byCat = {};
  for (const r of single) {
    const c = r.truth.category;
    if (!byCat[c]) byCat[c] = { total: 0, correct: 0 };
    byCat[c].total++;
    if (r.kind === 'single_correct') byCat[c].correct++;
  }
  console.log('  PER CATEGORY:');
  for (const [c, v] of Object.entries(byCat)) {
    const pct = (v.correct / v.total * 100).toFixed(0);
    console.log(`    ${c.padEnd(20)} ${v.correct}/${v.total} (${pct}%)`);
  }

  // Failures detail
  const failures = results.filter(r => !['single_correct','edge_correct','shelf_pass'].includes(r.kind));
  if (failures.length > 0) {
    console.log('');
    console.log('  FAILURES:');
    for (const f of failures) {
      console.log(`    ${f.file} [${f.kind}] ${f.detail || ''}`);
    }
  }

  const hit = Number(categoryAccuracy) >= 95 && Number(edgeAccuracy) === 100;
  process.exit(hit ? 0 : 1);
})();
```

**Step 2: Verify the script runs without error on a small subset**

Run: `node tests/accuracy-95.js`

Expected output: prints per-file lines + final CATEGORY ACCURACY %. Script may exit 1 if accuracy < 95% — that's expected at this point.

**Step 3: Commit**

```bash
git add tests/accuracy-95.js
git commit -m "feat: accuracy scoring runner for clean test set"
```

---

## Task 6: Measure Baseline Accuracy

**Files:** (none modified)

**Step 1: Run and record baseline**

```bash
node tests/accuracy-95.js > tests/clean-set/baseline.txt 2>&1
cat tests/clean-set/baseline.txt
```

**Step 2: Record starting numbers**

In `docs/plans/2026-04-18-95-percent-accuracy-impl.md`, add a section at the bottom:

```markdown
## Measured Results

### Baseline (before prompt changes)

- Category accuracy: __%
- Edge accuracy: __%
- Shelf recall: __%
- Weakest category: ___
```

**Step 3: Commit**

```bash
git add tests/clean-set/baseline.txt docs/plans/2026-04-18-95-percent-accuracy-impl.md
git commit -m "data: baseline accuracy measurement"
```

**Step 4: Decision gate**

- If category accuracy ≥ 95% → **skip Tasks 7-11**, go straight to Task 12 (final report)
- If 85-94% → proceed to Task 7
- If < 85% → **STOP**. Proceeding with prompt-only changes is unlikely to reach 95%. Escalate to user: recommend layering Approach A (flash for closeups) on top of this work.

---

## Task 7: Prompt Iteration 1 — Expand Brand Map

**Files:**
- Modify: `api/scan-bar.js` (lines ~45-56, the BRAND → CATEGORY CHEAT SHEET)

**Step 1: Identify weakest category from baseline**

From `baseline.txt`, find the category with the lowest accuracy. Common candidates: `cognac` (Hennessy confusion), `gin` (Bombay/Tanqueray mis-id), `vodka` (Grey Goose generic).

**Step 2: Add specific brand entries**

In `api/scan-bar.js`, expand the BRAND → CATEGORY CHEAT SHEET with explicit, disambiguating entries for the worst-performing brands. Replace the existing block (find with `grep -n "Absolut/Grey Goose" api/scan-bar.js`) with:

```
BRAND → CATEGORY CHEAT SHEET (memorize distinctive trade dress):
• Absolut (clear bottle, blue label) / Grey Goose (smoky etched glass, French eagle) / Smirnoff (silver label) / Belvedere (frosted tall) / Ketel One → vodka
• Bombay Sapphire (blue square bottle!) / Hendrick's (dark apothecary jar) / Tanqueray (green square with red seal) / Beefeater (yeoman illustration) / Gordon's (yellow label, boar) → gin
• Jack Daniel's (square black label "Old No. 7") / Jim Beam (white label) / Maker's Mark (red wax dip!) / Wild Turkey (turkey illustration) / Woodford Reserve (waxed stopper) → bourbon
• Johnnie Walker (square, walking man) / Glenfiddich (triangular green) / Macallan (tall amber, Highland) / Glenlivet / Chivas / Highland Park → scotch
• Bacardi (bat logo) / Havana Club (yellow label) / Captain Morgan white → rum; Captain Morgan dark/Kraken/Myers → rum_dark
• Don Julio (tall rounded) / Patron (etched bee symbol, stopper) / Jose Cuervo (amber) / Herradura / Casamigos → tequila
• Hennessy (CURVY AMBER BOTTLE, gold label with VS/XO/VSOP) / Rémy Martin (centaur) / Courvoisier → cognac — NEVER prosecco, NEVER wine
• Campari (bright red liquid, unmistakable) → campari
• Aperol (bright orange gradient) → aperol
• Kahlúa (dark brown, Aztec-style label) → kahlua
• Baileys (cream-colored, small round bottle, Irish lettering) → baileys
• Cointreau (orange square, red seal) → triple_sec
• Disaronno (angular square bottle, amber liquid, large label) → amaretto
• Jägermeister (dark green bottle, orange label, stag) / Fernet Branca (dark, medicinal) → fernet
• Chartreuse (distinctive green or yellow, tall narrow) → chartreuse
• Martini Rosso / Carpano Antica / Cinzano → sweet_vermouth
• Angostura (SMALL bottle with OVERSIZED yellow/red label) → bitters
• Monin / Torani / 1883 (tall clear bottle with fruit illustration) → syrup
```

**Step 3: Deploy**

```bash
git add api/scan-bar.js
git commit -m "prompt: expand brand→category cheat sheet with trade dress"
git push origin master
npx vercel --prod
```

Wait for "Aliased: https://cocktails-wiki.vercel.app" line.

**Step 4: Re-test**

```bash
node tests/accuracy-95.js > tests/clean-set/iter1.txt 2>&1
cat tests/clean-set/iter1.txt
```

**Step 5: Decide**

- If category accuracy lift ≥ +2% → keep change, continue to Task 8
- If lift < +2% → **revert** the prompt change:

  ```bash
  git revert HEAD --no-edit
  git push origin master
  npx vercel --prod
  ```

  Continue to Task 8 anyway (different lever).

**Step 6: Record result**

Append to the "Measured Results" section of this plan:

```markdown
### Iteration 1 — Expanded brand map
- Category accuracy: __% (delta: +__%)
- Kept / Reverted: ___
```

**Step 7: Commit results log**

```bash
git add tests/clean-set/iter1.txt docs/plans/2026-04-18-95-percent-accuracy-impl.md
git commit -m "data: iter1 accuracy measurement"
```

---

## Task 8: Prompt Iteration 2 — Confidence Calibration

**Files:**
- Modify: `api/scan-bar.js` (CONFIDENCE RULES section)

**Step 1: Tighten the confidence block**

In `api/scan-bar.js`, find the CONFIDENCE RULES block (grep for `CONFIDENCE RULES`). Replace with:

```
CONFIDENCE RULES (be decisive — this directly affects the UX):
• "high" — brand NAME is clearly readable on label (e.g. you can see "MACALLAN", "ABSOLUT", "HENNESSY"), or the trade dress is unmistakable (red Campari, blue Bombay Sapphire, black Jack Daniel's Old No. 7)
• "medium" — bottle shape + color + cap match a known brand, but label isn't fully readable
• "low" — ONLY when you're guessing from silhouette in a dim/blurry frame AND you are ≥ 60% confident
• If confidence would be below 60% → return 0 bottles for that entry, don't guess

You MUST prefer "high" over "medium" when the brand name is readable, even if partial. "Abs..." is enough for "high" on Absolut.
```

**Step 2: Deploy**

```bash
git add api/scan-bar.js
git commit -m "prompt: sharper confidence calibration rules"
git push origin master
npx vercel --prod
```

**Step 3: Re-test**

```bash
node tests/accuracy-95.js > tests/clean-set/iter2.txt 2>&1
cat tests/clean-set/iter2.txt
```

**Step 4: Decide + record**

Same logic as Task 7 Step 5. Keep or revert. Append results to plan. Commit.

---

## Task 9: Prompt Iteration 3 — Specific-Over-Generic Rule

**Files:**
- Modify: `api/scan-bar.js` (RULES section, rule 10)

**Step 1: Add specificity rule**

In `api/scan-bar.js`, find the RULES section and add rule 11:

```
11. SPECIFIC OVER GENERIC: Always try the most specific category first.
    • Never use generic "liqueur" if a specific category fits (campari, aperol, kahlua, baileys, chartreuse, fernet, benedictine, amaretto, creme_de_cacao, creme_de_menthe, etc.).
    • "liqueur" is a fallback for unidentified colored liqueurs only.
    • Similarly prefer "rum_dark" over "rum" when liquid is clearly brown, not clear.
```

**Step 2: Deploy, re-test, decide**

Repeat Task 7 steps 3-7 with filename `iter3.txt` and commit message `prompt: prefer specific categories over generic liqueur`.

---

## Task 10: Prompt Iteration 4 — Hennessy / Prosecco Hard Rule

**Files:**
- Modify: `api/scan-bar.js` (RULES section, rule 6 replacement)

**Step 1: Replace rule 6**

Currently rule 6 says something like "Hennessy cognac has a DISTINCTIVE curvy amber bottle...". Replace with a stronger version:

```
6. COGNAC vs PROSECCO HARD RULE: Any bottle that is
    (a) solid amber/brown liquid AND
    (b) has a rounded/curvy shape AND
    (c) has "VS", "VSOP", "XO", "Hennessy", "Rémy", or "Courvoisier" text, OR no visible wire cage
   is cognac. Prosecco ALWAYS has a visible wire cage or foil top and pale yellow liquid. Do NOT classify amber bottles as prosecco.
```

**Step 2: Deploy, re-test, decide**

Repeat Task 7 steps 3-7 with filename `iter4.txt` and message `prompt: hard rule for cognac vs prosecco disambiguation`.

---

## Task 11: Prompt Iteration 5 — Visual Cue Examples

**Files:**
- Modify: `api/scan-bar.js` (VISUAL IDENTIFICATION section)

**Step 1: Expand visual cues**

Only run this task if we're still below 95% after iterations 1-4. In `api/scan-bar.js`, expand the VISUAL IDENTIFICATION block with more specific tell-tales based on whichever categories are still failing in `iter4.txt`.

Example additions to investigate:
- "Patrón has a frosted glass bottle with a bee emblem and tall stopper"
- "Grey Goose has an etched eagle in flight on frosted glass"
- "Bombay Sapphire is unmistakable — BLUE glass square bottle"

Only add cues for categories still failing.

**Step 2: Deploy, re-test, decide**

Repeat Task 7 steps 3-7 with filename `iter5.txt` and message `prompt: targeted visual cues for remaining failure categories`.

**Step 3: Stop condition**

After iteration 5, stop iterating regardless of result. If we haven't hit 95%, proceed to Task 12 and escalate.

---

## Task 12: Final Report

**Files:**
- Modify: `docs/plans/2026-04-18-95-percent-accuracy-impl.md` (add Final Report section)

**Step 1: Write the report**

Append to the plan document:

```markdown
## Final Results

| Metric | Baseline | Final | Δ |
|---|---|---|---|
| Category accuracy | __% | __% | +__% |
| Edge accuracy | __% | __% | +__% |
| Shelf recall | __% | __% | +__% |
| Avg response time | __ms | __ms | +__ms |

### Per-category final accuracy
- cognac: __%
- scotch: __%
- bourbon: __%
- gin: __%
- vodka: __%
- ... (one line per category in ground truth)

### Surviving prompt changes (kept)
- Iter N: <description>
- ...

### Reverted (didn't help)
- Iter N: <description>
- ...

### Remaining failures
- <filename> — <root cause>
- ...

### Recommendation
- [x] 95% reached — no further action
- [ ] Below 95% — recommend Approach A (use gemini-2.5-flash for single-bottle closeups) or Approach B (two-pass verification)
```

**Step 2: Commit**

```bash
git add docs/plans/2026-04-18-95-percent-accuracy-impl.md
git commit -m "docs: final report on 95% accuracy work"
git push origin master
```

---

## Verification Checklist

Before declaring done:
- [ ] `tests/clean-set/ground-truth.json` has ≥ 40 verified entries
- [ ] Every image in `ground-truth.json` exists in `tests/clean-set/images/`
- [ ] `tests/accuracy-95.js` runs without errors on the full set
- [ ] Category accuracy ≥ 95% (or escalation report written explaining why not)
- [ ] Edge accuracy = 100%
- [ ] All changes deployed to production (`https://cocktails-wiki.vercel.app`)
- [ ] Final report in plan document

---

## Notes for Executor

- **Do not skip Task 4** (visual verification). The whole premise of this plan is that our current test data is bad. If you skip verification, you'll produce meaningless numbers.
- **Keep each prompt iteration isolated.** Don't bundle changes. If two changes are applied and accuracy goes up, you can't attribute the lift.
- **Revert ruthlessly.** Any change that doesn't lift accuracy by ≥2% gets reverted. The prompt gets worse, not better, from piled-up weak rules.
- **If 3 iterations in a row fail to lift**, stop early — you're plateau'd and more tweaks won't help.
