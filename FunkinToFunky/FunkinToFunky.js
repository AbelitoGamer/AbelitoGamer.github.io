// Enhanced FunkinToFunky.js with Spritesheet Parsing and Fixed Extension Handling
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const elements = {
        // Method selection
        zipMethodBtn: document.getElementById('zip-method-btn'),
        spritesheetMethodBtn: document.getElementById('spritesheet-method-btn'),
        zipUploadPanel: document.getElementById('zip-upload-panel'),
        spritesheetUploadPanel: document.getElementById('spritesheet-upload-panel'),
        
        // ZIP upload
        zipDropZone: document.getElementById('zip-drop-zone'),
        zipFileInput: document.getElementById('zip-file-input'),
        zipSelectBtn: document.getElementById('zip-select-btn'), // Added missing element
        
        // Spritesheet upload
        pngDropZone: document.getElementById('png-drop-zone'),
        xmlDropZone: document.getElementById('xml-drop-zone'),
        pngFileInput: document.getElementById('png-file-input'),
        xmlFileInput: document.getElementById('xml-file-input'),
        pngSelectBtn: document.getElementById('png-select-btn'),
        xmlSelectBtn: document.getElementById('xml-select-btn'),
        
        // Common elements
        progressBar: document.getElementById('progress-bar'),
        progressContainer: document.getElementById('progress-container'),
        statusText: document.getElementById('status-text'),
        removeDuplicatesCheckbox: document.getElementById('remove-duplicates'),
        resultPanel: document.getElementById('result-panel'),
        downloadButton: document.getElementById('download-again'),
        generateButton: document.getElementById('generate-button'),
        resultContent: document.querySelector('.result-content')
    };

    // State variables
    let state = {
        lastDownloadUrl: null,
        lastFileName: null,
        currentZipFile: null,
        currentPngFile: null,
        currentXmlFile: null,
        inputMethod: 'zip' // 'zip' or 'spritesheet'
    };

    // Initialize UI
    elements.generateButton.disabled = true;
    
    // Event listeners
    setupEventListeners();

    function setupEventListeners() {
        // Method selection
        elements.zipMethodBtn.addEventListener('click', () => setInputMethod('zip'));
        elements.spritesheetMethodBtn.addEventListener('click', () => setInputMethod('spritesheet'));

        // ZIP upload
        setupDragAndDrop(elements.zipDropZone, handleZipFiles);
        elements.zipFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectZipFile(e.target.files[0]);
            }
        });

        // PNG upload
        setupDragAndDrop(elements.pngDropZone, handlePngFiles);
        elements.pngFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectPngFile(e.target.files[0]);
            }
        });

        // XML upload
        setupDragAndDrop(elements.xmlDropZone, handleXmlFiles);
        elements.xmlFileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectXmlFile(e.target.files[0]);
            }
        });

        // Generate and download buttons
        elements.generateButton.addEventListener('click', processFiles);
        elements.downloadButton?.addEventListener('click', downloadFile);

        // Prevent file input reset
        elements.zipFileInput.addEventListener('click', (e) => e.stopPropagation());
        elements.pngFileInput.addEventListener('click', (e) => e.stopPropagation());
        elements.xmlFileInput.addEventListener('click', (e) => e.stopPropagation());
    }

    function setInputMethod(method) {
        state.inputMethod = method;
        
        // Update button states
        elements.zipMethodBtn.classList.toggle('active', method === 'zip');
        elements.spritesheetMethodBtn.classList.toggle('active', method === 'spritesheet');
        
        // Show/hide panels
        elements.zipUploadPanel.style.display = method === 'zip' ? 'block' : 'none';
        elements.spritesheetUploadPanel.style.display = method === 'spritesheet' ? 'block' : 'none';
        
        // Reset file selections and button states
        resetFileSelections();
        
        // Reset generate button
        updateGenerateButtonState();
        resetResults();
    }

    function resetFileSelections() {
        // Reset ZIP file selection
        state.currentZipFile = null;
        if (elements.zipSelectBtn) {
            elements.zipSelectBtn.classList.remove('file-selected');
            elements.zipSelectBtn.innerHTML = '<i class="fas fa-file-upload"></i> Seleccionar Archivo ZIP';
        }

        // Reset PNG file selection
        state.currentPngFile = null;
        elements.pngSelectBtn.classList.remove('file-selected');
        elements.pngSelectBtn.innerHTML = '<i class="fas fa-file-upload"></i> Seleccionar PNG';

        // Reset XML file selection
        state.currentXmlFile = null;
        elements.xmlSelectBtn.classList.remove('file-selected');
        elements.xmlSelectBtn.innerHTML = '<i class="fas fa-file-upload"></i> Seleccionar XML';

        // Clear file inputs
        if (elements.zipFileInput) elements.zipFileInput.value = '';
        if (elements.pngFileInput) elements.pngFileInput.value = '';
        if (elements.xmlFileInput) elements.xmlFileInput.value = '';
    }

    function setupDragAndDrop(dropZone, fileHandler) {
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            e.stopPropagation();
            dropZone.classList.remove('dragover');
            fileHandler(e.dataTransfer.files);
        });
    }

    function handleZipFiles(files) {
        for (const file of files) {
            if (file.type === 'application/zip' || file.name.endsWith('.zip')) {
                selectZipFile(file);
                break;
            }
        }
    }

    function handlePngFiles(files) {
        for (const file of files) {
            if (file.type.startsWith('image/') || file.name.toLowerCase().endsWith('.png')) {
                selectPngFile(file);
                break;
            }
        }
    }

    function handleXmlFiles(files) {
        for (const file of files) {
            if (file.type === 'text/xml' || file.name.toLowerCase().endsWith('.xml')) {
                selectXmlFile(file);
                break;
            }
        }
    }

    function selectZipFile(file) {
        state.currentZipFile = file;
        
        // Update ZIP button appearance (FIXED)
        if (elements.zipSelectBtn) {
            elements.zipSelectBtn.classList.add('file-selected');
            elements.zipSelectBtn.innerHTML = `<i class="fas fa-check"></i> ${file.name}`;
        }
        
        updateGenerateButtonState();
        elements.statusText.textContent = `Archivo ZIP seleccionado: ${file.name}`;
    }

    function selectPngFile(file) {
        state.currentPngFile = file;
        elements.pngSelectBtn.classList.add('file-selected');
        elements.pngSelectBtn.innerHTML = `<i class="fas fa-check"></i> ${file.name}`;
        updateGenerateButtonState();
        elements.statusText.textContent = `PNG seleccionado: ${file.name}`;
    }

    function selectXmlFile(file) {
        state.currentXmlFile = file;
        elements.xmlSelectBtn.classList.add('file-selected');
        elements.xmlSelectBtn.innerHTML = `<i class="fas fa-check"></i> ${file.name}`;
        updateGenerateButtonState();
        elements.statusText.textContent = `XML seleccionado: ${file.name}`;
    }

    function updateGenerateButtonState() {
        const canGenerate = state.inputMethod === 'zip' ? 
            !!state.currentZipFile : 
            (!!state.currentPngFile && !!state.currentXmlFile);
        
        elements.generateButton.disabled = !canGenerate;
        
        if (canGenerate) {
            elements.statusText.textContent = "Listo para procesar. Presione 'Generar Spritesheet'.";
        }
    }

    function resetResults() {
        elements.resultPanel.style.display = 'none';
        elements.progressContainer.style.display = 'none';
        elements.progressBar.style.width = '0%';
        elements.progressBar.classList.remove('bg-success', 'bg-danger');
    }

    function downloadFile() {
        if (state.lastDownloadUrl && state.lastFileName) {
            const a = document.createElement('a');
            a.href = state.lastDownloadUrl;
            a.download = state.lastFileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }

    async function processFiles() {
        resetResults();
        elements.progressContainer.style.display = 'block';

        try {
            if (state.inputMethod === 'zip') {
                await processZipFile(state.currentZipFile);
            } else {
                await processSpritesheetAndXml(state.currentPngFile, state.currentXmlFile);
            }
        } catch (error) {
            console.error('Processing error:', error);
            elements.statusText.textContent = `Error: ${error.message}`;
            elements.progressBar.classList.add('bg-danger');
        }
    }

    // Spritesheet and XML processing
    async function processSpritesheetAndXml(pngFile, xmlFile) {
        const shouldRemoveDuplicates = elements.removeDuplicatesCheckbox.checked;
        
        elements.statusText.textContent = "Cargando spritesheet y XML...";
        elements.progressBar.style.width = '20%';

        // Load the image
        const img = await loadImage(pngFile);
        elements.statusText.textContent = "Parseando XML...";
        elements.progressBar.style.width = '40%';

        // Parse the XML
        const xmlText = await readFileAsText(xmlFile);
        const frameData = parseSparrowXml(xmlText);
        
        elements.statusText.textContent = "Extrayendo frames...";
        elements.progressBar.style.width = '60%';

        // Extract individual frames
        const frames = await extractFramesFromSpritesheet(img, frameData);
        
        elements.statusText.textContent = "Organizando animaciones...";
        elements.progressBar.style.width = '80%';

        // Organize frames into animations
        const animations = organizeFramesIntoAnimations(frames);
        
        // Process animations
        const newZip = new JSZip();
        const spritesheetPreviews = [];
        let duplicatesRemoved = 0;
        let processedCount = 0;
        const totalAnimations = Object.keys(animations).length;

        for (const [animName, animFrames] of Object.entries(animations)) {
            elements.statusText.textContent = `Procesando animación: ${animName}`;
            
            const result = await processAnimationFrames(
                animName, animFrames, newZip, shouldRemoveDuplicates
            );
            
            spritesheetPreviews.push(result.preview);
            duplicatesRemoved += result.duplicatesRemoved;
            
            updateProgress(++processedCount, totalAnimations);
        }

        // Generate final download with proper filename (FIXED)
        const baseFileName = pngFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        await generateDownload(newZip, baseFileName, true); // Pass true for spritesheet mode
        
        // Display results
        displayResults(spritesheetPreviews, duplicatesRemoved, shouldRemoveDuplicates, false);
        
        elements.statusText.textContent = "¡Procesamiento completado!";
        elements.progressBar.style.width = '100%';
        elements.progressBar.classList.add('bg-success');
    }

    function loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }

    function readFileAsText(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = reject;
            reader.readAsText(file);
        });
    }

    function parseSparrowXml(xmlText) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        const subTextures = xmlDoc.querySelectorAll('SubTexture');
        const frames = [];

        subTextures.forEach(subTexture => {
            const name = subTexture.getAttribute('name');
            const x = parseInt(subTexture.getAttribute('x') || '0');
            const y = parseInt(subTexture.getAttribute('y') || '0');
            const width = parseInt(subTexture.getAttribute('width') || '0');
            const height = parseInt(subTexture.getAttribute('height') || '0');
            const frameX = parseInt(subTexture.getAttribute('frameX') || '0');
            const frameY = parseInt(subTexture.getAttribute('frameY') || '0');
            const frameWidth = parseInt(subTexture.getAttribute('frameWidth') || width);
            const frameHeight = parseInt(subTexture.getAttribute('frameHeight') || height);

            frames.push({
                name,
                x, y, width, height,
                frameX, frameY, frameWidth, frameHeight
            });
        });

        return frames;
    }

    async function extractFramesFromSpritesheet(spritesheet, frameData) {
        const extractedFrames = [];
        
        for (const frame of frameData) {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to the frame's source size
            canvas.width = frame.frameWidth;
            canvas.height = frame.frameHeight;
            
            // Clear canvas with transparent background
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            
            // Draw the frame from spritesheet at the correct position
            // Account for frameX and frameY offsets
            const drawX = -frame.frameX;
            const drawY = -frame.frameY;
            
            ctx.drawImage(
                spritesheet,
                frame.x, frame.y, frame.width, frame.height,  // Source rectangle
                drawX, drawY, frame.width, frame.height        // Destination rectangle
            );
            
            const img = await createImageBitmap(canvas);
            extractedFrames.push({
                name: frame.name,
                img: img,
                originalFrame: frame
            });
        }
        
        return extractedFrames;
    }

    function organizeFramesIntoAnimations(frames) {
        const animations = {};
        
        frames.forEach(frame => {
            // Extract animation name and frame number
            // Updated regex to handle file extensions and various naming patterns
            let match = frame.name.match(/^(.*?)(\d+)$/);
            let animName, frameNum;
            
            if (match) {
                // Standard case: name ends with numbers
                animName = match[1].replace(/[_.-]$/, ''); // Remove trailing underscore, dash, or dot
                frameNum = parseInt(match[2]);
            } else {
                // Check if there are numbers embedded before file extensions or other suffixes
                // Pattern: capture everything up to the last sequence of digits, then the digits
                match = frame.name.match(/^(.*[_.-])?(.+?)(\d+)([_.-].*)?$/);
                
                if (match) {
                    const [, prefix = '', baseName, digits, suffix = ''] = match;
                    animName = (prefix + baseName + suffix).replace(/[_.-]$/, '');
                    frameNum = parseInt(digits);
                } else {
                    // If still no match, try to find any digits in the name
                    const digitMatch = frame.name.match(/(\d+)/);
                    if (digitMatch) {
                        // Use the part before the first digit sequence as animation name
                        const digitIndex = frame.name.indexOf(digitMatch[0]);
                        animName = frame.name.substring(0, digitIndex).replace(/[_.-]$/, '');
                        frameNum = parseInt(digitMatch[0]);
                        
                        // If animation name is empty, use the part after digits
                        if (!animName) {
                            const afterDigits = frame.name.substring(digitIndex + digitMatch[0].length);
                            animName = afterDigits.replace(/^[_.-]/, '') || 'animation';
                        }
                    } else {
                        // No digits found, treat as single frame animation
                        animName = frame.name.replace(/[_.-]$/, '');
                        frameNum = 0;
                    }
                }
            }
            
            // Ensure animation name is not empty
            if (!animName || animName.trim() === '') {
                animName = 'animation';
            }
            
            if (!animations[animName]) {
                animations[animName] = [];
            }
            
            animations[animName].push({
                ...frame,
                frameNumber: frameNum
            });
        });
        
        // Sort frames within each animation
        Object.keys(animations).forEach(animName => {
            animations[animName].sort((a, b) => a.frameNumber - b.frameNumber);
        });
        
        return animations;
    }

    async function processAnimationFrames(animName, frames, newZip, shouldRemoveDuplicates) {
        const images = frames.map(f => f.img);
        
        // Remove duplicates if requested
        let uniqueImages = images;
        let duplicatesRemoved = 0;
        
        if (shouldRemoveDuplicates && images.length > 1) {
            uniqueImages = [images[0]];
            
            for (let i = 1; i < images.length; i++) {
                const current = images[i];
                const prev = images[i-1];
                
                if (!(await areImagesEqual(current, prev))) {
                    uniqueImages.push(current);
                } else {
                    duplicatesRemoved++;
                }
            }
        }
        
        const maxWidth = Math.max(...uniqueImages.map(img => img.width));
        const maxHeight = Math.max(...uniqueImages.map(img => img.height));

        // Create spritesheet
        const { blob, canvas } = await createSpritesheet(uniqueImages, maxWidth, maxHeight);
        newZip.file(`${animName}.png`, blob);
        
        const preview = createSpritesheetPreview(animName, blob, uniqueImages.length, canvas.width, canvas.height);

        return { preview, duplicatesRemoved };
    }

    // Original ZIP processing function (kept for compatibility)
    async function processZipFile(file) {
        const { progressBar, progressContainer, statusText, resultPanel } = elements;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-success', 'bg-danger');
        resultPanel.style.display = 'none';
        
        const shouldRemoveDuplicates = elements.removeDuplicatesCheckbox.checked;

        try {
            statusText.textContent = "Leyendo el archivo ZIP...";
            
            const zip = await JSZip.loadAsync(file);
            const { imageGroups, singleImages } = await organizeImages(zip);
            
            const newZip = new JSZip();
            const spritesheetPreviews = [];
            let processedCount = 0;
            let duplicatesRemoved = 0;
            const totalItems = Object.keys(imageGroups).length + singleImages.length;

            // Process single images
            for (const singleImage of singleImages) {
                statusText.textContent = `Procesando imagen individual: ${singleImage.name}`;
                
                const preview = await processSingleImage(singleImage, newZip);
                spritesheetPreviews.push(preview);
                
                updateProgress(++processedCount, totalItems);
            }

            // Process animation sequences
            for (const [animName, files] of Object.entries(imageGroups)) {
                statusText.textContent = `Procesando animación: ${animName}`;
                
                const result = await processAnimationSequence(
                    animName, files, newZip, shouldRemoveDuplicates
                );
                
                spritesheetPreviews.push(result.preview);
                duplicatesRemoved += result.duplicatesRemoved;
                
                updateProgress(++processedCount, totalItems);
            }

            // Generate final download
            await generateDownload(newZip, file.name, false); // Pass false for ZIP mode
            
            // Display results
            displayResults(spritesheetPreviews, duplicatesRemoved, shouldRemoveDuplicates, false);
            
            statusText.textContent = "¡Procesamiento completado!";
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-success');

        } catch (error) {
            console.error(error);
            statusText.textContent = `Error al procesar el archivo: ${error.message}`;
            progressBar.classList.add('bg-danger');
        }
    }

    // Original helper functions (kept for ZIP compatibility)
    async function organizeImages(zip) {
        const imageGroups = {};
        const singleImages = [];
        const tempGroups = {};

        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (!filename.endsWith('.png')) continue;
            
            const nameWithoutExt = filename.slice(0, -4);
            
            // Improved pattern matching to handle file extensions in animation names
            let match = nameWithoutExt.match(/^(.*?)(\d+)?$/);
            let baseName, frameNumber;
            
            if (match && match[2]) {
                // Standard case: name ends with numbers
                baseName = match[1].replace(/[_.-]$/, '');
                frameNumber = parseInt(match[2]);
            } else {
                // Check for numbers embedded before extensions or suffixes
                match = nameWithoutExt.match(/^(.*[_.-])?(.+?)(\d+)([_.-].*)?$/);
                
                if (match && match[3]) {
                    const [, prefix = '', name, digits, suffix = ''] = match;
                    baseName = (prefix + name + suffix).replace(/[_.-]$/, '');
                    frameNumber = parseInt(digits);
                } else {
                    // Try to find any digits in the name
                    const digitMatch = nameWithoutExt.match(/(\d+)/);
                    if (digitMatch) {
                        const digitIndex = nameWithoutExt.indexOf(digitMatch[0]);
                        baseName = nameWithoutExt.substring(0, digitIndex).replace(/[_.-]$/, '');
                        frameNumber = parseInt(digitMatch[0]);
                        
                        if (!baseName) {
                            const afterDigits = nameWithoutExt.substring(digitIndex + digitMatch[0].length);
                            baseName = afterDigits.replace(/^[_.-]/, '') || nameWithoutExt;
                        }
                    } else {
                        // No numbers found
                        baseName = nameWithoutExt;
                        frameNumber = 0;
                    }
                }
            }
            
            const normalizedBaseName = baseName || nameWithoutExt;

            if (!tempGroups[normalizedBaseName]) {
                tempGroups[normalizedBaseName] = [];
            }
            
            tempGroups[normalizedBaseName].push({
                name: filename,
                frameNumber: frameNumber,
                entry: zipEntry
            });
        }

        for (const [baseName, files] of Object.entries(tempGroups)) {
            if (files.length === 1 && files[0].frameNumber === 0) {
                singleImages.push({
                    name: files[0].name,
                    entry: files[0].entry
                });
            } else {
                imageGroups[baseName] = files;
            }
        }

        return { imageGroups, singleImages };
    }

    async function processSingleImage(singleImage, newZip) {
        const blob = await singleImage.entry.async('blob');
        const baseName = singleImage.name.slice(0, -4);
        newZip.file(`${baseName}.png`, blob);
        
        const img = await createImageBitmap(blob);
        const previewUrl = URL.createObjectURL(blob);
        
        return {
            name: baseName,
            url: previewUrl,
            frames: 1,
            width: img.width,
            height: img.height
        };
    }

    async function processAnimationSequence(animName, files, newZip, shouldRemoveDuplicates) {
        files.sort((a, b) => a.frameNumber - b.frameNumber);

        const imageEntries = await Promise.all(files.map(async file => {
            const blob = await file.entry.async('blob');
            const img = await createImageBitmap(blob);
            return { img, frameNumber: file.frameNumber };
        }));

        let uniqueImages = imageEntries;
        let duplicatesRemoved = 0;
        
        if (shouldRemoveDuplicates && imageEntries.length > 1) {
            uniqueImages = [imageEntries[0]];
            
            for (let i = 1; i < imageEntries.length; i++) {
                const current = imageEntries[i];
                const prev = imageEntries[i-1];
                
                if (!(await areImagesEqual(current.img, prev.img))) {
                    uniqueImages.push(current);
                } else {
                    duplicatesRemoved++;
                }
            }
        }
        
        const images = uniqueImages.map(entry => entry.img);
        const maxWidth = Math.max(...images.map(img => img.width));
        const maxHeight = Math.max(...images.map(img => img.height));

        const { blob, canvas } = await createSpritesheet(images, maxWidth, maxHeight);
        newZip.file(`${animName}.png`, blob);
        const preview = createSpritesheetPreview(animName, blob, images.length, canvas.width, canvas.height);

        return { preview, duplicatesRemoved };
    }

    // Common utility functions
    async function areImagesEqual(img1, img2) {
        if (img1.width !== img2.width || img1.height !== img2.height) {
            return false;
        }

        const [data1, data2] = await Promise.all([
            getImageData(img1),
            getImageData(img2)
        ]);

        for (let i = 0; i < data1.length; i += 4) {
            if (data1[i] !== data2[i] || 
                data1[i+1] !== data2[i+1] || 
                data1[i+2] !== data2[i+2] || 
                data1[i+3] !== data2[i+3]) {
                return false;
            }
        }
        
        return true;
    }

    function getImageData(img) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    }

    async function createSpritesheet(images, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = maxWidth * images.length;
        canvas.height = maxHeight;

        images.forEach((img, index) => {
            const x = index * maxWidth + (maxWidth - img.width) / 2;
            const y = (maxHeight - img.height) / 2;
            ctx.drawImage(img, x, y);
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        return { blob, canvas };
    }

    function createSpritesheetPreview(animName, blob, frameCount, width, height) {
        return {
            name: animName,
            url: URL.createObjectURL(blob),
            frames: frameCount,
            width,
            height
        };
    }

    function updateProgress(current, total) {
        elements.progressBar.style.width = `${(current / total) * 100}%`;
    }

    // FIXED: Updated generateDownload function with proper filename handling
    async function generateDownload(newZip, originalFileName, isSpritesheetMode = false) {
        elements.statusText.textContent = "Creando archivo de descarga...";
        
        const content = await newZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE'
        });

        state.lastDownloadUrl = URL.createObjectURL(content);
        
        // Fix filename to always have .zip extension
        if (isSpritesheetMode) {
            // For spritesheet mode, use base name without extension + .zip
            state.lastFileName = `funky'ed_${originalFileName}.zip`;
        } else {
            // For ZIP mode, maintain original behavior
            state.lastFileName = `funky'ed_${originalFileName}`;
        }
    }

    function displayResults(previews, duplicatesRemoved, shouldRemoveDuplicates) {
        elements.resultPanel.style.display = 'block';
        elements.resultContent.innerHTML = '';

        previews.sort((a, b) => a.name.localeCompare(b.name));
        previews.forEach(preview => {
            const element = createPreviewElement(preview);
            elements.resultContent.appendChild(element);
        });

        if (shouldRemoveDuplicates && duplicatesRemoved > 0) {
            const duplicateInfo = createInfoElement(
                `Se han eliminado ${duplicatesRemoved} frames duplicados.`,
                'rgba(255, 107, 107, 0.2)'
            );
            elements.resultContent.appendChild(duplicateInfo);
        }
    }

    function createPreviewElement(preview) {
        const element = document.createElement('div');
        element.className = 'spritesheet-preview';
        element.style.marginBottom = '20px';
        
        const nameElement = document.createElement('h3');
        nameElement.className = 'animation-name';
        nameElement.textContent = preview.name;
        element.appendChild(nameElement);
        
        const container = document.createElement('div');
        container.className = 'preview-image-container';
        Object.assign(container.style, {
            width: '100%',
            height: '140px',
            backgroundColor: 'rgba(20, 20, 40, 0.3)',
            overflow: 'auto',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
            padding: '10px'
        });
        
        const img = document.createElement('img');
        img.src = preview.url;
        img.alt = `${preview.name} preview`;
        img.style.maxHeight = '120px';
        
        container.appendChild(img);
        element.appendChild(container);
        
        const infoText = document.createElement('p');
        infoText.className = 'sprite-info';
        infoText.textContent = formatPreviewInfo(preview);
        Object.assign(infoText.style, {
            margin: '8px 0 0 0',
            fontSize: '0.9rem',
            color: 'rgba(255, 255, 255, 0.8)'
        });
        
        element.appendChild(infoText);
        return element;
    }

    function formatPreviewInfo(preview) {
        const frameWidth = preview.frames > 1 ? Math.round(preview.width / preview.frames) : preview.width;
        
        if (preview.frames > 1) {
            return `${preview.frames} frames, Tamaño de cada frame: ${frameWidth}×${preview.height}, Tamaño del spritesheet: ${preview.width}×${preview.height}`;
        } else {
            return `Tamaño: ${preview.width}×${preview.height}`;
        }
    }

    function createInfoElement(text, backgroundColor) {
        const element = document.createElement('p');
        element.textContent = text;
        Object.assign(element.style, {
            marginTop: '20px',
            padding: '10px',
            backgroundColor,
            borderRadius: '4px'
        });
        return element;
    }
});