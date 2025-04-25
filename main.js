// Global reference to default navigation data
let defaultNavigationData = null;

// Function to fetch data from the configured JSON file
async function fetchNavigationData(source = DATA_SOURCE, isDefaultFetch = false) {
    try {
        const response = await fetch(source);
        
        if (!response.ok) {
            // If we can't load the specified JSON and it's not already index.json, try to fall back to index.json
            if (source !== 'index.json') {
                console.warn(`Could not load ${source}, falling back to index.json`);
                DATA_SOURCE = 'index.json';
                return fetchNavigationData(); // Try again with index.json
            }
            throw new Error(`Failed to fetch navigation data: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Store default navigation data when fetching index.json
        if (source === 'index.json' && !isDefaultFetch) {
            defaultNavigationData = data;
        }
        
        return data;
    } catch (error) {
        console.error(`Error fetching navigation data from ${source}:`, error);
        if (!isDefaultFetch) {
            showErrorMessage('Could not load data. Please refresh the page or try again later.');
        }
        return null;
    }
}

// Function to ensure we have default data available
async function ensureDefaultDataAvailable() {
    if (!defaultNavigationData && DATA_SOURCE !== 'index.json') {
        defaultNavigationData = await fetchNavigationData('index.json', true);
    }
}

// Function to show error messages
function showErrorMessage(message) {
    const containers = [
        document.getElementById('topNavLinks'),
        document.getElementById('cardContainer'),
        document.getElementById('footerLinks')
    ];
    
    containers.forEach(container => {
        if (container) {
            container.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    ${message}
                </div>
            `;
        }
    });
}

// Function to handle navigation or JSON switching
function handleNavigation(item, event) {
    // If item has a json property, load that JSON instead of navigating
    if (item.json) {
        event.preventDefault();
        
        // Update the URL without reloading the page
        const url = new URL(window.location);
        url.searchParams.set('json', item.json);
        window.history.pushState({}, '', url);
        
        // Update the data source and reload the content
        DATA_SOURCE = item.json;
        initializeWebsite();
        
        // Scroll back to top when changing "pages"
        window.scrollTo(0, 0);
        
        return true; // Navigation handled
    }
    
    // If we have a regular link, let the browser handle it normally
    return false; // Navigation not handled
}

// Initialize the website
async function initializeWebsite() {
    // Show loading state
    document.getElementById('topNavLinks').innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading navigation...</div>';
    document.getElementById('cardContainer').innerHTML = '<div class="loading"><div class="loading-spinner"></div>Loading content...</div>';
    document.getElementById('footerLinks').innerHTML = '<div class="loading">Loading...</div>';
    
    // Make sure default data is available
    await ensureDefaultDataAvailable();
    
    // Get current JSON data
    const data = await fetchNavigationData();
    if (!data) return;
    
    // Set site title and meta information
    document.title = data.siteInfo.title || 'Funky Atlas';
    document.getElementById('siteName').textContent = data.siteInfo.name || 'Funky Atlas';
    document.getElementById('pageTitle').textContent = data.siteInfo.title || 'Funky Atlas';
    document.getElementById('pageSubtitle').textContent = data.siteInfo.subtitle || '';
    document.getElementById('copyright').textContent = data.siteInfo.copyright || '© 2025 Funky Atlas';
    
    // Process each section, falling back to default data if needed
    const finalData = {
        ...data,
        // Use fallbacks for missing sections
        topNavigation: data.topNavigation || (defaultNavigationData?.topNavigation || []),
        footerNavigation: data.footerNavigation || (defaultNavigationData?.footerNavigation || []),
        socialLinks: data.socialLinks || (defaultNavigationData?.socialLinks || []),
        // Use current JSON's cards or textpage (no fallback for content)
        cards: data.cards || [],
        textpage: data.textpage || null
    };
    
    // Populate top navigation
    populateTopNavigation(finalData.topNavigation);
    
    // Populate content area with either cards or textpage
    if (finalData.textpage) {
        populateTextPage(finalData.textpage);
    } else {
        populateCards(finalData.cards);
    }
    
    // Populate footer navigation
    populateFooterNavigation(finalData.footerNavigation);
    
    // Populate social links
    populateSocialLinks(finalData.socialLinks);
    
    // Log fallback usage for debugging
    if (!data.topNavigation && defaultNavigationData?.topNavigation) {
        console.info('Using default topNavigation from index.json');
    }
    if (!data.footerNavigation && defaultNavigationData?.footerNavigation) {
        console.info('Using default footerNavigation from index.json');
    }
    if (!data.socialLinks && defaultNavigationData?.socialLinks) {
        console.info('Using default socialLinks from index.json');
    }
}

// Function to populate top navigation including dropdowns
function populateTopNavigation(items) {
    const topNavLinks = document.getElementById('topNavLinks');
    topNavLinks.innerHTML = '';

    if (!items || items.length === 0) {
        topNavLinks.innerHTML = '<div class="error-message">No navigation items found</div>';
        return;
    }

    items.forEach(item => {
        const navItem = document.createElement('div');
        navItem.className = item.dropdown ? 'nav-item dropdown' : 'nav-item';

        const link = document.createElement('a');
        link.href = item.json ? '#' : (item.link || '#');
        
        if (item.icon) {
            const icon = document.createElement('i');
            icon.className = item.icon;
            link.appendChild(icon);
        }
        
        const text = document.createTextNode(` ${item.title}`);
        link.appendChild(text);
        
        // Add click handler if item has json property
        if (item.json) {
            link.addEventListener('click', (e) => {
                handleNavigation(item, e);
            });
        }
        
        if (item.dropdown && item.dropdown.length > 0) {
            const caretIcon = document.createElement('i');
            caretIcon.className = 'fas fa-caret-down';
            caretIcon.style.marginLeft = '5px';
            link.appendChild(caretIcon);
            
            const dropdownContent = document.createElement('div');
            dropdownContent.className = 'dropdown-content';
            
            item.dropdown.forEach(dropdownItem => {
                const dropdownLink = document.createElement('a');
                dropdownLink.href = dropdownItem.json ? '#' : (dropdownItem.link || '#');
                dropdownLink.textContent = dropdownItem.title;
                
                // Add click handler if dropdown item has json property
                if (dropdownItem.json) {
                    dropdownLink.addEventListener('click', (e) => {
                        handleNavigation(dropdownItem, e);
                    });
                }
                
                dropdownContent.appendChild(dropdownLink);
            });
            
            navItem.appendChild(link);
            navItem.appendChild(dropdownContent);
        } else {
            navItem.appendChild(link);
        }
        
        topNavLinks.appendChild(navItem);
    });
}

// Function to populate cards
function populateCards(cards) {
    const cardContainer = document.getElementById('cardContainer');
    cardContainer.innerHTML = '';
    cardContainer.className = 'card-container'; // Reset to default class

    if (!cards || cards.length === 0) {
        cardContainer.innerHTML = '<div class="error-message">No cards found</div>';
        return;
    }

    cards.forEach(cardData => {
        const card = document.createElement('a');
        card.href = cardData.json ? '#' : (cardData.link || '#');
        card.className = 'card';
        
        // Add click handler if card has json property
        if (cardData.json) {
            card.addEventListener('click', (e) => {
                handleNavigation(cardData, e);
            });
        }
        
        // Card background
        const cardBackground = document.createElement('div');
        cardBackground.className = 'card-background';
        cardBackground.style.backgroundImage = `url('${cardData.backgroundImage || cardData.image}')`;
        
        // Card image
        const cardImage = document.createElement('div');
        cardImage.className = 'card-image';
        
        const img = document.createElement('img');
        img.src = cardData.image || '/api/placeholder/400/320';
        img.alt = cardData.title;
        cardImage.appendChild(img);
        
        // Card content
        const cardContent = document.createElement('div');
        cardContent.className = 'card-content';
        
        const cardTitle = document.createElement('h3');
        cardTitle.className = 'card-title';
        cardTitle.textContent = cardData.title;
        
        const cardText = document.createElement('p');
        cardText.className = 'card-text';
        
        // Process text with special formatting
        if (cardData.description) {
            // First, create a temporary container to safely parse the HTML content
            const tempContainer = document.createElement('div');
            tempContainer.innerHTML = cardData.description;
            
            // Process highlight spans
            if (cardData.highlights) {
                cardData.highlights.forEach(highlight => {
                    const regex = new RegExp(highlight, 'gi');
                    tempContainer.innerHTML = tempContainer.innerHTML.replace(
                        regex, 
                        `<span class="highlight">${highlight}</span>`
                    );
                });
            }
            
            // Process subdued spans
            if (cardData.subdued) {
                cardData.subdued.forEach(subdued => {
                    const regex = new RegExp(subdued, 'gi');
                    tempContainer.innerHTML = tempContainer.innerHTML.replace(
                        regex, 
                        `<span class="subdued">${subdued}</span>`
                    );
                });
            }
            
            cardText.innerHTML = tempContainer.innerHTML;
        }
        
        cardContent.appendChild(cardTitle);
        cardContent.appendChild(cardText);
        
        // Assemble card
        card.appendChild(cardBackground);
        card.appendChild(cardImage);
        card.appendChild(cardContent);
        
        cardContainer.appendChild(card);
    });
}

// Function to populate text page content
function populateTextPage(textpage) {
    const contentContainer = document.getElementById('cardContainer');
    contentContainer.innerHTML = '';
    
    // Add text page class to apply specific styling
    contentContainer.className = 'text-page-container';
    
    if (!textpage || (!textpage.sections && !textpage.content)) {
        contentContainer.innerHTML = '<div class="error-message">No text page content found</div>';
        return;
    }
    
    // Create a wrapper for the text page content
    const textPageWrapper = document.createElement('div');
    textPageWrapper.className = 'text-page-wrapper';
    
    // If there's direct content (simple text page)
    if (textpage.content) {
        // Create the content section
        const contentSection = createTextPageSection(textpage);
        textPageWrapper.appendChild(contentSection);
    } 
    // If there are multiple sections
    else if (textpage.sections && textpage.sections.length > 0) {
        // Process each section
        textpage.sections.forEach(section => {
            const sectionElement = createTextPageSection(section);
            textPageWrapper.appendChild(sectionElement);
        });
    }
    
    contentContainer.appendChild(textPageWrapper);
    
    // Process any interactive elements after adding to DOM
    setupTextPageInteractions();
}

// Function to create a text page section
function createTextPageSection(section) {
    const sectionElement = document.createElement('div');
    sectionElement.className = 'text-page-section';
    
    // Add custom classes if specified
    if (section.classes) {
        section.classes.forEach(className => {
            sectionElement.classList.add(className);
        });
    }
    
    // Apply custom styles if provided
    if (section.style) {
        for (const [property, value] of Object.entries(section.style)) {
            sectionElement.style[property] = value;
        }
    }
    
    // Add specific alignment class if needed
    if (section.align) {
        sectionElement.classList.add(`align-${section.align}`);
    }
    
    // Add title if provided
    if (section.title) {
        const titleElement = document.createElement('h2');
        titleElement.className = 'text-page-title';
        titleElement.innerHTML = processTextFormatting(section.title);
        
        // Apply title-specific styles if provided
        if (section.titleStyle) {
            for (const [property, value] of Object.entries(section.titleStyle)) {
                titleElement.style[property] = value;
            }
        }
        
        sectionElement.appendChild(titleElement);
    }
    
    // Add subtitle if provided
    if (section.subtitle) {
        const subtitleElement = document.createElement('h3');
        subtitleElement.className = 'text-page-subtitle';
        subtitleElement.innerHTML = processTextFormatting(section.subtitle);
        
        // Apply subtitle-specific styles if provided
        if (section.subtitleStyle) {
            for (const [property, value] of Object.entries(section.subtitleStyle)) {
                subtitleElement.style[property] = value;
            }
        }
        
        sectionElement.appendChild(subtitleElement);
    }
    
    // Add content
    if (section.content) {
        // Process paragraphs if content is an array
        if (Array.isArray(section.content)) {
            section.content.forEach(paragraph => {
                const paragraphElement = document.createElement('p');
                paragraphElement.className = 'text-page-paragraph';
                paragraphElement.innerHTML = processTextFormatting(paragraph);
                sectionElement.appendChild(paragraphElement);
            });
        } 
        // Process as HTML if content is a string
        else {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'text-page-content';
            contentDiv.innerHTML = processTextFormatting(section.content);
            sectionElement.appendChild(contentDiv);
        }
    }
    
    // Add image if provided
    if (section.image) {
        const imageWrapper = document.createElement('div');
        imageWrapper.className = 'text-page-image-wrapper';
        
        // Apply image alignment if specified
        if (section.imageAlign) {
            imageWrapper.classList.add(`image-align-${section.imageAlign}`);
        }
        
        const imageElement = document.createElement('img');
        imageElement.src = section.image;
        imageElement.alt = section.imageAlt || 'Image';
        imageElement.className = 'text-page-image';
        
        // Apply image styles if provided
        if (section.imageStyle) {
            for (const [property, value] of Object.entries(section.imageStyle)) {
                imageElement.style[property] = value;
            }
        }
        
        imageWrapper.appendChild(imageElement);
        
        // Add caption if provided
        if (section.imageCaption) {
            const captionElement = document.createElement('figcaption');
            captionElement.className = 'text-page-image-caption';
            captionElement.innerHTML = processTextFormatting(section.imageCaption);
            imageWrapper.appendChild(captionElement);
        }
        
        sectionElement.appendChild(imageWrapper);
    }
    
    return sectionElement;
}

// Process text formatting with custom tags
function processTextFormatting(text) {
    if (!text) return '';
    
    // Replace line breaks with <br> tags
    let processedText = text.replace(/\n/g, '<br>');
    
    // Process color tags - [color:red]text[/color]
    processedText = processedText.replace(/\[color:([^[\]]+)\]([^[]+)\[\/color\]/g, 
        '<span style="color:$1">$2</span>');
    
    // Process background color tags - [bg:yellow]text[/bg]
    processedText = processedText.replace(/\[bg:([^[\]]+)\]([^[]+)\[\/bg\]/g, 
        '<span style="background-color:$1">$2</span>');
    
    // Process size tags - [size:16px]text[/size]
    processedText = processedText.replace(/\[size:([^[\]]+)\]([^[]+)\[\/size\]/g, 
        '<span style="font-size:$1">$2</span>');
    
    // Process bold tags - [b]text[/b]
    processedText = processedText.replace(/\[b\]([^[]+)\[\/b\]/g, '<strong>$1</strong>');
    
    // Process italic tags - [i]text[/i]
    processedText = processedText.replace(/\[i\]([^[]+)\[\/i\]/g, '<em>$1</em>');
    
    // Process underline tags - [u]text[/u]
    processedText = processedText.replace(/\[u\]([^[]+)\[\/u\]/g, '<u>$1</u>');
    
    // Process link tags - [link:url]text[/link]
    processedText = processedText.replace(/\[link:([^[\]]+)\]([^[]+)\[\/link\]/g, 
        '<a href="$1" target="_blank">$2</a>');
    
    // Process internal navigation links - [json:filename.json]text[/json]
    processedText = processedText.replace(/\[json:([^[\]]+)\]([^[]+)\[\/json\]/g, 
        '<a href="#" class="json-link" data-json="$1">$2</a>');
    
    // Process highlight tags - [highlight]text[/highlight]
    processedText = processedText.replace(/\[highlight\]([^[]+)\[\/highlight\]/g, 
        '<span class="highlight">$1</span>');
    
    // Process subdued tags - [subdued]text[/subdued]
    processedText = processedText.replace(/\[subdued\]([^[]+)\[\/subdued\]/g, 
        '<span class="subdued">$1</span>');
    
    // Process alignment tags - [align:left]text[/align]
    processedText = processedText.replace(/\[align:([^[\]]+)\]([^[]+)\[\/align\]/g, 
        '<div style="text-align:$1">$2</div>');
    
    return processedText;
}

// Setup interactive elements in text pages
function setupTextPageInteractions() {
    // Add click handlers for JSON navigation links
    document.querySelectorAll('.json-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const jsonFile = link.getAttribute('data-json');
            
            if (jsonFile) {
                // Update the URL
                const url = new URL(window.location);
                url.searchParams.set('json', jsonFile);
                window.history.pushState({}, '', url);
                
                // Update the data source and reload the content
                DATA_SOURCE = jsonFile;
                initializeWebsite();
                
                // Scroll back to top
                window.scrollTo(0, 0);
            }
        });
    });
}

// Function to populate footer navigation
function populateFooterNavigation(items) {
    const footerLinks = document.getElementById('footerLinks');
    footerLinks.innerHTML = '';

    if (!items || items.length === 0) {
        footerLinks.innerHTML = '<div class="error-message">No footer links found</div>';
        return;
    }

    items.forEach(item => {
        const link = document.createElement('a');
        link.href = item.json ? '#' : (item.link || '#');
        link.textContent = item.title;
        
        // Add click handler if item has json property
        if (item.json) {
            link.addEventListener('click', (e) => {
                handleNavigation(item, e);
            });
        }
        
        footerLinks.appendChild(link);
    });
}

// Function to populate social links
function populateSocialLinks(items) {
    const socialLinks = document.getElementById('socialLinks');
    socialLinks.innerHTML = '';

    if (!items || items.length === 0) {
        return; // Social links are optional, no error needed
    }

    items.forEach(item => {
        const link = document.createElement('a');
        link.href = item.json ? '#' : (item.link || '#');
        link.className = 'social-icon';
        
        const icon = document.createElement('i');
        icon.className = item.icon;
        
        link.appendChild(icon);
        
        // Add click handler if item has json property
        if (item.json) {
            link.addEventListener('click', (e) => {
                handleNavigation(item, e);
            });
        }
        
        socialLinks.appendChild(link);
    });
}

// Add smooth scrolling for the card container
function setupCardScrolling() {
    const cardsWrapper = document.querySelector('.cards-wrapper');
    if (cardsWrapper) {
        cardsWrapper.addEventListener('wheel', function(e) {
            if (e.deltaY !== 0) {
                e.preventDefault();
                this.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }
}

// Mobile dropdown toggle
function setupMobileDropdowns() {
    document.addEventListener('click', function(e) {
        if (window.innerWidth <= 768) {
            const navItem = e.target.closest('.dropdown');
            if (navItem) {
                e.preventDefault();
                navItem.classList.toggle('active');
            }
        }
    });
}

// Handle "home" functionality - clear any json parameter and load index.json
function setupHomeNavigation() {
    document.querySelector('.logo').addEventListener('click', () => {
        // Only reload if we're not already on the home page
        if (DATA_SOURCE !== 'index.json') {
            // Update URL by removing json parameter
            const url = new URL(window.location);
            url.searchParams.delete('json');
            window.history.pushState({}, '', url);
            
            // Load index.json
            DATA_SOURCE = 'index.json';
            initializeWebsite();
            
            // Scroll back to top
            window.scrollTo(0, 0);
        }
    });
}

// Browser back button support
window.addEventListener('popstate', () => {
    // Get the JSON parameter from the updated URL
    const urlParams = new URLSearchParams(window.location.search);
    DATA_SOURCE = urlParams.has('json') ? urlParams.get('json') : 'index.json';
    
    // Reload content with the new JSON
    initializeWebsite();
});

// Initialize event listeners
function initializeEventListeners() {
    setupCardScrolling();
    setupMobileDropdowns();
    setupHomeNavigation();
}

// Add CSS styles for text pages
function addTextPageStyles() {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
        /* Text Page Styles */
        .text-page-container {
            padding: 0;
            overflow-x: hidden;
            overflow-y: auto;
            width: 100%;
            height: 100%;
        }
        
        .text-page-wrapper {
            max-width: 1000px;
            margin: 0 auto;
            padding: 20px;
        }
        
        .text-page-section {
            margin-bottom: 30px;
            line-height: 1.6;
        }
        
        .text-page-title {
            font-size: 2rem;
            margin-bottom: 1rem;
            color: var(--primary-color, #333);
        }
        
        .text-page-subtitle {
            font-size: 1.5rem;
            margin-bottom: 1rem;
            color: var(--secondary-color, #555);
        }
        
        .text-page-paragraph {
            margin-bottom: 1rem;
        }
        
        .text-page-image-wrapper {
            margin: 1.5rem 0;
        }
        
        .text-page-image {
            max-width: 100%;
            border-radius: 5px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }
        
        .text-page-image-caption {
            margin-top: 0.5rem;
            font-style: italic;
            color: #666;
            font-size: 0.9rem;
            text-align: center;
        }
        
        /* Alignment classes */
        .align-left {
            text-align: left;
        }
        
        .align-center {
            text-align: center;
        }
        
        .align-right {
            text-align: right;
        }
        
        .align-justify {
            text-align: justify;
        }
        
        /* Image alignment */
        .image-align-left {
            float: left;
            margin-right: 20px;
            margin-bottom: 10px;
            max-width: 40%;
        }
        
        .image-align-right {
            float: right;
            margin-left: 20px;
            margin-bottom: 10px;
            max-width: 40%;
        }
        
        .image-align-center {
            display: block;
            margin-left: auto;
            margin-right: auto;
            text-align: center;
        }
        
        /* Highlight and subdued */
        .highlight {
            background-color: rgba(255, 255, 0, 0.3);
            padding: 0 3px;
        }
        
        .subdued {
            opacity: 0.7;
            font-size: 0.9em;
        }
        
        /* Clear floats */
        .clearfix::after {
            content: "";
            clear: both;
            display: table;
        }
        
        /* Responsive adjustments */
        @media (max-width: 768px) {
            .text-page-wrapper {
                padding: 15px;
            }
            
            .image-align-left,
            .image-align-right {
                float: none;
                margin: 1rem 0;
                max-width: 100%;
                text-align: center;
            }
            
            .text-page-title {
                font-size: 1.8rem;
            }
            
            .text-page-subtitle {
                font-size: 1.3rem;
            }
        }
    `;
    
    document.head.appendChild(styleElement);
}

// Load the website when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    addTextPageStyles();
    initializeWebsite();
    initializeEventListeners();
});