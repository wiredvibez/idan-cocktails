// ─────────────────────────────────────────────────
// SCANNER STATE
// ─────────────────────────────────────────────────
let currentImageBase64 = null;
let identifiedBottles = [];
let manualIngredients = [];

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

// ─────────────────────────────────────────────────
// IMAGE HANDLING
// ─────────────────────────────────────────────────

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
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);
        resolve(base64);
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

  resizeAndConvert(file).then(base64 => {
    currentImageBase64 = base64;
    previewImg.src = base64;
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
    const base64ForApi = currentImageBase64.replace(/^data:image\/\w+;base64,/, '');

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

    identifiedBottles = data.bottles || [];

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

scanBtn.addEventListener('click', scanBar);

// ─────────────────────────────────────────────────
// RESULTS RENDERING
// ─────────────────────────────────────────────────

function renderResults() {
  const taggedBottles = tagBottlesUsage(identifiedBottles, cocktails);

  const bottlesGrid = document.getElementById('bottles-grid');
  bottlesGrid.innerHTML = taggedBottles.map(b => {
    const emoji = getSpiritEmoji(b.category);
    const usedClass = b.usedInRecipes ? 'bottle-used' : 'bottle-unused';
    const confClass = `conf-${b.confidence}`;
    return `<div class="bottle-chip ${usedClass}">
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
  identifiedBottles = [];
  manualIngredients = [];
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
