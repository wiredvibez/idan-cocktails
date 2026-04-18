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
