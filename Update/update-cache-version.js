const fs = require('fs');
const path = require('path');

// Generate timestamp-based cache version
const cacheVersion = Date.now().toString();

console.log(`Generating cache version: ${cacheVersion}`);

// Root directory (parent of Update folder)
const rootDir = path.join(__dirname, '..');

// Function to recursively find all HTML files
function findHtmlFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        
        // Skip node_modules, .git, and other hidden directories
        if (stat.isDirectory()) {
            if (!file.startsWith('.') && file !== 'node_modules' && file !== 'Update') {
                findHtmlFiles(filePath, fileList);
            }
        } else if (file.endsWith('.html')) {
            fileList.push(filePath);
        }
    });
    
    return fileList;
}

// Function to update cache version in HTML file
function updateHtmlFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // Update CSS href links (with and without existing version)
    const newContent1 = content.replace(/href="([^"]+\.css)(?:\?v=[^"]*)?"/g, `href="$1?v=${cacheVersion}"`);
    if (newContent1 !== content) {
        content = newContent1;
        modified = true;
    }
    
    // Update JavaScript src links (with and without existing version)
    const newContent2 = content.replace(/src="([^"]+\.js)(?:\?v=[^"]*)?"/g, `src="$1?v=${cacheVersion}"`);
    if (newContent2 !== content) {
        content = newContent2;
        modified = true;
    }
    
    // Update JSON references in DATA_SOURCE variables (single quotes)
    // Be more specific to avoid matching JSON object syntax
    const newContent3 = content.replace(/= '([^']+\.json)(?:\?v=[^']*)?'/g, `= '$1?v=${cacheVersion}'`);
    if (newContent3 !== content) {
        content = newContent3;
        modified = true;
    }
    
    // Update JSON references (let/const/var declarations)
    const newContent4 = content.replace(/(let|const|var)\s+DATA_SOURCE\s*=\s*"([^"]+\.json)(?:\?v=[^"]*)?"(?!\s*:)/g, `$1 DATA_SOURCE = "$2?v=${cacheVersion}"`);
    if (newContent4 !== content) {
        content = newContent4;
        modified = true;
    }
    
    // Update Font Awesome and other CDN links (but not jQuery from googleapis)
    const newContent5 = content.replace(/(https:\/\/cdnjs\.cloudflare\.com\/[^"']+\.(?:css|js))(?:\?v=[^"']*)?/g, `$1?v=${cacheVersion}`);
    if (newContent5 !== content) {
        content = newContent5;
        modified = true;
    }
    
    // Update jsdelivr CDN links
    const newContent6 = content.replace(/(https:\/\/cdn\.jsdelivr\.net\/[^"']+\.(?:css|js))(?:\?v=[^"']*)?/g, `$1?v=${cacheVersion}`);
    if (newContent6 !== content) {
        content = newContent6;
        modified = true;
    }
    
    if (modified) {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Updated: ${path.relative(rootDir, filePath)}`);
        return true;
    }
    
    return false;
}

// Main execution
try {
    console.log('Searching for HTML files...');
    const htmlFiles = findHtmlFiles(rootDir);
    console.log(`Found ${htmlFiles.length} HTML files\n`);
    
    let updatedCount = 0;
    
    htmlFiles.forEach(file => {
        if (updateHtmlFile(file)) {
            updatedCount++;
        }
    });
    
    console.log(`\n✓ Cache version updated successfully!`);
    console.log(`  Version: ${cacheVersion}`);
    console.log(`  Files updated: ${updatedCount}/${htmlFiles.length}`);
    
    // Save the cache version to a file for reference
    const versionInfo = {
        version: cacheVersion,
        timestamp: new Date().toISOString(),
        filesUpdated: updatedCount
    };
    
    fs.writeFileSync(
        path.join(__dirname, 'cache-version.json'),
        JSON.stringify(versionInfo, null, 2)
    );
    
    console.log(`\nCache version info saved to Update/cache-version.json`);
    
} catch (error) {
    console.error('Error updating cache version:', error);
    process.exit(1);
}
