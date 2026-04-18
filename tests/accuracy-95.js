/**
 * Scores scanner accuracy against tests/clean-set/ground-truth.json.
 *
 * Metrics:
 *   - Category accuracy: single-bottle photos, did scanner return right category?
 *   - Hallucination rate: edge cases, did scanner correctly return []?
 *   - Shelf recall: bar-shelf photos, did scanner meet min_bottles?
 *
 * Exit 0 if category ≥95% AND hallucination = 100% (0 false positives).
 *
 * Usage: node tests/accuracy-95.js
 */
// @ts-check
const fs = require('fs');
const path = require('path');

const API = process.env.API_URL || 'https://cocktails-wiki.vercel.app/api/scan-bar';
const GT  = JSON.parse(fs.readFileSync('tests/clean-set/ground-truth.json', 'utf8'));
const IMG_DIR = 'tests/clean-set/images';

function classify(truth, apiResult) {
  const bottles = apiResult?.bottles || [];
  const count = bottles.length;

  if (truth.bottles === 0) {
    if (count === 0) return { kind: 'edge_correct', detail: 'returned []' };
    return { kind: 'edge_hallucination', detail: `${count} fakes: ${bottles.map(b=>b.category).join(',')}` };
  }

  if (truth.category === 'multi') {
    if (count >= (truth.min_bottles || 1)) return { kind: 'shelf_pass', detail: `${count} ≥ ${truth.min_bottles}` };
    return { kind: 'shelf_underreport', detail: `${count} < ${truth.min_bottles}` };
  }

  const cats = bottles.map(b => b.category);
  const acceptable = new Set([truth.category, ...(truth.alt_categories || [])]);
  const hit = cats.some(c => acceptable.has(c));
  if (hit) return { kind: 'single_correct', detail: `got ${cats.join(',')}` };
  if (count === 0) return { kind: 'single_miss', detail: 'returned 0' };
  return { kind: 'single_wrong_category', detail: `got ${cats.join(',')} expected ${truth.category}` };
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

function ok(kind) { return ['single_correct','edge_correct','shelf_pass'].includes(kind); }

(async () => {
  const files = Object.keys(GT);
  console.log('═'.repeat(72));
  console.log(`  ACCURACY TEST — ${files.length} images`);
  console.log(`  API: ${API}`);
  console.log('═'.repeat(72));

  const results = [];
  for (const f of files) {
    const filepath = path.join(IMG_DIR, f);
    if (!fs.existsSync(filepath)) {
      console.log(`  ⚠  ${f} — missing on disk`);
      continue;
    }
    const truth = GT[f];
    const { status, ms, data } = await scanImage(filepath);
    if (status !== 200) {
      console.log(`  💥 ${f.padEnd(28)} HTTP ${status}`);
      results.push({ file: f, truth, kind: 'api_error', ms });
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }
    const r = classify(truth, data);
    const icon = ok(r.kind) ? '✅' : '❌';
    console.log(`  ${icon} ${f.padEnd(28)} ${String(ms).padStart(5)}ms  ${r.kind.padEnd(22)} ${r.detail}`);
    results.push({ file: f, truth, kind: r.kind, detail: r.detail, ms });
    await new Promise(r => setTimeout(r, 1500));
  }

  const single = results.filter(r => r.truth.category && r.truth.category !== 'multi');
  const edge   = results.filter(r => r.truth.bottles === 0);
  const shelf  = results.filter(r => r.truth.category === 'multi');

  const singleCorrect = single.filter(r => r.kind === 'single_correct').length;
  const edgeCorrect   = edge.filter(r => r.kind === 'edge_correct').length;
  const shelfCorrect  = shelf.filter(r => r.kind === 'shelf_pass').length;

  const catPct = single.length > 0 ? (singleCorrect / single.length * 100).toFixed(1) : 'N/A';
  const edgePct = edge.length > 0 ? (edgeCorrect / edge.length * 100).toFixed(1) : 'N/A';
  const shelfPct = shelf.length > 0 ? (shelfCorrect / shelf.length * 100).toFixed(1) : 'N/A';

  console.log('');
  console.log('═'.repeat(72));
  console.log(`  CATEGORY ACCURACY:  ${catPct}%  (${singleCorrect}/${single.length})   target ≥ 95%`);
  console.log(`  HALLUCINATION-FREE: ${edgePct}%  (${edgeCorrect}/${edge.length})   target 100%`);
  console.log(`  SHELF RECALL:       ${shelfPct}%  (${shelfCorrect}/${shelf.length})   target ≥ 90%`);
  console.log('═'.repeat(72));

  const failures = results.filter(r => !ok(r.kind));
  if (failures.length > 0) {
    console.log('\n  FAILURES:');
    for (const f of failures) {
      console.log(`    ${f.file.padEnd(28)} [${f.kind}] ${f.detail || ''}`);
    }
  }

  const avgMs = results.length > 0 ? Math.round(results.reduce((s,r)=>s+(r.ms||0),0) / results.length) : 0;
  console.log(`\n  Average response: ${avgMs}ms`);

  const hit = Number(catPct) >= 95 && Number(edgePct) === 100;
  process.exit(hit ? 0 : 1);
})();
