// Variables to store the input image
let inputImage = null;
let inputFileName = ''; // <--- AÑADIDO para guardar el nombre del archivo
let processingModalVisible = false;
let isGenerating = false;

// DOM elements 
const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const previewContainer = document.getElementById('preview-container');
const previewImage = document.getElementById('preview-image');
const frameCountSlider = document.getElementById('frame-count');
const frameCountInput = document.getElementById('frame-count-input');
const targetOpacitySlider = document.getElementById('target-opacity');
const targetOpacityInput = document.getElementById('target-opacity-input');
const reverseCheckbox = document.getElementById('reverse-effect');
const generateBtn = document.getElementById('generate-btn');
const resultCard = document.getElementById('result-card');
const spritesheetResult = document.getElementById('spritesheet-result');
const spritesheetInfo = document.getElementById('spritesheet-info');
const downloadBtn = document.getElementById('download-btn');
const processingModal = document.getElementById('processing-modal');
const processingProgress = document.getElementById('processing-progress');

// UI text configuration
const uiText = {
    pageTitle: "Fade-inator 3000",
    inputHeader: "Sube una imagen",
    dropText: "Arrastra y suelta una imagen aqui o",
    selectButton: "Selecciona una imagen",
    settingsHeader: "Ajustes",
    frameCountLabel: "Frames maximos:",
    targetOpacityLabel: "Opacidad deseada (del frame final):",
    reverseLabel: "Reverso (Inicia invisible y se vuelve visible, al contrario de si no marcas esto)",
    generateButton: "Generar Spritesheet",
    generatingText: "Generando...",
    resultHeader: "Spritesheet generado",
    downloadButton: "Descargar",
    processingText: "Generando...",
    spritesheetInfoTemplate: "Spritesheet: {0} frames, {1}x{2} pixeles por frame, Tamaño total: {3}x{4}"
};

// Event listeners for drag and drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    
    if (e.dataTransfer.files.length > 0) {
        handleFileSelect(e.dataTransfer.files[0]);
    }
});

// Event listener for file input
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

// Event listeners for sliders and inputs
frameCountSlider.addEventListener('input', () => {
    frameCountInput.value = frameCountSlider.value;
});

frameCountInput.addEventListener('input', () => {
    const value = parseInt(frameCountInput.value);
    if (value >= 2 && value <= 100) {
        frameCountSlider.value = value;
    }
});

targetOpacitySlider.addEventListener('input', () => {
    targetOpacityInput.value = targetOpacitySlider.value;
});

targetOpacityInput.addEventListener('input', () => {
    const value = parseInt(targetOpacityInput.value);
    if (value >= 0 && value <= 100) {
        targetOpacitySlider.value = value;
    }
});

// Event listener for generate button
generateBtn.addEventListener('click', startGenerate);

// Event listener for download button
downloadBtn.addEventListener('click', downloadSpritesheet);

// Handle file selection
function handleFileSelect(file) {
    if (!file.type.match('image.*')) {
        alert('Please select an image file.');
        return;
    }
    
    inputFileName = file.name.replace(/\.[^/.]+$/, ""); // <--- GUARDAMOS el nombre base
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            inputImage = img;
            previewImage.src = img.src;
            previewContainer.style.display = 'block';
            generateBtn.disabled = false;
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Show the processing modal
function showProcessingModal() {
    processingModal.style.display = 'flex';
    processingProgress.style.width = '0%';
    processingModalVisible = true;
}

// Hide the processing modal
function hideProcessingModal() {
    processingModal.style.display = 'none';
    processingModalVisible = false;
}

// Toggle button state to show generation in progress
function setGeneratingState(isGenerating) {
    if (isGenerating) {
        generateBtn.innerHTML = '<span class="spinner-inline"></span> ' + uiText.generatingText;
        generateBtn.classList.add('generating');
        generateBtn.disabled = true;
    } else {
        generateBtn.innerHTML = uiText.generateButton;
        generateBtn.classList.remove('generating');
        generateBtn.disabled = !inputImage;
    }
}

// Start the generation process
function startGenerate() {
    if (!inputImage || isGenerating) return;
    
    isGenerating = true;
    setGeneratingState(true);
    
    if (inputImage.width * inputImage.height > 1000000) {
        showProcessingModal();
        setTimeout(() => generateSpritesheet(), 100);
    } else {
        generateSpritesheet();
    }
}

// Generate spritesheet
function generateSpritesheet() {
    if (!inputImage) return;
    
    const maxFrames = parseInt(frameCountInput.value);
    const targetOpacity = parseInt(targetOpacityInput.value);
    const isReversed = reverseCheckbox.checked;
    const startOpacity = isReversed ? targetOpacity : 100;
    const endOpacity = isReversed ? 100 : targetOpacity;
    
    let opacities = [];
    for (let i = 0; i < maxFrames; i++) {
        const opacity = Math.round(startOpacity + (i * (endOpacity - startOpacity) / (maxFrames - 1)));
        opacities.push(opacity);
    }
    
    opacities = [...new Set(opacities)];
    
    const frameCount = opacities.length;
    
    const frameCanvas = document.createElement('canvas');
    const frameCtx = frameCanvas.getContext('2d');
    frameCanvas.width = inputImage.width;
    frameCanvas.height = inputImage.height;
    
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    canvas.width = inputImage.width * frameCount;
    canvas.height = inputImage.height;
    
    const drawNextFrame = (index) => {
        if (index >= frameCount) {
            finalizeSpritesheet(canvas, frameCount);
            return;
        }
        
        frameCtx.clearRect(0, 0, frameCanvas.width, frameCanvas.height);
        frameCtx.drawImage(inputImage, 0, 0);
        
        frameCtx.globalCompositeOperation = 'destination-in';
        frameCtx.fillStyle = `rgba(0, 0, 0, ${opacities[index] / 100})`;
        frameCtx.fillRect(0, 0, frameCanvas.width, frameCanvas.height);
        
        frameCtx.globalCompositeOperation = 'source-over';
        
        ctx.drawImage(frameCanvas, index * inputImage.width, 0);
        
        if (processingModalVisible) {
            processingProgress.style.width = `${((index + 1) / frameCount) * 100}%`;
        }
        
        setTimeout(() => drawNextFrame(index + 1), 0);
    };
    
    drawNextFrame(0);
}

// Finalize spritesheet generation
function finalizeSpritesheet(canvas, frameCount) {
    if (processingModalVisible) {
        hideProcessingModal();
    }
    
    isGenerating = false;
    setGeneratingState(false);
    
    spritesheetResult.src = canvas.toDataURL('image/png');
    resultCard.style.display = 'block';
    
    const infoText = uiText.spritesheetInfoTemplate
        .replace('{0}', frameCount)
        .replace('{1}', inputImage.width)
        .replace('{2}', inputImage.height)
        .replace('{3}', canvas.width)
        .replace('{4}', canvas.height);
    
    spritesheetInfo.textContent = infoText;
    
    resultCard.scrollIntoView({ behavior: 'smooth' });
}

// Download spritesheet
function downloadSpritesheet() {
    if (!spritesheetResult.src) return;
    
    const link = document.createElement('a');
    link.download = `fade-inated ${inputFileName}.png`; // <--- Aquí usamos el nombre del archivo
    link.href = spritesheetResult.src;
    link.click();
}
