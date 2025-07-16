import { useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageItem, ColorRemovalSettings, EffectSettings } from '@/pages/Index';

export const useImageProcessor = () => {
  const { toast } = useToast();

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

  // Apply morphological operations
  const applyMorphology = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const radius = Math.max(1, Math.floor(settings.featherRadius));

    // Simple erosion to clean up edges
    for (let y = radius; y < height - radius; y++) {
      for (let x = radius; x < width - radius; x++) {
        const centerIndex = (y * width + x) * 4;
        if (data[centerIndex + 3] === 0) continue; // Skip transparent pixels

        let shouldErode = false;
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const neighborIndex = ((y + dy) * width + (x + dx)) * 4;
            if (data[neighborIndex + 3] === 0) {
              shouldErode = true;
              break;
            }
          }
          if (shouldErode) break;
        }

        if (shouldErode) {
          data[centerIndex + 3] = 0;
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
      const intensity = settings.inkStamp.threshold / 100;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          // Blend with stamp color based on intensity
          data[i] = Math.round(data[i] * (1 - intensity) + stampR * intensity);
          data[i + 1] = Math.round(data[i + 1] * (1 - intensity) + stampG * intensity);
          data[i + 2] = Math.round(data[i + 2] * (1 - intensity) + stampB * intensity);
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
    if (!image.originalData) {
      toast({
        title: "Error",
        description: "Original image data not found",
        variant: "destructive"
      });
      return;
    }

    try {
      // Update status to processing
      setImages(prev => prev.map(img => 
        img.id === image.id ? { ...img, status: 'processing', progress: 0 } : img
      ));

      let processedData = new ImageData(
        new Uint8ClampedArray(image.originalData.data),
        image.originalData.width,
        image.originalData.height
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

        // Step 3: Morphological operations
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, progress: 75 } : img
        ));

        if (colorSettings.featherRadius > 0) {
          processedData = applyMorphology(processedData, colorSettings);
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
  }, [autoColorRemoval, manualColorRemoval, borderFloodFill, applyMorphology, applyEffects, toast]);

  // Process all images
  const processAllImages = useCallback(async (
    images: ImageItem[],
    colorSettings: ColorRemovalSettings,
    effectSettings: EffectSettings,
    setImages: React.Dispatch<React.SetStateAction<ImageItem[]>>
  ) => {
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
      description: `Processing ${pendingImages.length} images...`
    });

    // Process images sequentially to avoid overwhelming the browser
    for (const image of pendingImages) {
      await processImage(image, colorSettings, effectSettings, setImages);
      // Small delay to prevent UI blocking
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    toast({
      title: "Batch Processing Complete",
      description: `Processed ${pendingImages.length} images`
    });
  }, [processImage, toast]);

  // Download single image
  const downloadImage = useCallback((image: ImageItem) => {
    if (!image.processedData) {
      toast({
        title: "No Processed Data",
        description: "Process the image first before downloading",
        variant: "destructive"
      });
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.processedData.width;
    canvas.height = image.processedData.height;
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;

    ctx.putImageData(image.processedData, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) return;
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${image.name.replace(/\.[^/.]+$/, '')}_processed.png`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/png');

    toast({
      title: "Download Started",
      description: `Downloading ${image.name}`
    });
  }, [toast]);

  // Download all processed images as ZIP
  const downloadAllImages = useCallback(async (images: ImageItem[]) => {
    const { default: JSZip } = await import('jszip');
    
    const processedImages = images.filter(img => img.status === 'completed' && img.processedData);
    
    if (processedImages.length === 0) {
      toast({
        title: "No Processed Images",
        description: "Process some images first before downloading",
        variant: "destructive"
      });
      return;
    }

    const zip = new JSZip();

    for (const image of processedImages) {
      if (!image.processedData) continue;
      
      const canvas = document.createElement('canvas');
      canvas.width = image.processedData.width;
      canvas.height = image.processedData.height;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) continue;

      ctx.putImageData(image.processedData, 0, 0);
      
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/png');
      });
      
      if (blob) {
        const filename = `${image.name.replace(/\.[^/.]+$/, '')}_processed.png`;
        zip.file(filename, blob);
      }
    }

    const zipBlob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(zipBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'processed_images.zip';
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "ZIP Download Started",
      description: `Downloading ${processedImages.length} processed images`
    });
  }, [toast]);

  return {
    processImage,
    processAllImages,
    downloadImage,
    downloadAllImages
  };
};