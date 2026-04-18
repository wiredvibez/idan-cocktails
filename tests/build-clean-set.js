// @ts-check
/**
 * Fetches candidate images from sources.json, saves them to
 * tests/clean-set/images/<slug>.jpg, skipping any that 404.
 *
 * Does NOT populate ground-truth.json — that happens in Task 4
 * after the human visually inspects each saved image.
 */

const fs = require('fs');
const path = require('path');

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
