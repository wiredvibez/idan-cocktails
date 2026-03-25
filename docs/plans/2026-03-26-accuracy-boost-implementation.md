# Accuracy Boost Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Improve bottle detection accuracy ~30-40% via lean prompt, structured JSON output, auto-retry, and exact matcher.

**Architecture:** Client sends enhanced image to Vercel serverless API. API uses Gemini 2.5 Flash with a ~400-word prompt and `responseSchema` for guaranteed JSON. Client auto-retries with boosted enhancement if <3 bottles found. Matcher uses exact alias lookup instead of fuzzy `includes()`.

**Tech Stack:** Vanilla JS (client), Vercel Serverless Functions (API), Google Gemini 2.5 Flash (AI), Canvas API (image enhancement)

---

### Task 1: Replace Mega-Prompt with Lean Prompt + Structured Output

**Files:**
- Modify: `api/scan-bar.js` (lines 26-88 prompt, lines 103-122 generationConfig, lines 138-169 parsing)

**Step 1: Replace the prompt**

In `api/scan-bar.js`, replace the entire `geminiPrompt` variable (lines 26-88) with:

```javascript
  const geminiPrompt = `You are identifying alcohol bottles in a bar photo for a cocktail recipe matcher.

TASK: List every alcohol bottle visible. Return a JSON array.

VALID CATEGORIES (use these exact keys):
vodka, gin, bourbon, rye_whiskey, scotch, rum, rum_dark, tequila, mezcal, cognac, campari, aperol, kahlua, baileys, triple_sec, sweet_vermouth, amaretto, chartreuse, benedictine, maraschino, blue_curacao, galliano, fernet, absinthe, peach_schnapps, cherry_liqueur, chocolate_liqueur, creme_de_menthe, creme_de_cacao, licor43, bitters, orange_bitters, grenadine, prosecco, passoa, liqueur, syrup, simple_syrup, honey_syrup, agave_syrup, raspberry_syrup, orgeat

RULES:
1. Read label text first. Even partial text counts ("...olut" = Absolut = vodka).
2. If label is unreadable, identify by bottle shape, liquid color, and cap color.
3. Monin bottles (tall, colorful fruit illustration on label) = syrup. Specify the flavor in name_en (e.g. "Monin Elderflower Syrup").
4. IGNORE: water, soda, cola, juice cartons, fresh fruit, ice, salt, sugar, tonic water.
5. Count all bottles visible. If your list has fewer items than bottles you can see, look again for missed ones.
6. For dark or blurry images: look for faint label outlines, bottle silhouettes, reflections on glass, and cap colors.

CONFIDENCE:
- "high" = label text clearly readable
- "medium" = identified by bottle shape/color/brand recognition
- "low" = best guess from silhouette only

Each entry: {"name_en": "Brand + Type", "name_he": "Hebrew category name", "category": "category_key", "confidence": "high|medium|low"}`;
```

**Step 2: Replace generationConfig with structured output**

In `api/scan-bar.js`, replace the `generationConfig` block (lines 115-122) with:

```javascript
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4096,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              name_en: { type: "STRING" },
              name_he: { type: "STRING" },
              category: {
                type: "STRING",
                enum: [
                  "vodka", "gin", "bourbon", "rye_whiskey", "scotch",
                  "rum", "rum_dark", "tequila", "mezcal", "cognac",
                  "campari", "aperol", "kahlua", "baileys", "triple_sec",
                  "sweet_vermouth", "amaretto", "chartreuse", "benedictine",
                  "maraschino", "blue_curacao", "galliano", "fernet",
                  "absinthe", "peach_schnapps", "cherry_liqueur",
                  "chocolate_liqueur", "creme_de_menthe", "creme_de_cacao",
                  "licor43", "bitters", "orange_bitters", "grenadine",
                  "prosecco", "passoa", "liqueur", "syrup", "simple_syrup",
                  "honey_syrup", "agave_syrup", "raspberry_syrup", "orgeat"
                ]
              },
              confidence: {
                type: "STRING",
                enum: ["high", "medium", "low"]
              }
            },
            required: ["name_en", "name_he", "category", "confidence"]
          }
        }
      }
```

**Step 3: Simplify response parsing**

Replace lines 138-173 (the entire parsing block with markdown stripping and regex fallback) with:

```javascript
    const geminiData = await geminiRes.json();

    // With responseSchema, Gemini returns clean JSON directly
    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find(p => p.text);
    const textContent = textPart?.text;
    if (!textContent) {
      return res.status(200).json({ bottles: [] });
    }

    let bottles;
    try {
      bottles = JSON.parse(textContent);
    } catch (parseErr) {
      console.error('JSON parse failed despite schema:', textContent.substring(0, 200));
      return res.status(200).json({ bottles: [] });
    }

    if (!Array.isArray(bottles)) {
      return res.status(200).json({ bottles: [] });
    }

    return res.status(200).json({ bottles });
```

**Step 4: Verify the file looks correct**

Read `api/scan-bar.js` and confirm:
- Prompt is ~400 words (not 1,800)
- `thinkingConfig` is gone (incompatible with responseSchema)
- `responseMimeType` and `responseSchema` are present
- No markdown stripping code remains
- No regex `arrayMatch` fallback code remains

**Step 5: Commit**

```bash
git add api/scan-bar.js
git commit -m "refactor: lean prompt + structured JSON output for accuracy boost"
```

---

### Task 2: Fix Matcher — Exact Alias Lookup

**Files:**
- Modify: `js/matcher.js` (lines 94-115, the `matchIngredient` function)

**Step 1: Replace matchIngredient with exact lookup**

In `js/matcher.js`, replace lines 94-115 (the entire `matchIngredient` function) with:

```javascript
/**
 * Check if a bottle category matches a recipe ingredient name.
 * Uses exact alias lookup — no fuzzy substring matching.
 */
function matchIngredient(bottleCategory, recipeIngredientName) {
  const normBottle = normalize(bottleCategory);
  const normRecipe = normalize(recipeIngredientName);

  // Direct exact match
  if (normBottle === normRecipe) return true;

  // Find canonical group for the bottle
  let bottleCanonical = null;
  for (const [canonical, aliases] of Object.entries(INGREDIENT_ALIASES)) {
    if (normalize(canonical) === normBottle ||
        aliases.some(a => normalize(a) === normBottle)) {
      bottleCanonical = canonical;
      break;
    }
  }

  if (!bottleCanonical) return false;

  // Check if recipe ingredient is in the same canonical group
  const aliases = INGREDIENT_ALIASES[bottleCanonical];
  return normalize(bottleCanonical) === normRecipe ||
         aliases.some(a => normalize(a) === normRecipe);
}
```

**Step 2: Verify no `includes()` remains in matching logic**

Search `js/matcher.js` for any remaining `.includes(` in the matchIngredient function. There should be none — all matching is now `===` exact equality.

Note: `isGarnish()` on line 83 still uses `.includes()` and that's correct — garnish keywords are meant to be substring matches (e.g., "לקישוט" inside "נענע לקישוט").

**Step 3: Commit**

```bash
git add js/matcher.js
git commit -m "fix: exact alias lookup in matcher, remove fuzzy includes()"
```

---

### Task 3: Add Auto-Retry Logic in Scanner

**Files:**
- Modify: `js/scanner.js` (lines 32-33 constants, lines 61-134 enhancement, lines 241-286 scanBar function)

**Step 1: Add retry constants and boost enhancement function**

After line 33 (`const MAX_DIMENSION = 1920;`), add:

```javascript
const MAX_DIMENSION_RETRY = 2048;
const RETRY_THRESHOLD = 3; // retry if fewer bottles found
```

After the `enhanceForScanning` function (after line 134), add:

```javascript
/**
 * Apply extra boost enhancement for retry scans.
 * Takes an already-enhanced canvas and pushes brightness/contrast further.
 */
function boostEnhancement(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      let val = data[i + c];
      val += 30; // extra brightness
      val = ((val - 128) * 1.2) + 128; // extra contrast
      data[i + c] = Math.max(0, Math.min(255, Math.round(val)));
    }
  }
  ctx.putImageData(imageData, 0, 0);
}
```

**Step 2: Add retry image preparation function**

After the new `boostEnhancement` function, add:

```javascript
/**
 * Create a boosted retry image: higher resolution + stronger enhancement.
 */
function createRetryImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION_RETRY || height > MAX_DIMENSION_RETRY) {
          const ratio = Math.min(MAX_DIMENSION_RETRY / width, MAX_DIMENSION_RETRY / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        enhanceForScanning(canvas, ctx);
        boostEnhancement(canvas, ctx);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
```

**Step 3: Store original file reference for retry**

In the scanner state section (line 4-7), add a reference to store the original file:

After line 7 (`let manualIngredients = [];`), add:

```javascript
let currentFile = null; // store original file for retry
```

In the `handleFile` function (line 180), store the file. After line 180 (`function handleFile(file) {`), at the start of the function body after the validation checks (after line 188), add:

```javascript
  currentFile = file;
```

In the `resetToUpload` function (line 466), clear it. After line 469 (`manualIngredients = [];`), add:

```javascript
  currentFile = null;
```

**Step 4: Rewrite scanBar with auto-retry**

Replace the entire `scanBar` function (lines 241-286) with:

```javascript
async function scanBar() {
  if (!currentImageBase64) return;

  previewActions.style.display = 'none';
  scanOverlay.style.display = 'flex';
  loadingText.style.display = 'block';
  errorSection.style.display = 'none';
  resultsSection.style.display = 'none';

  try {
    // First scan — use the pre-enhanced image
    const firstResult = await callScanApi(enhancedImageBase64 || currentImageBase64);

    if (firstResult.length >= RETRY_THRESHOLD) {
      // Good result — show immediately
      identifiedBottles = firstResult;
    } else if (currentFile) {
      // Low result — auto-retry with boosted enhancement
      console.log(`First scan: ${firstResult.length} bottles. Retrying with boost...`);
      try {
        const boostedBase64 = await createRetryImage(currentFile);
        const retryResult = await callScanApi(boostedBase64);
        // Merge results: keep highest confidence per category
        identifiedBottles = mergeBottleResults(firstResult, retryResult);
        console.log(`Retry scan: ${retryResult.length} new. Merged: ${identifiedBottles.length} total.`);
      } catch (retryErr) {
        console.warn('Retry failed, using first result:', retryErr);
        identifiedBottles = firstResult;
      }
    } else {
      identifiedBottles = firstResult;
    }

    if (identifiedBottles.length === 0) {
      showError('לא הצלחנו לזהות בקבוקים. נסה תמונה ברורה יותר עם תאורה טובה');
      return;
    }

    scanOverlay.style.display = 'none';
    loadingText.style.display = 'none';
    renderResults();

  } catch (err) {
    console.error('Scan failed:', err);
    showError('משהו השתבש, נסה שוב');
  }
}

/**
 * Call the scan API with a base64 image. Returns bottles array.
 */
async function callScanApi(imageBase64) {
  const base64ForApi = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const response = await fetch('/api/scan-bar', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64ForApi })
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }

  return data.bottles || [];
}

/**
 * Merge two bottle result arrays. Keep highest confidence per category.
 * If same category appears in both, prefer: high > medium > low.
 */
function mergeBottleResults(first, second) {
  const confRank = { high: 3, medium: 2, low: 1 };
  const merged = new Map();

  for (const bottle of [...first, ...second]) {
    const key = bottle.category;
    const existing = merged.get(key);
    if (!existing || (confRank[bottle.confidence] || 0) > (confRank[existing.confidence] || 0)) {
      merged.set(key, bottle);
    }
  }

  return Array.from(merged.values());
}
```

**Step 5: Commit**

```bash
git add js/scanner.js
git commit -m "feat: add auto-retry with boosted enhancement when <3 bottles found"
```

---

### Task 4: Add Confidence Dots + Tappable Bottle Chips

**Files:**
- Modify: `bar-scanner.html` (lines 296-311, bottle chip CSS)
- Modify: `js/scanner.js` (renderResults function, lines 294-321)

**Step 1: Update bottle chip CSS in bar-scanner.html**

In `bar-scanner.html`, replace the `.bottle-conf` and `.conf-*` styles (lines 308-311) with:

```css
.bottle-conf{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.conf-high{background:#34d399;box-shadow:0 0 6px rgba(52,211,153,0.4)}
.conf-medium{background:#fbbf24;box-shadow:0 0 6px rgba(251,191,36,0.4)}
.conf-low{background:var(--zinc-600);position:relative}
.conf-low::after{content:'?';position:absolute;top:-1px;left:1px;font-size:7px;color:var(--zinc-400);font-weight:700}
.bottle-chip.excluded{opacity:0.3;text-decoration:line-through;border-style:dashed}
.bottle-chip{cursor:pointer;user-select:none}
.bottle-chip:hover{border-color:var(--gold-dim);background:rgba(200,169,110,0.08)}
```

**Step 2: Update renderResults to make bottle chips tappable**

In `js/scanner.js`, in the `renderResults` function, replace the `bottlesGrid.innerHTML` assignment (lines 298-310) with:

```javascript
  bottlesGrid.innerHTML = taggedBottles.map((b, i) => {
    const emoji = getSpiritEmoji(b.category);
    const usedClass = b.usedInRecipes ? 'bottle-used' : 'bottle-unused';
    const confClass = `conf-${b.confidence}`;
    return `<div class="bottle-chip ${usedClass}" data-index="${i}" onclick="toggleBottle(${i})">
      <span class="bottle-emoji">${emoji}</span>
      <div class="bottle-info">
        <span class="bottle-name-he">${b.name_he}</span>
        <span class="bottle-name-en">${b.name_en}</span>
      </div>
      <span class="bottle-conf ${confClass}"></span>
    </div>`;
  }).join('');
```

**Step 3: Add toggleBottle function**

At the end of `js/scanner.js` (before the last line), add:

```javascript
/**
 * Toggle a bottle on/off — excluded bottles don't count for matching.
 */
function toggleBottle(index) {
  const chip = document.querySelector(`.bottle-chip[data-index="${index}"]`);
  if (!chip) return;

  chip.classList.toggle('excluded');

  // Rebuild identifiedBottles to exclude toggled-off ones
  const activeBottles = identifiedBottles.filter((_, i) => {
    const el = document.querySelector(`.bottle-chip[data-index="${i}"]`);
    return el && !el.classList.contains('excluded');
  });

  // Re-run matching with only active bottles
  const { fullMatch, partialMatch } = findCocktailMatches(
    activeBottles, manualIngredients, cocktails
  );

  const fullSection = document.getElementById('full-match-section');
  const partialSection = document.getElementById('partial-match-section');
  const noMatchesMsg = document.getElementById('no-matches-msg');

  if (fullMatch.length > 0) {
    fullSection.style.display = 'block';
    document.getElementById('full-match-count').textContent =
      `אתה יכול להכין ${fullMatch.length} קוקטיילים!`;
    document.getElementById('full-match-grid').innerHTML =
      fullMatch.map((c, i) => cocktailCardHTML(c, i, 'full')).join('');
  } else {
    fullSection.style.display = 'none';
  }

  if (partialMatch.length > 0) {
    partialSection.style.display = 'block';
    document.getElementById('partial-match-grid').innerHTML =
      partialMatch.map((c, i) => cocktailCardHTML(c, i, 'partial')).join('');
  } else {
    partialSection.style.display = 'none';
  }

  noMatchesMsg.style.display =
    (fullMatch.length === 0 && partialMatch.length === 0) ? 'block' : 'none';
}
```

**Step 4: Commit**

```bash
git add bar-scanner.html js/scanner.js
git commit -m "feat: tappable bottle chips with confidence dots and exclude toggle"
```

---

### Task 5: Manual Test and Deploy

**Step 1: Deploy to Vercel**

```bash
cd C:\Users\Slowpoke\Documents\ClaudeAlex\cocktails-wiki
git push
```

Wait for Vercel deployment to complete.

**Step 2: Manual test checklist**

Open https://cocktails-wiki.vercel.app/bar-scanner.html and test:

1. Upload a clear bar photo → should get bottles with green/yellow dots
2. Upload a dark bar photo → should auto-retry (check console for "Retrying with boost...")
3. Click a bottle chip → should toggle "excluded" style and update cocktail matches
4. Upload a single bottle photo → should identify correctly (no false matches)
5. Check that cocktail cards still expand on click

**Step 3: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: post-deploy adjustments"
git push
```
