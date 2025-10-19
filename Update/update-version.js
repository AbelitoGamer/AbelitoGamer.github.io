const fs = require('fs');
const path = require('path');

// Read current version
const versionPath = './version.json';
const version = JSON.parse(fs.readFileSync(versionPath, 'utf8'));

// Generate new version number
const currentVersion = version.version.split('.').map(Number);
currentVersion[2]++; // Increment patch version
const newVersion = currentVersion.join('.');

// Update version file
version.version = newVersion;
version.lastUpdated = new Date().toISOString().split('T')[0];
fs.writeFileSync(versionPath, JSON.stringify(version, null, 2));

console.log(`Version updated to ${newVersion}`);

// Update HTML files with new version
const updateFileVersion = (filePath) => {
    const fullPath = path.join('..', filePath);
    if (!fs.existsSync(fullPath)) return;
    
    let content = fs.readFileSync(fullPath, 'utf8');
    
    // Update CSS links
    content = content.replace(/href="([^"]+\.css)\?v=[^"]*"/g, `href="$1?v=${newVersion}"`);
    content = content.replace(/href="([^"]+\.css)"/g, `href="$1?v=${newVersion}"`);
    
    // Update JS links
    content = content.replace(/src="([^"]+\.js)\?v=[^"]*"/g, `src="$1?v=${newVersion}"`);
    content = content.replace(/src="([^"]+\.js)"/g, `src="$1?v=${newVersion}"`);
    
    // Update JSON references
    content = content.replace(/'([^']+\.json)\?v=[^']*'/g, `'$1?v=${newVersion}'`);
    content = content.replace(/'([^']+\.json)'/g, `'$1?v=${newVersion}'`);
    
    fs.writeFileSync(fullPath, content);
    console.log(`Updated ${filePath}`);
};

// Update main HTML file
updateFileVersion('index.html');

// Update other HTML files in subdirectories
const updateHtmlInDir = (dir) => {
    const fullDir = path.join('..', dir);
    if (!fs.existsSync(fullDir)) return;
    
    const files = fs.readdirSync(fullDir);
    files.forEach(file => {
        const filePath = path.join(fullDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
            updateHtmlInDir(path.join(dir, file));
        } else if (file.endsWith('.html')) {
            updateFileVersion(path.join(dir, file));
        }
    });
};

// Update HTML files in all subdirectories
const subdirs = fs.readdirSync('..').filter(item => 
    fs.statSync(path.join('..', item)).isDirectory() && 
    !item.startsWith('.') && 
    !item.startsWith('node_modules') &&
    item !== 'update'
);

subdirs.forEach(updateHtmlInDir);

console.log('Version update complete!');