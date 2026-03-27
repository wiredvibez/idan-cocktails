// Mixologist's Radar — Find nearby stores for cocktail ingredients

const NEARBY_API = '/api/nearby-stores';

const STORE_ICONS = {
  liquor_store: '🍷',
  supermarket: '🛒',
  convenience_store: '🏪'
};

// Israeli market prices (₪) based on real Shufersal/Victory/Cheapersal data (2026)
// Baseline = Shufersal/Victory average price for 700ml bottles
const INGREDIENT_PRICES = {
  // Spirits (700ml bottles — real supermarket prices)
  'ג\'ין': 110, 'gin': 110,                    // Bombay Sapphire ~₪100-120
  'vodka': 65, 'וודקה': 65,                    // Absolut ~₪60-75
  'בורבון': 100, 'bourbon': 100,               // Jim Beam ~₪90, Maker's Mark ~₪130
  'וויסקי ריי': 120, 'rye whiskey': 120,       // Bulleit Rye ~₪120
  'סקוטש': 130, 'scotch': 130,                 // Johnnie Walker Red ~₪100, Black ~₪160
  'רום': 70, 'rum': 70,                        // Bacardi ~₪65-80
  'רום כהה': 75, 'rum_dark': 75,               // Captain Morgan ~₪70-80
  'טקילה': 100, 'tequila': 100,                // Jose Cuervo ~₪90, Patron ~₪200
  'מזקל': 150, 'mezcal': 150,                  // Hard to find in Israel
  'קוניאק': 140, 'cognac': 140,                // Hennessy VS ~₪140
  'אבסינת': 120, 'absinthe': 120,
  // Liqueurs (real prices)
  'קמפרי': 100, 'campari': 100,                // Campari 1L ~₪99-110
  'אפרול': 90, 'aperol': 90,                   // Aperol ~₪85-95
  'קהלואה': 80, 'kahlua': 80,                  // Kahlúa ~₪75-85
  'בייליס': 75, 'baileys': 75,                 // Baileys ~₪70-80
  'קואנטרו': 90, 'triple sec': 50, 'טריפל סק': 50, // Cointreau ~₪90, generic triple sec ~₪50
  'אמרטו': 80, 'דיסארונו': 80, 'amaretto': 80,// Disaronno ~₪80
  'שארטרז': 160, 'chartreuse': 160,            // Chartreuse ~₪150-170
  'ורמוט מתוק': 50, 'sweet vermouth': 50,      // Martini Rosso ~₪45-55
  'ורמוט יבש': 50,
  'מרשקינו': 100, 'maraschino': 100,           // Luxardo ~₪95-110
  'בנדיקטין': 120, 'benedictine': 120,
  'גליאנו': 100, 'galliano': 100,
  'בלו קוראסאו': 55, 'blue_curacao': 55,
  'פרנה': 85, 'fernet': 85,                    // Fernet Branca ~₪80-90
  'פסואה': 70, 'passoa': 70,
  'ליקר אפרסק': 50, 'peach_schnapps': 50,
  'ליקר דובדבן': 55, 'cherry_liqueur': 55,
  'ליקר שוקולד': 55, 'chocolate_liqueur': 55,
  'קרם דה מנט': 50, 'creme_de_menthe': 50,
  'קרם דה קקאו': 50, 'creme_de_cacao': 50,
  'ליקור 43': 90, 'licor43': 90,
  // Bitters & syrups
  'אנגוסטורה ביטרס': 50, 'ביטרס': 50, 'bitters': 50, // Angostura ~₪45-55
  'ביטרס תפוז': 55, 'orange_bitters': 55,
  'גרנדין': 20, 'grenadine': 20,               // Monin grenadine ~₪20
  'סירופ פשוט': 12, 'simple_syrup': 12,        // Homemade or Monin ~₪12-20
  'סירופ': 18, 'syrup': 18,
  'דבש': 12, 'honey_syrup': 12,
  'אורגיט': 35, 'orgeat': 35,
  'סירופ פטל': 22, 'raspberry_syrup': 22,
  'אגבה': 18, 'agave_syrup': 18,
  // Mixers & fresh
  'פרוסקו': 35, 'prosecco': 35,                // Shufersal prosecco ~₪30-40
  'סודה': 5, 'soda': 5,
  'לימון': 2, 'ליים': 4, 'מיץ ליים': 8, 'מיץ לימון': 8,
  'מיץ תפוזים': 10, 'מיץ אננס': 12, 'מיץ חמוציות': 15,
  'קוביית סוכר': 3, 'סוכר': 3,
  'ביצה': 3, 'לבן ביצה': 3,
  'שמנת': 10, 'חלב קוקוס': 12,
  'אספרסו': 5, 'קפה': 5,
  'גלידת וניל': 15,
  'מים': 0, 'קרח': 0,
  'ביטרס פישו': 60,
  'אבסינת (שטיפה)': 5,
};

// Store name → type mapping (Google often misclassifies Israeli stores)
const STORE_TYPE_OVERRIDES = {
  'am:pm': 'convenience_store', 'am pm': 'convenience_store', 'ampm': 'convenience_store',
  'yellow': 'convenience_store', 'ילו': 'convenience_store',
  'tiv taam': 'premium_supermarket', 'טיב טעם': 'premium_supermarket',
  'tiv taam in the city': 'premium_supermarket',
  'shufersal': 'supermarket', 'שופרסל': 'supermarket',
  'victory': 'supermarket', 'ויקטורי': 'supermarket',
  'rami levy': 'discount_supermarket', 'רמי לוי': 'discount_supermarket',
  'osher ad': 'discount_supermarket', 'אושר עד': 'discount_supermarket',
  'mega': 'supermarket', 'מגה': 'supermarket',
};

// Price multipliers by store type (based on real Israeli price differences)
const PRICE_MULTIPLIER = {
  liquor_store: 0.90,          // Dedicated liquor stores: ~10% cheaper
  discount_supermarket: 0.92,  // Rami Levy, Osher Ad: cheapest
  supermarket: 1.0,            // Shufersal, Victory: baseline
  premium_supermarket: 1.12,   // Tiv Taam: ~12% markup
  convenience_store: 1.25      // AM:PM, Yellow: ~25% markup
};

// Determine real store type from name (Google often misclassifies Israeli stores)
function getStoreType(storeName, googleType) {
  const nameLower = (storeName || '').toLowerCase();
  for (const [pattern, type] of Object.entries(STORE_TYPE_OVERRIDES)) {
    if (nameLower.includes(pattern)) return type;
  }
  return googleType || 'supermarket';
}

// Estimate basket cost for ingredients at a given store
function estimateBasketCost(ingredients, storeName, googleStoreType) {
  let total = 0;
  const realType = getStoreType(storeName, googleStoreType);
  const multiplier = PRICE_MULTIPLIER[realType] || 1.0;
  for (const ing of ingredients) {
    const name = (ing.item || '').toLowerCase().trim();
    let price = 0;
    // Try exact match first, then partial
    for (const [key, val] of Object.entries(INGREDIENT_PRICES)) {
      const keyLower = key.toLowerCase();
      if (name === keyLower) { price = val; break; }
    }
    // Partial match if no exact
    if (price === 0) {
      for (const [key, val] of Object.entries(INGREDIENT_PRICES)) {
        const keyLower = key.toLowerCase();
        if (name.includes(keyLower) || keyLower.includes(name)) { price = val; break; }
      }
    }
    // Default: small cost for garnishes/unknown
    if (price === 0) price = 3;
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
    const cost = ingredients ? estimateBasketCost(ingredients, store.name, store.storeType) : null;
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
