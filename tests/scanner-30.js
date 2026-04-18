/**
 * Scanner 30-Image Stress Test with Root-Cause Classification
 *
 * Sends 30 diverse bar/alcohol photos through /api/scan-bar.
 * For every failure, auto-classifies the failure mode:
 *   - API_ERROR         : HTTP 5xx/4xx
 *   - MODEL_MISS        : bottles expected, 0 returned
 *   - WRONG_CATEGORY    : expected specific category, got different
 *   - SLOW              : >30s response
 *   - LOW_CONF          : only "low" confidence when photo is clear
 *   - HALLUCINATION     : returned bottles from non-alcohol photo
 *
 * Usage: node tests/scanner-30.js
 */

const API = 'https://cocktails-wiki.vercel.app/api/scan-bar';

// ─── IMAGE SET (30) ─────────────────────────────────────────────────
// Each image has realistic expectations based on image type.
// Group A = single bottle (expect ≥1 with medium+ conf)
// Group B = bar shelf (expect ≥2)
// Group C = dim/challenging (expect ≥0 — relaxed)
// Group D = no bottles (expect 0)
// Group E = specialty brand (expect that specific category)

const IMAGES = [
  // Group A — Single bottle closeups
  { id: 1,  group: 'A', url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=800', desc: 'Macallan whisky', expectMin: 1, expectMaxLow: 1 },
  { id: 2,  group: 'A', url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=800', desc: 'Hennessy cognac', expectMin: 1 },
  { id: 3,  group: 'A', url: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=800', desc: 'Rum bottles', expectMin: 1 },
  { id: 4,  group: 'A', url: 'https://images.unsplash.com/photo-1527281400683-1aae777175f8?w=800', desc: 'Whiskey on wood bar', expectMin: 1 },
  { id: 5,  group: 'A', url: 'https://images.unsplash.com/photo-1586993451228-09818021e309?w=800', desc: 'Gin bottle', expectMin: 1 },
  { id: 6,  group: 'A', url: 'https://images.unsplash.com/photo-1607622750671-6cd9a99eabd1?w=800', desc: 'Vodka lineup', expectMin: 1 },
  { id: 7,  group: 'A', url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=800', desc: 'Whiskey closeup', expectMin: 1 },
  { id: 8,  group: 'A', url: 'https://images.unsplash.com/photo-1567696911980-2eed69a46042?w=800', desc: 'Campari red bottle', expectMin: 1 },
  { id: 9,  group: 'A', url: 'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?w=800', desc: 'Whiskey with cola glass', expectMin: 1 },
  { id: 10, group: 'A', url: 'https://images.unsplash.com/photo-1570598912132-0ba1dc952b7d?w=800', desc: 'Dark spirits single', expectMin: 1 },

  // Group B — Bar shelves (multiple bottles)
  { id: 11, group: 'B', url: 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=1000', desc: 'Liquor wall', expectMin: 3 },
  { id: 12, group: 'B', url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1000', desc: 'Backlit bar shelf', expectMin: 2 },
  { id: 13, group: 'B', url: 'https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=1000', desc: 'Cocktail bar shelves', expectMin: 2 },
  { id: 14, group: 'B', url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=1000', desc: 'Home bar collection', expectMin: 2 },
  { id: 15, group: 'B', url: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=1000', desc: 'Bar counter scene', expectMin: 1 },
  { id: 16, group: 'B', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1000', desc: 'Spirits behind bar', expectMin: 1 },
  { id: 17, group: 'B', url: 'https://images.unsplash.com/photo-1543007630-9710e4a00a20?w=1000', desc: 'Assorted liquor', expectMin: 2 },
  { id: 18, group: 'B', url: 'https://images.unsplash.com/photo-1597290282695-edc43d0e7129?w=1000', desc: 'Liquor store shelves', expectMin: 3 },

  // Group C — Dim/challenging photos
  { id: 19, group: 'C', url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=800', desc: 'Dark cocktail bar', expectMin: 0 },
  { id: 20, group: 'C', url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800', desc: 'Moody bar lighting', expectMin: 0 },
  { id: 21, group: 'C', url: 'https://images.unsplash.com/photo-1546171753-97d7676e4602?w=800', desc: 'Dimly lit spirits', expectMin: 0 },
  { id: 22, group: 'C', url: 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800', desc: 'Dim bar atmosphere', expectMin: 0 },
  { id: 23, group: 'C', url: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=800', desc: 'Nightclub bar dark', expectMin: 0 },
  { id: 24, group: 'C', url: 'https://images.unsplash.com/photo-1583898350903-99fa829dad3a?w=800', desc: 'Bar counter many bottles', expectMin: 1 },

  // Group D — No bottles (edge cases)
  { id: 25, group: 'D', url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800', desc: 'Food plate (no alcohol)', expectMin: 0, expectMax: 0 },
  { id: 26, group: 'D', url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800', desc: 'Coffee cup (no alcohol)', expectMin: 0, expectMax: 0 },
  { id: 27, group: 'D', url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=800', desc: 'Restaurant interior', expectMin: 0, expectMax: 1 },

  // Group E — Specialty brand recognition
  { id: 28, group: 'E', url: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800', desc: 'Aperol spritz scene', expectMin: 1, expectCategory: 'aperol' },
  { id: 29, group: 'E', url: 'https://images.unsplash.com/photo-1609951651556-5334e2706168?w=800', desc: 'Baileys Irish Cream', expectMin: 1, expectCategory: 'baileys' },
  { id: 30, group: 'E', url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=800', desc: 'Beer bottles (wine/beer=0 expected)', expectMin: 0, expectMax: 0 },
];

// ─── HELPERS ────────────────────────────────────────────────────────

async function fetchImage(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} fetching image`);
  const buf = await r.arrayBuffer();
  return Buffer.from(buf).toString('base64');
}

async function callApi(b64) {
  const start = Date.now();
  const r = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: b64 })
  });
  const ms = Date.now() - start;
  const text = await r.text();
  let data = null;
  try { data = JSON.parse(text); } catch {}
  return { status: r.status, ms, data, text };
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// ─── FAILURE CLASSIFIER ─────────────────────────────────────────────

function classify(img, result) {
  const { status, ms, data } = result;

  if (status >= 400) {
    return { kind: 'API_ERROR', detail: `HTTP ${status}` };
  }
  if (ms > 30000) {
    return { kind: 'SLOW', detail: `${ms}ms (>30s)` };
  }

  const bottles = data?.bottles || [];
  const count = bottles.length;

  // Edge case: no bottles expected
  if (img.expectMax === 0 && count > 0) {
    return { kind: 'HALLUCINATION', detail: `${count} bottles returned from no-alcohol photo: ${bottles.map(b=>b.category).slice(0,3).join(',')}` };
  }
  if (img.expectMax !== undefined && count > img.expectMax) {
    return { kind: 'HALLUCINATION', detail: `${count} > max ${img.expectMax}` };
  }

  // Bottles expected but none found
  if (count < img.expectMin) {
    return { kind: 'MODEL_MISS', detail: `expected ≥${img.expectMin}, got ${count}` };
  }

  // Specific category expected
  if (img.expectCategory && count > 0) {
    const cats = bottles.map(b => b.category);
    if (!cats.includes(img.expectCategory)) {
      return { kind: 'WRONG_CATEGORY', detail: `expected "${img.expectCategory}", got: ${cats.slice(0,3).join(',')}` };
    }
  }

  // Low confidence only (for group A, we expect at least some medium+ signal)
  if (img.group === 'A' && count >= 1) {
    const hasMediumOrHigh = bottles.some(b => b.confidence === 'high' || b.confidence === 'medium');
    if (!hasMediumOrHigh) {
      return { kind: 'LOW_CONF', detail: `all ${count} bottles "low" confidence on single-bottle photo` };
    }
  }

  return null; // PASS
}

// ─── MAIN ────────────────────────────────────────────────────────────

async function run() {
  console.log('═'.repeat(75));
  console.log(`  SCANNER 30-IMAGE STRESS TEST`);
  console.log(`  API: ${API}`);
  console.log(`  ${new Date().toISOString()}`);
  console.log('═'.repeat(75));

  const results = [];
  const failures = [];
  const timings = [];
  let fetchErrors = 0;

  for (let i = 0; i < IMAGES.length; i++) {
    const img = IMAGES[i];
    const tag = `[${String(img.id).padStart(2,'0')}/30 ${img.group}]`;
    process.stdout.write(`  ${tag} ${img.desc.padEnd(38)} `);

    let b64;
    try {
      b64 = await fetchImage(img.url);
    } catch (e) {
      console.log(`⚠️  fetch: ${e.message.substring(0, 40)}`);
      fetchErrors++;
      results.push({ ...img, result: 'FETCH_ERROR', detail: e.message });
      await sleep(500);
      continue;
    }

    let apiResult;
    try {
      apiResult = await callApi(b64);
    } catch (e) {
      console.log(`💥 ${e.message.substring(0, 40)}`);
      results.push({ ...img, result: 'NETWORK_ERROR', detail: e.message });
      await sleep(2000);
      continue;
    }

    timings.push(apiResult.ms);
    const bottles = apiResult.data?.bottles || [];
    const fail = classify(img, apiResult);
    const confs = bottles.map(b => (b.confidence || '?')[0]).join('');
    const cats = bottles.map(b => b.category);

    if (fail) {
      console.log(`❌ ${fail.kind.padEnd(15)} ${apiResult.ms}ms ${fail.detail}`);
      failures.push({ ...img, ...fail, count: bottles.length, categories: cats, confidences: bottles.map(b => b.confidence), ms: apiResult.ms });
      results.push({ ...img, result: 'FAIL', kind: fail.kind, detail: fail.detail });
    } else {
      console.log(`✅ ${bottles.length} bottles [${confs||'-'}] ${apiResult.ms}ms`);
      results.push({ ...img, result: 'PASS', count: bottles.length, ms: apiResult.ms });
    }

    // Rate limit — don't hammer API
    await sleep(1500);
  }

  // ─── REPORT ────────────────────────────────────────────────────────
  console.log('');
  console.log('═'.repeat(75));
  console.log('  SUMMARY');
  console.log('═'.repeat(75));

  const pass = results.filter(r => r.result === 'PASS').length;
  const fail = failures.length;
  const total = IMAGES.length - fetchErrors;
  const pct = total > 0 ? Math.round(pass / total * 100) : 0;

  console.log(`  Tested:   ${total}/${IMAGES.length} images (${fetchErrors} fetch errors excluded)`);
  console.log(`  Passed:   ${pass}  (${pct}%)`);
  console.log(`  Failed:   ${fail}  (${100 - pct}%)`);
  console.log('');

  // By group
  console.log('  ─ BY GROUP ─');
  for (const g of ['A','B','C','D','E']) {
    const grp = results.filter(r => r.group === g && r.result !== 'FETCH_ERROR');
    const p = grp.filter(r => r.result === 'PASS').length;
    const labels = { A: 'Single bottle closeups', B: 'Bar shelves', C: 'Dim/challenging', D: 'No-bottle edge cases', E: 'Specialty brands' };
    const pctG = grp.length > 0 ? Math.round(p / grp.length * 100) : 0;
    const bar = '█'.repeat(Math.round(pctG/5)) + '░'.repeat(20 - Math.round(pctG/5));
    console.log(`    ${g}. ${labels[g].padEnd(25)} ${bar} ${pctG}% (${p}/${grp.length})`);
  }
  console.log('');

  // Timing
  if (timings.length > 0) {
    const avg = Math.round(timings.reduce((a,b)=>a+b,0)/timings.length);
    const max = Math.max(...timings);
    const min = Math.min(...timings);
    console.log(`  ─ TIMING ─`);
    console.log(`    avg: ${avg}ms, min: ${min}ms, max: ${max}ms`);
    const slow = timings.filter(t => t > 15000).length;
    if (slow > 0) console.log(`    ${slow} responses >15s`);
    console.log('');
  }

  // Root cause classification
  console.log('  ─ FAILURE ROOT CAUSES ─');
  const kinds = {};
  for (const f of failures) {
    kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  }
  for (const [k, v] of Object.entries(kinds)) {
    console.log(`    ${k.padEnd(18)} × ${v}`);
  }
  if (failures.length === 0) console.log('    (no failures)');
  console.log('');

  if (failures.length > 0) {
    console.log('  ─ FAILURE DETAILS ─');
    for (const f of failures) {
      console.log(`    [#${String(f.id).padStart(2,'0')} ${f.group}] ${f.desc}`);
      console.log(`        ROOT: ${f.kind} — ${f.detail}`);
      if (f.categories?.length) {
        console.log(`        Detected: ${f.categories.join(', ')} [${f.confidences.join(',')}]`);
      }
    }
    console.log('');
  }

  // ─── ROOT CAUSE ANALYSIS ──────────────────────────────────────────
  console.log('═'.repeat(75));
  console.log('  ROOT CAUSE ANALYSIS (systematic-debugging Phase 2)');
  console.log('═'.repeat(75));

  if (failures.length === 0) {
    console.log('  No failures detected. Scanner performing well.');
    process.exitCode = 0;
    return;
  }

  // Dominant failure mode
  const dominant = Object.entries(kinds).sort((a,b) => b[1]-a[1])[0];
  console.log(`  DOMINANT FAILURE: ${dominant[0]} (${dominant[1]}/${failures.length})`);
  console.log('');

  const analysis = {
    MODEL_MISS: 'Gemini Vision returned 0 bottles when bottles were visible.\n' +
                '    → Possible causes: image too small/blurry, model not recognizing unusual bottles,\n' +
                '      prompt not instructing "detect any bottles you can see."',
    WRONG_CATEGORY: 'Gemini identified bottle but mapped to wrong category.\n' +
                    '    → Possible causes: shape/color confusion, brand→category mapping in prompt\n' +
                    '      incomplete, or specific brand (e.g. Hennessy) being read as something else.',
    API_ERROR: 'Server returned 4xx/5xx. Infrastructure issue.\n' +
               '    → Possible causes: Gemini API down, rate limit, model deprecated, Vercel timeout.',
    SLOW: 'Response >30s. Performance issue.\n' +
          '    → Possible causes: cold start, large image, Gemini thinking budget too high.',
    LOW_CONF: 'Model returned only "low" confidence on clear photos.\n' +
              '    → Possible causes: prompt not rewarding recognized labels as "high", image\n' +
              '      enhancement washing out labels.',
    HALLUCINATION: 'Model returned bottles from images with no alcohol.\n' +
                   '    → Possible causes: prompt saying "NEVER return empty array if bottles visible"\n' +
                   '      pushes model to invent bottles, especially in dim/ambiguous photos.',
  };

  for (const k of Object.keys(kinds)) {
    console.log(`  ${k}: ${analysis[k] || '(no analysis available)'}`);
    console.log('');
  }

  process.exitCode = fail > 0 ? 1 : 0;
}

run().catch(err => {
  console.error('Runner crashed:', err);
  process.exit(2);
});
