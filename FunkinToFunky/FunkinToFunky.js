// Updated JavaScript for FunkinToFunky.js
document.addEventListener('DOMContentLoaded', function() {
    let lastDownloadUrl = null;
    let lastFileName = null;
    let currentZipFile = null;

    const dropZone = document.querySelector('.drop-zone');
    const fileInput = document.getElementById('file-input');
    const progressBar = document.getElementById('progress-bar');
    const progressContainer = document.getElementById('progress-container');
    const statusText = document.getElementById('status-text');
    const removeDuplicatesCheckbox = document.getElementById('remove-duplicates');
    const outputGifCheckbox = document.getElementById('output-gif');
    const gifWarning = document.getElementById('gif-warning');
    const resultPanel = document.getElementById('result-panel');
    const resultInfo = document.getElementById('result-info');
    const downloadButton = document.getElementById('download-again');
    const generateButton = document.getElementById('generate-button');
    const selectFileButton = document.querySelector('.select-file-button');

    // Initialize generate button as disabled
    generateButton.disabled = true;
    
    // Show/hide GIF warning based on checkbox
    if (outputGifCheckbox) {
        outputGifCheckbox.addEventListener('change', function() {
            if (this.checked) {
                gifWarning.style.display = 'block';
            } else {
                gifWarning.style.display = 'none';
            }
        });
    }

    // Check if duplicate images are visually the same
    async function areImagesEqual(img1, img2) {
        // Create canvas for both images
        const canvas1 = document.createElement('canvas');
        const ctx1 = canvas1.getContext('2d');
        canvas1.width = img1.width;
        canvas1.height = img1.height;
        ctx1.drawImage(img1, 0, 0);
        
        const canvas2 = document.createElement('canvas');
        const ctx2 = canvas2.getContext('2d');
        canvas2.width = img2.width;
        canvas2.height = img2.height;
        ctx2.drawImage(img2, 0, 0);
        
        // If dimensions differ, they are different
        if (img1.width !== img2.width || img1.height !== img2.height) {
            return false;
        }
        
        // Compare pixel data
        const data1 = ctx1.getImageData(0, 0, canvas1.width, canvas1.height).data;
        const data2 = ctx2.getImageData(0, 0, canvas2.width, canvas2.height).data;
        
        // Check each pixel
        for (let i = 0; i < data1.length; i += 4) {
            // Compare RGBA values
            if (data1[i] !== data2[i] || 
                data1[i+1] !== data2[i+1] || 
                data1[i+2] !== data2[i+2] || 
                data1[i+3] !== data2[i+3]) {
                return false;
            }
        }
        
        return true;
    }

    // Fix for drag and drop functionality
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

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            selectZipFile(e.target.files[0]);
        }
    });

    if (downloadButton) {
        downloadButton.addEventListener('click', () => {
            if (lastDownloadUrl && lastFileName) {
                const a = document.createElement('a');
                a.href = lastDownloadUrl;
                a.download = lastFileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            }
        });
    }

    // Fix for file selection button - don't reset when clicking
    fileInput.addEventListener('click', (e) => {
        // Do nothing - we no longer want to reset the button appearance
        // This ensures that the green selected state persists between selections
        // even if the same file is selected again
        e.stopPropagation(); // Prevent any default behavior
    });
    
    // Add event listener for the generate button
    generateButton.addEventListener('click', () => {
        if (currentZipFile) {
            processZipFile(currentZipFile);
        }
    });

    // Function to handle zip file selection
    function selectZipFile(file) {
        currentZipFile = file;
        generateButton.disabled = false;
        statusText.textContent = "Archivo seleccionado. Presione 'Generar Spritesheet' para procesar.";
        
        // Update the select file button to show that a file is selected
        if (selectFileButton) {
            selectFileButton.classList.add('file-selected');
            selectFileButton.innerHTML = '<i class="fas fa-check"></i> Archivo: ' + file.name;
        }
    }

    // Create a GIF from frames
    async function createGif(images, frameDelay) {
        // This is a placeholder - you would need to include a GIF encoding library
        // like gif.js, gifshot, or gif-encoder-2 in your project
        
        // For demonstration purposes, we'll just create a simulated GIF blob
        // In a real implementation, you'd encode the frames into an actual GIF
        
        // Example using a canvas to simulate GIF creation:
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const maxWidth = Math.max(...images.map(img => img.width));
        const maxHeight = Math.max(...images.map(img => img.height));
        
        canvas.width = maxWidth;
        canvas.height = maxHeight;
        
        // Draw the first frame
        if (images.length > 0) {
            ctx.drawImage(images[0], 0, 0);
        }
        
        // In a real implementation, you would encode all frames into a GIF
        // For now, we'll return a PNG blob of the first frame as a placeholder
        // Replace this with actual GIF encoding in production
        return new Promise(resolve => canvas.toBlob(resolve));
    }

    async function processZipFile(file) {
        progressContainer.style.display = 'block';
        progressBar.style.width = '0%';
        statusText.textContent = "Leyendo el archivo ZIP...";
        const shouldRemoveDuplicates = removeDuplicatesCheckbox.checked;
        const shouldOutputGif = outputGifCheckbox && outputGifCheckbox.checked;
        resultPanel.style.display = 'none';
        
        // Remove any previous success/error classes
        progressBar.classList.remove('bg-success', 'bg-danger');

        try {
            const zip = await JSZip.loadAsync(file);
            const imageFiles = {};
            const tempGroups = {};
            const singleImages = []; // Track single images

            // First pass: Collect all PNG files and their potential base names
            for (const [filename, zipEntry] of Object.entries(zip.files)) {
                if (!filename.endsWith('.png')) continue;
                
                // Extract name without extension
                const nameWithoutExt = filename.slice(0, -4);
                
                // Try to find a number at the end
                const numberMatch = nameWithoutExt.match(/^(.*?)(\d+)?$/);
                if (!numberMatch) continue;
                
                const [_, baseName, frameNumber] = numberMatch;
                const normalizedBaseName = baseName.endsWith('_') || baseName.endsWith('-') 
                    ? baseName.slice(0, -1) 
                    : baseName;

                // Store in temporary groups to help identify base names
                if (!tempGroups[normalizedBaseName]) {
                    tempGroups[normalizedBaseName] = [];
                }
                
                tempGroups[normalizedBaseName].push({
                    name: filename,
                    frameNumber: frameNumber ? parseInt(frameNumber) : 0,
                    entry: zipEntry
                });
            }

            // Second pass: Process groups and create final imageFiles object
            for (const [baseName, files] of Object.entries(tempGroups)) {
                // If there's only one file and it has no number, store it separately
                if (files.length === 1 && files[0].frameNumber === 0) {
                    singleImages.push({
                        name: files[0].name,
                        entry: files[0].entry
                    });
                    continue;
                }

                imageFiles[baseName] = files;
            }

            const newZip = new JSZip();
            let processedCount = 0;
            const totalAnimations = Object.keys(imageFiles).length + singleImages.length;
            
            // Stats for result panel
            let totalFrames = 0;
            let duplicatesRemoved = 0;
            let maxFrameWidth = 0;
            let maxFrameHeight = 0;
            let maxSpriteWidth = 0;
            let maxSpriteHeight = 0;
            
            // Store previews and info for each spritesheet/gif
            const spritesheetPreviews = [];

            // First process single images (just copy them)
            for (const singleImage of singleImages) {
                statusText.textContent = "Procesando imagen individual: " + singleImage.name;
                
                // Just copy the single image to the output
                const blob = await singleImage.entry.async('blob');
                const baseName = singleImage.name.slice(0, -4); // Remove .png
                newZip.file(`${baseName}.png`, blob);
                
                // Create a preview
                const img = await createImageBitmap(blob);
                
                // Create preview URL
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const previewBlob = await new Promise(resolve => canvas.toBlob(resolve));
                const previewUrl = URL.createObjectURL(previewBlob);
                
                spritesheetPreviews.push({
                    name: baseName,
                    url: previewUrl,
                    frames: 1,
                    pixelsPerFrame: img.width * img.height,
                    width: img.width,
                    height: img.height
                });
                
                totalFrames += 1;
                processedCount++;
                progressBar.style.width = `${(processedCount / totalAnimations) * 100}%`;
            }

            // Now process animation sequences
            for (const [animName, files] of Object.entries(imageFiles)) {
                statusText.textContent = "Procesando animación: " + animName;
                
                // Sort files by frame number
                files.sort((a, b) => a.frameNumber - b.frameNumber);

                // Load all images first
                const imageEntries = await Promise.all(files.map(async file => {
                    const blob = await file.entry.async('blob');
                    const img = await createImageBitmap(blob);
                    return {
                        img,
                        frameNumber: file.frameNumber
                    };
                }));

                // Filter out duplicate frames if option is selected
                let uniqueImages = imageEntries;
                if (shouldRemoveDuplicates && imageEntries.length > 1) {
                    uniqueImages = [imageEntries[0]];
                    
                    for (let i = 1; i < imageEntries.length; i++) {
                        const current = imageEntries[i];
                        const prev = imageEntries[i-1];
                        
                        const isDuplicate = await areImagesEqual(current.img, prev.img);
                        if (!isDuplicate) {
                            uniqueImages.push(current);
                        } else {
                            duplicatesRemoved++;
                        }
                    }
                }
                
                const images = uniqueImages.map(entry => entry.img);
                totalFrames += images.length;

                // Find maximum dimensions
                let maxWidth = 0;
                let maxHeight = 0;
                images.forEach(img => {
                    maxWidth = Math.max(maxWidth, img.width);
                    maxHeight = Math.max(maxHeight, img.height);
                });
                
                // Update stats
                maxFrameWidth = Math.max(maxFrameWidth, maxWidth);
                maxFrameHeight = Math.max(maxFrameHeight, maxHeight);

                if (shouldOutputGif && images.length > 1) {
                    // Create GIF instead of spritesheet
                    const frameDelay = 20; // 20ms delay between frames
                    const gifBlob = await createGif(images, frameDelay);
                    newZip.file(`${animName}.gif`, gifBlob);
                    
                    // For preview, we'll use the first frame with info overlay
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    canvas.width = maxWidth;
                    canvas.height = maxHeight;
                    ctx.drawImage(images[0], 0, 0);
                    
                    // Add an overlay label indicating it's a GIF
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    ctx.fillRect(0, canvas.height - 24, canvas.width, 24);
                    ctx.font = 'bold 12px Arial';
                    ctx.fillStyle = '#fff';
                    ctx.textAlign = 'center';
                    ctx.fillText(`GIF Animation: ${images.length} frames`, canvas.width / 2, canvas.height - 8);
                    
                    const gifPreviewBlob = await new Promise(resolve => canvas.toBlob(resolve));
                    const gifPreviewUrl = URL.createObjectURL(gifPreviewBlob);
                    
                    spritesheetPreviews.push({
                        name: animName + ' (GIF)',
                        url: gifPreviewUrl,
                        frames: images.length,
                        pixelsPerFrame: Math.round(maxWidth * maxHeight),
                        width: maxWidth,
                        height: maxHeight,
                        isGif: true
                    });
                } else {
                    // Create spritesheet as before
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas size to accommodate all normalized frames
                    canvas.height = maxHeight;
                    canvas.width = maxWidth * images.length;
                    
                    // Update total sprite size
                    maxSpriteWidth = Math.max(maxSpriteWidth, canvas.width);
                    maxSpriteHeight = Math.max(maxSpriteHeight, canvas.height);

                    // Draw each image centered in its frame
                    images.forEach((img, index) => {
                        const x = index * maxWidth;
                        const y = (maxHeight - img.height) / 2;
                        ctx.drawImage(
                            img,
                            x + (maxWidth - img.width) / 2,  // Center horizontally
                            y,  // Center vertically
                            img.width,
                            img.height
                        );
                    });

                    const blob = await new Promise(resolve => canvas.toBlob(resolve));
                    newZip.file(`${animName}.png`, blob);
                    
                    // Store preview and info for results panel
                    const previewUrl = URL.createObjectURL(blob);
                    spritesheetPreviews.push({
                        name: animName,
                        url: previewUrl,
                        frames: images.length,
                        pixelsPerFrame: Math.round(maxWidth * maxHeight),
                        width: canvas.width,
                        height: canvas.height
                    });
                }

                processedCount++;
                progressBar.style.width = `${(processedCount / totalAnimations) * 100}%`;
            }

            statusText.textContent = "Creando archivo de descarga...";
            const content = await newZip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE'
            });

            const url = URL.createObjectURL(content);
            lastDownloadUrl = url;
            lastFileName = "funky'ed_" + file.name;
            
            // Create result panel
            resultPanel.style.display = 'block';

            // Create and display preview for each spritesheet or GIF
            const resultContent = document.querySelector('.result-content');
            resultContent.innerHTML = ''; // Clear previous content

            // Sort spritesheets by name for consistent display
            spritesheetPreviews.sort((a, b) => a.name.localeCompare(b.name));

            // Add previews for each spritesheet
            spritesheetPreviews.forEach(preview => {
                const previewElement = document.createElement('div');
                previewElement.className = 'spritesheet-preview';
                previewElement.style.marginBottom = '20px';
                
                // Create animation name with special styling
                const nameElement = document.createElement('h3');
                nameElement.className = 'animation-name';
                nameElement.textContent = preview.name;
                previewElement.appendChild(nameElement);
                
                // Create preview image container with fixed height and horizontal scroll
                const previewImgContainer = document.createElement('div');
                previewImgContainer.className = 'preview-image-container';
                previewImgContainer.style.width = '100%';
                previewImgContainer.style.height = '140px';
                previewImgContainer.style.backgroundColor = 'rgba(20, 20, 40, 0.3)';
                previewImgContainer.style.position = 'relative';
                previewImgContainer.style.overflow = 'auto';
                previewImgContainer.style.borderRadius = '4px';
                previewImgContainer.style.border = '1px solid rgba(255, 255, 255, 0.1)';
                
                // Create an inner wrapper to maintain image aspect ratio
                const imageWrapper = document.createElement('div');
                imageWrapper.style.height = '120px';
                imageWrapper.style.display = 'flex';
                imageWrapper.style.alignItems = 'center';
                imageWrapper.style.padding = '10px';
                
                const previewImg = document.createElement('img');
                previewImg.src = preview.url;
                previewImg.alt = `${preview.name} spritesheet`;
                previewImg.className = 'preview-image';
                previewImg.style.maxHeight = '100%';
                
                // Add image to containers
                imageWrapper.appendChild(previewImg);
                previewImgContainer.appendChild(imageWrapper);
                previewElement.appendChild(previewImgContainer);
                
                // Calculate individual frame width
                const frameWidth = preview.frames > 1 ? Math.round(preview.width / preview.frames) : preview.width;
                const frameHeight = preview.height;
                
                // Create info text with frame count and dimensions
                const infoText = document.createElement('p');
                infoText.className = 'sprite-info';
                
                // Updated format for the information text
                if (preview.isGif) {
                    infoText.textContent = `${preview.frames} frames, Tamaño de cada frame: ${frameWidth}×${frameHeight}`;
                } else if (preview.frames > 1) {
                    infoText.textContent = `${preview.frames} frames, Tamaño de cada frame: ${frameWidth}×${frameHeight}, Tamaño del spritesheet: ${preview.width}×${preview.height}`;
                } else {
                    infoText.textContent = `Tamaño: ${preview.width}×${preview.height}`;
                }
                
                infoText.style.margin = '8px 0 0 0';
                infoText.style.fontSize = '0.9rem';
                infoText.style.color = 'rgba(255, 255, 255, 0.8)';
                
                previewElement.appendChild(infoText);
                resultContent.appendChild(previewElement);
            });
                    
            // Add duplicates removed info if applicable
            if (shouldRemoveDuplicates && duplicatesRemoved > 0) {
                const duplicateInfo = document.createElement('p');
                duplicateInfo.className = 'duplicate-info';
                duplicateInfo.textContent = `Se han eliminado ${duplicatesRemoved} frames duplicados.`;
                duplicateInfo.style.marginTop = '20px';
                duplicateInfo.style.padding = '10px';
                duplicateInfo.style.backgroundColor = 'rgba(255, 107, 107, 0.2)';
                duplicateInfo.style.borderRadius = '4px';
                resultContent.appendChild(duplicateInfo);
            }
            
            // Add GIF quality warning if applicable
            if (shouldOutputGif) {
                const gifInfo = document.createElement('p');
                gifInfo.className = 'gif-warning';
                gifInfo.textContent = 'Los archivos GIF son de menor calidad y no soportan transparencia parcial.';
                gifInfo.style.marginTop = '20px';
                resultContent.appendChild(gifInfo);
            }

            statusText.textContent = "¡Procesamiento completado! Haga clic en 'Descargar' para guardar su archivo.";
            progressBar.style.width = '100%';
            progressBar.classList.add('bg-success');

        } catch (error) {
            console.error(error);
            statusText.textContent = "Error al procesar el archivo: " + error.message;
            progressBar.classList.add('bg-danger');
        }
    }
});