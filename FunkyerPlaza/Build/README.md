# Build Scripts for FunkyerPlaza Wiki

This folder contains scripts to automatically generate the wiki navigation index.

## Files

- **`build-index.js`** - Node.js script that scans the content directory and generates `content-index.json`
- **`build-wiki.bat`** - Windows batch file wrapper (double-click to run)
- **`build-wiki.ps1`** - PowerShell wrapper with colored output

## Usage

### Windows (Double-Click)
Simply double-click `build-wiki.bat` or `build-wiki.ps1`

### Command Line
```bash
# From FunkyerPlaza directory:
node Build/build-index.js

# From Build directory:
cd Build
node build-index.js
```

### From Root Directory
```bash
cd FunkyerPlaza
node Build/build-index.js
```

## What It Does

1. Scans the `content/` directory recursively
2. Reads front-matter from all `.md` files
3. Organizes files by folder structure (folders = categories)
4. Generates `content-index.json` in the FunkyerPlaza root
5. Reports the number of categories and pages found

## When to Run

Run this script whenever you:
- ✅ Add a new markdown file
- ✅ Remove a markdown file
- ✅ Change front-matter (title, icon, order)
- ✅ Rename a file
- ✅ Create/delete folders
- ✅ Move files between folders

## Output

The script generates `../content-index.json` with this structure:

```json
{
  "generated": "2025-10-23T03:09:21.474Z",
  "defaultPage": "welcome.md",
  "categories": [
    {
      "type": "category",
      "name": "Your Characters",
      "folder": "your-characters",
      "items": [
        {
          "type": "page",
          "name": "Character Name",
          "file": "your-characters/character.md",
          "icon": "content/Resources/character/icon.png",
          "order": 1
        }
      ]
    }
  ],
  "rootPages": [...]
}
```

## Configuration

Edit `build-index.js` to customize:

- **`excludeFolders`** - Folders to skip (default: `['Resources', 'resources', 'assets']`)
- **`contentDir`** - Where to scan (default: `../content`)
- **`outputFile`** - Where to output (default: `../content-index.json`)

## Troubleshooting

**"Cannot find module"**
→ Make sure Node.js is installed: `node --version`

**"Cannot find path"**
→ Run from FunkyerPlaza directory or use the batch/ps1 files

**No files detected**
→ Check that markdown files have `.md` extension
→ Verify front-matter syntax is correct

**Wrong output location**
→ The script always outputs to `FunkyerPlaza/content-index.json` regardless of where you run it from
