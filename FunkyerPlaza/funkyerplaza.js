// FunkyerPlaza JavaScript - Character Wiki

let wikiData = null;
let currentPage = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('FunkyerPlaza Wiki loaded');
    initializeWiki();
});

async function initializeWiki() {
    try {
        // Load wiki structure from auto-generated index
        const response = await fetch('content-index.json?v=' + Date.now());
        wikiData = await response.json();
        
        console.log('Loaded wiki structure:', wikiData);
        
        // Render sidebar navigation
        renderSidebar();
        
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
        
    } catch (error) {
        console.error('Error loading wiki:', error);
        document.getElementById('wikiContent').innerHTML = 
            '<div class="error-message">Error loading wiki. Please check that content-index.json exists. Run "node build-index.js" to generate it.</div>';
    }
}

function handleHashChange() {
    const hash = window.location.hash.substring(1);
    if (hash) {
        loadWikiPage(hash);
    }
}

function renderSidebar() {
    const sidebarNav = document.getElementById('sidebarNav');
    
    if (!wikiData || !wikiData.categories) {
        sidebarNav.innerHTML = '<div class="error-message">No se encontro este contenido en la wiki.</div>';
        return;
    }
    
    sidebarNav.innerHTML = '';
    
    wikiData.categories.forEach((category, index) => {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'wiki-category';
        
        const categoryHeader = document.createElement('div');
        categoryHeader.className = 'category-header';
        categoryHeader.innerHTML = `
            <span>${category.name}</span>
            <i class="fas fa-chevron-down"></i>
        `;
        
        const categoryItems = document.createElement('div');
        categoryItems.className = 'category-items';
        
        if (category.items && category.items.length > 0) {
            category.items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = 'wiki-item';
                itemDiv.setAttribute('data-page', item.file);
                
                // Add icon if provided
                if (item.icon) {
                    const icon = document.createElement('img');
                    icon.className = 'wiki-item-icon';
                    icon.src = item.icon;
                    icon.alt = item.name;
                    icon.loading = 'lazy'; // Lazy load images for better mobile performance
                    itemDiv.appendChild(icon);
                }
                
                // Add text
                const textSpan = document.createElement('span');
                textSpan.className = 'wiki-item-text';
                textSpan.textContent = item.name;
                itemDiv.appendChild(textSpan);
                
                // Click handler
                itemDiv.addEventListener('click', () => {
                    loadWikiPage(item.file);
                    setActiveItem(itemDiv);
                    
                    // Update URL hash
                    window.history.pushState(null, '', `#${item.file}`);
                });
                
                categoryItems.appendChild(itemDiv);
            });
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
        // Fetch markdown file
        const response = await fetch(`content/${pageFile}?v=` + Date.now());
        
        if (!response.ok) {
            throw new Error('Page not found');
        }
        
        let markdown = await response.text();
        
        // Remove YAML front-matter if present
        markdown = markdown.replace(/^---[\r\n]+([\s\S]*?)[\r\n]+---[\r\n]+/, '');
        
        console.log('Original markdown length:', markdown.length);
        console.log('First 200 chars:', markdown.substring(0, 200));
        
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
        
    } catch (error) {
        console.error('Error loading page:', error);
        contentInner.innerHTML = `
            <div class="error-message">
                <h2>Pagina no encontrada</h2>
                <p>No se pudo cargar la pagina solicitada.</p>
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
        
        // Expand sidebar if user is searching on mobile
        if (searchTerm && window.innerWidth <= 968) {
            sidebar.classList.remove('collapsed');
        }
        
        document.querySelectorAll('.wiki-item').forEach(item => {
            const text = item.querySelector('.wiki-item-text').textContent.toLowerCase();
            const category = item.closest('.wiki-category');
            
            if (text.includes(searchTerm)) {
                item.style.display = 'flex';
                // Expand category if item matches
                if (searchTerm) {
                    category.querySelector('.category-header').classList.remove('collapsed');
                    category.querySelector('.category-items').classList.remove('collapsed');
                }
            } else {
                item.style.display = 'none';
            }
        });
        
        // Hide empty categories
        document.querySelectorAll('.wiki-category').forEach(category => {
            const visibleItems = category.querySelectorAll('.wiki-item[style="display: flex"]');
            if (visibleItems.length === 0 && searchTerm) {
                category.style.display = 'none';
            } else {
                category.style.display = 'block';
            }
        });
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
            html += `<button class="char-tab ${activeClass}" onclick="switchCharacterImage(this, '${form.image}')">${form.label}</button>`;
        });
        html += '</div>';
    }
    
    // Main image (full width, no padding)
    const defaultImage = imageForms[0]?.image || data.image;
    if (defaultImage) {
        html += `<img src="${defaultImage}" alt="${data.name || 'Character'}" class="char-card-main-image" id="char-main-image">`;
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
                    html += `<img src="${item}" alt="Icon" class="char-icon-item">`;
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
                const src = imgMatch[2].trim();
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
