import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageItem, ColorRemovalSettings, EffectSettings } from '@/pages/Index';

export const useImageProcessor = () => {
  const { toast } = useToast();
  const cancelTokenRef = useRef({ cancelled: false });

  // CIEDE2000 color distance calculation (simplified version)
  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    // Convert RGB to LAB color space (simplified)
    const lab1 = rgbToLab(r1, g1, b1);
    const lab2 = rgbToLab(r2, g2, b2);
    
    // Simplified CIEDE2000 distance calculation
    const deltaL = lab2.l - lab1.l;
    const deltaA = lab2.a - lab1.a;
    const deltaB = lab2.b - lab1.b;
    
    return Math.sqrt(deltaL * deltaL + deltaA * deltaA + deltaB * deltaB);
  }, []);

  // Convert RGB to LAB color space (simplified)
  const rgbToLab = (r: number, g: number, b: number) => {
    // Convert RGB to XYZ first (simplified)
    let rNorm = r / 255;
    let gNorm = g / 255;
    let bNorm = b / 255;

    // Apply gamma correction
    rNorm = rNorm > 0.04045 ? Math.pow((rNorm + 0.055) / 1.055, 2.4) : rNorm / 12.92;
    gNorm = gNorm > 0.04045 ? Math.pow((gNorm + 0.055) / 1.055, 2.4) : gNorm / 12.92;
    bNorm = bNorm > 0.04045 ? Math.pow((bNorm + 0.055) / 1.055, 2.4) : bNorm / 12.92;

    // Observer. = 2°, Illuminant = D65
    const x = rNorm * 0.4124 + gNorm * 0.3576 + bNorm * 0.1805;
    const y = rNorm * 0.2126 + gNorm * 0.7152 + bNorm * 0.0722;
    const z = rNorm * 0.0193 + gNorm * 0.1192 + bNorm * 0.9505;

    // Convert XYZ to LAB
    const xn = 95.047;  // Reference white D65
    const yn = 100.000;
    const zn = 108.883;

    const fx = x / xn > 0.008856 ? Math.pow(x / xn, 1/3) : (7.787 * x / xn) + (16/116);
    const fy = y / yn > 0.008856 ? Math.pow(y / yn, 1/3) : (7.787 * y / yn) + (16/116);
    const fz = z / zn > 0.008856 ? Math.pow(z / zn, 1/3) : (7.787 * z / zn) + (16/116);

    const l = (116 * fy) - 16;
    const a = 500 * (fx - fy);
    const b_lab = 200 * (fy - fz);

    return { l, a, b: b_lab };
  };

  // Auto color removal - removes top-left corner color and similar colors
  const autoColorRemoval = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Get top-left corner color
    const targetR = data[0];
    const targetG = data[1];
    const targetB = data[2];

    // Convert threshold (0-100) to LAB distance threshold
    const threshold = settings.threshold * 1.5; // Adjust scaling as needed

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

    const threshold = settings.threshold * 1.5;

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
      return distance <= settings.threshold * 1.5;
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

    // Step 2: Apply feathering (gaussian blur on alpha channel)
    if (settings.featherRadius > 0) {
      const radius = Math.max(1, Math.floor(settings.featherRadius));
      const newData = new Uint8ClampedArray(data);
      
      // Create gaussian kernel
      const sigma = radius / 3;
      const kernel: number[] = [];
      const kernelSize = radius * 2 + 1;
      let kernelSum = 0;
      
      for (let i = 0; i < kernelSize; i++) {
        const x = i - radius;
        const value = Math.exp(-(x * x) / (2 * sigma * sigma));
        kernel[i] = value;
        kernelSum += value;
      }
      
      // Normalize kernel
      for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
      }
      
      // Apply horizontal blur on alpha channel
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          let alpha = 0;
          
          for (let i = 0; i < kernelSize; i++) {
            const nx = x + i - radius;
            if (nx >= 0 && nx < width) {
              const index = (y * width + nx) * 4;
              alpha += data[index + 3] * kernel[i];
            }
          }
          
          const index = (y * width + x) * 4;
          newData[index + 3] = Math.round(Math.max(0, Math.min(255, alpha)));
        }
      }
      
      // Apply vertical blur on alpha channel
      for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
          let alpha = 0;
          
          for (let i = 0; i < kernelSize; i++) {
            const ny = y + i - radius;
            if (ny >= 0 && ny < height) {
              const index = (ny * width + x) * 4;
              alpha += newData[index + 3] * kernel[i];
            }
          }
          
          const index = (y * width + x) * 4;
          data[index + 3] = Math.round(Math.max(0, Math.min(255, alpha)));
        }
      }
    }

    return new ImageData(data, width, height);
  }, []);

  // Apply effects
  const applyEffects = useCallback((imageData: ImageData, settings: EffectSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Parse background color
    const hex = settings.background.color.replace('#', '');
    const bgR = parseInt(hex.substr(0, 2), 16);
    const bgG = parseInt(hex.substr(2, 2), 16);
    const bgB = parseInt(hex.substr(4, 2), 16);

    // Apply background color to transparent areas
    if (settings.background.enabled && settings.background.saveWithBackground) {
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

        if (colorSettings.contiguous) {
          processedData = borderFloodFill(processedData, colorSettings);
        }

        // Step 3: Cleanup regions and apply feathering
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, progress: 75 } : img
        ));

        if (colorSettings.minRegionSize > 0 || colorSettings.featherRadius > 0) {
          processedData = cleanupRegions(processedData, colorSettings);
        }
      }

      // Step 4: Apply effects
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, progress: 90 } : img
      ));

      processedData = applyEffects(processedData, effectSettings);

      // Complete
      setImages(prev => prev.map(img => 
        img.id === image.id ? { 
          ...img, 
          status: 'completed', 
          progress: 100, 
          processedData 
        } : img
      ));

      toast({
        title: "Processing Complete",
        description: `${image.name} has been processed successfully`
      });

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
  }, [autoColorRemoval, manualColorRemoval, borderFloodFill, cleanupRegions, applyEffects, toast]);

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

    toast({
      title: "Batch Processing Started",
      description: `Processing and downloading ${pendingImages.length} images one by one...`
    });

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
        // Show progress toast
        toast({
          title: `Processing ${i + 1}/${pendingImages.length}`,
          description: `Processing ${image.name}...`
        });

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
          
          // Download the processed image
          toast({
            title: `Downloading ${i + 1}/${pendingImages.length}`,
            description: `Downloading ${image.name}...`
          });
          
          downloadImage(processedImage, effectSettings);
          
          toast({
            title: `Downloaded ${i + 1}/${pendingImages.length}`,
            description: `${image.name} processed and downloaded successfully`
          });
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
      toast({
        title: "Batch Processing Complete",
        description: `Successfully processed and downloaded ${pendingImages.length} images`
      });
    }
  }, [processImage, toast]);

  const cancelProcessing = useCallback(() => {
    cancelTokenRef.current.cancelled = true;
  }, []);

  // Helper function to trim transparent pixels
  const trimTransparentPixels = useCallback((imageData: ImageData): ImageData => {
    const { data, width, height } = imageData;
    
    // Find bounds of non-transparent pixels
    let minX = width, minY = height, maxX = -1, maxY = -1;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3];
        if (alpha > 0) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
    }
    
    // If no non-transparent pixels found, return 1x1 transparent image
    if (maxX === -1) {
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
  const downloadImage = useCallback((image: ImageItem, effectSettings?: { download?: { trimTransparentPixels?: boolean }; background?: { enabled?: boolean; color?: string; saveWithBackground?: boolean } }) => {
    if (!image.processedData) {
      toast({
        title: "No Processed Data",
        description: "Process the image first before downloading",
        variant: "destructive"
      });
      return;
    }

    console.log('Downloading image:', image.name, 'Processed data size:', image.processedData.data.length);

    let imageDataToDownload = new ImageData(
      new Uint8ClampedArray(image.processedData.data),
      image.processedData.width,
      image.processedData.height
    );
    
    // Apply background only to download if saveWithBackground is enabled
    if (effectSettings?.background?.enabled && effectSettings?.background?.saveWithBackground && effectSettings?.background?.color) {
      const hex = effectSettings.background.color.replace('#', '');
      const bgR = parseInt(hex.substr(0, 2), 16);
      const bgG = parseInt(hex.substr(2, 2), 16);
      const bgB = parseInt(hex.substr(4, 2), 16);
      const data = imageDataToDownload.data;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      }
      
      console.log('Applied background color for download:', effectSettings.background.color);
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

    toast({
      title: "Download Started",
      description: `Downloading ${image.name}${effectSettings?.download?.trimTransparentPixels ? ' (trimmed)' : ''}`
    });
  }, [toast, trimTransparentPixels]);


  return {
    processImage,
    processAllImages,
    downloadImage,
    cancelProcessing
  };
};