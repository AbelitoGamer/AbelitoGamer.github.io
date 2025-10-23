/**
 * Auto-generate content-index.json by scanning the content directory
 * Run this script whenever you add/remove/modify markdown files
 * Usage: node Build/build-index.js
 */

const fs = require('fs');
const path = require('path');

// Paths relative to the FunkyerPlaza root (parent directory)
const contentDir = path.join(__dirname, '..', 'content');
const outputFile = path.join(__dirname, '..', 'content-index.json');

// Folders to exclude from scanning
const excludeFolders = ['Resources', 'resources', 'assets'];

// Category name formatting
function formatCategoryName(folderName) {
    return folderName
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Extract front-matter from markdown file
function extractFrontMatter(filePath) {
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        
        // Check for YAML-style front matter (--- at start)
        const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
        
        if (frontMatterMatch) {
            const frontMatter = {};
            const lines = frontMatterMatch[1].split(/\r?\n/);
            
            lines.forEach(line => {
                const match = line.match(/^(\w+):\s*(.+)$/);
                if (match) {
                    frontMatter[match[1]] = match[2].trim();
                }
            });
            
            return frontMatter;
        }
        
        // Fallback: get first heading as title
        const titleMatch = content.match(/^#\s+(.+)$/m);
        return {
            title: titleMatch ? titleMatch[1] : path.basename(filePath, '.md')
        };
    } catch (err) {
        console.error(`Error reading ${filePath}:`, err.message);
        return { title: path.basename(filePath, '.md') };
    }
}

// Recursively scan directory
function scanDirectory(dir, relativePath = '') {
    const items = [];
    
    try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            const relPath = relativePath ? `${relativePath}/${entry.name}` : entry.name;
            
            if (entry.isDirectory()) {
                // Skip excluded folders
                if (excludeFolders.includes(entry.name)) {
                    continue;
                }
                
                // Recursively scan subdirectory
                const subItems = scanDirectory(fullPath, relPath);
                
                if (subItems.length > 0) {
                    items.push({
                        type: 'category',
                        name: formatCategoryName(entry.name),
                        folder: entry.name,
                        items: subItems
                    });
                }
            } else if (entry.isFile() && entry.name.endsWith('.md')) {
                // Parse markdown file
                const frontMatter = extractFrontMatter(fullPath);
                
                items.push({
                    type: 'page',
                    name: frontMatter.title || entry.name.replace('.md', ''),
                    file: relPath,
                    icon: frontMatter.icon || null,
                    order: parseInt(frontMatter.order) || 999
                });
            }
        }
        
        // Sort items by order, then alphabetically
        items.sort((a, b) => {
            const orderDiff = (a.order || 999) - (b.order || 999);
            if (orderDiff !== 0) return orderDiff;
            return a.name.localeCompare(b.name);
        });
        
    } catch (err) {
        console.error(`Error scanning ${dir}:`, err.message);
    }
    
    return items;
}

// Build the index
function buildIndex() {
    console.log('Scanning content directory...');
    console.log(`Content dir: ${contentDir}`);
    console.log(`Output file: ${outputFile}`);
    console.log('');
    
    const structure = {
        generated: new Date().toISOString(),
        defaultPage: 'welcome.md',
        categories: []
    };
    
    // Scan content directory
    const items = scanDirectory(contentDir);
    
    // Separate root-level pages from categories
    structure.categories = items.filter(item => item.type === 'category');
    structure.rootPages = items.filter(item => item.type === 'page');
    
    // Write to file
    fs.writeFileSync(outputFile, JSON.stringify(structure, null, 2));
    
    console.log('✓ Generated content-index.json');
    console.log(`  - ${structure.categories.length} categories`);
    console.log(`  - ${structure.rootPages.length} root pages`);
    
    structure.categories.forEach(cat => {
        console.log(`  - ${cat.name}: ${cat.items.length} items`);
    });
}

// Run the build
try {
    buildIndex();
} catch (error) {
    console.error('Error building index:', error);
    process.exit(1);
}
