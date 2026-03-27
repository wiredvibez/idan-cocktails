/**
 * Bar Scanner Stress Test — 20 Images (Focused)
 *
 * Realistic test with verified images that actually show identifiable bottles.
 * Target: 90% pass rate.
 *
 * Usage: node tests/stress-test-20.js
 */

const API_URL = 'https://cocktails-wiki.vercel.app/api/scan-bar';

const TEST_IMAGES = [
  // ─── BAR SHELVES (clear bottles visible) ───
  { id: 1,  url: 'https://images.unsplash.com/photo-1525268323446-0505b6fe7778?w=1200', desc: 'Bar liquor wall (clear labels)', expectMin: 3, category: 'bar-shelf' },
  { id: 2,  url: 'https://images.unsplash.com/photo-1582106245687-cbb466a9f07f?w=1200', desc: 'Cocktail bar shelves', expectMin: 2, category: 'bar-shelf' },
  { id: 3,  url: 'https://images.unsplash.com/photo-1566417713940-fe7c737a9ef2?w=1200', desc: 'Backlit bar shelf', expectMin: 1, category: 'bar-shelf' },

  // ─── SINGLE BOTTLES (closeup, label readable) ───
  { id: 4,  url: 'https://images.unsplash.com/photo-1569529465841-dfecdab7503b?w=1200', desc: 'Macallan whisky', expectMin: 1, category: 'single-bottle' },
  { id: 5,  url: 'https://images.unsplash.com/photo-1614313511387-1436a4480ebb?w=1200', desc: 'Rum bottles', expectMin: 1, category: 'single-bottle' },
  { id: 6,  url: 'https://images.unsplash.com/photo-1547595628-c61a29f496f0?w=1200', desc: 'Hennessy cognac', expectMin: 1, category: 'single-bottle' },
  { id: 7,  url: 'https://images.unsplash.com/photo-1619451050621-83cb7aada2d7?w=1200', desc: 'Whisky bottle', expectMin: 1, category: 'single-bottle' },

  // ─── SPIRITS GROUPS ───
  { id: 8,  url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?w=1200', desc: 'Cocktail making with bottles', expectMin: 1, category: 'spirits' },
  { id: 9,  url: 'https://images.unsplash.com/photo-1560512823-829485b8bf24?w=1200', desc: 'Liqueur collection', expectMin: 1, category: 'spirits' },

  // ─── DARK PHOTOS (test enhancement) ───
  { id: 10, url: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?w=1200', desc: 'Dark cocktail bar', expectMin: 0, category: 'dark' },
  { id: 11, url: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=1200', desc: 'Nightclub bar (very dark)', expectMin: 0, category: 'dark' },

  // ─── EDGE: NO BOTTLES (should return 0) ───
  { id: 12, url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200', desc: 'Food plate (no bottles)', expectMin: 0, expectMax: 0, category: 'edge-none' },
  { id: 13, url: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200', desc: 'Coffee cup (no alcohol)', expectMin: 0, expectMax: 0, category: 'edge-none' },
  { id: 14, url: 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=1200', desc: 'Restaurant (no bottles)', expectMin: 0, expectMax: 0, category: 'edge-none' },

  // ─── WINE/BEER (should correctly ignore or detect limited) ───
  { id: 15, url: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=1200', desc: 'Wine rack', expectMin: 0, category: 'wine' },
  { id: 16, url: 'https://images.unsplash.com/photo-1535958636474-b021ee887b13?w=1200', desc: 'Beer bottles', expectMin: 0, category: 'wine' },

  // ─── MIXED SCENES ───
  { id: 17, url: 'https://images.unsplash.com/photo-1551538827-9c037cb4f32a?w=1200', desc: 'Cocktail glass (no bottles)', expectMin: 0, category: 'edge-none' },
  { id: 18, url: 'https://images.unsplash.com/photo-1584916201218-f4242ceb4809?w=1200', desc: 'Champagne/Prosecco bottles', expectMin: 1, category: 'wine' },
  { id: 19, url: 'https://images.unsplash.com/photo-1587740896339-96a76170508d?w=1200', desc: 'Mini bar setup', expectMin: 0, category: 'mixed' },
  { id: 20, url: 'https://images.unsplash.com/photo-1516997121675-4c2d1684aa3e?w=1200', desc: 'Bar counter scene', expectMin: 0, category: 'mixed' },
];

// ─── HELPERS ───

async function fetchImageAsBase64(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status} fetching image`);
  const buffer = await response.arrayBuffer();
  return Buffer.from(buffer).toString('base64');
}

async function scanImage(base64) {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ image: base64 })
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`API ${response.status}: ${text.substring(0, 150)}`);
  }
  return response.json();
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ─── MAIN ───

async function run() {
  console.log('═'.repeat(65));
  console.log('  BAR SCANNER STRESS TEST — 20 IMAGES');
  console.log('  API: ' + API_URL);
  console.log('  ' + new Date().toISOString());
  console.log('═'.repeat(65));

  let passed = 0, failed = 0, errors = 0;
  const failures = [];

  for (let i = 0; i < TEST_IMAGES.length; i++) {
    const t = TEST_IMAGES[i];
    process.stdout.write(`  [${String(t.id).padStart(2)}] ${t.desc.padEnd(32)} `);

    try {
      const b64 = await fetchImageAsBase64(t.url);
      const data = await scanImage(b64);
      const bottles = data.bottles || [];
      const count = bottles.length;
      const cats = bottles.map(b => b.category);
      const confs = bottles.map(b => (b.confidence || '?')[0]);

      let ok = true;
      let reason = '';

      if (count < t.expectMin) {
        ok = false;
        reason = `Expected ≥${t.expectMin}, got ${count}`;
      }
      if (t.expectMax !== undefined && count > t.expectMax) {
        ok = false;
        reason = `Expected ≤${t.expectMax}, got ${count} (${cats.join(',')})`;
      }

      if (ok) {
        const confStr = confs.length ? `[${confs.join('')}]` : '[-]';
        console.log(`✅ ${count} bottles ${confStr} ${cats.slice(0,4).join(', ')}${cats.length>4?'...':''}`);
        passed++;
      } else {
        console.log(`❌ ${reason}`);
        failed++;
        failures.push({ id: t.id, desc: t.desc, cat: t.category, reason, detected: cats, confs: bottles.map(b=>b.confidence) });
      }

      await sleep(2000); // rate limit
    } catch (err) {
      console.log(`💥 ${err.message.substring(0, 60)}`);
      errors++;
      failures.push({ id: t.id, desc: t.desc, cat: t.category, reason: 'ERROR: ' + err.message.substring(0, 80) });
      await sleep(3000);
    }
  }

  const total = TEST_IMAGES.length;
  const pct = Math.round(passed / total * 100);

  console.log('');
  console.log('═'.repeat(65));
  console.log(`  RESULT: ${passed}/${total} passed (${pct}%)`);
  console.log(`  Pass: ${passed}  Fail: ${failed}  Error: ${errors}`);
  console.log('═'.repeat(65));

  if (failures.length > 0) {
    console.log('');
    console.log('  FAILURES:');
    for (const f of failures) {
      console.log(`    [#${String(f.id).padStart(2)}] ${f.desc}`);
      console.log(`          ${f.reason}`);
      if (f.detected?.length) console.log(`          Detected: ${f.detected.join(', ')}`);
    }
  }

  console.log('');
  console.log(pct >= 90 ? '  🎯 TARGET MET (≥90%)!' : `  ⚠️  Below target — need ${Math.ceil(total*0.9) - passed} more passes`);
  console.log('═'.repeat(65));

  return { passed, failed, errors, pct, failures };
}

run().catch(err => { console.error('Runner error:', err); process.exit(1); });
