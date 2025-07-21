import { useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';
import { ImageItem, ColorRemovalSettings, EffectSettings } from '@/pages/Index';
import type { WorkerMessage, WorkerResponse } from '@/workers/imageProcessor.worker';

export const useImageProcessor = () => {
  const { toast } = useToast();
  const cancelTokenRef = useRef({ cancelled: false });
  const workerRef = useRef<Worker | null>(null);
  const taskIdRef = useRef(0);

  // Initialize worker on first use
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/workers/imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // Wrapper for worker operations with transferable objects
  const processWithWorker = useCallback(async (
    type: 'processImage' | 'applyEffects' | 'downloadEffects',
    imageData: ImageData,
    settings?: any,
    effectSettings?: any
  ): Promise<ImageData> => {
    console.log(`🔄 Starting worker processing: ${type}`);
    console.time(`worker-${type}`);
    
    return new Promise((resolve, reject) => {
      const worker = getWorker();
      const id = (++taskIdRef.current).toString();
      const timeout = setTimeout(() => {
        console.log(`⏰ Worker timeout for ${type}`);
        reject(new Error('Worker timeout'));
      }, 30000);

      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        if (event.data.id !== id) return;
        
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        
        if (event.data.type === 'success' && event.data.data) {
          console.log(`✅ Worker ${type} completed successfully`);
          console.timeEnd(`worker-${type}`);
          // Convert back to ImageData
          const resultData = new Uint8ClampedArray(event.data.data.data);
          const resultImageData = new ImageData(resultData, event.data.data.width, event.data.data.height);
          resolve(resultImageData);
        } else {
          console.log(`❌ Worker ${type} failed:`, event.data.error);
          console.timeEnd(`worker-${type}`);
          reject(new Error(event.data.error || 'Worker processing failed'));
        }
      };

      const handleError = (error: ErrorEvent) => {
        console.log(`💥 Worker error for ${type}:`, error);
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(new Error(`Worker error: ${error.message}`));
      };

      worker.addEventListener('message', handleMessage);
      worker.addEventListener('error', handleError);
      
      try {
        // Prepare data for transfer
        const transferableData = {
          data: imageData.data.buffer.slice(0), // Clone the buffer
          width: imageData.width,
          height: imageData.height
        };
        
        worker.postMessage({
          type,
          data: { imageData: transferableData, settings, effectSettings },
          id
        } as WorkerMessage, [transferableData.data]);
        
        console.log(`📤 Posted ${type} message to worker with id ${id} using transferable objects`);
      } catch (error) {
        console.log(`🚫 Failed to post message to worker:`, error);
        clearTimeout(timeout);
        worker.removeEventListener('message', handleMessage);
        worker.removeEventListener('error', handleError);
        reject(error);
      }
    });
  }, [getWorker]);

  // Cleanup worker on unmount
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  // RGB to HSL conversion
  const rgbToHsl = useCallback((r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) * 60;
          break;
        case g:
          h = ((b - r) / diff + 2) * 60;
          break;
        case b:
          h = ((r - g) / diff + 4) * 60;
          break;
      }
    }
    
    return [h, s, l];
  }, []);

  // HSL to RGB conversion
  const hslToRgb = useCallback((h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    if (s === 0) {
      return [l * 255, l * 255, l * 255];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
  }, []);

  // Color space conversion utilities
  const rgbToLab = useCallback((r: number, g: number, b: number): [number, number, number] => {
    // Convert RGB to XYZ
    let x = r / 255;
    let y = g / 255;
    let z = b / 255;

    x = x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
    y = y > 0.04045 ? Math.pow((y + 0.055) / 1.055, 2.4) : y / 12.92;
    z = z > 0.04045 ? Math.pow((z + 0.055) / 1.055, 2.4) : z / 12.92;

    x *= 100;
    y *= 100;
    z *= 100;

    // Observer = 2°, Illuminant = D65
    x = x / 95.047;
    y = y / 100.000;
    z = z / 108.883;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

    const L = (116 * y) - 16;
    const A = 500 * (x - y);
    const B = 200 * (y - z);

    return [L, A, B];
  }, []);

  // Color distance calculation with multiple color space support
  const calculateColorDistance = useCallback((
    r1: number, g1: number, b1: number, 
    r2: number, g2: number, b2: number, 
    colorSpace: 'rgb' | 'hsl' | 'lab' = 'lab'
  ): number => {
    switch (colorSpace) {
      case 'rgb': {
        const dr = r1 - r2;
        const dg = g1 - g2;
        const db = b1 - b2;
        return Math.sqrt(dr * dr + dg * dg + db * db);
      }
      case 'hsl': {
        const [h1, s1, l1] = rgbToHsl(r1, g1, b1);
        const [h2, s2, l2] = rgbToHsl(r2, g2, b2);
        
        // Handle hue wrapping (circular distance)
        let dh = Math.abs(h1 - h2);
        dh = Math.min(dh, 360 - dh);
        
        const ds = (s1 - s2) * 100; // Scale saturation difference
        const dl = (l1 - l2) * 100; // Scale lightness difference
        
        return Math.sqrt(dh * dh + ds * ds + dl * dl);
      }
      case 'lab': {
        const [l1, a1, b1Lab] = rgbToLab(r1, g1, b1);
        const [l2, a2, b2Lab] = rgbToLab(r2, g2, b2);
        
        const dl = l1 - l2;
        const da = a1 - a2;
        const db = b1Lab - b2Lab;
        
        // Delta E CIE76 formula for perceptual color difference
        return Math.sqrt(dl * dl + da * da + db * db);
      }
      default:
        return 0;
    }
  }, [rgbToLab, rgbToHsl]);

  // Unified processing function with proper logging
  const processImageDataUnified = useCallback(async (imageData: ImageData, settings: ColorRemovalSettings): Promise<ImageData> => {
    console.log('🎨 processImageDataUnified called with settings:', { enabled: settings.enabled, mode: settings.mode, contiguous: settings.contiguous });
    
    if (!settings.enabled) {
      console.log('🚫 Color removal disabled, returning original data');
      return imageData;
    }

    try {
      console.log('🏭 Using worker for color removal processing...');
      const result = await processWithWorker('processImage', imageData, settings);
      console.log('✅ Worker processing completed successfully');
      return result;
    } catch (error) {
      console.log('⚠️ Worker failed, falling back to main thread:', error);
      console.log('🔄 Falling back to main thread processing...');
      
      // Fallback to main thread with performance optimizations
      const data = new Uint8ClampedArray(imageData.data);
      const width = imageData.width;
      const height = imageData.height;

      console.log('🔧 Fallback: Processing on main thread with performance optimizations');

      // Only process if color removal is enabled
      if (settings.enabled) {
        if (settings.mode === 'auto') {
          // Use top-left corner color
          const targetR = data[0];
          const targetG = data[1];
          const targetB = data[2];
          const threshold = settings.threshold * 2.5; // Scale threshold to make it more sensitive (was too high)

          if (settings.contiguous) {
            // Contiguous removal starting from top-left corner with performance optimization
            const visited = new Set<string>();
            const stack = [[0, 0]];
            let processedPixels = 0;
            
            const isColorSimilar = (r: number, g: number, b: number) => {
              const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
              return distance <= threshold;
            };
            
            while (stack.length > 0) {
              const [x, y] = stack.pop()!;
              const key = `${x},${y}`;
              
              if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
              visited.add(key);
              
              const pixelIndex = (y * width + x) * 4;
              const r = data[pixelIndex];
              const g = data[pixelIndex + 1];
              const b = data[pixelIndex + 2];
              
              if (!isColorSimilar(r, g, b)) continue;
              
              // Make pixel transparent
              data[pixelIndex + 3] = 0;
              
              // Add neighbors to stack
              stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
              
              // Performance optimization: yield control every 1000 pixels
              processedPixels++;
              if (processedPixels % 1000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          } else {
            // Simple non-contiguous removal for auto mode with performance optimization
            const totalPixels = data.length / 4;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];

              const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
              
              if (distance <= threshold) {
                data[i + 3] = 0; // Make transparent
              }
              
              // Performance optimization: yield control every 10000 pixels
              if ((i / 4) % 10000 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
              }
            }
          }
        } else {
          // Manual mode - handle both single target color and picked colors
          let colorsToRemove = [];
          
          // Add the main target color
          const hex = settings.targetColor.replace('#', '');
          colorsToRemove.push({
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16),
            threshold: settings.threshold
          });
          
          // Add all picked colors with their individual thresholds
          settings.pickedColors.forEach(pickedColor => {
            const pickedHex = pickedColor.color.replace('#', '');
            colorsToRemove.push({
              r: parseInt(pickedHex.substr(0, 2), 16),
              g: parseInt(pickedHex.substr(2, 2), 16),
              b: parseInt(pickedHex.substr(4, 2), 16),
              threshold: pickedColor.threshold
            });
          });

          // Process each pixel against all target colors (always non-contiguous in manual mode) with performance optimization
          const totalPixels = data.length / 4;
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Check against each target color
            for (const targetColor of colorsToRemove) {
              const distance = calculateColorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
              const threshold = targetColor.threshold * 2.5; // Scale threshold to make it more sensitive (was too high)
              
              if (distance <= threshold) {
                data[i + 3] = 0; // Make transparent
                break; // No need to check other colors once removed
              }
            }
            
            // Performance optimization: yield control every 5000 pixels  
            if ((i / 4) % 5000 === 0) {
              await new Promise(resolve => setTimeout(resolve, 0));
            }
          }
        }
      }

      return new ImageData(data, width, height);
    }
  }, [processWithWorker, calculateColorDistance]);

  // Apply image effects with worker
  const applyImageEffects = useCallback(async (imageData: ImageData, settings: EffectSettings): Promise<ImageData> => {
    if (!settings.imageEffects.enabled) return imageData;
    
    try {
      console.log('🎨 Using worker for image effects...');
      return await processWithWorker('applyEffects', imageData, undefined, settings);
    } catch (error) {
      console.log('⚠️ Effects worker failed, falling back to main thread:', error);
      // Fallback to main thread processing
      const data = new Uint8ClampedArray(imageData.data);
      const width = imageData.width;
      const height = imageData.height;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent pixels
        
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness
        if (settings.imageEffects.brightness !== 0) {
          const brightness = settings.imageEffects.brightness * 2.55; // Scale to 0-255
          r = Math.max(0, Math.min(255, r + brightness));
          g = Math.max(0, Math.min(255, g + brightness));
          b = Math.max(0, Math.min(255, b + brightness));
        }

        // Apply contrast
        if (settings.imageEffects.contrast !== 0) {
          const contrast = (settings.imageEffects.contrast + 100) / 100; // Convert to multiplier
          r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
          g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
          b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
        }

        // Apply vibrance (enhance muted colors)
        if (settings.imageEffects.vibrance !== 0) {
          const max = Math.max(r, g, b);
          const avg = (r + g + b) / 3;
          const amt = ((Math.abs(max - avg) * 2 / 255) * (settings.imageEffects.vibrance / 100));
          
          if (r !== max) r += (max - r) * amt;
          if (g !== max) g += (max - g) * amt;
          if (b !== max) b += (max - b) * amt;
          
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));
        }

        // Apply hue shift
        if (settings.imageEffects.hue !== 0) {
          const [h, s, l] = rgbToHsl(r, g, b);
          const newHue = (h + settings.imageEffects.hue) % 360;
          [r, g, b] = hslToRgb(newHue, s, l);
        }

        // Apply colorize
        if (settings.imageEffects.colorize.enabled) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const [colorR, colorG, colorB] = hslToRgb(
            settings.imageEffects.colorize.hue,
            settings.imageEffects.colorize.saturation / 100,
            settings.imageEffects.colorize.lightness / 100
          );
          
          // Blend with original based on lightness
          const blend = 0.5;
          r = Math.max(0, Math.min(255, gray * (1 - blend) + colorR * blend));
          g = Math.max(0, Math.min(255, gray * (1 - blend) + colorG * blend));
          b = Math.max(0, Math.min(255, gray * (1 - blend) + colorB * blend));
        }

        // Apply black and white
        if (settings.imageEffects.blackAndWhite) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        // Apply invert
        if (settings.imageEffects.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = Math.round(r);
        data[i + 1] = Math.round(g);
        data[i + 2] = Math.round(b);
      }

      return new ImageData(data, width, height);
    }
  }, [processWithWorker, rgbToHsl, hslToRgb]);

  // Apply download effects with worker
  const applyDownloadEffects = useCallback(async (imageData: ImageData, settings: EffectSettings): Promise<ImageData> => {
    try {
      console.log('💾 Using worker for download effects...');
      return await processWithWorker('downloadEffects', imageData, {
        backgroundColor: settings.background.enabled && settings.background.saveWithBackground ? settings.background.color : 'transparent',
        inkStamp: settings.inkStamp.enabled
      });
    } catch (error) {
      console.log('⚠️ Download effects worker failed, falling back to main thread:', error);
      // Fallback to main thread processing
      let processedData = new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      );

      // Apply image effects at the end of the processing chain
      processedData = await applyImageEffects(processedData, settings);

      const data = processedData.data;
      const width = processedData.width;
      const height = processedData.height;

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
    }
  }, [processWithWorker, applyImageEffects]);

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
        processedData = await processImageDataUnified(processedData, colorSettings);

        // Step 3: Cleanup regions and apply feathering
        setImages(prev => prev.map(img => 
          img.id === image.id ? { ...img, progress: 75 } : img
        ));
        
        // Add delay to make progress visible
        await new Promise(resolve => setTimeout(resolve, 300));

        // Region cleanup is now handled by edge cleanup settings
        // if (colorSettings.minRegionSize > 0) {
        //   processedData = cleanupRegions(processedData, colorSettings);
        // }
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
  }, [processImageDataUnified, toast]);

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
          await downloadImage(processedImage, colorSettings, effectSettings);
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
  const downloadImage = useCallback(async (image: ImageItem, colorSettings: ColorRemovalSettings, effectSettings?: EffectSettings, setSingleImageProgress?: (progress: { imageId: string; progress: number } | null) => void, setIsFullscreen?: (value: boolean) => void) => {
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

    // Only reprocess if we're using originalData (no manual edits)
    // If using processedData, it already includes manual edits and should not be reprocessed
    const hasManualEdits = image.processedData && sourceData === image.processedData;
    
    if (hasManualEdits) {
      console.log('Skipping reprocessing - using manual edits as-is');
    } else {
      console.log('Reprocessing from original data with current settings');
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
        // Use the same unified processing logic as MainCanvas
        processedData = await processImageDataUnified(processedData, colorSettings);
        
        // Region cleanup is now handled by edge cleanup settings  
        // if (colorSettings.minRegionSize > 0) {
        //   processedData = cleanupRegions(processedData, colorSettings);
        // }
      }
    }
    
    // Count pixels after reprocessing
    let finalCount = 0;
    for (let i = 0; i < processedData.data.length; i += 4) {
      if (processedData.data[i + 3] > 0) finalCount++;
    }
    console.log('Pixels after reprocessing with current settings:', finalCount);
    
    let imageDataToDownload = processedData;
    
    // Note: Alpha feathering and edge softening have been moved to worker processing
    console.log('Download processing - effects will be applied by worker');
    
    // Apply download effects if provided
    if (effectSettings) {
      imageDataToDownload = await applyDownloadEffects(imageDataToDownload, effectSettings);
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
        if (setSingleImageProgress) {
          setSingleImageProgress(null);
        }
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
      
      // Clear progress and exit fullscreen mode after download
      if (setSingleImageProgress) {
        setSingleImageProgress(null);
      }
      if (setIsFullscreen) {
        setIsFullscreen(false);
      }
    }, 'image/png', 1.0); // Add quality parameter

    // Removed download started toast
  }, [trimTransparentPixels, applyDownloadEffects, processImageDataUnified]);

  return {
    processImage,
    processAllImages,
    downloadImage,
    cancelProcessing,
    cleanup,
    processImageDataUnified
  };
};
