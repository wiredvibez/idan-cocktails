// ─────────────────────────────────────────────────
// SCANNER STATE
// ─────────────────────────────────────────────────
let currentImageBase64 = null;
let enhancedImageBase64 = null;
let identifiedBottles = [];
let manualIngredients = [];
let currentFile = null; // store original file for retry

// ─────────────────────────────────────────────────
// DOM REFS
// ─────────────────────────────────────────────────
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const cameraInput = document.getElementById('camera-input');
const cameraBtn = document.getElementById('camera-btn');
const previewSection = document.getElementById('preview-section');
const previewImg = document.getElementById('preview-img');
const scanBtn = document.getElementById('scan-btn');
const changeBtn = document.getElementById('change-btn');
const scanOverlay = document.getElementById('scan-overlay');
const loadingText = document.getElementById('loading-text');
const previewActions = document.getElementById('preview-actions');
const resultsSection = document.getElementById('results-section');
const errorSection = document.getElementById('error-section');
const errorMessage = document.getElementById('error-message');
const retryBtn = document.getElementById('retry-btn');
const scanAgainBtn = document.getElementById('scan-again-btn');
const manualInput = document.getElementById('manual-input');
const manualAddBtn = document.getElementById('manual-add-btn');
const manualTags = document.getElementById('manual-tags');

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_DIMENSION = 1920;
const MAX_DIMENSION_RETRY = 2048;
const RETRY_THRESHOLD = 3; // retry if fewer bottles found

// ─────────────────────────────────────────────────
// IMAGE HANDLING
// ─────────────────────────────────────────────────

/**
 * Measure average brightness of a canvas (0-255).
 * Samples every 10th pixel for speed.
 */
function measureBrightness(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  let totalLuminance = 0;
  let count = 0;
  for (let i = 0; i < data.length; i += 40) { // every 10th pixel (4 channels * 10)
    const r = data[i], g = data[i + 1], b = data[i + 2];
    totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
    count++;
  }
  return totalLuminance / count;
}

/**
 * Enhance a dark/medium image for better AI scanning.
 * Applies brightness, contrast, gamma correction, and sharpening.
 * Modifies the canvas in-place.
 */
function enhanceForScanning(canvas, ctx) {
  const width = canvas.width;
  const height = canvas.height;
  const avgBrightness = measureBrightness(ctx, width, height);

  let brightnessBoost = 0;
  let contrastFactor = 1.0;
  let gammaCorrection = 1.0;

  if (avgBrightness < 80) {
    // Very dark — aggressive enhancement
    brightnessBoost = 60;
    contrastFactor = 1.5;
    gammaCorrection = 0.6;
  } else if (avgBrightness < 120) {
    // Dark — moderate enhancement
    brightnessBoost = 40;
    contrastFactor = 1.3;
    gammaCorrection = 0.75;
  } else if (avgBrightness < 160) {
    // Medium — light touch
    brightnessBoost = 15;
    contrastFactor = 1.15;
    gammaCorrection = 0.9;
  } else {
    // Bright — only sharpen, no brightness change
    gammaCorrection = 1.0;
  }

  // Apply brightness, contrast, and gamma
  if (brightnessBoost > 0 || contrastFactor !== 1.0 || gammaCorrection !== 1.0) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let val = data[i + c];
        // Gamma correction (brightens shadows without blowing highlights)
        val = 255 * Math.pow(val / 255, gammaCorrection);
        // Brightness
        val += brightnessBoost;
        // Contrast (around midpoint 128)
        val = ((val - 128) * contrastFactor) + 128;
        data[i + c] = Math.max(0, Math.min(255, Math.round(val)));
      }
    }
    ctx.putImageData(imageData, 0, 0);
  }

  // Apply mild sharpen using unsharp mask technique
  // Draw slightly blurred version, then blend with original
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = width;
  tempCanvas.height = height;
  const tempCtx = tempCanvas.getContext('2d');
  tempCtx.drawImage(canvas, 0, 0);

  // Apply sharpening via contrast with a slightly blurred copy
  ctx.globalAlpha = 0.3;
  ctx.filter = 'blur(1px)';
  ctx.globalCompositeOperation = 'difference';
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = 'none';
  ctx.globalAlpha = 1.0;

  // Simpler approach: use CSS filter-based sharpening
  // Reset and use contrast boost for perceived sharpness
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = 'contrast(1.05) saturate(1.1)';
  ctx.globalAlpha = 0.5;
  ctx.drawImage(tempCanvas, 0, 0);
  ctx.filter = 'none';
  ctx.globalAlpha = 1.0;
}

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

/**
 * Resize, convert, and produce two versions:
 * - original base64 for user preview
 * - enhanced base64 for AI scanning
 */
function resizeAndConvert(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        // Original for preview
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const originalBase64 = canvas.toDataURL('image/jpeg', 0.85);

        // Enhanced for AI scanning
        const scanCanvas = document.createElement('canvas');
        scanCanvas.width = width;
        scanCanvas.height = height;
        const scanCtx = scanCanvas.getContext('2d');
        scanCtx.drawImage(img, 0, 0, width, height);
        enhanceForScanning(scanCanvas, scanCtx);
        const enhancedBase64 = scanCanvas.toDataURL('image/jpeg', 0.85);

        resolve({ original: originalBase64, enhanced: enhancedBase64 });
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function handleFile(file) {
  if (!file || !file.type.startsWith('image/')) {
    showError('אנא בחר קובץ תמונה (JPG, PNG, WebP, HEIC)');
    return;
  }
  if (file.size > MAX_FILE_SIZE) {
    showError('הקובץ גדול מדי. מקסימום 10MB');
    return;
  }

  currentFile = file;
  resizeAndConvert(file).then(({ original, enhanced }) => {
    currentImageBase64 = original;
    enhancedImageBase64 = enhanced;
    previewImg.src = original;
    uploadZone.style.display = 'none';
    previewSection.style.display = 'block';
    previewActions.style.display = 'flex';
    scanOverlay.style.display = 'none';
    loadingText.style.display = 'none';
    resultsSection.style.display = 'none';
    errorSection.style.display = 'none';
  }).catch(() => {
    showError('לא ניתן לקרוא את התמונה. נסה תמונה אחרת');
  });
}

// ─────────────────────────────────────────────────
// UPLOAD ZONE EVENTS
// ─────────────────────────────────────────────────

uploadZone.addEventListener('click', () => fileInput.click());
cameraBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  cameraInput.click();
});

fileInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});
cameraInput.addEventListener('change', (e) => {
  if (e.target.files[0]) handleFile(e.target.files[0]);
});

// Drag and drop
uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('drag-over');
});
uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('drag-over');
});
uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
});

// ─────────────────────────────────────────────────
// SCAN ACTION
// ─────────────────────────────────────────────────

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

scanBtn.addEventListener('click', scanBar);

// ─────────────────────────────────────────────────
// RESULTS RENDERING
// ─────────────────────────────────────────────────

function renderResults() {
  const taggedBottles = tagBottlesUsage(identifiedBottles, cocktails);

  const bottlesGrid = document.getElementById('bottles-grid');
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

  const suggestions = document.getElementById('ingredient-suggestions');
  suggestions.innerHTML = getAllIngredientNames()
    .map(name => `<option value="${name}">`)
    .join('');

  updateMatches();

  resultsSection.style.display = 'block';
  resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateMatches() {
  const { fullMatch, partialMatch } = findCocktailMatches(
    identifiedBottles, manualIngredients, cocktails
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

function cocktailCardHTML(c, index, matchType) {
  // Map cocktails-wiki categories to Hebrew names and colors
  const catMap = {
    strong: { name: 'חזק ומר', color: '#ef4444' },
    sweet: { name: 'מתוק וקרמי', color: '#fbbf24' },
    sour: { name: 'חמוץ ומרענן', color: '#34d399' },
    fruity: { name: 'פירותי וטרופי', color: '#a78bfa' }
  };
  const catInfo = catMap[c.category] || { name: c.category, color: '#C8A96E' };
  const diffLabel = { easy: 'קל', medium: 'בינוני', hard: 'מאתגר' }[c.difficulty] || c.difficulty;
  const imageUrl = cocktailImages[c.name] || '';

  let badgeHTML = '';
  if (matchType === 'full') {
    badgeHTML = '<span class="match-badge match-full">\u2713 כל המרכיבים</span>';
  } else if (matchType === 'partial' && c.missing.length > 0) {
    badgeHTML = `<span class="match-badge match-partial">חסר: ${c.missing[0]}</span>`;
  }

  return `
  <article class="scanner-card" onclick="this.classList.toggle('expanded')" style="animation-delay:${index * 30}ms">
    <div class="scanner-card-img-wrap">
      ${imageUrl ? `<img src="${imageUrl}" alt="${c.name}" class="scanner-card-img" loading="lazy">` : '<div class="scanner-card-img-placeholder"></div>'}
      ${badgeHTML}
    </div>
    <div class="scanner-card-body">
      <div class="scanner-card-meta">
        <span style="color:${catInfo.color};font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em">${catInfo.name}</span>
        <span style="font-size:10px;color:var(--zinc-500)">${diffLabel}</span>
      </div>
      <h3 class="scanner-card-name">${c.name}</h3>
      <p class="scanner-card-desc" dir="rtl">${c.desc}</p>
      <div class="scanner-card-ingredients">
        ${c.ingredients.map(ig => `<span class="ingredient-tag">${ig.item}</span>`).join('')}
      </div>
      <div class="scanner-card-recipe">
        <div class="recipe-title">מרכיבים</div>
        <ul class="recipe-list">
          ${c.ingredients.map(ig => `<li><span>${ig.item}</span><span class="recipe-amount">${ig.amount}</span></li>`).join('')}
        </ul>
        <div class="recipe-title">הכנה</div>
        <ol class="recipe-steps">
          ${c.steps.map(s => `<li>${s}</li>`).join('')}
        </ol>
      </div>
      <svg class="card-chevron" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
  </article>`;
}

function getSpiritEmoji(category) {
  const map = {
    vodka: '🍸', gin: '🫒', rum: '🍹', rum_white: '🍹', rum_dark: '🍹',
    tequila: '🌵', bourbon: '🥃', whiskey: '🥃', scotch: '🥃',
    rye_whiskey: '🥃', cognac: '🍷', mezcal: '🌵',
    campari: '🔴', aperol: '🟠', kahlua: '☕', baileys: '🥛',
    triple_sec: '🍊', sweet_vermouth: '🍷', prosecco: '🥂',
    bitters: '💧', beer: '🍺', wine: '🍷'
  };
  return map[category] || '🍾';
}

// ─────────────────────────────────────────────────
// MANUAL INGREDIENT ADD
// ─────────────────────────────────────────────────

function addManualIngredient() {
  const value = manualInput.value.trim();
  if (!value || manualIngredients.includes(value)) return;

  manualIngredients.push(value);
  manualInput.value = '';
  renderManualTags();
  updateMatches();
}

function removeManualIngredient(name) {
  manualIngredients = manualIngredients.filter(i => i !== name);
  renderManualTags();
  updateMatches();
}

function renderManualTags() {
  manualTags.innerHTML = manualIngredients.map(name =>
    `<span class="manual-tag">
      ${name}
      <button class="manual-tag-remove" onclick="removeManualIngredient('${name.replace(/'/g, "\\'")}')">✕</button>
    </span>`
  ).join('');
}

manualAddBtn.addEventListener('click', addManualIngredient);
manualInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addManualIngredient();
});

// ─────────────────────────────────────────────────
// NAVIGATION & RESET
// ─────────────────────────────────────────────────

changeBtn.addEventListener('click', resetToUpload);
scanAgainBtn.addEventListener('click', resetToUpload);
retryBtn.addEventListener('click', () => {
  errorSection.style.display = 'none';
  if (currentImageBase64) {
    previewSection.style.display = 'block';
    previewActions.style.display = 'flex';
  } else {
    resetToUpload();
  }
});

function resetToUpload() {
  currentImageBase64 = null;
  enhancedImageBase64 = null;
  identifiedBottles = [];
  manualIngredients = [];
  currentFile = null;
  fileInput.value = '';
  cameraInput.value = '';
  uploadZone.style.display = 'flex';
  previewSection.style.display = 'none';
  resultsSection.style.display = 'none';
  errorSection.style.display = 'none';
  scanOverlay.style.display = 'none';
  loadingText.style.display = 'none';
  manualTags.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showError(message) {
  scanOverlay.style.display = 'none';
  loadingText.style.display = 'none';
  previewActions.style.display = 'none';
  errorSection.style.display = 'block';
  errorMessage.textContent = message;
}

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
