// Optimized FunkinToFunky.js
document.addEventListener('DOMContentLoaded', function() {
    // Cache DOM elements
    const elements = {
        dropZone: document.querySelector('.drop-zone'),
        fileInput: document.getElementById('file-input'),
        progressBar: document.getElementById('progress-bar'),
        progressContainer: document.getElementById('progress-container'),
        statusText: document.getElementById('status-text'),
        removeDuplicatesCheckbox: document.getElementById('remove-duplicates'),
        outputGifCheckbox: document.getElementById('output-gif'),
        gifWarning: document.getElementById('gif-warning'),
        resultPanel: document.getElementById('result-panel'),
        downloadButton: document.getElementById('download-again'),
        generateButton: document.getElementById('generate-button'),
        selectFileButton: document.querySelector('.select-file-button'),
        resultContent: document.querySelector('.result-content')
    };

    // State variables
    let state = {
        lastDownloadUrl: null,
        lastFileName: null,
        currentZipFile: null
    };

    // Initialize UI
    elements.generateButton.disabled = true;
    
    // Event listeners
    setupEventListeners();

    function setupEventListeners() {
        // GIF warning toggle
        elements.outputGifCheckbox?.addEventListener('change', function() {
            elements.gifWarning.style.display = this.checked ? 'block' : 'none';
        });

        // Drag and drop
        setupDragAndDrop();

        // File selection
        elements.fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                selectZipFile(e.target.files[0]);
            }
        });

        // Download button
        elements.downloadButton?.addEventListener('click', downloadFile);

        // Generate button
        elements.generateButton.addEventListener('click', () => {
            if (state.currentZipFile) {
                processZipFile(state.currentZipFile);
            }
        });

        // Prevent file input reset
        elements.fileInput.addEventListener('click', (e) => e.stopPropagation());
    }

    function setupDragAndDrop() {
        const { dropZone } = elements;

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
            
            const files = e.dataTransfer.files;
            if (files.length > 0 && files[0].type === 'application/zip') {
                selectZipFile(files[0]);
            }
        });
    }

    function selectZipFile(file) {
        state.currentZipFile = file;
        elements.generateButton.disabled = false;
        elements.statusText.textContent = "Archivo seleccionado. Presione 'Generar Spritesheet' para procesar.";
        
        // Update select button appearance
        if (elements.selectFileButton) {
            elements.selectFileButton.classList.add('file-selected');
            elements.selectFileButton.innerHTML = `<i class="fas fa-check"></i> Archivo: ${file.name}`;
        }
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

    // Optimized image comparison using ImageData comparison
    async function areImagesEqual(img1, img2) {
        // Quick dimension check
        if (img1.width !== img2.width || img1.height !== img2.height) {
            return false;
        }

        // Create canvases and get image data
        const [data1, data2] = await Promise.all([
            getImageData(img1),
            getImageData(img2)
        ]);

        // Compare pixel data efficiently
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

    // Simplified GIF creation placeholder
    async function createGif(images) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Use dimensions from first image
        const { width, height } = images[0];
        canvas.width = width;
        canvas.height = height;
        
        // Draw first frame as placeholder
        ctx.drawImage(images[0], 0, 0);
        
        return new Promise(resolve => canvas.toBlob(resolve));
    }

    async function processZipFile(file) {
        // Initialize progress
        const { progressBar, progressContainer, statusText, resultPanel } = elements;
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        progressBar.classList.remove('bg-success', 'bg-danger');
        resultPanel.style.display = 'none';
        
        const shouldRemoveDuplicates = elements.removeDuplicatesCheckbox.checked;
        const shouldOutputGif = elements.outputGifCheckbox?.checked;

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
                    animName, files, newZip, shouldRemoveDuplicates, shouldOutputGif
                );
                
                spritesheetPreviews.push(result.preview);
                duplicatesRemoved += result.duplicatesRemoved;
                
                updateProgress(++processedCount, totalItems);
            }

            // Generate final download
            await generateDownload(newZip, file.name);
            
            // Display results
            displayResults(spritesheetPreviews, duplicatesRemoved, shouldRemoveDuplicates, shouldOutputGif);
            
            statusText.textContent = "¡Procesamiento completado! Haga clic en 'Descargar' para guardar su archivo.";
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-success');

        } catch (error) {
            console.error(error);
            statusText.textContent = `Error al procesar el archivo: ${error.message}`;
            progressBar.classList.add('bg-danger');
        }
    }

    async function organizeImages(zip) {
        const imageGroups = {};
        const singleImages = [];
        const tempGroups = {};

        // Collect and group PNG files
        for (const [filename, zipEntry] of Object.entries(zip.files)) {
            if (!filename.endsWith('.png')) continue;
            
            const nameWithoutExt = filename.slice(0, -4);
            const match = nameWithoutExt.match(/^(.*?)(\d+)?$/);
            if (!match) continue;
            
            const [, baseName, frameNumber] = match;
            const normalizedBaseName = baseName.replace(/[_-]$/, '');

            if (!tempGroups[normalizedBaseName]) {
                tempGroups[normalizedBaseName] = [];
            }
            
            tempGroups[normalizedBaseName].push({
                name: filename,
                frameNumber: frameNumber ? parseInt(frameNumber) : 0,
                entry: zipEntry
            });
        }

        // Separate single images from animation sequences
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

    async function processAnimationSequence(animName, files, newZip, shouldRemoveDuplicates, shouldOutputGif) {
        // Sort by frame number
        files.sort((a, b) => a.frameNumber - b.frameNumber);

        // Load images
        const imageEntries = await Promise.all(files.map(async file => {
            const blob = await file.entry.async('blob');
            const img = await createImageBitmap(blob);
            return { img, frameNumber: file.frameNumber };
        }));

        // Remove duplicates if requested
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

        let preview;
        
        if (shouldOutputGif && images.length > 1) {
            // Create GIF
            const gifBlob = await createGif(images);
            newZip.file(`${animName}.gif`, gifBlob);
            preview = await createGifPreview(animName, images, maxWidth, maxHeight);
        } else {
            // Create spritesheet
            const { blob, canvas } = await createSpritesheet(images, maxWidth, maxHeight);
            newZip.file(`${animName}.png`, blob);
            preview = createSpritesheetPreview(animName, blob, images.length, canvas.width, canvas.height);
        }

        return { preview, duplicatesRemoved };
    }

    async function createSpritesheet(images, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = maxWidth * images.length;
        canvas.height = maxHeight;

        // Draw each image centered in its frame
        images.forEach((img, index) => {
            const x = index * maxWidth + (maxWidth - img.width) / 2;
            const y = (maxHeight - img.height) / 2;
            ctx.drawImage(img, x, y);
        });

        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        return { blob, canvas };
    }

    async function createGifPreview(animName, images, maxWidth, maxHeight) {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Draw first frame with GIF label
        ctx.drawImage(images[0], 0, 0);
        
        // Add overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
        ctx.font = 'bold 12px Arial';
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.fillText(`GIF Animation: ${images.length} frames`, canvas.width / 2, canvas.height - 8);
        
        const blob = await new Promise(resolve => canvas.toBlob(resolve));
        const url = URL.createObjectURL(blob);
        
        return {
            name: `${animName} (GIF)`,
            url,
            frames: images.length,
            width: maxWidth,
            height: maxHeight,
            isGif: true
        };
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

    async function generateDownload(newZip, originalFileName) {
        elements.statusText.textContent = "Creando archivo de descarga...";
        
        const content = await newZip.generateAsync({
            type: 'blob',
            compression: 'DEFLATE'
        });

        state.lastDownloadUrl = URL.createObjectURL(content);
        state.lastFileName = `funky'ed_${originalFileName}`;
    }

    function displayResults(previews, duplicatesRemoved, shouldRemoveDuplicates, shouldOutputGif) {
        elements.resultPanel.style.display = 'block';
        elements.resultContent.innerHTML = '';

        // Sort and display previews
        previews.sort((a, b) => a.name.localeCompare(b.name));
        previews.forEach(preview => {
            const element = createPreviewElement(preview);
            elements.resultContent.appendChild(element);
        });

        // Add info messages
        if (shouldRemoveDuplicates && duplicatesRemoved > 0) {
            const duplicateInfo = createInfoElement(
                `Se han eliminado ${duplicatesRemoved} frames duplicados.`,
                'rgba(255, 107, 107, 0.2)'
            );
            elements.resultContent.appendChild(duplicateInfo);
        }

        if (shouldOutputGif) {
            const gifInfo = createInfoElement(
                'Los archivos GIF son de menor calidad y no soportan transparencia parcial.',
                'rgba(255, 193, 7, 0.2)'
            );
            elements.resultContent.appendChild(gifInfo);
        }
    }

    function createPreviewElement(preview) {
        const element = document.createElement('div');
        element.className = 'spritesheet-preview';
        element.style.marginBottom = '20px';
        
        // Name
        const nameElement = document.createElement('h3');
        nameElement.className = 'animation-name';
        nameElement.textContent = preview.name;
        element.appendChild(nameElement);
        
        // Image container
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
        
        // Info text
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
        
        if (preview.isGif) {
            return `${preview.frames} frames, Tamaño de cada frame: ${frameWidth}×${preview.height}`;
        } else if (preview.frames > 1) {
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