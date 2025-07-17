import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageItem, ColorRemovalSettings, EffectSettings } from '@/pages/Index';

export const useImageProcessor = () => {
  const { toast } = useToast();
  const cancelTokenRef = useRef({ cancelled: false });

  // Simple RGB color distance calculation (more reliable than LAB)
  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }, []);


  // Auto color removal - removes top-left corner color and similar colors
  const autoColorRemoval = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Get top-left corner color
    const targetR = data[0];
    const targetG = data[1];
    const targetB = data[2];

    // Convert threshold (0-100) to RGB distance threshold (much more conservative)
    const threshold = settings.threshold * 2.55; // Scale to 0-255 range
    
    console.log('Auto color removal - target color:', `rgb(${targetR}, ${targetG}, ${targetB})`, 'threshold:', threshold);
    
    let pixelsRemoved = 0;
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      
      if (distance <= threshold) {
        data[i + 3] = 0; // Make transparent
        pixelsRemoved++;
      }
    }
    
    console.log('Auto color removal complete - pixels removed:', pixelsRemoved, 'out of', data.length / 4);

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Manual color removal - removes specified color
  const manualColorRemoval = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Parse target color
    const hex = settings.targetColor.replace('#', '');
    const targetR = parseInt(hex.substr(0, 2), 16);
    const targetG = parseInt(hex.substr(2, 2), 16);
    const targetB = parseInt(hex.substr(4, 2), 16);

    const threshold = settings.threshold * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      
      if (distance <= threshold) {
        data[i + 3] = 0; // Make transparent
      }
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Contiguous color removal from borders
  const borderFloodFill = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const visited = new Set<string>();

    const isColorSimilar = (r1: number, g1: number, b1: number, r2: number, g2: number, b2: number) => {
      const distance = calculateColorDistance(r1, g1, b1, r2, g2, b2);
      return distance <= settings.threshold * 2.55;
    };

    const floodFillFromBorder = (startX: number, startY: number) => {
      const stack = [[startX, startY]];
      const index = (startY * width + startX) * 4;
      const targetR = data[index];
      const targetG = data[index + 1];
      const targetB = data[index + 2];

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;

        if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
        visited.add(key);

        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        const a = data[pixelIndex + 3];

        if (a === 0 || !isColorSimilar(r, g, b, targetR, targetG, targetB)) continue;

        // Make pixel transparent
        data[pixelIndex + 3] = 0;

        // Add neighbors
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    };

    // Process borders
    for (let x = 0; x < width; x++) {
      floodFillFromBorder(x, 0); // Top border
      floodFillFromBorder(x, height - 1); // Bottom border
    }
    for (let y = 0; y < height; y++) {
      floodFillFromBorder(0, y); // Left border
      floodFillFromBorder(width - 1, y); // Right border
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Remove small regions and apply feathering
  const cleanupRegions = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Step 1: Remove small transparent regions (fill holes)
    if (settings.minRegionSize > 0) {
      const visited = new Set<string>();
      
      const floodFillRegion = (startX: number, startY: number, isTransparent: boolean): number => {
        const stack = [[startX, startY]];
        const region: [number, number][] = [];
        
        while (stack.length > 0) {
          const [x, y] = stack.pop()!;
          const key = `${x},${y}`;
          
          if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
          visited.add(key);
          
          const index = (y * width + x) * 4;
          const pixelIsTransparent = data[index + 3] === 0;
          
          if (pixelIsTransparent !== isTransparent) continue;
          
          region.push([x, y]);
          stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
        }
        
        return region.length;
      };

      // Find and remove small transparent regions
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const key = `${x},${y}`;
          if (visited.has(key)) continue;
          
          const index = (y * width + x) * 4;
          const isTransparent = data[index + 3] === 0;
          
          if (isTransparent) {
            const regionSize = floodFillRegion(x, y, true);
            
            // If region is too small, fill it (make it opaque)
            if (regionSize < settings.minRegionSize) {
              // Get surrounding color to fill with
              let fillR = 0, fillG = 0, fillB = 0, count = 0;
              
              for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                  const nx = x + dx;
                  const ny = y + dy;
                  if (nx >= 0 && ny >= 0 && nx < width && ny < height) {
                    const nIndex = (ny * width + nx) * 4;
                    if (data[nIndex + 3] > 0) {
                      fillR += data[nIndex];
                      fillG += data[nIndex + 1];
                      fillB += data[nIndex + 2];
                      count++;
                    }
                  }
                }
              }
              
              if (count > 0) {
                fillR = Math.round(fillR / count);
                fillG = Math.round(fillG / count);
                fillB = Math.round(fillB / count);
                
                // Fill the small region
                const fillStack = [[x, y]];
                const fillVisited = new Set<string>();
                
                while (fillStack.length > 0) {
                  const [fx, fy] = fillStack.pop()!;
                  const fKey = `${fx},${fy}`;
                  
                  if (fillVisited.has(fKey) || fx < 0 || fy < 0 || fx >= width || fy >= height) continue;
                  fillVisited.add(fKey);
                  
                  const fIndex = (fy * width + fx) * 4;
                  if (data[fIndex + 3] > 0) continue;
                  
                  data[fIndex] = fillR;
                  data[fIndex + 1] = fillG;
                  data[fIndex + 2] = fillB;
                  data[fIndex + 3] = 255;
                  
                  fillStack.push([fx + 1, fy], [fx - 1, fy], [fx, fy + 1], [fx, fy - 1]);
                }
              }
            }
          }
        }
      }
    }


    return new ImageData(data, width, height);
  }, []);

  // Apply effects for display only (non-destructive background)
  const applyDisplayEffects = useCallback((imageData: ImageData, settings: EffectSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Apply background color for preview only (regardless of saveWithBackground setting)
    if (settings.background.enabled) {
      const hex = settings.background.color.replace('#', '');
      const bgR = parseInt(hex.substr(0, 2), 16);
      const bgG = parseInt(hex.substr(2, 2), 16);
      const bgB = parseInt(hex.substr(4, 2), 16);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      }
    }

    // Apply ink stamp effect
    if (settings.inkStamp.enabled) {
      const hex = settings.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = (100 - settings.inkStamp.threshold) * 2.55; // Convert to 0-255 range, invert for intuitive control

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Only process non-transparent pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to luminance (perceived brightness)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance < threshold) {
            // Dark areas become stamp color
            data[i] = stampR;
            data[i + 1] = stampG;
            data[i + 2] = stampB;
            data[i + 3] = 255; // Fully opaque
          } else {
            // Light areas become transparent
            data[i + 3] = 0;
          }
        }
      }
    }

    return new ImageData(data, width, height);
  }, []);

  // Apply effects for download (only applies background if saveWithBackground is true)
  const applyDownloadEffects = useCallback((imageData: ImageData, settings: EffectSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Only apply background for download if explicitly requested
    if (settings.background.enabled && settings.background.saveWithBackground) {
      const hex = settings.background.color.replace('#', '');
      const bgR = parseInt(hex.substr(0, 2), 16);
      const bgG = parseInt(hex.substr(2, 2), 16);
      const bgB = parseInt(hex.substr(4, 2), 16);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      }
    }

    // Apply ink stamp effect
    if (settings.inkStamp.enabled) {
      const hex = settings.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = (100 - settings.inkStamp.threshold) * 2.55; // Convert to 0-255 range, invert for intuitive control

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Only process non-transparent pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to luminance (perceived brightness)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance < threshold) {
            // Dark areas become stamp color
            data[i] = stampR;
            data[i + 1] = stampG;
            data[i + 2] = stampB;
            data[i + 3] = 255; // Fully opaque
          } else {
            // Light areas become transparent
            data[i + 3] = 0;
          }
        }
      }
    }

    return new ImageData(data, width, height);
  }, []);

  // Process a single image
  const processImage = useCallback(async (
    image: ImageItem, 
    colorSettings: ColorRemovalSettings, 
    effectSettings: EffectSettings,
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>
  ) => {
    let originalData = image.originalData;
    
    // If original data is not available, load it from the file
    if (!originalData) {
      try {
        const img = new Image();
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          throw new Error('Could not get canvas context');
        }

        // Load image from file
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          img.src = URL.createObjectURL(image.file);
        });

        // Set canvas size and draw image
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Clean up
        URL.revokeObjectURL(img.src);
        
        // Update the image with original data for future use
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, originalData } : img
        ));
        
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to load original image data",
          variant: "destructive"
        });
        return;
      }
    }

    try {
      // Update status to processing
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, status: 'processing', progress: 0 } : img
      ));

      let processedData = new ImageData(
        new Uint8ClampedArray(originalData.data),
        originalData.width,
        originalData.height
      );

      // Step 1: Color removal
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, progress: 25 } : img
      ));
      
      // Add delay to make progress visible
      await new Promise(resolve => setTimeout(resolve, 300));

      if (colorSettings.enabled) {
        if (colorSettings.mode === 'auto') {
          processedData = autoColorRemoval(processedData, colorSettings);
        } else {
          processedData = manualColorRemoval(processedData, colorSettings);
        }

        // Step 2: Contiguous removal from borders
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, progress: 50 } : img
        ));
        
        // Add delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 300));

        if (colorSettings.contiguous) {
          processedData = borderFloodFill(processedData, colorSettings);
        }

        // Step 3: Cleanup regions and apply feathering
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, progress: 75 } : img
        ));
        
        // Add delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 300));

        if (colorSettings.minRegionSize > 0) {
          processedData = cleanupRegions(processedData, colorSettings);
        }
      }

      // Step 4: Store clean processed data (without background/effects applied)
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, progress: 90 } : img
      ));
      
      // Add delay to make progress visible
      await new Promise(resolve => setTimeout(resolve, 300));

      // Store the clean processed data (color removal only, no effects)
      // Effects will be applied separately for display and download

      // Complete
      setImages(prev => prev.map(img => 
        img.id === image.id ? { 
          ...img, 
          status: 'completed', 
          progress: 100, 
          processedData 
        } : img
      ));

      // Removed success toast notification

    } catch (error) {
      console.error('Processing error:', error);
      
      setImages(prev => prev.map(img => 
        img.id === image.id ? { 
          ...img, 
          status: 'error', 
          error: error instanceof Error ? error.message : 'Unknown error'
        } : img
      ));

      toast({
        title: "Processing Error",
        description: `Failed to process ${image.name}`,
        variant: "destructive"
      });
    }
  }, [autoColorRemoval, manualColorRemoval, borderFloodFill, cleanupRegions, applyDisplayEffects, toast]);

  // Process and download all images one by one sequentially
  const processAllImages = useCallback(async (
    images: ImageItem[],
    colorSettings: ColorRemovalSettings,
    effectSettings: EffectSettings,
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>
  ) => {
    // Reset cancel token
    cancelTokenRef.current.cancelled = false;
    
    const pendingImages = images.filter(img => img.status === 'pending');
    
    if (pendingImages.length === 0) {
      toast({
        title: "No Images to Process",
        description: "All images have already been processed"
      });
      return;
    }

    // Removed batch processing start toast

    // Process and download images sequentially
    for (let i = 0; i < pendingImages.length; i++) {
      // Check if cancelled
      if (cancelTokenRef.current.cancelled) {
        toast({
          title: "Processing Cancelled",
          description: "Batch processing was cancelled by user"
        });
        return;
      }
      
      const image = pendingImages[i];
      
      try {
        // Processing notification now handled in queue header

        // Process the image
        await processImage(image, colorSettings, effectSettings, setImages);
        
        // Check if cancelled after processing
        if (cancelTokenRef.current.cancelled) {
          return;
        }
        
        // Wait a moment to ensure processing is complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get the updated image with processed data
        const updatedImages = await new Promise<ImageItem[]>((resolve) => {
          setImages(prev => {
            resolve(prev);
            return prev;
          });
        });
        
        const processedImage = updatedImages.find(img => img.id === image.id);
        
        if (processedImage && processedImage.status === 'completed' && processedImage.processedData) {
          // Check if cancelled before downloading
          if (cancelTokenRef.current.cancelled) {
            return;
          }
          
          // Download the processed image - notification handled in queue header
          downloadImage(processedImage, colorSettings, effectSettings);
        } else {
          throw new Error('Processing failed');
        }
        
        // Add delay between downloads to avoid browser issues
        if (i < pendingImages.length - 1 && !cancelTokenRef.current.cancelled) {
          await new Promise(resolve => setTimeout(resolve, 1500)); // 1.5 second delay
        }
        
      } catch (error) {
        console.error(`Error processing/downloading ${image.name}:`, error);
        toast({
          title: "Processing Error",
          description: `Failed to process/download ${image.name}`,
          variant: "destructive"
        });
      }
    }

    if (!cancelTokenRef.current.cancelled) {
      // Removed batch processing complete toast
    }
  }, [processImage, toast]);

  const cancelProcessing = useCallback(() => {
    cancelTokenRef.current.cancelled = true;
  }, []);

  // Helper function to trim transparent pixels
  const trimTransparentPixels = useCallback((imageData: ImageData): ImageData => {
    const { data, width, height } = imageData;
    
    console.log('Trimming function called with dimensions:', width, 'x', height);
    
    // Find bounds of non-transparent pixels
    let minX = width, minY = height, maxX = -1, maxY = -1;
    let totalNonTransparent = 0;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          totalNonTransparent++;
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    console.log('Found', totalNonTransparent, 'non-transparent pixels');
    console.log('Bounds: minX:', minX, 'minY:', minY, 'maxX:', maxX, 'maxY:', maxY);
    
    // If no non-transparent pixels found, return 1x1 transparent image
    if (maxX === -1) {
      console.log('No non-transparent pixels found, returning 1x1 image');
      const trimmedData = new Uint8ClampedArray(4);
      return new ImageData(trimmedData, 1, 1);
    }
    
    // Calculate trimmed dimensions
    const trimmedWidth = maxX - minX + 1;
    const trimmedHeight = maxY - minY + 1;
    const trimmedData = new Uint8ClampedArray(trimmedWidth * trimmedHeight * 4);
    
    // Copy trimmed region
    for (let y = 0; y < trimmedHeight; y++) {
      for (let x = 0; x < trimmedWidth; x++) {
        const sourceIndex = ((minY + y) * width + (minX + x)) * 4;
        const targetIndex = (y * trimmedWidth + x) * 4;
        
        trimmedData[targetIndex] = data[sourceIndex];
        trimmedData[targetIndex + 1] = data[sourceIndex + 1];
        trimmedData[targetIndex + 2] = data[sourceIndex + 2];
        trimmedData[targetIndex + 3] = data[sourceIndex + 3];
      }
    }
    
    return new ImageData(trimmedData, trimmedWidth, trimmedHeight);
  }, []);

  // Download single image
  const downloadImage = useCallback((image: ImageItem, colorSettings: ColorRemovalSettings, effectSettings?: EffectSettings) => {
    // Prioritize processedData (includes manual edits) over originalData
    if (!image.processedData && !image.originalData) {
      console.error('No image data available for download');
      return;
    }

    const sourceData = image.processedData || image.originalData!;
    console.log('Downloading image:', image.name, 'Using:', image.processedData ? 'processedData (with manual edits)' : 'originalData');
    console.log('Download effect settings:', JSON.stringify(effectSettings, null, 2));

    // Use the current processed data (includes manual edits) as starting point
    let processedData = new ImageData(
      new Uint8ClampedArray(sourceData.data),
      sourceData.width,
      sourceData.height
    );

    // Re-process with current settings (same logic as MainCanvas preview)
    const data = processedData.data;
    const width = processedData.width;
    const height = processedData.height;

    // Count initial non-transparent pixels
    let initialCount = 0;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) initialCount++;
    }
    console.log('Initial non-transparent pixels:', initialCount);

    // Apply the same color removal logic as preview using current settings
    if (colorSettings.enabled) {
      if (colorSettings.mode === 'auto') {
        processedData = autoColorRemoval(processedData, colorSettings);
      } else {
        processedData = manualColorRemoval(processedData, colorSettings);
      }

      if (colorSettings.contiguous) {
        processedData = borderFloodFill(processedData, colorSettings);
      }

      if (colorSettings.minRegionSize > 0) {
        processedData = cleanupRegions(processedData, colorSettings);
      }
    }
    
    // Count pixels after reprocessing
    let finalCount = 0;
    for (let i = 0; i < processedData.data.length; i += 4) {
      if (processedData.data[i + 3] > 0) finalCount++;
    }
    console.log('Pixels after reprocessing with current settings:', finalCount);
    
    let imageDataToDownload = processedData;
    
    // Apply download effects if provided
    if (effectSettings) {
      imageDataToDownload = applyDownloadEffects(imageDataToDownload, effectSettings);
      console.log('Applied download effects');
      
      // Count non-transparent pixels after applying effects
      let nonTransparentCountAfter = 0;
      for (let i = 0; i < imageDataToDownload.data.length; i += 4) {
        if (imageDataToDownload.data[i + 3] > 0) nonTransparentCountAfter++;
      }
      console.log('Non-transparent pixels after download effects:', nonTransparentCountAfter);
    }
    
    // Apply trimming if enabled
    if (effectSettings?.download?.trimTransparentPixels) {
      imageDataToDownload = trimTransparentPixels(imageDataToDownload);
      console.log('Applied trimming, new dimensions:', imageDataToDownload.width, 'x', imageDataToDownload.height);
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = imageDataToDownload.width;
    canvas.height = imageDataToDownload.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      console.error('Could not get canvas context for download');
      return;
    }

    // Clear canvas with transparent background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.putImageData(imageDataToDownload, 0, 0);
    
    // Debug: check canvas content
    console.log('Canvas dimensions:', canvas.width, 'x', canvas.height);
    console.log('ImageData dimensions:', imageDataToDownload.width, 'x', imageDataToDownload.height);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        console.error('Failed to create blob from canvas');
        return;
      }
      
      console.log('Blob created successfully, size:', blob.size);
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const suffix = effectSettings?.download?.trimTransparentPixels ? '_trimmed' : '_processed';
      a.href = url;
      a.download = `${image.name.replace(/\.[^/.]+$/, '')}${suffix}.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0); // Add quality parameter

    // Removed download started toast
  }, [autoColorRemoval, manualColorRemoval, borderFloodFill, cleanupRegions, trimTransparentPixels, applyDownloadEffects]);


  return {
    processImage,
    processAllImages,
    downloadImage,
    cancelProcessing
  };
};