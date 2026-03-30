# Mixologist's Radar — Design Doc

**Date:** 2026-03-27
**Feature:** Find nearby liquor stores from any recipe card

## What it does

User expands a cocktail recipe → clicks "מצא חנויות קרובות" → browser asks for location → shows nearby liquor stores sorted by distance with Google Maps navigation links.

## Architecture

- **Frontend:** Vanilla JS (`js/radar.js`), button inside expanded recipe cards
- **Backend:** Vercel serverless function (`api/nearby-stores.js`)
- **API:** Google Places API (New) — Nearby Search
- **Cost:** ~$0.032/request, $200/month free credit (~6,000 searches/month)

## Flow

1. User clicks "Find Nearby" button in recipe card
2. Browser requests geolocation (lat/lng)
3. Calls `api/nearby-stores.js` with lat/lng
4. Server calls Google Places API (types: liquor_store, supermarket)
5. Returns top 5 stores sorted by distance
6. Shows inline results: name, distance, rating, open/closed, navigate link
7. Also shows shareable shopping list (copy/WhatsApp)

## Files

| File | Action |
|------|--------|
| `api/nearby-stores.js` | New — serverless function |
| `js/radar.js` | New — geolocation + render |
| `index.html` | Edit — add button + results container |
