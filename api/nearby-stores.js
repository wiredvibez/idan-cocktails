// New Relic backend agent removed: ESM `import newrelic` crashes Vercel
// serverless on cold start. Browser Agent (frontend) covers monitoring.
const newrelic = { addCustomAttributes: () => {} };

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { lat: rawLat, lng: rawLng } = req.body;
  if (rawLat === undefined || rawLat === null || rawLng === undefined || rawLng === null) {
    return res.status(400).json({ error: 'lat/lng required' });
  }
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
      lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return res.status(400).json({ error: 'lat/lng must be valid numeric coordinates' });
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.error('GOOGLE_PLACES_API_KEY not configured');
    return res.status(500).json({ error: 'Server configuration error' });
  }

  try {
    const placesStart = Date.now();
    newrelic.addCustomAttributes({ lat, lng });
    // Search for liquor stores and supermarkets nearby
    const searchUrl = 'https://places.googleapis.com/v1/places:searchNearby';

    const body = {
      includedTypes: ['liquor_store', 'supermarket', 'convenience_store'],
      maxResultCount: 15,
      locationRestriction: {
        circle: {
          center: { latitude: lat, longitude: lng },
          radius: 1500.0
        }
      }
    };

    const placesRes = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.userRatingCount,places.currentOpeningHours,places.googleMapsUri,places.types'
      },
      body: JSON.stringify(body)
    });

    if (!placesRes.ok) {
      const errText = await placesRes.text();
      console.error('Places API error:', placesRes.status, errText);
      return res.status(502).json({ error: 'Places API error' });
    }

    const data = await placesRes.json();
    const allPlaces = data.places || [];

    // Filter out bars, cafes, restaurants — we only want actual stores
    const EXCLUDE_TYPES = ['bar', 'cafe', 'coffee_shop', 'restaurant', 'night_club', 'meal_delivery', 'meal_takeaway'];
    const places = allPlaces.filter(place => {
      const types = place.types || [];
      return !types.some(t => EXCLUDE_TYPES.includes(t));
    });

    // Calculate distance and format results
    const stores = places.map(place => {
      const storeLat = place.location?.latitude;
      const storeLng = place.location?.longitude;
      const distance = storeLat && storeLng
        ? haversineDistance(lat, lng, storeLat, storeLng)
        : null;

      // Determine store type for icon
      const types = place.types || [];
      let storeType = 'supermarket';
      if (types.includes('liquor_store')) storeType = 'liquor_store';
      else if (types.includes('convenience_store')) storeType = 'convenience_store';

      return {
        name: place.displayName?.text || 'Unknown',
        address: place.formattedAddress || '',
        rating: place.rating || null,
        ratingCount: place.userRatingCount || 0,
        isOpen: place.currentOpeningHours?.openNow ?? null,
        mapsUrl: place.googleMapsUri || '',
        distance: distance,
        storeType: storeType
      };
    });

    // Sort by distance (closest first)
    stores.sort((a, b) => (a.distance || 9999) - (b.distance || 9999));

    newrelic.addCustomAttributes({
      places_latency_ms: Date.now() - placesStart,
      store_count: stores.length
    });

    return res.status(200).json({ stores: stores.slice(0, 5) });

  } catch (err) {
    console.error('Nearby stores error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

// Haversine formula — distance in meters between two lat/lng points
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = deg => deg * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}
