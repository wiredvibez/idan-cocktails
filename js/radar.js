// Mixologist's Radar — Find nearby stores for cocktail ingredients

const NEARBY_API = '/api/nearby-stores';

const STORE_ICONS = {
  liquor_store: '🍷',
  supermarket: '🛒',
  convenience_store: '🏪'
};

// Estimated Israeli market prices (₪) for cocktail ingredients
const INGREDIENT_PRICES = {
  // Spirits (750ml bottles)
  'ג\'ין': 90, 'gin': 90, 'vodka': 85, 'וודקה': 85,
  'בורבון': 120, 'bourbon': 120, 'וויסקי ריי': 130, 'rye whiskey': 130,
  'סקוטש': 150, 'scotch': 150, 'רום': 80, 'rum': 80, 'רום כהה': 85,
  'טקילה': 110, 'tequila': 110, 'מזקל': 140, 'mezcal': 140,
  'קוניאק': 160, 'cognac': 160, 'אבסינת': 130,
  // Liqueurs
  'קמפרי': 85, 'campari': 85, 'אפרול': 80, 'aperol': 80,
  'קהלואה': 75, 'kahlua': 75, 'בייליס': 70, 'baileys': 70,
  'קואנטרו': 80, 'triple sec': 60, 'טריפל סק': 60,
  'אמרטו': 70, 'דיסארונו': 70, 'שארטרז': 140,
  'ורמוט מתוק': 55, 'sweet vermouth': 55, 'ורמוט יבש': 55,
  'מרשקינו': 90, 'בנדיקטין': 110, 'גליאנו': 95,
  'בלו קוראסאו': 55, 'פרנה': 80, 'פסואה': 65,
  'ליקר אפרסק': 50, 'ליקר דובדבן': 50, 'ליקר שוקולד': 55,
  'קרם דה מנט': 50, 'קרם דה קקאו': 50, 'ליקור 43': 85,
  // Bitters & syrups
  'אנגוסטורה ביטרס': 45, 'ביטרס': 45, 'ביטרס תפוז': 50,
  'גרנדין': 25, 'סירופ פשוט': 15, 'סירופ': 20,
  'דבש': 15, 'אורגיט': 35, 'סירופ פטל': 25, 'אגבה': 20,
  // Mixers & fresh
  'פרוסקו': 40, 'prosecco': 40, 'סודה': 5,
  'לימון': 3, 'ליים': 5, 'מיץ ליים': 8, 'מיץ לימון': 8,
  'מיץ תפוזים': 10, 'מיץ אננס': 12, 'מיץ חמוציות': 15,
  'קוביית סוכר': 5, 'סוכר': 5,
  'ביצה': 3, 'לבן ביצה': 3,
  'שמנת': 10, 'חלב קוקוס': 12,
  'אספרסו': 8, 'קפה': 8,
  'גלידת וניל': 15,
  'מים': 0, 'קרח': 0,
  // Peychaud's, etc
  'ביטרס פישו': 55,
  'אבסינת (שטיפה)': 5, // tiny amount
};

// Price multipliers by store type
const PRICE_MULTIPLIER = {
  liquor_store: 0.95,      // Liquor stores: slightly cheaper for alcohol
  supermarket: 1.0,         // Baseline
  convenience_store: 1.25   // AM:PM etc: ~25% markup
};

// Estimate basket cost for ingredients at a given store type
function estimateBasketCost(ingredients, storeType) {
  let total = 0;
  const multiplier = PRICE_MULTIPLIER[storeType] || 1.0;
  for (const ing of ingredients) {
    const name = ing.item?.toLowerCase() || '';
    let price = 0;
    // Try exact match first
    for (const [key, val] of Object.entries(INGREDIENT_PRICES)) {
      if (name === key.toLowerCase() || name.includes(key.toLowerCase()) || key.toLowerCase().includes(name)) {
        price = val;
        break;
      }
    }
    // Default: small cost for unknown ingredients (garnishes, etc)
    if (price === 0) price = 5;
    total += price;
  }
  return Math.round(total * multiplier);
}

// Get user's current position
function getUserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('הדפדפן לא תומך בזיהוי מיקום'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      err => {
        if (err.code === 1) reject(new Error('גישה למיקום נדחתה. אנא אשר גישה למיקום'));
        else if (err.code === 2) reject(new Error('לא ניתן לזהות מיקום'));
        else reject(new Error('שגיאה בזיהוי מיקום'));
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

// Fetch nearby stores from API
async function fetchNearbyStores(lat, lng) {
  const res = await fetch(NEARBY_API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat, lng })
  });
  if (!res.ok) throw new Error('שגיאה בחיפוש חנויות');
  const data = await res.json();
  return data.stores || [];
}

// Format distance for display
function formatDistance(meters) {
  if (!meters) return '';
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

// Generate star rating HTML
function starsHTML(rating) {
  if (!rating) return '';
  const full = Math.floor(rating);
  const half = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty) + ` ${rating}`;
}

// Build the shopping list text from a cocktail's ingredients
function buildShoppingList(cocktailName, ingredients) {
  let text = `🍸 ${cocktailName}\n\n🛒 רשימת קניות:\n`;
  ingredients.forEach(ing => {
    text += `• ${ing.item} — ${ing.amount}\n`;
  });
  return text;
}

// Share via WhatsApp
function shareWhatsApp(cocktailName, ingredients) {
  const text = buildShoppingList(cocktailName, ingredients);
  const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}

// Copy shopping list to clipboard
async function copyShoppingList(cocktailName, ingredients, btn) {
  const text = buildShoppingList(cocktailName, ingredients);
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = '✓ הועתק!';
    setTimeout(() => btn.textContent = orig, 2000);
  } catch {
    // Fallback for older browsers
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.textContent;
    btn.textContent = '✓ הועתק!';
    setTimeout(() => btn.textContent = orig, 2000);
  }
}

// Render store results inside a container
function renderStores(stores, container, ingredients) {
  if (stores.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px; color:#a1a1aa;">
        לא נמצאו חנויות קרובות (1.5 ק"מ)
      </div>`;
    return;
  }

  container.innerHTML = stores.map(store => {
    const cost = ingredients ? estimateBasketCost(ingredients, store.storeType) : null;
    return `
    <div class="radar-store">
      <div class="radar-store-header">
        <span class="radar-store-icon">${STORE_ICONS[store.storeType] || '📍'}</span>
        <div class="radar-store-info">
          <div class="radar-store-name">${store.name}</div>
          <div class="radar-store-meta">
            ${store.distance ? `<span class="radar-distance">${formatDistance(store.distance)}</span>` : ''}
            ${store.rating ? `<span class="radar-rating">${starsHTML(store.rating)}</span>` : ''}
            ${store.isOpen !== null ? `<span class="radar-status ${store.isOpen ? 'open' : 'closed'}">${store.isOpen ? 'פתוח' : 'סגור'}</span>` : ''}
          </div>
        </div>
        <div class="radar-store-actions">
          ${cost ? `<span class="radar-cost">~₪${cost}</span>` : ''}
          ${store.mapsUrl ? `<a href="${store.mapsUrl}" target="_blank" rel="noopener" class="radar-nav-btn">נווט →</a>` : ''}
        </div>
      </div>
    </div>`;
  }).join('');
}

// Main: handle "Find Nearby" button click
async function findNearbyStores(btn, cocktailName, ingredients) {
  const card = btn.closest('.card') || btn.closest('.cocktail-card');
  let container = card?.querySelector('.radar-results');

  // Toggle off if already showing
  if (container && container.style.display !== 'none') {
    container.style.display = 'none';
    btn.classList.remove('active');
    return;
  }

  // Create container if first time
  if (!container) {
    container = document.createElement('div');
    container.className = 'radar-results';
    btn.parentElement.insertAdjacentElement('afterend', container);
  }

  container.style.display = 'block';
  btn.classList.add('active');

  // Loading state
  container.innerHTML = `
    <div style="text-align:center; padding:16px;">
      <div class="radar-loading"></div>
      <div style="color:#C8A96E; margin-top:8px;">מחפש חנויות קרובות...</div>
    </div>`;

  try {
    const { lat, lng } = await getUserLocation();
    const stores = await fetchNearbyStores(lat, lng);
    renderStores(stores, container, ingredients);

    // Add shopping list buttons
    const actionsDiv = document.createElement('div');
    actionsDiv.className = 'radar-actions';
    actionsDiv.innerHTML = `
      <button class="radar-action-btn radar-copy-btn" onclick="copyShoppingList('${cocktailName.replace(/'/g, "\\'")}', ${JSON.stringify(ingredients).replace(/"/g, '&quot;')}, this)">
        📋 העתק רשימת קניות
      </button>
      <button class="radar-action-btn radar-whatsapp-btn" onclick="shareWhatsApp('${cocktailName.replace(/'/g, "\\'")}', ${JSON.stringify(ingredients).replace(/"/g, '&quot;')})">
        📱 שלח בוואטסאפ
      </button>
    `;
    container.appendChild(actionsDiv);

  } catch (err) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px; color:#F87171;">
        ${err.message}
      </div>`;
  }
}
