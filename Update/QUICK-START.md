# 🚀 Quick Start: Cache Version Update

## TL;DR - Before Every Push

```bash
cd Update
node update-cache-version.js
cd ..
git add .
git commit -m "Your commit message"
git push
```

## Why?

GitHub Pages caches everything aggressively. This script adds unique timestamps to ALL resource files so browsers ALWAYS load the latest version.

## What Gets Updated?

- ✅ All `.css` files
- ✅ All `.js` files  
- ✅ All `.json` files
- ✅ CDN links (Font Awesome, etc.)

## Version Format

Old: `?v=1.0.12`
New: `?v=1761329719942` (Unix timestamp in milliseconds)

## Troubleshooting

**Q: I pushed but users still see old content**  
**A:** Did you run the script BEFORE pushing? Run it now and push again.

**Q: Script says "0 files updated"**  
**A:** Files already have the current timestamp. This is normal if you ran it recently.

**Q: I don't have Node.js**  
**A:** Use PowerShell version: `.\update-cache-version.ps1`

**Q: Can this run automatically?**  
**A:** Yes! The GitHub Actions workflow (`.github/workflows/update-cache.yml`) can do it automatically on push.

## For CI/CD

The workflow is already set up. Just push your code and it will:
1. Detect changes to JS/CSS/JSON/HTML
2. Run the cache version script
3. Commit and push the updated files
4. Deploy to GitHub Pages

Note: Uses `[skip ci]` in commit message to avoid infinite loops.
