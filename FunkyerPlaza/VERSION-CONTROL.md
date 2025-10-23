# Version Control Notes

## Git Handling

### Should You Commit content-index.json?

**Option 1: Commit it (Recommended for GitHub Pages)**
- ✅ Visitors can use the site immediately
- ✅ No build step required on the server
- ✅ Works with GitHub Pages out of the box
- ⚠️ Need to remember to rebuild and commit after changes

**Option 2: Don't commit it (Requires Build Step)**
- ✅ Always stays in sync with markdown files
- ✅ Cleaner git history
- ⚠️ Requires running `node Build/build-index.js` before deploying
- ⚠️ Need a build step in your deployment process

### Recommended Approach

For GitHub Pages (static hosting), **commit it**:

```bash
# After making changes to markdown files
node Build/build-index.js
git add content-index.json
git commit -m "Update wiki content"
git push
```

### Automation with Git Hooks

To automatically rebuild before committing, create `.git/hooks/pre-commit`:

```bash
#!/bin/sh
cd FunkyerPlaza
node Build/build-index.js
git add content-index.json
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

Now every time you commit, the index rebuilds automatically!

### .gitignore Suggestion

If you choose NOT to commit content-index.json:

```
# Add to .gitignore
FunkyerPlaza/content-index.json
```

## Deployment

### GitHub Pages (Static)
1. Run `node Build/build-index.js` locally
2. Commit `content-index.json`
3. Push to GitHub
4. Site updates automatically

### With Build Pipeline (GitHub Actions)
Create `.github/workflows/build-wiki.yml`:

```yaml
name: Build Wiki Index
on:
  push:
    paths:
      - 'FunkyerPlaza/content/**'
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd FunkyerPlaza && node Build/build-index.js
      - run: |
          git config user.name github-actions
          git config user.email github-actions@github.com
          git add FunkyerPlaza/content-index.json
          git commit -m "Auto-rebuild wiki index"
          git push
```

This automatically rebuilds when you change markdown files!
