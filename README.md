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

**Note:** `assets/bg-video.mp4` is large (~10 MB). That is within Vercel’s deployment size limits; for faster loads later you could host the video on a CDN or compress it further.
