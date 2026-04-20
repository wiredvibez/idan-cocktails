/**
 * Lottie JSON animations for cocktail prep steps.
 * Hand-crafted minimal shapes — each ~1-2KB.
 * Color: gold (#D4B575) — matches site theme.
 *
 * Exposes window.LOTTIE_STEPS = { shake, stir, muddle, strain, pour }
 * and window.initLottieSteps() which finds all .step-icon[data-lottie]
 * elements in the DOM and mounts the matching animation.
 */

(function () {
  // Gold color in Lottie format (normalized 0-1 RGBA)
  const GOLD = [0.83, 0.71, 0.46, 1];

  // Common structural bits
  const baseMeta = (name) => ({
    v: "5.7.4", fr: 30, ip: 0, op: 60, w: 64, h: 64, nm: name, ddd: 0, assets: [],
    markers: []
  });

  // Helper: fill shape
  const fill = (color = GOLD, opacity = 100) => ({
    ty: "fl", c: { a: 0, k: color }, o: { a: 0, k: opacity }, r: 1,
    bm: 0, nm: "Fill", mn: "ADBE Vector Graphic - Fill", hd: false
  });

  // Helper: stroke
  const stroke = (color = GOLD, width = 2, opacity = 100) => ({
    ty: "st", c: { a: 0, k: color }, o: { a: 0, k: opacity },
    w: { a: 0, k: width }, lc: 2, lj: 2, ml: 1, bm: 0, nm: "Stroke", hd: false
  });

  // Helper: transform (identity by default)
  const xform = (overrides = {}) => ({
    ty: "tr",
    p: { a: 0, k: [0, 0] },
    a: { a: 0, k: [0, 0] },
    s: { a: 0, k: [100, 100] },
    r: { a: 0, k: 0 },
    o: { a: 0, k: 100 },
    sk: { a: 0, k: 0 },
    sa: { a: 0, k: 0 },
    nm: "Transform",
    ...overrides
  });

  // Helper: rect shape
  const rect = (size, pos = [0, 0], radius = 0) => ({
    ty: "rc",
    d: 1,
    s: { a: 0, k: size },
    p: { a: 0, k: pos },
    r: { a: 0, k: radius },
    nm: "Rectangle"
  });

  // Helper: ellipse shape
  const ellipse = (size, pos = [0, 0]) => ({
    ty: "el",
    d: 1,
    s: { a: 0, k: size },
    p: { a: 0, k: pos },
    nm: "Ellipse"
  });

  // Helper: group of shapes (for hierarchical transforms)
  const group = (items, name = "Group") => ({
    ty: "gr",
    it: items,
    nm: name
  });

  // Helper: build a shape layer with the given ks (transforms) and shapes
  const layer = (index, name, ks, shapes) => ({
    ddd: 0, ind: index, ty: 4, nm: name, sr: 1,
    ks, ao: 0, shapes,
    ip: 0, op: 60, st: 0, bm: 0
  });

  // ══════════════════════════════════════════
  //  1. SHAKE — shaker rotates left/right
  // ══════════════════════════════════════════
  const shake = {
    ...baseMeta("Shake"),
    layers: [
      layer(1, "Shaker",
        // Transforms: rotate back and forth around center
        {
          o: { a: 0, k: 100 },
          r: {
            a: 1,
            k: [
              { t: 0,  s: [0],   i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
              { t: 10, s: [-18], i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
              { t: 20, s: [0],   i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
              { t: 30, s: [18],  i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
              { t: 40, s: [0],   i: { x: [0.5], y: [1] }, o: { x: [0.5], y: [0] } },
              { t: 50, s: [-18] },
              { t: 60, s: [0] }
            ]
          },
          p: { a: 0, k: [32, 36] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          // Shaker body (tapered by using two rects stacked)
          rect([22, 8], [0, -14], 2),   // cap
          rect([28, 28], [0, 4], 4),    // body
          fill(GOLD)
        ]
      )
    ]
  };

  // ══════════════════════════════════════════
  //  2. STIR — spoon rotates in a glass
  // ══════════════════════════════════════════
  const stir = {
    ...baseMeta("Stir"),
    layers: [
      // Glass (static)
      layer(1, "Glass",
        {
          o: { a: 0, k: 60 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [32, 36] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          ellipse([34, 32]),
          stroke(GOLD, 2.5, 100)
        ]
      ),
      // Spoon (rotating)
      layer(2, "Spoon",
        {
          o: { a: 0, k: 100 },
          r: {
            a: 1,
            k: [
              { t: 0,  s: [0] },
              { t: 60, s: [360] }
            ]
          },
          p: { a: 0, k: [32, 36] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([2.5, 22], [0, -8], 1),      // handle
          ellipse([8, 6], [0, 6]),           // bowl
          fill(GOLD)
        ]
      )
    ]
  };

  // ══════════════════════════════════════════
  //  3. MUDDLE — muddler moves up & down
  // ══════════════════════════════════════════
  const muddle = {
    ...baseMeta("Muddle"),
    layers: [
      // Glass base (static)
      layer(1, "Glass",
        {
          o: { a: 0, k: 70 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [32, 44] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([28, 18], [0, 0], 3),
          stroke(GOLD, 2, 100)
        ]
      ),
      // Muddler (moves down-up)
      layer(2, "Muddler",
        {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: 0,  s: [32, 20],  i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } },
              { t: 15, s: [32, 34],  i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } },
              { t: 30, s: [32, 20],  i: { x: 0.5, y: 1 }, o: { x: 0.5, y: 0 } },
              { t: 45, s: [32, 34] },
              { t: 60, s: [32, 20] }
            ]
          },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([6, 22], [0, -4], 2),     // handle
          rect([10, 6], [0, 10], 2),     // head
          fill(GOLD)
        ]
      )
    ]
  };

  // ══════════════════════════════════════════
  //  4. STRAIN — drops fall through strainer
  // ══════════════════════════════════════════
  const strain = {
    ...baseMeta("Strain"),
    layers: [
      // Strainer body (static)
      layer(1, "Strainer",
        {
          o: { a: 0, k: 100 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [32, 24] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([30, 3], [0, -6], 1),      // top rim
          rect([4, 3], [-8, -2]),          // mesh dots row 1
          rect([4, 3], [0, -2]),
          rect([4, 3], [8, -2]),
          rect([4, 3], [-4, 3]),
          rect([4, 3], [4, 3]),
          fill(GOLD)
        ]
      ),
      // Falling drop 1
      layer(2, "Drop1",
        {
          o: {
            a: 1,
            k: [
              { t: 0,  s: [0] },
              { t: 5,  s: [100] },
              { t: 25, s: [100] },
              { t: 30, s: [0] },
              { t: 60, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: 0,  s: [26, 32], i: { x: 0.3, y: 1 }, o: { x: 0.7, y: 0 } },
              { t: 30, s: [26, 52] },
              { t: 60, s: [26, 52] }
            ]
          },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [ ellipse([4, 6]), fill(GOLD) ]
      ),
      // Falling drop 2 (offset)
      layer(3, "Drop2",
        {
          o: {
            a: 1,
            k: [
              { t: 0,  s: [0] },
              { t: 15, s: [0] },
              { t: 20, s: [100] },
              { t: 40, s: [100] },
              { t: 45, s: [0] },
              { t: 60, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: {
            a: 1,
            k: [
              { t: 15, s: [38, 32], i: { x: 0.3, y: 1 }, o: { x: 0.7, y: 0 } },
              { t: 45, s: [38, 52] },
              { t: 60, s: [38, 52] }
            ]
          },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [ ellipse([4, 6]), fill(GOLD) ]
      )
    ]
  };

  // ══════════════════════════════════════════
  //  5. POUR — bottle tilts and pours stream
  // ══════════════════════════════════════════
  const pour = {
    ...baseMeta("Pour"),
    layers: [
      // Bottle — tilts during pour
      layer(1, "Bottle",
        {
          o: { a: 0, k: 100 },
          r: {
            a: 1,
            k: [
              { t: 0,  s: [0],   i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
              { t: 15, s: [-55], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
              { t: 45, s: [-55], i: { x: [0.4], y: [1] }, o: { x: [0.6], y: [0] } },
              { t: 60, s: [0] }
            ]
          },
          p: { a: 0, k: [24, 28] },
          a: { a: 0, k: [0, 6] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([10, 12], [0, -14], 1),    // neck
          rect([18, 22], [0, 2], 3),      // body
          fill(GOLD)
        ]
      ),
      // Glass (static)
      layer(2, "Glass",
        {
          o: { a: 0, k: 70 },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [46, 46] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([18, 14], [0, 0], 2),
          stroke(GOLD, 2, 100)
        ]
      ),
      // Pouring stream
      layer(3, "Stream",
        {
          o: {
            a: 1,
            k: [
              { t: 0,  s: [0] },
              { t: 15, s: [0] },
              { t: 20, s: [100] },
              { t: 40, s: [100] },
              { t: 45, s: [0] },
              { t: 60, s: [0] }
            ]
          },
          r: { a: 0, k: 0 },
          p: { a: 0, k: [36, 34] },
          a: { a: 0, k: [0, 0] },
          s: { a: 0, k: [100, 100] }
        },
        [
          rect([2, 14]),
          fill(GOLD)
        ]
      )
    ]
  };

  window.LOTTIE_STEPS = { shake, stir, muddle, strain, pour };

  // Track already-mounted nodes (avoid double-mount when re-rendered)
  const mounted = new WeakSet();

  /**
   * Scan the DOM for any .step-icon[data-lottie] nodes that haven't
   * been initialized yet, and load the matching Lottie animation.
   * Safe to call multiple times.
   */
  window.initLottieSteps = function () {
    if (typeof window.lottie === "undefined") {
      // lottie-web not loaded yet — try again shortly
      setTimeout(window.initLottieSteps, 150);
      return;
    }
    const nodes = document.querySelectorAll(".step-icon[data-lottie]");
    nodes.forEach(node => {
      if (mounted.has(node)) return;
      const kind = node.dataset.lottie;
      const data = window.LOTTIE_STEPS[kind];
      if (!data) return;
      try {
        window.lottie.loadAnimation({
          container: node,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data
        });
        mounted.add(node);
      } catch (e) {
        console.warn("Lottie failed for", kind, e);
      }
    });
  };

  // Auto-init when DOM is ready (covers the initial render done
  // by the inline script before deferred scripts loaded).
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", window.initLottieSteps);
  } else {
    window.initLottieSteps();
  }
})();
