# Path to 95% Scanner Category Accuracy — Design

## Goal
Reach **95% category accuracy** on the AI bar scanner (`/api/scan-bar`). "Category accuracy" means: of every bottle the scanner detects, 95%+ must be assigned to the correct category (e.g. Hennessy → `cognac`, not `prosecco`).

## Approach (chosen)
**Approach C: Clean Test Set + Prompt Engineering.** No model changes, no infrastructure changes. Cheapest and lowest-risk path. If this plateaus below 95%, Approaches A (stronger model on closeups) or B (two-pass verification) can be layered on top later.

## Why Approach C
The current "52%" pass rate on `tests/scanner-30.js` is misleading — 10+ of the 29 tested images are labeled as bottle photos but actually show cocktails, glasses, or beer taps. We do not know the real baseline. A clean test set is the prerequisite for any accuracy work.

## Plan

### Phase 1: Build Clean Test Set (~30 min)

Source 50 images from three buckets:

| Count | Source | What we get |
|---|---|---|
| 20 | Wikimedia bottle product photos | Verified specific brands: Hennessy, Macallan, Campari, Aperol, Baileys, Kahlúa, Cointreau, Jack Daniel's, Bombay, Tanqueray, Bacardi, Jägermeister, Absolut, Smirnoff, Martini Rosso, Disaronno, Chartreuse, Fernet Branca, Patron, Grey Goose |
| 15 | Curated Unsplash bar shelves | Multi-bottle scenes, manually inspected before inclusion |
| 15 | Edge cases (no bottles) | Food, coffee, cocktails in glasses, wine glasses — correct answer is `[]` |

Every image is saved to `tests/clean-set/` and visually verified before inclusion. Ground-truth annotations go in `tests/clean-set/ground-truth.json`:

```json
{
  "hennessy-vs.jpg": { "category": "cognac", "bottles": 1, "brand": "Hennessy VS" },
  "campari.jpg":     { "category": "campari", "bottles": 1, "brand": "Campari" },
  "food-plate.jpg":  { "category": null, "bottles": 0 }
}
```

Any image where the content doesn't match the label is rejected.

### Phase 2: Measure True Baseline (~5 min)

New test runner `tests/accuracy-95.js` that:
- Iterates `ground-truth.json`
- Calls `/api/scan-bar` for each image
- Scores each result against ground truth
- Reports: overall category accuracy, per-brand accuracy, hallucination rate

This gives us the real starting number.

### Phase 3: Iterative Prompt Tuning (30-60 min)

Targeted prompt changes tested against the clean set. Keep each change only if it moves category accuracy by ≥ +2%:

1. **Expand brand map** — specific entries for Patron Silver, Grey Goose, Tanqueray variants, Martini Rosso. Replace vague "liqueur" defaults with specific categories where possible.
2. **Hennessy disambiguation** — stronger language explaining VS/XO/VSOP markings are cognac, never prosecco.
3. **Confidence calibration** — *"If brand label is readable, use 'high'. Don't default to 'low'."*
4. **"Liqueur" fallback last** — *"Only use generic 'liqueur' if no specific category fits. Try specific categories first."*

Maximum 5 iteration cycles. After each cycle, re-run `accuracy-95.js`, compare.

### Phase 4: Final Report

- Final accuracy number on clean set
- Per-category breakdown (cognac X%, whiskey Y%, etc.)
- Remaining systematic failures with root-cause notes
- If 95% reached → done
- If 92-94% reached → minor gap, probably brand-specific edge cases
- If ≤ 92% → recommend layering Approach A (stronger model for closeups) on top

## Success Criteria

1. **Category accuracy ≥ 95%** on the 50-image clean set
2. **Hallucination rate = 0** on the 15 edge-case images (must return `[]`)
3. **Average response time ≤ 3s**
4. No increase in error rate or 5xx responses

## Out of Scope (explicitly not doing)

- No model switch (staying on `gemini-2.5-flash-lite`)
- No two-pass verification architecture
- No image downscaling changes
- No client-side changes
- No changes to the matcher or recipe data

## Timeline

| Phase | Duration |
|---|---|
| 1. Build clean set | ~30 min |
| 2. Baseline | ~5 min |
| 3. Iterate prompts | 30-60 min |
| 4. Report | ~10 min |
| **Total** | **~90 min** |

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Real baseline is already > 95% | Medium | Declare victory, document the clean set for future regression testing |
| Baseline is < 85% | Low | Stop, recommend Approach A or B instead of continuing to iterate prompts |
| 3 prompt changes in a row give no lift | Medium | Stop iterating, report current best, suggest model upgrade |
| Wikimedia/Unsplash image URLs 404 | Low | Have 10% extra candidates on hand |
| Scoring misclassifies valid alternate categories (e.g. `scotch` vs `whiskey`) | Medium | Make ground truth accept a **set** of valid categories per image |

## Related Files

- `api/scan-bar.js` — the prompt being tuned
- `tests/clean-set/` (new) — verified images + ground truth
- `tests/accuracy-95.js` (new) — scoring runner
- `docs/plans/2026-04-18-95-percent-accuracy-design.md` — this document
