// Animation handling functions
function handleSongAnimation(songElement, songName) {
    return new Promise((resolve) => {
        const sanitizedSongId = songName.toLowerCase().replace(/\s+/g, '-');
        const iconContainer = songElement.querySelector(`#icon-${sanitizedSongId}`);
        if (!iconContainer || !iconContainer.stage || !iconContainer.stage.children.length) {
            // No animation available; continue gracefully
            resolve();
            return;
        }

        const sprite = iconContainer.stage.children[0];
        // Play confirm animation
        sprite.gotoAndPlay("confirm");

        // Wait for confirm animation to finish and add hold time
        const handleAnimEnd = () => {
            setTimeout(resolve, 500);
            sprite.removeEventListener("animationend", handleAnimEnd);
        };
        sprite.addEventListener("animationend", handleAnimEnd);
    });
}

let songData = null;
let downloadModal = null;
let latestSelectionToken = 0; // Tracks most recent song click

// Keyboard navigation state
let currentFocusMode = 'list'; // 'list', 'filters', 'modal'
let currentSongIndex = 0;
let currentModalButtonIndex = 0;
let keyboardEnabled = true;

// Cache for SpriteSheets (by icon name) and active CreateJS stages to clean up between renders
const iconSprites = {};
const activeStages = new Set();

async function loadIconData(iconName) {
    if (iconSprites[iconName]) return iconSprites[iconName]; // For backward compatibility, but will change below

    try {
        // Load XML data
        // Load the image first to make sure it exists
        const image = new Image();
        image.src = `resources/icons/${iconName}pixel.png`;
        await new Promise((resolve, reject) => {
            image.onload = resolve;
            image.onerror = () => reject(new Error(`Image load failed: ${iconName}pixel.png`));
        });

        const xmlResponse = await fetch(`resources/icons/${iconName}pixel.xml`);
        if (!xmlResponse.ok) {
            throw new Error(`Failed to load XML: ${iconName}pixel.xml`);
        }
        
        const xmlText = await xmlResponse.text();
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Parse XML frames
        const frames = [];
        const idleFrames = [];
        const frameElements = xmlDoc.getElementsByTagName("SubTexture");
        
        for (let i = 0; i < frameElements.length; i++) {
            const frame = frameElements[i];
            const frameName = frame.getAttribute("name");
            
            // Create frame data
            const frameData = [
                parseInt(frame.getAttribute("x")),
                parseInt(frame.getAttribute("y")),
                parseInt(frame.getAttribute("width")),
                parseInt(frame.getAttribute("height"))
            ];
            
            frames.push(frameData);
            
            // If frame name contains "idle", add it to idle animation
            if (frameName.toLowerCase().includes("idle")) {
                idleFrames.push(i);
            }
        }

        // If no specific idle frames found, use first frame
        if (idleFrames.length === 0) {
            idleFrames.push(0);
        }

        // Sort frames by animation type
        const animations = {
            idle: [],
            confirm: [],
            'confirm-hold': []
        };

        for (let i = 0; i < frameElements.length; i++) {
            const frameName = frameElements[i].getAttribute("name").toLowerCase();
            if (frameName.includes("confirm") && frameName.includes("hold")) {
                animations['confirm-hold'].push(i);
            } else if (frameName.includes("confirm")) {
                animations.confirm.push(i);
            } else if (frameName.includes("idle")) {
                animations.idle.push(i);
            }
        }

        // If no specific frames found, use first frame as fallback
        if (animations.idle.length === 0) animations.idle = [0];
        if (animations.confirm.length === 0) animations.confirm = animations.idle;
        if (animations['confirm-hold'].length === 0) animations['confirm-hold'] = animations.confirm;

        // Create sprite sheet with all animations
        const spriteSheet = new createjs.SpriteSheet({
            images: [image],
            frames: frames,
            animations: {
                idle: {
                    frames: animations.idle,
                    speed: 0.2
                },
                confirm: {
                    frames: animations.confirm,
                    speed: 0.4,
                    next: "confirm-hold"
                },
                'confirm-hold': {
                    frames: animations['confirm-hold'],
                    speed: 0.2
                },
                'confirm-reverse': {
                    // Use confirm frames in reverse
                    frames: animations.confirm.slice().reverse(),
                    speed: 0.4
                }
            }
        });

        // Cache only the spriteSheet, not the sprite instance
        iconSprites[iconName] = spriteSheet;
        return spriteSheet;
    } catch (error) {
        console.error(`Error loading icon ${iconName}:`, error);
        return null;
    }
}

function setupIconAnimation(iconContainer, iconName) {
    // Guard: ensure iconContainer exists
    if (!iconContainer) {
        console.warn(`Icon container not found for ${iconName}`);
        return Promise.resolve(null);
    }
    
    // Remove previous stage from ticker if present
    if (iconContainer.stage) {
        createjs.Ticker.removeEventListener("tick", iconContainer.stage);
    }
    // Remove previous canvas/children if present
    while (iconContainer.firstChild) {
        iconContainer.removeChild(iconContainer.firstChild);
    }
    // Extra: forcefully delete any lingering stage reference
    delete iconContainer.stage;
    // Create canvas for the icon
    const canvas = document.createElement('canvas');
    canvas.width = 112;
    canvas.height = 112;
    iconContainer.appendChild(canvas);
    // Setup CreateJS stage
    const stage = new createjs.Stage(canvas);
    iconContainer.stage = stage; // Store stage reference directly on container
    // Force pixel-perfect rendering on the canvas
    canvas.style.imageRendering = 'pixelated';
    canvas.style.imageRendering = 'crisp-edges';
    // Disable smoothing on the canvas context
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    // Framerate set once on DOMContentLoaded
    // Create a promise to handle sprite loading
    return new Promise((resolve) => {
        // Load and setup sprite
        loadIconData(iconName).then(spriteSheet => {
            if (spriteSheet) {
                const iconSprite = new createjs.Sprite(spriteSheet, "idle");
                iconSprite.x = canvas.width / 2;
                iconSprite.y = canvas.height / 2;
                // Set scale before getting bounds
                iconSprite.scaleX = iconSprite.scaleY = 2.25;
                const bounds = iconSprite.getBounds();
                if (bounds) {
                    iconSprite.regX = bounds.width / 2;
                    iconSprite.regY = bounds.height / 2;
                }
                stage.addChild(iconSprite);
                stage.update(); // Initial update
                // Update stage continuously
                createjs.Ticker.addEventListener("tick", stage);
                activeStages.add(stage);
                resolve(stage);
            }
        }).catch(error => {
            console.error(`Error in setupIconAnimation for ${iconName}:`, error);
            resolve(stage); // Resolve even on error to prevent hanging
        });
    });

    // No need to return stage here
}

function getCurrentVariantName() {
    const difficulty = document.getElementById('difficultySelect').value;
    const character = document.getElementById('characterSelect').value;
    return character === 'bf' ? difficulty : `${difficulty}-${character}`;
}

function updateSelectors(data) {
    const difficultySelect = document.getElementById('difficultySelect');
    const characterSelect = document.getElementById('characterSelect');

    // Save current selections
    const currentDifficulty = difficultySelect.value;
    const currentCharacter = characterSelect.value;

    // Clear and update difficulty selector
    difficultySelect.innerHTML = '';
    data.difficulties.forEach(difficulty => {
        const option = document.createElement('option');
        option.value = difficulty;
        option.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
        difficultySelect.appendChild(option);
    });

    // Clear and update character selector
    characterSelect.innerHTML = '';
    Object.keys(data.characters).forEach(character => {
        const option = document.createElement('option');
        option.value = character;
        option.textContent = character.toUpperCase();
        characterSelect.appendChild(option);
    });

    // Restore selections if they still exist in the options
    if (Array.from(difficultySelect.options).some(opt => opt.value === currentDifficulty)) {
        difficultySelect.value = currentDifficulty;
    }
    if (Array.from(characterSelect.options).some(opt => opt.value === currentCharacter)) {
        characterSelect.value = currentCharacter;
    }
}

function isDownloadAvailable(variant) {
    return variant && 
           variant.download && 
           (variant.download.landscape !== '#' || variant.download.portrait !== '#');
}

function getVariant(details, variantName) {
    return details?.variants?.[0]?.[variantName];
}

async function handleSongClick(songElement, songName, songDetails) {
    // Bump token to mark a new selection. Capture for this click.
    const clickToken = ++latestSelectionToken;
    const variantName = getCurrentVariantName();
    const variant = getVariant(songDetails, variantName);
    
    if (!variant || !isDownloadAvailable(variant)) {
        alert('This version is not available for the selected song.');
        return;
    }

    const sanitizedSongId = songName.toLowerCase().replace(/\s+/g, '-');
    const iconContainer = songElement.querySelector(`#icon-${sanitizedSongId}`);
    const sprite = iconContainer?.stage?.children?.[0];
    if (sprite) {
        // Attach the click token to the sprite so we know which selection it belongs to
        sprite._selectionToken = clickToken;
    }

    // Play animation and wait for it to complete
    await handleSongAnimation(songElement, songName);

    // Add modal close handler before showing modal
    const modalEl = document.getElementById('downloadModal');
    
    // Switch to modal mode when modal opens
    modalEl.addEventListener('shown.bs.modal', () => {
        switchToModalMode();
    }, { once: true });
    
    modalEl.addEventListener('hidden.bs.modal', () => {
        // Only act if this handler belongs to the latest selection
        if (!sprite || sprite._selectionToken !== latestSelectionToken) return;
        sprite.addEventListener("animationend", function onReverseEnd() {
            sprite.removeEventListener("animationend", onReverseEnd);
            sprite.gotoAndPlay("idle");
        });
        sprite.gotoAndPlay("confirm-reverse");
        
        // Return to list mode when modal closes
        switchToListMode();
    }, { once: true });

    // Show download modal
    const modalSongName = document.getElementById('modalSongName');
    const modalVariantName = document.getElementById('modalVariantName');
    const landscapeBtn = document.getElementById('landscapeBtn');
    const portraitBtn = document.getElementById('portraitBtn');

    modalSongName.textContent = songName;
    modalVariantName.textContent = `${variantName} (${variant.bpm} BPM)`;

    // Configure landscape button
    if (variant.download.landscape === '#') {
        landscapeBtn.classList.remove('btn-primary');
        landscapeBtn.classList.add('btn-secondary');
        landscapeBtn.disabled = true;
        landscapeBtn.innerHTML = 'Landscape Version<br><small class="text-muted">Not Available</small>';
    } else {
        landscapeBtn.classList.remove('btn-secondary');
        landscapeBtn.classList.add('btn-primary');
        landscapeBtn.disabled = false;
        landscapeBtn.innerHTML = 'Landscape Version';
        landscapeBtn.onclick = () => window.location.href = variant.download.landscape;
    }

    // Configure portrait button
    if (variant.download.portrait === '#') {
        portraitBtn.classList.remove('btn-success');
        portraitBtn.classList.add('btn-secondary');
        portraitBtn.disabled = true;
        portraitBtn.innerHTML = 'Portrait Version<br><small class="text-muted">Not Available</small>';
    } else {
        portraitBtn.classList.remove('btn-secondary');
        portraitBtn.classList.add('btn-success');
        portraitBtn.disabled = false;
        portraitBtn.innerHTML = 'Portrait Version';
        portraitBtn.onclick = () => window.location.href = variant.download.portrait;
    }

    downloadModal.show();
}

async function loadSongs() {
    try {
        const response = await fetch('FunkyBasedata.json');
        const data = await response.json();
        songData = data;
        const songListContainer = document.getElementById('songList');

        // Update the selectors with available options from the JSON data
        updateSelectors(data);
        
        // Clear existing content and cleanup running stages/tickers
        cleanupStages();
        songListContainer.innerHTML = '';
        
        // Reset keyboard selection
        currentSongIndex = 0;
        
        const variantName = getCurrentVariantName();
        
        data.songs.forEach(songObj => {
            for (const [songName, details] of Object.entries(songObj)) {
                const songElement = document.createElement('div');
                songElement.className = 'song-item';
                
                // Sanitize song name for use in HTML IDs (replace spaces and special chars with hyphens)
                const sanitizedSongId = songName.toLowerCase().replace(/\s+/g, '-');
                
                // Get current variant based on selected options
                const currentVariant = getVariant(details, variantName);
                const isAvailable = currentVariant && isDownloadAvailable(currentVariant);
                
                // Add unavailable class if song is not available
                if (!isAvailable) {
                    songElement.classList.add('unavailable');
                }
                
                // Render song item with available info or placeholder
                const bpm = currentVariant ? currentVariant.bpm : 'N/A';
                const week = currentVariant ? currentVariant.week : 'N/A';
                const difficulty = currentVariant ? currentVariant.difficulty : 'N/A';
                
                songElement.innerHTML = `
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="song-icon me-3" id="icon-${sanitizedSongId}"></div>
                            <div>
                                <h3 class="mb-1">${songName}</h3>
                                <div class="text-muted">
                                    BPM: ${bpm} | Week: ${week} | Difficulty: ${difficulty}
                                </div>
                            </div>
                        </div>
                        
                    </div>
                `;

                // Add click handler for all songs
                if (isAvailable) {
                    songElement.addEventListener('click', () => {
                        handleSongClick(songElement, songName, details);
                    });
                } else {
                    // Show popup for unavailable songs
                    songElement.addEventListener('click', () => {
                        showUnavailablePopup();
                    });
                }
                
                songListContainer.appendChild(songElement);

                // Setup animation after adding to DOM (loadIconData caches sprite sheets)
                setupIconAnimation(
                    songElement.querySelector(`#icon-${sanitizedSongId}`),
                    details.icon
                );
            }
        });
        
        // Initialize keyboard selection on first song
        updateSongSelection();
    } catch (error) {
        console.error('Error loading songs:', error);
        document.getElementById('songList').innerHTML = '<div class="alert alert-danger">Error loading songs data</div>';
    }
}

function cleanupStages() {
    // Remove tick listeners for all previously active stages
    activeStages.forEach(stage => {
        try { createjs.Ticker.removeEventListener('tick', stage); } catch {}
    });
    activeStages.clear();
}

// Function to handle filter changes
function handleFilterChange() {
    if (songData) {
        loadSongs(); // Reload the song list with new filter settings
    }
}

// Initialize when the page loads
document.addEventListener('DOMContentLoaded', () => {
    downloadModal = new bootstrap.Modal(document.getElementById('downloadModal'));
    // Set ticker framerate once
    createjs.Ticker.framerate = 24;
    
    // Add event listeners for filters
    document.getElementById('difficultySelect').addEventListener('change', handleFilterChange);
    document.getElementById('characterSelect').addEventListener('change', handleFilterChange);
    
    // Setup keyboard navigation
    setupKeyboardNavigation();
    
    loadSongs();
});

// Keyboard Navigation Functions
function setupKeyboardNavigation() {
    document.addEventListener('keydown', handleKeyboardNavigation);
}

function handleKeyboardNavigation(e) {
    if (!keyboardEnabled) return;

    // Tab key switches between list and filters
    if (e.key === 'Tab') {
        e.preventDefault();
        if (currentFocusMode === 'list') {
            switchToFilterMode();
        } else if (currentFocusMode === 'filters') {
            switchToListMode();
        }
        return;
    }

    if (currentFocusMode === 'list') {
        handleListNavigation(e);
    } else if (currentFocusMode === 'filters') {
        handleFilterNavigation(e);
    } else if (currentFocusMode === 'modal') {
        handleModalNavigation(e);
    }
}

function handleListNavigation(e) {
    const songItems = Array.from(document.querySelectorAll('.song-item'));
    if (songItems.length === 0) return;

    switch(e.key) {
        case 'ArrowUp':
            e.preventDefault();
            currentSongIndex = Math.max(0, currentSongIndex - 1);
            updateSongSelection();
            break;
        case 'ArrowDown':
            e.preventDefault();
            currentSongIndex = Math.min(songItems.length - 1, currentSongIndex + 1);
            updateSongSelection();
            break;
        case 'Enter':
            e.preventDefault();
            selectCurrentSong();
            break;
    }
}

function handleFilterNavigation(e) {
    const difficultySelect = document.getElementById('difficultySelect');
    const characterSelect = document.getElementById('characterSelect');
    const activeElement = document.activeElement;

    switch(e.key) {
        case 'ArrowLeft':
        case 'ArrowRight':
            e.preventDefault();
            if (activeElement === difficultySelect || activeElement === characterSelect) {
                const select = activeElement;
                const currentIndex = select.selectedIndex;
                const direction = e.key === 'ArrowLeft' ? -1 : 1;
                const newIndex = Math.max(0, Math.min(select.options.length - 1, currentIndex + direction));
                select.selectedIndex = newIndex;
                select.dispatchEvent(new Event('change'));
            }
            break;
        case 'ArrowUp':
            e.preventDefault();
            difficultySelect.focus();
            break;
        case 'ArrowDown':
            e.preventDefault();
            characterSelect.focus();
            break;
    }
}

function handleModalNavigation(e) {
    const landscapeBtn = document.getElementById('landscapeBtn');
    const portraitBtn = document.getElementById('portraitBtn');
    const buttons = [landscapeBtn, portraitBtn].filter(btn => !btn.disabled);

    if (buttons.length === 0) return;

    switch(e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            currentModalButtonIndex = Math.max(0, currentModalButtonIndex - 1);
            updateModalButtonSelection(buttons);
            break;
        case 'ArrowRight':
            e.preventDefault();
            currentModalButtonIndex = Math.min(buttons.length - 1, currentModalButtonIndex + 1);
            updateModalButtonSelection(buttons);
            break;
        case 'Enter':
            e.preventDefault();
            buttons[currentModalButtonIndex].click();
            break;
        case 'Escape':
            e.preventDefault();
            closeModal();
            break;
    }
}

function updateSongSelection() {
    const songItems = Array.from(document.querySelectorAll('.song-item'));
    songItems.forEach((item, index) => {
        if (index === currentSongIndex) {
            item.classList.add('keyboard-selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            item.classList.remove('keyboard-selected');
        }
    });
}

function selectCurrentSong() {
    const songItems = Array.from(document.querySelectorAll('.song-item'));
    if (songItems[currentSongIndex]) {
        songItems[currentSongIndex].click();
    }
}

function switchToFilterMode() {
    currentFocusMode = 'filters';
    document.querySelector('.filters-fixed').classList.add('keyboard-focus');
    document.getElementById('difficultySelect').focus();
    // Remove list selection visual
    const songItems = Array.from(document.querySelectorAll('.song-item'));
    songItems.forEach(item => item.classList.remove('keyboard-selected'));
}

function switchToListMode() {
    currentFocusMode = 'list';
    document.querySelector('.filters-fixed').classList.remove('keyboard-focus');
    document.getElementById('difficultySelect').blur();
    document.getElementById('characterSelect').blur();
    updateSongSelection();
}

function switchToModalMode() {
    currentFocusMode = 'modal';
    currentModalButtonIndex = 0;
    const landscapeBtn = document.getElementById('landscapeBtn');
    const portraitBtn = document.getElementById('portraitBtn');
    const buttons = [landscapeBtn, portraitBtn].filter(btn => !btn.disabled);
    updateModalButtonSelection(buttons);
}

function updateModalButtonSelection(buttons) {
    buttons.forEach((btn, index) => {
        if (index === currentModalButtonIndex) {
            btn.classList.add('keyboard-selected');
        } else {
            btn.classList.remove('keyboard-selected');
        }
    });
}

function closeModal() {
    downloadModal.hide();
    switchToListMode();
}

function showUnavailablePopup() {
    const popup = document.getElementById('unavailablePopup');
    popup.classList.add('show');
    setTimeout(() => {
        popup.classList.remove('show');
    }, 2000);
}
