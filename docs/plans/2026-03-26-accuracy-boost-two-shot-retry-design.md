# Accuracy Boost — Two-Shot with Auto-Retry

**Date:** 2026-03-26
**Priority:** Improve bottle detection accuracy across all failure modes
**Expected Impact:** ~30-40% accuracy improvement

## Problem

The current scanner has 3 failure modes:
1. Dark/dim photos — Canvas enhancement helps but isn't enough
2. Crowded bars with 15+ bottles — AI misses small/hidden bottles
3. Misidentification — AI confuses similar bottle categories (scotch vs bourbon)

Root causes:
- Mega-prompt (1,800 words) causes focus dilution
- No retry strategy — 0 bottles = dead end
- Fuzzy matcher (`includes()`) causes false positive cocktail matches
- JSON parsing is fragile (3-layer fallback)

## Solution: 4-Part Accuracy Upgrade

### Part 1: Lean Prompt (~400 words)

Replace the 1,800-word mega-prompt with a focused ~400-word version:
- Category list (all valid keys)
- 5 numbered rules (read labels, use shape, Monin = syrup, ignore non-alcohol, count bottles)
- Confidence definitions (high/medium/low)
- Output format (JSON array)

Remove: 5-pass verification theater, 13 silhouette rules, 40+ brand mappings, Master Recipe List header formatting. The AI processes everything at once anyway — sequential pass instructions waste tokens.

### Part 2: Structured Output (responseSchema)

Use Gemini's `responseMimeType: "application/json"` with `responseSchema` to guarantee valid JSON:
- Category field constrained to enum of valid keys
- Confidence constrained to enum ["high", "medium", "low"]
- Required fields: name_en, name_he, category, confidence
- Reduce maxOutputTokens from 16384 to 4096

This eliminates: markdown fence stripping, regex JSON extraction, all 3 fallback parsing layers.

### Part 3: Auto-Retry Logic (Client-Side)

After first scan, check results:
- 0 bottles → auto-retry with stronger enhancement
- 1-2 bottles → auto-retry (suspicious for bar photo)
- Any "low" confidence → auto-retry with hint

On retry:
- Canvas enhancement boosted: extra +30 brightness, +1.2x contrast
- Image sent at 2048px (up from 1920px)
- Prompt appended: "Previous scan found only N bottles. Look more carefully."
- Results merged: keep highest confidence per category, deduplicate by category key

Retry is client-side (`scanner.js`). Server processes each request independently.

### Part 4: Fix Matcher (Exact Alias Lookup)

Replace fuzzy `includes()` matching with exact dictionary lookup:
- Find bottle's canonical group by exact match against alias list
- Check if recipe ingredient exists in the same canonical group
- No more substring matching ("rum" won't match "forum")

## Files to Change

| File | Changes |
|------|---------|
| `api/scan-bar.js` | Replace prompt (1800→400 words), add responseSchema, remove JSON fallback parsing, remove thinkingConfig |
| `js/scanner.js` | Add auto-retry logic in scanBar(), stronger enhancement on retry, merge duplicate bottles |
| `js/matcher.js` | Replace matchIngredient() with exact alias lookup, remove includes() |
| `bar-scanner.html` | Confidence dot CSS (green/yellow/gray), tappable bottle chips to exclude |

## Settings Changes

```javascript
generationConfig: {
  temperature: 0.1,
  maxOutputTokens: 4096,
  responseMimeType: "application/json",
  responseSchema: { /* category enum + confidence enum */ }
}
```

Note: `thinkingConfig` removed — structured output mode is incompatible with thinking mode in Gemini 2.5 Flash. The structured schema provides better results than thinking budget for JSON generation.

## Retry Flow

```
User uploads photo
  → Canvas enhance (existing)
  → First scan (lean prompt + schema)
  → Results: N bottles

  IF N < 3:
    → Boost enhancement (+30 brightness, +1.2x contrast)
    → Resize to 2048px
    → Second scan (retry prompt)
    → Merge: first + second results, deduplicate by category
    → Show combined results

  ELSE:
    → Show results directly
```

## UI Changes

- Bottle chips: green dot (high), yellow dot (medium), gray "?" (low confidence)
- Tappable chips: click to exclude bottle from matching
- Retry is silent — user sees one loading animation, results appear when complete
