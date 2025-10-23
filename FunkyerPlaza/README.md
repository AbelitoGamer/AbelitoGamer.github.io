# Funkyer Plaza Wiki - Usage Guide

## Overview
A wiki-style page for documenting your original characters and your friends' characters, built with markdown support and automatic file-based navigation.

## Quick Start

1. **Add a character**: Create a `.md` file in `content/your-characters/`
2. **Add front-matter**: Include title, icon, and order
3. **Rebuild index**: Run `Build/build-wiki.bat`
4. **View**: Refresh your browser

For detailed instructions, see `QUICK-REFERENCE.md`

## File Structure

```
FunkyerPlaza/
├── FunkyerPlaza.html          # Main HTML page
├── funkyerplaza.css           # Wiki styling
├── funkyerplaza.js            # Wiki functionality
├── content-index.json         # Auto-generated navigation (don't edit!)
├── Build/                     # Build scripts
│   ├── build-index.js        # Index generator
│   ├── build-wiki.bat        # Windows wrapper
│   ├── build-wiki.ps1        # PowerShell wrapper
│   └── README.md             # Build documentation
├── content/                   # All markdown content
│   ├── welcome.md            # Default welcome page
│   ├── your-characters/      # Your character pages
│   │   ├── character1.md
│   │   └── character2.md
│   ├── friends-characters/   # Friends' character pages
│   │   └── friend-char1.md
│   ├── lore/                 # World building pages
│   │   ├── world.md
│   │   └── timeline.md
│   └── Resources/            # Images (ignored by scanner)
```

## How to Add a New Character

### Step 1: Create the Markdown File
Create a new `.md` file in the appropriate folder:
- Your characters: `content/your-characters/charactername.md`
- Friends' characters: `content/friends-characters/charactername.md`

### Step 2: Add Front-Matter
At the top of the file, add metadata:

```markdown
---
title: Character Name
icon: content/Resources/CharacterName/icon.png
order: 5
---

# Character Name

Your character content here...
```

### Step 3: Rebuild the Index
Run `Build/build-wiki.bat` (or `node Build/build-index.js`)

### Step 4: Refresh Browser
Your character now appears in the sidebar!
```

### Step 3: Write Your Content
Use the template in `character1.md` as a starting point. You can use all standard markdown features:

- **Headers**: `# H1`, `## H2`, `### H3`
- **Bold**: `**text**`
- **Italic**: `*text*`
- **Lists**: `- item` or `1. item`
- **Links**: `[text](url)`
- **Images**: `![alt](path/to/image.png)`
- **Tables**: See `character2.md` for example
- **Code blocks**: Use triple backticks
- **Blockquotes**: `> quote`

## Character Icon Guidelines

For best results with character icons:
- **Recommended size**: 150x150 pixels
- **Displayed size**: 40x40px (scaled down automatically on desktop, 35x35px on mobile)
- **Format**: PNG with transparency recommended
- **Location**: Store in `/Resources/images/` or appropriate subfolder

## Adding New Categories

To add a new category (e.g., "Villains"), edit `wiki-structure.json`:

```json
{
    "name": "Villains",
    "items": [
        {
            "name": "Villain Name",
            "file": "villains/villain1.md",
            "icon": "/Resources/images/villain-icon.png"
        }
    ]
}
```

Then create the folder: `content/villains/`

## Features

✅ **Sidebar Navigation** - Organized by categories with collapsible sections
✅ **Character Icons** - Optional 150x150 icons displayed next to each entry
✅ **Search Functionality** - Real-time search through all wiki entries
✅ **Markdown Support** - Full markdown formatting with code syntax, tables, images, etc.
✅ **Mobile Responsive** - Collapsible sidebar for mobile devices
✅ **Styled Content** - Beautiful purple-themed styling matching your site
✅ **Easy Updates** - Just add .md files and update JSON

## Tips

1. **Keep file names simple**: Use lowercase with hyphens (e.g., `my-character.md`)
2. **Organize by folders**: Use the folder structure to keep things organized
3. **Use templates**: Copy existing .md files as templates for consistency
4. **Image paths**: Use absolute paths from site root (e.g., `/Resources/images/...`)
5. **Test locally**: Always check your pages work before publishing

## Need Help?

- Check existing `.md` files for formatting examples
- The wiki uses [marked.js](https://marked.js.org/) for markdown parsing
- Icons are displayed at 40x40px, so high-res images will be scaled down

Enjoy building your character wiki! 🎮
