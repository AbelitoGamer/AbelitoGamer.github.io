// FunkyerPlaza JavaScript - Character Wiki

let wikiData = null;
let currentPage = null;

// Utility function to normalize paths for web deployment
// Converts backslashes to forward slashes (Windows -> Web compatible)
function normalizePath(path) {
    if (!path) return path;
    return path.replace(/\\/g, '/');
}

// Parse SUMMARY.md to extract wiki structure (supports nested categories)
function parseSummaryMarkdown(markdown) {
    const lines = markdown.split('\n').map(line => line.trimEnd());
    const structure = {
        defaultPage: null,
        categories: [],
        hiddenSections: [] // Hidden sections like "Rechazados"
    };
    
    let currentSection = null; // Track which section we're in (Indice, Rechazados, etc.)
    let currentSectionCategories = structure.categories; // Current array to push to
    const stack = []; // Stack to track parent items at each indent level
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Check for "# Default" section
        if (line.trim() === '# Default') {
            // Next non-empty line should be the default page link
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                if (nextLine && nextLine.startsWith('[')) {
                    const match = nextLine.match(/\[([^\]]+)\]\(([^)]+)\)/);
                    if (match) {
                        structure.defaultPage = match[2]; // Extract file path
                    }
                    break;
                }
            }
            continue;
        }
        
        // Check for section headers
        if (line.trim().startsWith('#') && !line.trim().startsWith('##')) {
            const sectionName = line.trim().substring(1).trim();
            
            if (sectionName === 'Indice') {
                currentSection = 'indice';
                currentSectionCategories = structure.categories;
            } else if (sectionName === 'Rechazados') {
                currentSection = 'rechazados';
                const hiddenSection = {
                    name: sectionName,
                    categories: [],
                    hidden: true
                };
                structure.hiddenSections.push(hiddenSection);
                currentSectionCategories = hiddenSection.categories;
            } else {
                // Unknown section - skip
                currentSection = null;
            }
            
            stack.length = 0; // Reset stack for new section
            continue;
        }
        
        // Skip if not in a recognized section
        if (!currentSection) continue;
        
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;
        
        // Parse list items - support both with and without links
        if (trimmedLine.startsWith('- ')) {
            const indentLevel = Math.floor(line.search(/\S/) / 2); // Indent level (2 spaces = 1 level)
            
            let item = null;
            
            // Try to match link format: - [Title](file.md)
            const linkMatch = trimmedLine.match(/^- \[([^\]]+)\]\(([^)]+)\)/);
            if (linkMatch) {
                item = {
                    title: linkMatch[1],
                    file: linkMatch[2],
                    items: [],
                    isCategory: false,
                    section: currentSection // Mark which section this belongs to
                };
            } else {
                // Try to match plain text format: - Category Name
                const plainMatch = trimmedLine.match(/^- (.+)$/);
                if (plainMatch) {
                    item = {
                        title: plainMatch[1],
                        file: null, // No file for plain categories
                        items: [],
                        isCategory: true, // Plain text items are always categories
                        section: currentSection
                    };
                }
            }
            
            if (item) {
                // Adjust stack to current indent level
                stack.length = indentLevel + 1;
                stack[indentLevel] = item;
                
                // Add to appropriate parent
                if (indentLevel === 0) {
                    // Top-level category
                    item.name = item.title;
                    item.isCategory = true;
                    currentSectionCategories.push(item);
                } else {
                    // Nested item - add to parent
                    const parent = stack[indentLevel - 1];
                    if (parent) {
                        parent.items.push(item);
                        parent.isCategory = true; // Parent has children, so it's a category
                    }
                }
            }
        }
    }
    
    console.log('Parsed SUMMARY.md structure:', structure);
    return structure;
}

// Parse YAML front matter from markdown content
function parseFrontMatter(markdown) {
    const frontMatterRegex = /^---\r?\n([\s\S]*?)\r?\n---/;
    const match = markdown.match(frontMatterRegex);
    
    if (!match) {
        return {};
    }
    
    const frontMatterText = match[1];
    const metadata = {};
    
    // Parse simple key: value pairs
    const lines = frontMatterText.split('\n');
    lines.forEach(line => {
        const colonIndex = line.indexOf(':');
        if (colonIndex !== -1) {
            const key = line.substring(0, colonIndex).trim();
            const value = line.substring(colonIndex + 1).trim();
            metadata[key] = value;
        }
    });
    
    return metadata;
}

// Fetch and parse front matter from a markdown file
async function fetchFileFrontMatter(filePath) {
    try {
        const encodedPath = filePath.split('/').map(encodeURIComponent).join('/');
        const response = await fetch(`content/${encodedPath}?v=` + Date.now());
        
        if (!response.ok) {
            console.warn(`Could not fetch front matter for ${filePath}`);
            return {};
        }
        
        const content = await response.text();
        return parseFrontMatter(content);
    } catch (error) {
        console.warn(`Error fetching front matter for ${filePath}:`, error);
        return {};
    }
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('FunkyerPlaza Wiki loaded');
    initializeWiki();
});

async function initializeWiki() {
    try {
        // Determine the base path for the wiki
        const currentPath = window.location.pathname;
        const basePath = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
        console.log('Current path:', currentPath);
        console.log('Base path:', basePath);
        console.log('Attempting to fetch SUMMARY.md');
        
        // Load wiki structure from SUMMARY.md
        const response = await fetch('SUMMARY.md?v=' + Date.now());
        
        if (!response.ok) {
            throw new Error(`Failed to fetch SUMMARY.md: ${response.status} ${response.statusText}`);
        }
        
        const summaryText = await response.text();
        wikiData = parseSummaryMarkdown(summaryText);
        
        console.log('Loaded wiki structure:', wikiData);
        
        // Render sidebar navigation (with front matter metadata)
        await renderSidebar();
        
        // Check URL hash for a specific page
        const hash = window.location.hash.substring(1); // Remove the #
        
        if (hash) {
            // Try to load the page from the hash
            loadWikiPage(hash);
        } else if (wikiData.defaultPage) {
            // Load default page if no hash
            loadWikiPage(wikiData.defaultPage);
        } else {
            showWelcomePage();
        }
        
        // Setup search functionality
        setupSearch();
        
        // Setup sidebar toggle for mobile
        setupSidebarToggle();
        
        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', handleHashChange);
        
        // Listen for popstate (browser back/forward with pushState)
        window.addEventListener('popstate', handleHashChange);
        
    } catch (error) {
        console.error('Error loading wiki:', error);
        console.error('Error details:', {
            message: error.message,
            url: window.location.href,
            pathname: window.location.pathname
        });
        document.getElementById('wikiContent').innerHTML = 
            `<div class="error-message">
                <h2>Error loading wiki</h2>
                <p>${error.message}</p>
                <p>Current URL: ${window.location.href}</p>
                <p>Please check that SUMMARY.md exists in the FunkyerPlaza folder.</p>
                <p>The SUMMARY.md file should follow the format:</p>
                <pre># Default
[PageName](file.md)

# Indice
- [Category](category.md)
  - [Entry](entry.md)</pre>
            </div>`;
    }
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        loadWikiPage(hash);
        updateActiveSidebarItem(hash);
    } else if (wikiData && wikiData.defaultPage) {
        // No hash, load default page
        loadWikiPage(wikiData.defaultPage);
        updateActiveSidebarItem(wikiData.defaultPage);
    } else {
        // No hash and no default page, show welcome
        showWelcomePage();
        // Clear active items
        document.querySelectorAll('.wiki-item').forEach(item => {
            item.classList.remove('active');
        });
    }
}

async function renderSidebar() {
    const sidebarNav = document.getElementById('sidebarNav');
    
    if (!wikiData || !wikiData.categories) {
        sidebarNav.innerHTML = '<div class="error-message">No se encontro este contenido en la wiki.</div>';
        return;
    }
    
    sidebarNav.innerHTML = '<div class="loading"><div class="loading-spinner"></div>Cargando metadata...</div>';
    
    // Helper function to recursively collect all items (including nested ones)
    function collectAllItems(items, list = []) {
        items.forEach(item => {
            list.push(item);
            if (item.items && item.items.length > 0) {
                collectAllItems(item.items, list);
            }
        });
        return list;
    }
    
    // Fetch front matter for all items in parallel (including nested)
    // But skip categories - they use their title from SUMMARY.md
    const fetchPromises = [];
    wikiData.categories.forEach(category => {
        // Top-level categories always use SUMMARY.md title
        category.displayTitle = category.title || category.name;
        
        if (category.items && category.items.length > 0) {
            const allItems = collectAllItems(category.items);
            allItems.forEach(item => {
                // If this item is a category (has children), use SUMMARY.md title
                if (item.isCategory) {
                    item.displayTitle = item.title;
                    // Don't fetch front matter for categories
                } else {
                    // Regular entry - fetch front matter
                    fetchPromises.push(
                        fetchFileFrontMatter(item.file).then(frontMatter => {
                            // Merge front matter into item
                            item.metadata = frontMatter;
                            if (frontMatter.title) {
                                item.displayTitle = frontMatter.title;
                            } else {
                                item.displayTitle = item.title; // Fallback to SUMMARY.md title
                            }
                            if (frontMatter.icon) {
                                item.icon = normalizePath(frontMatter.icon);
                            }
                        })
                    );
                }
            });
        }
    });
    
    // Wait for all metadata to be fetched
    await Promise.all(fetchPromises);
    
    // Helper function to render items recursively (supports nested categories)
    function renderItems(items, container) {
        items.forEach(item => {
            // Check if this item is a category (has sub-items) or a regular entry
            if (item.isCategory && item.items && item.items.length > 0) {
                // This is a sub-category
                const subCategoryDiv = document.createElement('div');
                subCategoryDiv.className = 'wiki-category wiki-subcategory';
                
                const subCategoryHeader = document.createElement('div');
                subCategoryHeader.className = 'category-header';
                subCategoryHeader.innerHTML = `
                    <span>${item.displayTitle || item.title}</span>
                    <i class="fas fa-chevron-down"></i>
                `;
                
                const subCategoryItems = document.createElement('div');
                subCategoryItems.className = 'category-items';
                
                // Recursively render sub-items
                renderItems(item.items, subCategoryItems);
                
                // Toggle functionality
                subCategoryHeader.addEventListener('click', () => {
                    subCategoryHeader.classList.toggle('collapsed');
                    subCategoryItems.classList.toggle('collapsed');
                });
                
                subCategoryDiv.appendChild(subCategoryHeader);
                subCategoryDiv.appendChild(subCategoryItems);
                container.appendChild(subCategoryDiv);
            } else {
                // This is a regular entry
                const itemDiv = document.createElement('div');
                itemDiv.className = 'wiki-item';
                itemDiv.setAttribute('data-page', item.file);
                // Persist section information for robust filtering (e.g., 'indice' or 'rechazados')
                if (item.section) {
                    itemDiv.dataset.section = String(item.section).toLowerCase();
                }
                
                // Add icon if provided in front matter
                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.className = 'wiki-item-icon';
                    icon.src = item.icon;
                    icon.alt = item.displayTitle || item.title;
                    icon.loading = 'lazy';
                    itemDiv.appendChild(icon);
                }
                
                // Add text (use front matter title if available)
                const textSpan = document.createElement('span');
                textSpan.className = 'wiki-item-text';
                textSpan.textContent = item.displayTitle || item.title;
                itemDiv.appendChild(textSpan);
                
                // Click handler
                itemDiv.addEventListener('click', () => {
                    loadWikiPage(item.file);
                    setActiveItem(itemDiv);
                    window.history.pushState(null, '', `#${item.file}`);
                });
                
                container.appendChild(itemDiv);
            }
        });
    }
    
    // Now render the sidebar with metadata
    sidebarNav.innerHTML = '';
    
    wikiData.categories.forEach((category) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'wiki-category';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <span>${category.name || category.title}</span>
            <i class="fas fa-chevron-down"></i>
        `;
        
        const categoryItems = document.createElement('div');
        categoryItems.className = 'category-items';
        
        // Render items (including nested categories)
        if (category.items && category.items.length > 0) {
            renderItems(category.items, categoryItems);
        }
        
        // Category toggle
        categoryHeader.addEventListener('click', () => {
            categoryHeader.classList.toggle('collapsed');
            categoryItems.classList.toggle('collapsed');
        });
        
        categoryDiv.appendChild(categoryHeader);
        categoryDiv.appendChild(categoryItems);
        sidebarNav.appendChild(categoryDiv);
    });
    
    // Render hidden sections (like "Rechazados")
    if (wikiData.hiddenSections) {
        wikiData.hiddenSections.forEach((hiddenSection) => {
            hiddenSection.categories.forEach((category) => {
                const categoryDiv = document.createElement('div');
                categoryDiv.className = 'wiki-category hidden-section';
                categoryDiv.style.display = 'none'; // Hidden by default
                categoryDiv.dataset.section = hiddenSection.name.toLowerCase();
                categoryDiv.dataset.shouldBeHidden = 'true'; // Track that this should be hidden by default
                
                const categoryHeader = document.createElement('div');
                categoryHeader.className = 'category-header';
                categoryHeader.innerHTML = `
                    <span>${category.name || category.title}</span>
                    <i class="fas fa-chevron-down"></i>
                `;
                
                const categoryItems = document.createElement('div');
                categoryItems.className = 'category-items';
                
                // Render items (including nested categories)
                if (category.items && category.items.length > 0) {
                    renderItems(category.items, categoryItems);
                }
                
                // Category toggle
                categoryHeader.addEventListener('click', () => {
                    categoryHeader.classList.toggle('collapsed');
                    categoryItems.classList.toggle('collapsed');
                });
                
                categoryDiv.appendChild(categoryHeader);
                categoryDiv.appendChild(categoryItems);
                sidebarNav.appendChild(categoryDiv);
            });
        });
    }
}

// Function to update visibility of hidden sections based on current page
function updateHiddenSectionsVisibility(currentPageFile) {
    if (!wikiData.hiddenSections) return;
    
    // Helper to check if a file belongs to a section
    function fileInSection(file, sectionCategories) {
        for (const category of sectionCategories) {
            if (category.file === file) return true;
            if (category.items && category.items.length > 0) {
                if (fileInItems(file, category.items)) return true;
            }
        }
        return false;
    }
    
    function fileInItems(file, items) {
        for (const item of items) {
            if (item.file === file) return true;
            if (item.items && item.items.length > 0) {
                if (fileInItems(file, item.items)) return true;
            }
        }
        return false;
    }
    
    // Check each hidden section
    wikiData.hiddenSections.forEach((hiddenSection) => {
        const sectionName = hiddenSection.name.toLowerCase();
        const isInSection = fileInSection(currentPageFile, hiddenSection.categories);
        
        // Show/hide all categories in this section
        document.querySelectorAll(`.wiki-category.hidden-section[data-section="${sectionName}"]`).forEach(categoryDiv => {
            if (isInSection) {
                categoryDiv.style.display = '';
                categoryDiv.dataset.shouldBeHidden = 'false'; // Mark as temporarily visible
            } else {
                categoryDiv.style.display = 'none';
                categoryDiv.dataset.shouldBeHidden = 'true'; // Mark as should be hidden
            }
        });
    });
}

async function loadWikiPage(pageFile) {
    const contentDiv = document.getElementById('wikiContent');
    const contentInner = contentDiv.querySelector('.wiki-content-inner');
    
    // Show loading
    contentInner.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            Loading page...
        </div>
    `;
    
    try {
        // URL-encode the page file path to handle spaces and special characters
        const encodedPageFile = pageFile.split('/').map(encodeURIComponent).join('/');
        
        // Fetch markdown file with proper encoding
        const fetchUrl = `content/${encodedPageFile}?v=` + Date.now();
        console.log('Fetching markdown file:', fetchUrl);
        console.log('Full URL:', new URL(fetchUrl, window.location.href).href);
        
        const response = await fetch(fetchUrl);
        
        if (!response.ok) {
            throw new Error(`Page not found: ${response.status} ${response.statusText} - ${fetchUrl}`);
        }
        
        let markdown = await response.text();
        
        // Remove YAML front-matter if present
        markdown = markdown.replace(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+/, '');
        
        console.log('Original markdown length:', markdown.length);
        console.log('First 200 chars:', markdown.substring(0, 200));
        
        // Normalize all image paths (convert backslashes to forward slashes)
        markdown = markdown.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, (match, alt, path) => {
            return `![${alt}](${normalizePath(path)})`;
        });
        
        // Pre-process custom markdown extensions
        markdown = processCustomMarkdown(markdown);
        
        console.log('Processed markdown length:', markdown.length);
        console.log('First 500 chars after processing:', markdown.substring(0, 500));
        
        // Check if marked is available
        if (typeof marked === 'undefined') {
            console.error('marked.js is not loaded!');
            contentInner.innerHTML = '<div class="error-message">Markdown parser no cargado. Por favor recarga la pagina.</div>';
            return;
        }
        
        // Parse markdown to HTML using marked.js
        const html = marked.parse(markdown);
        
        // Display content
        contentInner.innerHTML = html;
        
        // Post-process for interactive elements
        processCustomElements(contentInner);
        
        // Scroll to top
        contentDiv.scrollTop = 0;
        
        currentPage = pageFile;
        
        // Update active item in sidebar
        updateActiveSidebarItem(pageFile);
        
        // Update hidden sections visibility based on current page
        updateHiddenSectionsVisibility(pageFile);
        
    } catch (error) {
        console.error('Error loading page:', error);
        contentInner.innerHTML = `
            <div class="error-message">
                <h2>Pagina no encontrada</h2>
                <p>No se pudo cargar la pagina solicitada: <code>${pageFile}</code></p>
                <p>Error: ${error.message}</p>
                <p>Base URL: ${window.location.href}</p>
            </div>
        `;
    }
}

function updateActiveSidebarItem(pageFile) {
    // Remove active class from all items
    document.querySelectorAll('.wiki-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Find and activate the matching item
    document.querySelectorAll('.wiki-item').forEach(item => {
        if (item.getAttribute('data-page') === pageFile) {
            item.classList.add('active');
            
            // Expand the category if it's collapsed
            const category = item.closest('.wiki-category');
            if (category) {
                const header = category.querySelector('.category-header');
                const items = category.querySelector('.category-items');
                if (header && items) {
                    header.classList.remove('collapsed');
                    items.classList.remove('collapsed');
                }
            }
        }
    });
}

function showWelcomePage() {
    const contentDiv = document.getElementById('wikiContent');
    const contentInner = contentDiv.querySelector('.wiki-content-inner');
    
    contentInner.innerHTML = `
        <h1>Welcome to Funkyer Plaza Wiki</h1>
        <p>Select a character from the sidebar to view their information.</p>
        <h2>About This Wiki</h2>
        <p>This is a collection of original characters created by me and my friends. 
        Browse through the categories on the left to learn more about each character.</p>
    `;
}

function setActiveItem(activeItem) {
    // Remove active class from all items
    document.querySelectorAll('.wiki-item').forEach(item => {
        item.classList.remove('active');
    });
    
    // Add active class to clicked item
    activeItem.classList.add('active');
}

function setupSearch() {
    const searchInput = document.getElementById('wikiSearch');
    const sidebar = document.getElementById('wikiSidebar');
    
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();

        // Helper: is a hidden section currently visible?
        const isSectionVisible = (name) => {
            const sectionEl = document.querySelector(`.wiki-category.hidden-section[data-section="${name.toLowerCase()}"]`);
            if (!sectionEl) return true; // If no hidden section node, treat as visible to avoid over-filtering
            return sectionEl.dataset.shouldBeHidden !== 'true';
        };
        
        // Expand sidebar if user is searching on mobile
        if (searchTerm && window.innerWidth <= 968) {
            sidebar.classList.remove('collapsed');
        }
        
        // If search is empty, show everything except hidden sections
        if (!searchTerm) {
            document.querySelectorAll('.wiki-item').forEach(item => {
                // Keep items from hidden sections hidden
                const section = (item.dataset.section || '').toLowerCase();
                const isRechazados = section === 'rechazados';
                const rechazadosVisible = isSectionVisible('rechazados');
                if (isRechazados && !rechazadosVisible) {
                    // Keep items in hidden sections hidden
                    item.style.display = 'none';
                } else {
                    item.style.display = '';
                }
            });
            document.querySelectorAll('.wiki-category, .wiki-subcategory').forEach(category => {
                // Restore hidden sections to their proper state
                if (category.classList.contains('hidden-section')) {
                    if (category.dataset.shouldBeHidden === 'true') {
                        category.style.display = 'none';
                    } else {
                        category.style.display = '';
                    }
                    return;
                }
                category.style.display = '';
            });
            return;
        }
        
        // Search through all items
        document.querySelectorAll('.wiki-item').forEach(item => {
            const textElement = item.querySelector('.wiki-item-text');
            if (!textElement) return;
            
            const text = textElement.textContent.toLowerCase();
            
            // Check if this item belongs to a hidden section (by data-section) and that section is hidden
            const section = (item.dataset.section || '').toLowerCase();
            const isRechazados = section === 'rechazados';
            const rechazadosVisible = isSectionVisible('rechazados');
            
            // Skip items from hidden sections that should be hidden
            if (isRechazados && !rechazadosVisible) {
                item.style.display = 'none';
                return;
            }
            
            if (text.includes(searchTerm)) {
                item.style.display = 'flex';
                
                // Expand all parent categories/subcategories (but not hidden sections)
                let parent = item.parentElement;
                while (parent) {
                    if (parent.classList.contains('category-items')) {
                        parent.classList.remove('collapsed');
                        const header = parent.previousElementSibling;
                        if (header && header.classList.contains('category-header')) {
                            header.classList.remove('collapsed');
                        }
                    }
                    // Don't make hidden sections visible
                    if (parent.classList.contains('hidden-section')) {
                        // If we hit a hidden section, stop here
                        break;
                    }
                    parent = parent.parentElement;
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide categories/subcategories with no visible items
        function updateCategoryVisibility(category) {
            // Don't modify hidden sections - keep them in their proper state
            if (category.classList.contains('hidden-section')) {
                if (category.dataset.shouldBeHidden === 'true') {
                    category.style.display = 'none';
                }
                return;
            }
            
            const categoryItems = category.querySelector('.category-items');
            if (!categoryItems) return;
            
            // Check for visible items (directly or in subcategories)
            const visibleItems = categoryItems.querySelectorAll('.wiki-item');
            let hasVisibleItem = false;
            
            visibleItems.forEach(item => {
                if (item.style.display !== 'none') {
                    hasVisibleItem = true;
                }
            });
            
            if (hasVisibleItem) {
                category.style.display = '';
            } else {
                category.style.display = 'none';
            }
        }
        
        // Update visibility for subcategories first (bottom-up)
        document.querySelectorAll('.wiki-subcategory').forEach(updateCategoryVisibility);
        // Then update top-level categories
        document.querySelectorAll('.wiki-category:not(.wiki-subcategory)').forEach(updateCategoryVisibility);
    });
    
    // Focus search expands sidebar on mobile
    searchInput.addEventListener('focus', () => {
        if (window.innerWidth <= 968) {
            sidebar.classList.remove('collapsed');
        }
    });
}

function setupSidebarToggle() {
    const toggleBtn = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('wikiSidebar');
    
    toggleBtn.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });
    
    // Auto-collapse sidebar on mobile after selecting a page
    const isMobile = () => window.innerWidth <= 968;
    
    document.addEventListener('click', (e) => {
        const wikiItem = e.target.closest('.wiki-item');
        if (wikiItem && isMobile()) {
            // Delay collapse slightly to allow navigation to complete
            setTimeout(() => {
                sidebar.classList.add('collapsed');
            }, 300);
        }
    });
    
    // Collapse sidebar by default on mobile
    if (isMobile()) {
        sidebar.classList.add('collapsed');
    }
    
    // Re-collapse on window resize if switching to mobile
    window.addEventListener('resize', () => {
        if (isMobile() && !sidebar.classList.contains('collapsed')) {
            // Only auto-collapse if user switches from desktop to mobile
            const wasDesktop = window.innerWidth > 968;
            setTimeout(() => {
                if (isMobile() && wasDesktop) {
                    sidebar.classList.add('collapsed');
                }
            }, 100);
        }
    });
}

// Custom Markdown Processing Functions

function processCustomMarkdown(markdown) {
    console.log('processCustomMarkdown called');
    
    // Process character cards
    markdown = processCharacterCards(markdown);
    
    // Process info boxes
    markdown = processInfoBoxes(markdown);
    
    // Process stat bars
    markdown = processStatBars(markdown);
    
    // Process spoilers
    markdown = processSpoilers(markdown);
    
    // Process image galleries
    markdown = processGalleries(markdown);
    
    console.log('processCustomMarkdown finished');
    return markdown;
}

function processCharacterCards(markdown) {
    // Match :::character-card ... ::: blocks (handle different line endings)
    const cardRegex = /:::character-card[\r\n]+([\s\S]*?)[\r\n]+:::/g;
    
    return markdown.replace(cardRegex, (match, content) => {
        console.log('Found character card block');
        const data = parseYAMLLike(content);
        console.log('Parsed data:', data);
        return generateCharacterCard(data);
    });
}

function parseYAMLLike(text) {
    const lines = text.split('\n');
    const data = {
        _customFields: [] // Track custom fields in order
    };
    let currentKey = null;
    let currentArray = null;
    
    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        
        // Check if it's a key-value pair
        if (trimmed.includes(':') && !trimmed.startsWith('-')) {
            const colonIndex = trimmed.indexOf(':');
            const key = trimmed.substring(0, colonIndex).trim();
            const value = trimmed.substring(colonIndex + 1).trim();
            
            // Check if it's a custom field (type-name format)
            if (key.includes('-')) {
                const parts = key.split('-');
                const fieldType = parts[0];
                const fieldName = parts.slice(1).join('-'); // Join back in case name has dashes
                
                // Store as custom field
                if (!data._customFields) data._customFields = [];
                
                const customField = {
                    type: fieldType,
                    name: fieldName,
                    key: key
                };
                
                if (value) {
                    customField.value = value;
                } else {
                    customField.value = [];
                    currentArray = customField.value;
                }
                
                data._customFields.push(customField);
                data[key] = customField;
                currentKey = key;
            } else {
                // Regular field
                currentKey = key;
                
                if (value) {
                    data[key] = value;
                    currentArray = null;
                } else {
                    // It's an array
                    data[key] = [];
                    currentArray = data[key];
                }
            }
        } else if (trimmed.startsWith('-') && currentArray !== null) {
            // It's an array item
            const item = trimmed.substring(1).trim();
            currentArray.push(item);
        }
    });
    
    return data;
}

function generateCharacterCard(data) {
    let html = '<div class="character-card">';
    
    // Name at the top
    if (data.name) {
        html += `<div class="char-card-title">${data.name}</div>`;
    }
    
    // Image tabs and image section
    html += '<div class="char-card-image-container">';
    
    // Tabs for image switching (if multiple images or forms exist)
    const imageForms = [];
    
    // Collect all image forms
    if (data.current || data.currentimage) {
        imageForms.push({
            label: data.current || 'Current',
            image: data.currentimage || data.image
        });
    }
    
    if (data.old || data.oldimage) {
        imageForms.push({
            label: data.old || 'Old',
            image: data.oldimage
        });
    }
    
    // Check for custom forms (form1, form2, etc.)
    Object.keys(data).forEach(key => {
        if (key.startsWith('form') && key.includes('image')) {
            const formNumber = key.replace('formimage', '').replace('form', '').replace('image', '');
            const labelKey = formNumber ? `form${formNumber}` : 'form';
            imageForms.push({
                label: data[labelKey] || `Form ${formNumber || imageForms.length + 1}`,
                image: data[key]
            });
        }
    });
    
    // If no forms defined but image exists, add default
    if (imageForms.length === 0 && data.image) {
        imageForms.push({
            label: 'Current',
            image: data.image
        });
    }
    
    // Render tabs if multiple forms exist
    if (imageForms.length > 1) {
        html += '<div class="char-image-tabs">';
        imageForms.forEach((form, index) => {
            const activeClass = index === 0 ? 'active' : '';
            const normalizedImage = normalizePath(form.image);
            html += `<button class="char-tab ${activeClass}" onclick="switchCharacterImage(this, '${normalizedImage}')">${form.label}</button>`;
        });
        html += '</div>';
    }
    
    // Main image (full width, no padding)
    const defaultImage = imageForms[0]?.image || data.image;
    if (defaultImage) {
        const normalizedImage = normalizePath(defaultImage);
        html += `<img src="${normalizedImage}" alt="${data.name || 'Character'}" class="char-card-main-image" id="char-main-image">`;
    }
    
    html += '</div>'; // End image container
    
    // Body section with details
    html += '<div class="char-card-body">';
    
    // Process custom fields first
    if (data._customFields && data._customFields.length > 0) {
        data._customFields.forEach(field => {
            html += renderCustomField(field);
        });
    }
    
    // Legacy fields support (for backward compatibility)
    // Only render if not already rendered as custom fields
    const renderedKeys = data._customFields ? data._customFields.map(f => f.key) : [];
    
    // Aliases (if not custom)
    if (data.aliases && Array.isArray(data.aliases) && !renderedKeys.includes('aliases')) {
        html += '<div class="char-card-section">';
        html += '<h3 class="char-section-title expandable" onclick="toggleSection(this)">Aliases <i class="fas fa-chevron-down"></i></h3>';
        html += '<div class="char-section-content">';
        html += '<ul class="char-list">';
        data.aliases.forEach(alias => {
            html += `<li>${alias}</li>`;
        });
        html += '</ul>';
        html += '</div>';
        html += '</div>';
    }
    
    // Gender/Pronouns
    if ((data.gender || data.pronouns) && !renderedKeys.includes('gender') && !renderedKeys.includes('pronouns')) {
        html += '<div class="char-card-section">';
        html += '<h3 class="char-section-title expandable" onclick="toggleSection(this)">Gender/Pronouns <i class="fas fa-chevron-down"></i></h3>';
        html += '<div class="char-section-content">';
        html += `<p>${data.gender || ''} ${data.pronouns || ''}</p>`;
        html += '</div>';
        html += '</div>';
    }
    
    // Other legacy fields...
    if (data.relationships && Array.isArray(data.relationships) && !renderedKeys.includes('relationships')) {
        html += '<div class="char-card-section">';
        html += '<h3 class="char-section-title expandable" onclick="toggleSection(this)">Relationships <i class="fas fa-chevron-down"></i></h3>';
        html += '<div class="char-section-content">';
        html += '<ul class="char-list">';
        data.relationships.forEach(rel => {
            html += `<li>${rel}</li>`;
        });
        html += '</ul>';
        html += '</div>';
        html += '</div>';
    }
    
    if (data.affiliations && Array.isArray(data.affiliations) && !renderedKeys.includes('affiliations')) {
        html += '<div class="char-card-section">';
        html += '<h3 class="char-section-title expandable" onclick="toggleSection(this)">Affiliations <i class="fas fa-chevron-down"></i></h3>';
        html += '<div class="char-section-content">';
        html += '<ul class="char-list">';
        data.affiliations.forEach(aff => {
            html += `<li>${aff}</li>`;
        });
        html += '</ul>';
        html += '</div>';
        html += '</div>';
    }
    
    if (data.occupation && !renderedKeys.includes('occupation')) {
        html += '<div class="char-card-section">';
        html += '<h3 class="char-section-title expandable" onclick="toggleSection(this)">Occupation <i class="fas fa-chevron-down"></i></h3>';
        html += '<div class="char-section-content">';
        html += `<p>${data.occupation}</p>`;
        html += '</div>';
        html += '</div>';
    }
    
    html += '</div>'; // End body
    html += '</div>'; // End character card
    
    return html;
}

function renderCustomField(field) {
    let html = '';
    const { type, name, value } = field;
    
    // Capitalize the field name for display
    const displayName = name.charAt(0).toUpperCase() + name.slice(1);
    
    switch (type) {
        case 'list':
            // Render as collapsible bullet list
            if (Array.isArray(value) && value.length > 0) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += '<ul class="char-list">';
                value.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                html += '</div>';
                html += '</div>';
            }
            break;
            
        case 'text':
            // Render as collapsible text paragraph
            if (value) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += `<p>${value}</p>`;
                html += '</div>';
                html += '</div>';
            }
            break;
            
        case 'table':
            // Render as collapsible table (expects array of key:value pairs)
            if (Array.isArray(value) && value.length > 0) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += '<table class="char-bio-table">';
                value.forEach(item => {
                    // Parse "key: value" format
                    const colonIndex = item.indexOf(':');
                    if (colonIndex > -1) {
                        const key = item.substring(0, colonIndex).trim();
                        const val = item.substring(colonIndex + 1).trim();
                        html += `<tr><td class="bio-label">${key}</td><td>${val}</td></tr>`;
                    } else {
                        html += `<tr><td colspan="2">${item}</td></tr>`;
                    }
                });
                html += '</table>';
                html += '</div>';
                html += '</div>';
            }
            break;
            
        case 'collapse':
        case 'collapsible':
            // Render as collapsible section with list
            if (Array.isArray(value) && value.length > 0) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += '<ul class="char-list">';
                value.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                html += '</div>';
                html += '</div>';
            }
            break;
            
        case 'grid':
            // Render as collapsible image grid (for icons)
            if (Array.isArray(value) && value.length > 0) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += '<div class="char-icons-grid">';
                value.forEach(item => {
                    const normalizedItem = normalizePath(item);
                    html += `<img src="${normalizedItem}" alt="Icon" class="char-icon-item">`;
                });
                html += '</div>';
                html += '</div>';
                html += '</div>';
            }
            break;
            
        default:
            // Unknown type - try to render intelligently as collapsible
            if (Array.isArray(value) && value.length > 0) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += '<ul class="char-list">';
                value.forEach(item => {
                    html += `<li>${item}</li>`;
                });
                html += '</ul>';
                html += '</div>';
                html += '</div>';
            } else if (value) {
                html += '<div class="char-card-section">';
                html += `<h3 class="char-section-title expandable" onclick="toggleSection(this)">${displayName} <i class="fas fa-chevron-down"></i></h3>`;
                html += '<div class="char-section-content">';
                html += `<p>${value}</p>`;
                html += '</div>';
                html += '</div>';
            }
            break;
    }
    
    return html;
}

function processInfoBoxes(markdown) {
    const infoRegex = /:::info-box[\r\n]+([\s\S]*?)[\r\n]+:::/g;
    return markdown.replace(infoRegex, (match, content) => {
        return `<div class="info-box">${marked.parse(content)}</div>`;
    });
}

function processStatBars(markdown) {
    const statRegex = /{{stat name="([^"]+)" value="(\d+)" max="(\d+)"( color="([^"]+)")?}}/g;
    return markdown.replace(statRegex, (match, name, value, max, _, color) => {
        const percentage = (parseInt(value) / parseInt(max)) * 100;
        const statColor = color || '#8a2be2';
        return `
            <div class="stat-bar-container">
                <div class="stat-bar-label">${name}</div>
                <div class="stat-bar-wrapper">
                    <div class="stat-bar-fill" style="width: ${percentage}%; background: ${statColor};"></div>
                    <span class="stat-bar-value">${value}/${max}</span>
                </div>
            </div>
        `;
    });
}

function processSpoilers(markdown) {
    const spoilerRegex = /:::spoiler( title="([^"]+)")?[\r\n]+([\s\S]*?)[\r\n]+:::/g;
    return markdown.replace(spoilerRegex, (match, _, title, content) => {
        const spoilerTitle = title || 'Spoiler';
        return `
            <div class="spoiler-box" onclick="toggleSpoiler(this)">
                <div class="spoiler-header">
                    <i class="fas fa-eye-slash"></i> ${spoilerTitle} <span class="spoiler-hint">(Click to reveal)</span>
                </div>
                <div class="spoiler-content hidden">${marked.parse(content)}</div>
            </div>
        `;
    });
}

function processGalleries(markdown) {
    const galleryRegex = /:::gallery[\r\n]+([\s\S]*?)[\r\n]+:::/g;
    return markdown.replace(galleryRegex, (match, content) => {
        const images = content.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
        let html = '<div class="image-gallery">';
        images.forEach((img, index) => {
            const imgMatch = img.match(/!\[([^\]]*)\]\(([^)]+)\)/);
            if (imgMatch) {
                const alt = imgMatch[1];
                const src = normalizePath(imgMatch[2].trim());
                // Use data attribute and add click via event listener instead of inline onclick
                html += `<img src="${src}" alt="${alt}" class="gallery-image" data-lightbox-src="${src.replace(/"/g, '&quot;')}">`;
            }
        });
        html += '</div>';
        return html;
    });
}

function processCustomElements(contentDiv) {
    // Add any post-processing here if needed
    // For example, initialize interactive components
    
    // Setup gallery image click handlers
    const galleryImages = contentDiv.querySelectorAll('.gallery-image');
    galleryImages.forEach(img => {
        img.addEventListener('click', function() {
            const src = this.getAttribute('data-lightbox-src') || this.src;
            openLightbox(src);
        });
    });
    
    // Intercept internal wiki links (links to .md files)
    const links = contentDiv.querySelectorAll('a[href]');
    links.forEach(link => {
        const href = link.getAttribute('href');
        
        // Check if it's an internal wiki link (ends with .md and doesn't start with http:// or https://)
        if (href && href.endsWith('.md') && !href.startsWith('http://') && !href.startsWith('https://')) {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                
                // Load the wiki page and update the hash
                loadWikiPage(href);
                window.history.pushState(null, '', `#${href}`);
                
                // Update active sidebar item
                updateActiveSidebarItem(href);
            });
        }
    });
}

// Helper functions for interactive elements
window.toggleSection = function(element) {
    const content = element.nextElementSibling;
    const icon = element.querySelector('i');
    content.classList.toggle('collapsed');
    icon.classList.toggle('fa-chevron-down');
    icon.classList.toggle('fa-chevron-up');
}

window.toggleSpoiler = function(element) {
    const content = element.querySelector('.spoiler-content');
    const icon = element.querySelector('i');
    content.classList.toggle('hidden');
    icon.classList.toggle('fa-eye-slash');
    icon.classList.toggle('fa-eye');
}

window.openLightbox = function(src) {
    console.log('Opening lightbox with image:', src);
    
    // Create lightbox overlay
    const lightbox = document.createElement('div');
    lightbox.className = 'lightbox-overlay';
    lightbox.innerHTML = `
        <div class="lightbox-content" onclick="event.stopPropagation()">
            <img src="${src}" alt="Lightbox Image" onerror="console.error('Failed to load image:', this.src)">
            <button class="lightbox-close" onclick="closeLightbox()">&times;</button>
        </div>
    `;
    
    // Click overlay to close
    lightbox.addEventListener('click', function() {
        closeLightbox();
    });
    
    document.body.appendChild(lightbox);
    setTimeout(() => lightbox.classList.add('active'), 10);
}

window.closeLightbox = function() {
    const lightbox = document.querySelector('.lightbox-overlay');
    if (lightbox) {
        lightbox.classList.remove('active');
        setTimeout(() => lightbox.remove(), 300);
    }
}

window.switchCharacterImage = function(tabElement, imageUrl) {
    // Remove active class from all tabs in this card
    const tabs = tabElement.parentElement.querySelectorAll('.char-tab');
    tabs.forEach(tab => tab.classList.remove('active'));
    
    // Add active class to clicked tab
    tabElement.classList.add('active');
    
    // Switch the image
    const imageContainer = tabElement.parentElement.parentElement;
    const mainImage = imageContainer.querySelector('.char-card-main-image');
    if (mainImage) {
        mainImage.src = imageUrl;
    }
}
