// Mixologist's Radar — Find nearby stores for cocktail ingredients

const NEARBY_API = '/api/nearby-stores';

const STORE_ICONS = {
  liquor_store: '🍷',
  supermarket: '🛒',
  convenience_store: '🏪'
};

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
function renderStores(stores, container) {
  if (stores.length === 0) {
    container.innerHTML = `
      <div style="text-align:center; padding:16px; color:#a1a1aa;">
        לא נמצאו חנויות קרובות (1.5 ק"מ)
      </div>`;
    return;
  }

  container.innerHTML = stores.map(store => `
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
        ${store.mapsUrl ? `<a href="${store.mapsUrl}" target="_blank" rel="noopener" class="radar-nav-btn">נווט →</a>` : ''}
      </div>
    </div>
  `).join('');
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
    renderStores(stores, container);

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
