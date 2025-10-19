// State variables
let inputImage = null;
let inputFileName = '';
let isGenerating = false;

// DOM elements
const elements = {
    dropZone: document.getElementById('drop-zone'),
    fileInput: document.getElementById('file-input'),
    previewContainer: document.getElementById('preview-container'),
    previewImage: document.getElementById('preview-image'),
    frameCountSlider: document.getElementById('frame-count'),
    frameCountInput: document.getElementById('frame-count-input'),
    targetOpacitySlider: document.getElementById('target-opacity'),
    targetOpacityInput: document.getElementById('target-opacity-input'),
    reverseCheckbox: document.getElementById('reverse-effect'),
    generateBtn: document.getElementById('generate-btn'),
    resultCard: document.getElementById('result-card'),
    spritesheetResult: document.getElementById('spritesheet-result'),
    spritesheetInfo: document.getElementById('spritesheet-info'),
    downloadBtn: document.getElementById('download-btn'),
    processingModal: document.getElementById('processing-modal'),
    processingProgress: document.getElementById('processing-progress')
};

// Utility functions
const toggleModal = (show) => {
    elements.processingModal.style.display = show ? 'flex' : 'none';
    if (show) elements.processingProgress.style.width = '0%';
};

const setGeneratingState = (generating) => {
    isGenerating = generating;
    elements.generateBtn.innerHTML = generating ? 
        '<span class="spinner-inline"></span> Generando...' : 
        'Generar Spritesheet';
    elements.generateBtn.classList.toggle('generating', generating);
    elements.generateBtn.disabled = generating || !inputImage;
};

const syncSliderInput = (slider, input) => {
    slider.addEventListener('input', () => input.value = slider.value);
    input.addEventListener('input', () => {
        const value = parseInt(input.value);
        const min = parseInt(input.min);
        const max = parseInt(input.max);
        if (value >= min && value <= max) slider.value = value;
    });
};

// Event listeners
elements.dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.dropZone.classList.add('dragover');
});

elements.dropZone.addEventListener('dragleave', () => {
    elements.dropZone.classList.remove('dragover');
});

elements.dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// Hide the default file input
elements.fileInput.style.display = 'none';

elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Sync sliders with inputs
syncSliderInput(elements.frameCountSlider, elements.frameCountInput);
syncSliderInput(elements.targetOpacitySlider, elements.targetOpacityInput);

elements.generateBtn.addEventListener('click', startGenerate);
elements.downloadBtn.addEventListener('click', downloadSpritesheet);

// File handling
function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
        alert('Please select an image file.');
        return;
    }
    
    inputFileName = file.name.replace(/\.[^/.]+$/, "");
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            inputImage = img;
            elements.previewImage.src = img.src;
            elements.previewContainer.style.display = 'block';
            elements.generateBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Generation process
function startGenerate() {
    if (!inputImage || isGenerating) return;
    
    setGeneratingState(true);
    
    // Show modal for large images
    if (inputImage.width * inputImage.height > 1000000) {
        toggleModal(true);
        setTimeout(generateSpritesheet, 100);
    } else {
        generateSpritesheet();
    }
}

function generateSpritesheet() {
    if (!inputImage) return;
    
    const maxFrames = parseInt(elements.frameCountInput.value);
    const targetOpacity = parseInt(elements.targetOpacityInput.value);
    const isReversed = elements.reverseCheckbox.checked;
    
    // Special case for single frame - just apply the target opacity
    if (maxFrames === 1) {
        generateSingleFrame(targetOpacity);
        return;
    }
    
    const startOpacity = isReversed ? targetOpacity : 100;
    const endOpacity = isReversed ? 100 : targetOpacity;
    
    // Generate opacity values and remove duplicates
    const opacities = [...new Set(
        Array.from({ length: maxFrames }, (_, i) => 
            Math.round(startOpacity + (i * (endOpacity - startOpacity) / (maxFrames - 1)))
        )
    )];
    
    const frameCount = opacities.length;
    
    // Create canvases
    const frameCanvas = document.createElement('canvas');
    const frameCtx = frameCanvas.getContext('2d');
    frameCanvas.width = inputImage.width;
    frameCanvas.height = inputImage.height;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = inputImage.width * frameCount;
    canvas.height = inputImage.height;
    
    // Draw frames recursively
    const drawNextFrame = (index) => {
        if (index >= frameCount) {
            finalizeSpritesheet(canvas, frameCount);
            return;
        }
        
        // Clear and draw base image
        frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
        frameCtx.drawImage(inputImage, 0, 0);
        
        // Apply opacity mask
        frameCtx.globalCompositeOperation = 'destination-in';
        frameCtx.fillStyle = `rgba(0, 0, 0, ${opacities[index] / 100})`;
        frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
        frameCtx.globalCompositeOperation = 'source-over';
        
        // Draw to main canvas
        ctx.drawImage(frameCanvas, index * inputImage.width, 0);
        
        // Update progress
        if (elements.processingModal.style.display === 'flex') {
            elements.processingProgress.style.width = `${((index + 1) / frameCount) * 100}%`;
        }
        
        setTimeout(() => drawNextFrame(index + 1), 0);
    };
    
    drawNextFrame(0);
}

function generateSingleFrame(opacity) {
    // Create a single canvas for the frame
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = inputImage.width;
    canvas.height = inputImage.height;
    
    // Draw the image with the specified opacity
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(inputImage, 0, 0);
    
    // Apply opacity mask
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = `rgba(0, 0, 0, ${opacity / 100})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.globalCompositeOperation = 'source-over';
    
    // Finalize with frame count of 1
    finalizeSpritesheet(canvas, 1);
}

function finalizeSpritesheet(canvas, frameCount) {
    toggleModal(false);
    setGeneratingState(false);
    
    elements.spritesheetResult.src = canvas.toDataURL('image/png');
    elements.resultCard.style.display = 'block';
    
    elements.spritesheetInfo.textContent = 
        `Spritesheet: ${frameCount} frames, ${inputImage.width}x${inputImage.height} pixeles por frame, Tamaño total: ${canvas.width}x${canvas.height}`;
    
    elements.resultCard.scrollIntoView({ behavior: 'smooth' });
}

function downloadSpritesheet() {
    if (!elements.spritesheetResult.src) return;
    
    const link = document.createElement('a');
    link.download = `fade-inated ${inputFileName}.png`;
    link.href = elements.spritesheetResult.src;
    link.click();
}