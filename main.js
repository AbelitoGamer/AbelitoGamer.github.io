// Global state
let defaultData = null;
let bgInitialized = false;

// Fetch data with fallback
async function fetchData(source = DATA_SOURCE, isDefault = false) {
    try {
        const res = await fetch(source);
        if (!res.ok) {
            if (source !== 'index.json') {
                console.warn(`Loading ${source} failed, using index.json`);
                DATA_SOURCE = 'index.json';
                return fetchData();
            }
            throw new Error(`Fetch failed: ${res.status}`);
        }
        const data = await res.json();
        if (source === 'index.json' && !isDefault) defaultData = data;
        return data;
    } catch (error) {
        console.error(`Error fetching ${source}:`, error);
        if (!isDefault) showError('Could not load data. Please refresh.');
        return null;
    }
}

// Ensure default data
async function ensureDefault() {
    if (!defaultData && DATA_SOURCE !== 'index.json') {
        defaultData = await fetchData('index.json', true);
    }
}

// Show error message
function showError(msg) {
    ['topNavLinks', 'cardContainer', 'footerLinks'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<div class="error-message"><i class="fas fa-exclamation-triangle"></i>${msg}</div>`;
    });
}

// Handle navigation
function handleNav(item, e) {
    if (item.json) {
        e.preventDefault();
        const url = new URL(window.location);
        url.searchParams.set('json', item.json);
        window.history.pushState({}, '', url);
        DATA_SOURCE = item.json;
        init();
        window.scrollTo(0, 0);
        return true;
    }
    return false;
}

// Initialize background
function initBg() {
    if (bgInitialized) return;
    bgInitialized = true;
    const bg = document.querySelector('.bg-container');
    if (!bg) return;
    let scrollBg = bg.querySelector('.scrolling-bg');
    if (!scrollBg) {
        scrollBg = document.createElement('div');
        scrollBg.className = 'scrolling-bg';
        bg.appendChild(scrollBg);
    }
}

// Main initialization
async function init() {
    initBg();
    
    // Show loading
    const loading = '<div class="loading"><div class="loading-spinner"></div>Loading...</div>';
    document.getElementById('topNavLinks').innerHTML = loading;
    document.getElementById('cardContainer').innerHTML = loading;
    document.getElementById('textPageContainer').innerHTML = loading;
    document.getElementById('footerLinks').innerHTML = loading;
    
    await ensureDefault();
    const data = await fetchData();
    if (!data) return;
    
    // Set site info
    document.title = data.siteInfo.title || 'Funky Atlas';
    document.getElementById('siteName').textContent = data.siteInfo.name || 'Funky Atlas';
    document.getElementById('pageTitle').textContent = data.siteInfo.title || 'Funky Atlas';
    document.getElementById('pageSubtitle').textContent = data.siteInfo.subtitle || '';
    document.getElementById('copyright').textContent = data.siteInfo.copyright || '© 2025 Funky Atlas';
    
    // Merge with defaults
    const final = {
        ...data,
        topNavigation: data.topNavigation || defaultData?.topNavigation || [],
        footerNavigation: data.footerNavigation || defaultData?.footerNavigation || [],
        socialLinks: data.socialLinks || defaultData?.socialLinks || [],
        cards: data.cards || [],
        textpage: data.textpage || null
    };
    
    populateNav(final.topNavigation);
    
    const wrapper = document.querySelector('.content-wrapper');
    if (final.textpage) {
        wrapper.classList.add('textpage-active');
        populateText(final.textpage);
    } else {
        wrapper.classList.remove('textpage-active');
        populateCards(final.cards);
    }
    
    populateFooter(final.footerNavigation);
    populateSocial(final.socialLinks);
}

// Populate navigation
function populateNav(items) {
    const nav = document.getElementById('topNavLinks');
    nav.innerHTML = '';
    if (!items?.length) {
        nav.innerHTML = '<div class="error-message">No navigation items found</div>';
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
        
        link.appendChild(document.createTextNode(` ${item.title}`));
        
        if (item.json) {
            link.addEventListener('click', e => handleNav(item, e));
        }
        
        if (item.dropdown?.length) {
            const caret = document.createElement('i');
            caret.className = 'fas fa-caret-down';
            caret.style.marginLeft = '5px';
            link.appendChild(caret);
            
            const dropdown = document.createElement('div');
            dropdown.className = 'dropdown-content';
            
            item.dropdown.forEach(dropItem => {
                const dropLink = document.createElement('a');
                dropLink.href = dropItem.json ? '#' : (dropItem.link || '#');
                dropLink.textContent = dropItem.title;
                if (dropItem.json) {
                    dropLink.addEventListener('click', e => handleNav(dropItem, e));
                }
                dropdown.appendChild(dropLink);
            });
            
            navItem.appendChild(link);
            navItem.appendChild(dropdown);
        } else {
            navItem.appendChild(link);
        }
        
        nav.appendChild(navItem);
    });
}

// Populate cards
function populateCards(cards) {
    const container = document.getElementById('cardContainer');
    container.innerHTML = '';
    
    document.getElementById('cardsWrapper').style.display = 'block';
    document.getElementById('textpageWrapper').style.display = 'none';
    
    if (!cards?.length) {
        container.innerHTML = '<div class="error-message">No cards found</div>';
        return;
    }
    
    cards.forEach(cardData => {
        const card = document.createElement('a');
        card.href = cardData.json ? '#' : (cardData.link || '#');
        card.className = 'card';
        
        if (cardData.json) {
            card.addEventListener('click', e => handleNav(cardData, e));
        }
        
        const bg = document.createElement('div');
        bg.className = 'card-background';
        bg.style.backgroundImage = `url('${cardData.backgroundImage || cardData.image}')`;
        
        const imgDiv = document.createElement('div');
        imgDiv.className = 'card-image';
        const img = document.createElement('img');
        img.src = cardData.image || '/api/placeholder/400/320';
        img.alt = cardData.title;
        imgDiv.appendChild(img);
        
        const content = document.createElement('div');
        content.className = 'card-content';
        
        const title = document.createElement('h3');
        title.className = 'card-title';
        title.textContent = cardData.title;
        
        const text = document.createElement('p');
        text.className = 'card-text';
        
        if (cardData.description) {
            let desc = cardData.description;
            if (cardData.highlights) {
                cardData.highlights.forEach(h => {
                    desc = desc.replace(new RegExp(h, 'gi'), `<span class="highlight">${h}</span>`);
                });
            }
            if (cardData.subdued) {
                cardData.subdued.forEach(s => {
                    desc = desc.replace(new RegExp(s, 'gi'), `<span class="subdued">${s}</span>`);
                });
            }
            text.innerHTML = desc;
        }
        
        content.appendChild(title);
        content.appendChild(text);
        
        card.appendChild(bg);
        card.appendChild(imgDiv);
        card.appendChild(content);
        
        container.appendChild(card);
    });
}

// Populate text page
function populateText(textpage) {
    const container = document.getElementById('textPageContainer');
    container.innerHTML = '';
    
    document.getElementById('cardsWrapper').style.display = 'none';
    document.getElementById('textpageWrapper').style.display = 'block';
    
    if (!textpage || (!textpage.sections && !textpage.content)) {
        container.innerHTML = '<div class="error-message">No text page content found</div>';
        return;
    }
    
    const content = document.createElement('div');
    content.className = 'text-page-content';
    
    if (textpage.content) {
        content.appendChild(createSection(textpage));
    } else if (textpage.sections?.length) {
        textpage.sections.forEach(section => {
            content.appendChild(createSection(section));
        });
    }
    
    container.appendChild(content);
    setupTextInteractions();
}

// Create text section
function createSection(section) {
    const div = document.createElement('div');
    div.className = 'text-page-section';
    
    if (section.classes) section.classes.forEach(c => div.classList.add(c));
    if (section.style) Object.assign(div.style, section.style);
    if (section.align) div.classList.add(`align-${section.align}`);
    
    if (section.title) {
        const title = document.createElement('h2');
        title.className = 'text-page-title';
        title.innerHTML = processText(section.title);
        if (section.titleStyle) Object.assign(title.style, section.titleStyle);
        div.appendChild(title);
    }
    
    if (section.subtitle) {
        const subtitle = document.createElement('h3');
        subtitle.className = 'text-page-subtitle';
        subtitle.innerHTML = processText(section.subtitle);
        if (section.subtitleStyle) Object.assign(subtitle.style, section.subtitleStyle);
        div.appendChild(subtitle);
    }
    
    if (section.content) {
        if (Array.isArray(section.content)) {
            section.content.forEach(p => {
                const para = document.createElement('p');
                para.className = 'text-page-paragraph';
                para.innerHTML = processText(p);
                div.appendChild(para);
            });
        } else {
            const contentDiv = document.createElement('div');
            contentDiv.className = 'text-page-content';
            contentDiv.innerHTML = processText(section.content);
            div.appendChild(contentDiv);
        }
    }
    
    if (section.image) {
        const wrapper = document.createElement('div');
        wrapper.className = 'text-page-image-wrapper';
        if (section.imageAlign) wrapper.classList.add(`image-align-${section.imageAlign}`);
        
        const img = document.createElement('img');
        img.src = section.image;
        img.alt = section.imageAlt || 'Image';
        img.className = 'text-page-image';
        if (section.imageStyle) Object.assign(img.style, section.imageStyle);
        wrapper.appendChild(img);
        
        if (section.imageCaption) {
            const caption = document.createElement('figcaption');
            caption.className = 'text-page-image-caption';
            caption.innerHTML = processText(section.imageCaption);
            wrapper.appendChild(caption);
        }
        
        div.appendChild(wrapper);
    }
    
    return div;
}

// Process text formatting
function processText(text) {
    if (!text) return '';
    
    return text
        .replace(/\n/g, '<br>')
        .replace(/\[color:([^[\]]+)\]([^[]+)\[\/color\]/g, '<span style="color:$1">$2</span>')
        .replace(/\[bg:([^[\]]+)\]([^[]+)\[\/bg\]/g, '<span style="background-color:$1">$2</span>')
        .replace(/\[size:([^[\]]+)\]([^[]+)\[\/size\]/g, '<span style="font-size:$1">$2</span>')
        .replace(/\[b\]([^[]+)\[\/b\]/g, '<strong>$1</strong>')
        .replace(/\[i\]([^[]+)\[\/i\]/g, '<em>$1</em>')
        .replace(/\[u\]([^[]+)\[\/u\]/g, '<u>$1</u>')
        .replace(/\[link:([^[\]]+)\]([^[]+)\[\/link\]/g, '<a href="$1" target="_blank">$2</a>')
        .replace(/\[json:([^[\]]+)\]([^[]+)\[\/json\]/g, '<a href="#" class="json-link" data-json="$1">$2</a>')
        .replace(/\[highlight\]([^[]+)\[\/highlight\]/g, '<span class="highlight">$1</span>')
        .replace(/\[subdued\]([^[]+)\[\/subdued\]/g, '<span class="subdued">$1</span>')
        .replace(/\[align:([^[\]]+)\]([^[]+)\[\/align\]/g, '<div style="text-align:$1">$2</div>');
}

// Setup text interactions
function setupTextInteractions() {
    document.querySelectorAll('.json-link').forEach(link => {
        link.addEventListener('click', e => {
            e.preventDefault();
            const json = link.getAttribute('data-json');
            if (json) {
                const url = new URL(window.location);
                url.searchParams.set('json', json);
                window.history.pushState({}, '', url);
                DATA_SOURCE = json;
                init();
                window.scrollTo(0, 0);
            }
        });
    });
}

// Populate footer
function populateFooter(items) {
    const footer = document.getElementById('footerLinks');
    footer.innerHTML = '';
    if (!items?.length) {
        footer.innerHTML = '<div class="error-message">No footer links found</div>';
        return;
    }
    
    items.forEach(item => {
        const link = document.createElement('a');
        link.href = item.json ? '#' : (item.link || '#');
        link.textContent = item.title;
        if (item.json) {
            link.addEventListener('click', e => handleNav(item, e));
        }
        footer.appendChild(link);
    });
}

// Populate social links
function populateSocial(items) {
    const social = document.getElementById('socialLinks');
    social.innerHTML = '';
    if (!items?.length) return;
    
    items.forEach(item => {
        const link = document.createElement('a');
        link.href = item.json ? '#' : (item.link || '#');
        link.className = 'social-icon';
        
        const icon = document.createElement('i');
        icon.className = item.icon;
        link.appendChild(icon);
        
        if (item.json) {
            link.addEventListener('click', e => handleNav(item, e));
        }
        
        social.appendChild(link);
    });
}

// Event listeners
function setupEvents() {
    // Card scrolling
    const wrapper = document.querySelector('.cards-wrapper');
    if (wrapper) {
        wrapper.addEventListener('wheel', e => {
            if (e.deltaY !== 0) {
                e.preventDefault();
                wrapper.scrollLeft += e.deltaY;
            }
        }, { passive: false });
    }
    
    // Mobile dropdowns
    document.addEventListener('click', e => {
        if (window.innerWidth <= 768) {
            const navItem = e.target.closest('.dropdown');
            if (navItem) {
                e.preventDefault();
                navItem.classList.toggle('active');
            }
        }
    });
    
    // Home navigation
    document.querySelector('.logo').addEventListener('click', () => {
        if (DATA_SOURCE !== 'index.json') {
            const url = new URL(window.location);
            url.searchParams.delete('json');
            window.history.pushState({}, '', url);
            DATA_SOURCE = 'index.json';
            init();
            window.scrollTo(0, 0);
        }
    });
}

// Browser back button
window.addEventListener('popstate', () => {
    const params = new URLSearchParams(window.location.search);
    DATA_SOURCE = params.has('json') ? params.get('json') : 'index.json';
    init();
});

// Add styles
function addStyles() {
    const style = document.createElement('style');
    style.textContent = `
.text-page-container{padding:0;overflow-x:hidden;overflow-y:auto;width:100%;height:100%}
.text-page-wrapper{max-width:800px;margin:0 auto;padding:40px}
.text-page-content{margin:0 auto;line-height:1.6}
.text-page-section{margin-bottom:40px;padding:0 15px;line-height:1.6}
.text-page-title{font-size:2rem;margin-bottom:1.5rem}
.text-page-subtitle{font-size:1.5rem;margin-bottom:1.5rem}
.text-page-paragraph{margin-bottom:1.2rem;line-height:1.7}
.text-page-image-wrapper{margin:1.5rem 0}
.text-page-image{max-width:100%;border-radius:5px;box-shadow:0 2px 8px rgba(0,0,0,0.1)}
.text-page-image-caption{margin-top:0.5rem;font-style:italic;color:#666;font-size:0.9rem;text-align:center}
.align-left{text-align:left}
.align-center{text-align:center}
.align-right{text-align:right}
.align-justify{text-align:justify}
.image-align-left{float:left;margin-right:20px;margin-bottom:10px;max-width:40%}
.image-align-right{float:right;margin-left:20px;margin-bottom:10px;max-width:40%}
.image-align-center{display:block;margin-left:auto;margin-right:auto;text-align:center}
.highlight{background-color:rgba(255,255,0,0.3);padding:0 3px}
.subdued{opacity:0.7;font-size:0.9em}
.clearfix::after{content:"";clear:both;display:table}
@media (max-width:768px){
.text-page-wrapper{padding:20px}
.text-page-section{padding:0 10px;margin-bottom:30px}
.text-page-title{font-size:1.8rem}
.text-page-subtitle{font-size:1.3rem}
.image-align-left,.image-align-right{float:none;margin:1rem 0;max-width:100%;text-align:center}
}
@media (max-width:480px){
.text-page-wrapper{padding:15px 10px}
.text-page-section{padding:0 5px}
}`;
    document.head.appendChild(style);
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    addStyles();
    initBg();
    init();
    setupEvents();
});