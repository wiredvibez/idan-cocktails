# Cocktails Wiki

Static single-page site (Hebrew RTL): cocktail catalog with hero video and filters.

## Deploy on Vercel

1. Push this folder to GitHub (or GitLab / Bitbucket).
2. In [Vercel](https://vercel.com), **Add New Project** → import the repository.
3. **Framework Preset:** Other (or “No Framework”).
4. **Build Command:** leave empty.
5. **Output Directory:** leave empty (or `.` if the UI requires a value).

Vercel will serve `index.html` at `/` and the hero video at `/assets/bg-video.mp4` (see `assets/` in this repo).

### CLI (optional)

```bash
npm i -g vercel
vercel
```

---

## Environment variables (Vercel)

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Yes (bar scanner) | [Google AI Studio](https://aistudio.google.com/apikey) API key for `generativelanguage.googleapis.com`. |
| `GEMINI_MODEL` | No | Model id for scan (default `gemini-2.0-flash`). Set e.g. `gemini-2.5-flash` if your key supports it. |
| `GOOGLE_PLACES_API_KEY` | No | Only for “nearby stores” on recipe cards (`/api/nearby-stores`). |

---

**Note:** `assets/bg-video.mp4` is large (~10 MB). That is within Vercel’s deployment size limits; for faster loads later you could host the video on a CDN or compress it further.
