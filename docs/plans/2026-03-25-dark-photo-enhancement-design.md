# Dark Photo Enhancement — Client-Side Canvas Pipeline

**Date:** 2026-03-25
**Priority:** Fix #1 failure mode — dark/blurry photos (0% detection rate)

## Problem

Test results show 0/6 dark bar photos detected any bottles. Users taking phone photos in dimly lit kitchens get zero results.

## Solution

Client-side Canvas image enhancement before sending to Gemini API. User sees original preview; enhanced version is sent silently to the API.

## Pipeline

1. After resize (existing `resizeAndConvert`), run `enhanceForScanning(canvas, ctx)`
2. Measure average brightness by sampling pixel luminance
3. Apply adaptive enhancement:
   - Dark (avg < 100): brightness +50, contrast 1.4x, gamma 0.7
   - Medium (100-160): brightness +20, contrast 1.2x
   - Bright (>160): no change
4. Apply mild sharpen convolution kernel (always)
5. Output enhanced base64 for API, keep original for user preview

## Files to Change

- `js/scanner.js` — add `enhanceForScanning()`, modify `resizeAndConvert()` to produce two outputs (original preview + enhanced for API)

## Prompt Tweak

- Add low-light guidance to `api/scan-bar.js` prompt: tell Gemini the image may have been pre-enhanced and to look for faint outlines/reflections
