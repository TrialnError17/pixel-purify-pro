import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings } from '@/pages/Index';
import { SpeckleSettings, useSpeckleTools } from '@/hooks/useSpeckleTools';
import { 
  Move, 
  Pipette, 
  MousePointer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Wand,
  Undo,
  Redo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'color-stack' | 'magic-wand';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: SpeckleSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: (image: ImageItem) => void;
  addUndoAction?: (action: { type: string; description: string; undo: () => void; redo?: () => void }) => void;
  
  onSpeckCountUpdate?: (count: number) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  tool,
  onToolChange,
  colorSettings,
  contiguousSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  onImageUpdate,
  onColorPicked,
  onPreviousImage,
  onNextImage,
  canGoPrevious,
  canGoNext,
  currentImageIndex,
  totalImages,
  onDownloadImage,
  addUndoAction,
  onSpeckCountUpdate
}) => {
  const { processSpecks } = useSpeckleTools();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const isProcessingEdgeCleanupRef = useRef(false);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const [preEdgeCleanupImageData, setPreEdgeCleanupImageData] = useState<ImageData | null>(null);
  const [preSpeckleImageData, setPreSpeckleImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousTool, setPreviousTool] = useState<'pan' | 'color-stack' | 'magic-wand'>('pan');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  
  // Triple-click detection state
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Color processing functions
  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
  }, []);

  // Helper function to compare ImageData objects
  const areImageDataEqual = useCallback((data1: ImageData, data2: ImageData): boolean => {
    if (data1.width !== data2.width || data1.height !== data2.height) {
      return false;
    }
    
    // Sample comparison - check every 10th pixel for performance
    const step = 40; // Check every 10th pixel (4 bytes per pixel)
    for (let i = 0; i < data1.data.length; i += step) {
      if (data1.data[i] !== data2.data[i] ||
          data1.data[i + 1] !== data2.data[i + 1] ||
          data1.data[i + 2] !== data2.data[i + 2] ||
          data1.data[i + 3] !== data2.data[i + 3]) {
        return false;
      }
    }
    return true;
  }, []);

  const processImageData = useCallback((imageData: ImageData, settings: ColorRemovalSettings, effects: EffectSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Only process if color removal is enabled
    if (settings.enabled) {
      if (settings.mode === 'auto') {
        // Use top-left corner color
        const targetR = data[0];
        const targetG = data[1];
        const targetB = data[2];
        const threshold = settings.threshold * 2.55;

        if (settings.contiguous) {
          // Contiguous removal starting from top-left corner
          const visited = new Set<string>();
          const stack = [[0, 0]];
          
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
          }
        } else {
          // Simple non-contiguous removal for auto mode
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
            
            if (distance <= threshold) {
              data[i + 3] = 0; // Make transparent
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

        // Process each pixel against all target colors (always non-contiguous in manual mode)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check against each target color
          for (const targetColor of colorsToRemove) {
            const distance = calculateColorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
            const threshold = targetColor.threshold * 2.55; // Scale to 0-255 range
            
            if (distance <= threshold) {
              data[i + 3] = 0; // Make transparent
              break; // No need to check other colors once removed
            }
          }
        }
      }

      // Apply minimum region size filtering
      if (settings.minRegionSize.enabled && settings.minRegionSize.value > 0) {
        const alphaData = new Uint8ClampedArray(width * height);
        
        // Extract alpha channel
        for (let i = 0; i < data.length; i += 4) {
          alphaData[i / 4] = data[i + 3];
        }
        
        // Find and remove small transparent regions
        const visited = new Array(width * height).fill(false);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = y * width + x;
            
            if (!visited[index] && alphaData[index] === 0) {
              // Found a transparent pixel, flood fill to measure region size
              const regionPixels: number[] = [];
              const stack = [index];
              
              while (stack.length > 0) {
                const currentIndex = stack.pop()!;
                if (visited[currentIndex]) continue;
                
                const currentX = currentIndex % width;
                const currentY = Math.floor(currentIndex / width);
                
                if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue;
                if (alphaData[currentIndex] !== 0) continue;
                
                visited[currentIndex] = true;
                regionPixels.push(currentIndex);
                
                // Add neighbors
                if (currentX > 0) stack.push(currentIndex - 1);
                if (currentX < width - 1) stack.push(currentIndex + 1);
                if (currentY > 0) stack.push(currentIndex - width);
                if (currentY < height - 1) stack.push(currentIndex + width);
              }
              
              // If region is smaller than minimum size, restore it
              if (regionPixels.length < settings.minRegionSize.value) {
                for (const pixelIndex of regionPixels) {
                  data[pixelIndex * 4 + 3] = 255; // Make opaque
                }
              }
            }
          }
        }
      }
    }

    // Apply edge cleanup after color removal but before effects
    if (edgeCleanupSettings.enabled) {
      const edgeCleanupResult = processEdgeCleanup(new ImageData(data, width, height), edgeCleanupSettings);
      data.set(edgeCleanupResult.data);
    }

    // Apply background color for preview only (regardless of saveWithBackground setting)
    if (effects.background.enabled) {
      const hex = effects.background.color.replace('#', '');
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
    if (effects.inkStamp.enabled) {
      console.log('Applying ink stamp effect', effects.inkStamp);
      const hex = effects.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = effects.inkStamp.threshold === 1 ? 255 : (100 - effects.inkStamp.threshold) * 2.55; // Show all pixels when value is 1

      let processedPixels = 0;
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
            processedPixels++;
          } else {
            // Light areas become transparent
            data[i + 3] = 0;
          }
        }
      }
      console.log('Ink stamp processed', processedPixels, 'pixels with threshold', threshold);
    }

    // Apply image effects at the end of the processing chain
    if (effects.imageEffects.enabled) {
      console.log('Applying image effects:', effects.imageEffects);
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent pixels
        
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness
        if (effects.imageEffects.brightness !== 0) {
          const brightness = effects.imageEffects.brightness * 2.55; // Scale to 0-255
          r = Math.max(0, Math.min(255, r + brightness));
          g = Math.max(0, Math.min(255, g + brightness));
          b = Math.max(0, Math.min(255, b + brightness));
        }

        // Apply contrast
        if (effects.imageEffects.contrast !== 0) {
          const contrast = (effects.imageEffects.contrast + 100) / 100; // Convert to multiplier
          r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
          g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
          b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
        }

        // Apply vibrance (enhance muted colors)
        if (effects.imageEffects.vibrance !== 0) {
          const max = Math.max(r, g, b);
          const avg = (r + g + b) / 3;
          const amt = ((Math.abs(max - avg) * 2 / 255) * (effects.imageEffects.vibrance / 100));
          
          if (r !== max) r += (max - r) * amt;
          if (g !== max) g += (max - g) * amt;
          if (b !== max) b += (max - b) * amt;
          
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));
        }

        // Apply hue shift
        if (effects.imageEffects.hue !== 0) {
          const [h, s, l] = rgbToHsl(r, g, b);
          const newHue = (h + effects.imageEffects.hue) % 360;
          [r, g, b] = hslToRgb(newHue, s, l);
        }

        // Apply colorize
        if (effects.imageEffects.colorize.enabled) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const [colorR, colorG, colorB] = hslToRgb(
            effects.imageEffects.colorize.hue,
            effects.imageEffects.colorize.saturation / 100,
            effects.imageEffects.colorize.lightness / 100
          );
          
          // Blend with original based on lightness
          const blend = 0.5;
          r = Math.max(0, Math.min(255, gray * (1 - blend) + colorR * blend));
          g = Math.max(0, Math.min(255, gray * (1 - blend) + colorG * blend));
          b = Math.max(0, Math.min(255, gray * (1 - blend) + colorB * blend));
        }

        // Apply black and white
        if (effects.imageEffects.blackAndWhite) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        // Apply invert
        if (effects.imageEffects.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = Math.round(r);
        data[i + 1] = Math.round(g);
        data[i + 2] = Math.round(b);
      }
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Helper functions for HSL conversion
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
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
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }
    
    return [h * 360, s, l];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    if (s === 0) {
      const gray = l * 255;
      return [gray, gray, gray];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = hue2rgb(p, q, h + 1/3) * 255;
    const g = hue2rgb(p, q, h) * 255;
    const b = hue2rgb(p, q, h - 1/3) * 255;
    
    return [r, g, b];
  };

  // Edge cleanup processing function
  const processEdgeCleanup = useCallback((imageData: ImageData, settings: EdgeCleanupSettings): ImageData => {
    console.log('processEdgeCleanup called:', { enabled: settings.enabled, trimRadius: settings.trimRadius });
    
    if (!settings.enabled) {
      console.log('Edge cleanup disabled, returning original data');
      return imageData;
    }

    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Step 1: Edge trimming (if radius > 0)
    if (settings.trimRadius > 0) {
      console.log('Processing edge trimming with radius:', settings.trimRadius);
      const radius = settings.trimRadius;
      const toTransparent = new Set<number>();

      // Function to check if a pixel is on an edge (next to transparent or border)
      const isEdgePixel = (x: number, y: number): boolean => {
        const index = (y * width + x) * 4;
        
        // Skip if already transparent
        if (data[index + 3] === 0) return false;
        
        // Check if at image border
        if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
          return true;
        }
        
        // Check surrounding pixels for transparency
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = (ny * width + nx) * 4;
              if (data[neighborIndex + 3] === 0) {
                return true;
              }
            }
          }
        }
        
        return false;
      };

      // Find all edge pixels
      const edgePixels: Array<{x: number, y: number}> = [];
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (isEdgePixel(x, y)) {
            edgePixels.push({x, y});
          }
        }
      }

      // For each edge pixel, mark pixels within radius for transparency
      edgePixels.forEach(({x, y}) => {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            // Check if within image bounds
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              // Check if within circular radius
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= radius) {
                const pixelIndex = ny * width + nx;
                toTransparent.add(pixelIndex);
              }
            }
          }
        }
      });

      // Apply transparency to marked pixels
      toTransparent.forEach(pixelIndex => {
        const dataIndex = pixelIndex * 4;
        data[dataIndex + 3] = 0; // Make transparent
      });
      console.log('Edge trimming processed', toTransparent.size, 'pixels');
    }


    const result = new ImageData(data, width, height);
    console.log('processEdgeCleanup completed');
    return result;
  }, []);

  // Load original image and store image data
  useEffect(() => {
    console.log('Image loading effect triggered:', { 
      hasImage: !!image, 
      hasCanvas: !!canvasRef.current, 
      imageId: image?.id, 
      hasProcessedData: !!image?.processedData,
      hasManualEdits: hasManualEditsRef.current,
      hasOriginalData: !!originalImageData 
    });
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // If we have manual edits and processedData, use that instead of reloading
    if (hasManualEditsRef.current && image.processedData && manualImageData) {
      console.log('Preserving manual edits, using processedData');
      // Use requestAnimationFrame to ensure smooth update
      requestAnimationFrame(() => {
        ctx.putImageData(image.processedData!, 0, 0);
      });
      return;
    }

    // If image has processedData and no manual edits, use that
    if (image.processedData && !hasManualEditsRef.current) {
      console.log('Using existing processedData');
      // Use requestAnimationFrame to ensure smooth update
      requestAnimationFrame(() => {
        ctx.putImageData(image.processedData!, 0, 0);
      });
      
      // Store as original data if not set
      if (!originalImageData) {
        setOriginalImageData(image.processedData);
      }
      return;
    }

    console.log('Loading image from file');
    const img = new Image();
    img.onload = () => {
      console.log('Image loaded successfully:', { 
        naturalWidth: img.naturalWidth, 
        naturalHeight: img.naturalHeight 
      });
      
      // Set canvas size to image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      console.log('Canvas size set to:', { width: canvas.width, height: canvas.height });
      
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      console.log('Image drawn to canvas');
      
      // Store original image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(imageData);
      
      console.log('Original image data stored');
      setOriginalImageData(imageData);
      
      // Reset manual edits when new image is loaded
      hasManualEditsRef.current = false;
      setManualImageData(null);
      setUndoStack([]);
      setRedoStack([]);
      
      // Update image with original data if not already set
      if (!image.originalData) {
        const updatedImage = { ...image, originalData: imageData };
        onImageUpdate(updatedImage);
      }
      
      // Calculate center offset for the image
      if (containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scaleX = (containerRect.width - 40) / canvas.width;
        const scaleY = (containerRect.height - 40) / canvas.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        // Calculate center position
        const centerX = (containerRect.width - canvas.width * scale) / 2;
        const centerY = (containerRect.height - canvas.height * scale) / 2;
        
        setZoom(scale);
        setPan({ x: 0, y: 0 });
        setCenterOffset({ x: centerX, y: centerY });
      }
    };
    
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
    };
    
    img.src = URL.createObjectURL(image.file);
    
    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [image]);

  // Debounced processing to prevent flashing
  const debouncedProcessImageData = useCallback((imageData: ImageData, colorSettings: ColorRemovalSettings, effectSettings: EffectSettings) => {
    return new Promise<ImageData>((resolve) => {
      const timeoutId = setTimeout(() => {
        const result = processImageData(imageData, colorSettings, effectSettings);
        resolve(result);
      }, 50); // 50ms debounce
      
      // Return cleanup function
      return () => clearTimeout(timeoutId);
    });
  }, [processImageData]);

  // Process and display image when settings change (but not if there are manual edits or manual mode is active)
  useEffect(() => {
    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!originalImageData,
      hasCanvas: !!canvasRef.current,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing,
      imageHasProcessedData: !!image?.processedData,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: effectSettings.background.enabled,
      inkStampEnabled: effectSettings.inkStamp.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled
    });
    
    if (!originalImageData || !canvasRef.current || isProcessing) {
      console.log('Early return - missing requirements or processing in progress');
      return;
    }
     
    // Allow speckle and edge cleanup to run even with manual edits, but skip other auto-processing
    if (hasManualEditsRef.current) {
      // If we have manual edits, handle speckle and edge cleanup specially
      if (isProcessingEdgeCleanupRef.current) {
        console.log('Early return - already processing');
        return;
      }
      
      // Check if we need to do any processing
      const needsSpeckleProcessing = speckleSettings.enabled && (speckleSettings.removeSpecks || speckleSettings.highlightSpecks);
      const needsSpeckleRestore = (!speckleSettings.enabled || (!speckleSettings.highlightSpecks && !speckleSettings.removeSpecks)) && preSpeckleImageData;
      const needsEdgeCleanup = edgeCleanupSettings.enabled && edgeCleanupSettings.trimRadius > 0;
      const needsEdgeRestore = edgeCleanupSettings.enabled === false && preEdgeCleanupImageData;
      
      if (!needsSpeckleProcessing && !needsSpeckleRestore && !needsEdgeCleanup && !needsEdgeRestore) {
        console.log('Early return - no speckle or edge cleanup needed');
        return;
      }
      
      // Set flag to prevent re-triggering
      isProcessingEdgeCleanupRef.current = true;
      
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        isProcessingEdgeCleanupRef.current = false;
        return;
      }
      
      // Prevent infinite loop by checking if already processing
      const wasProcessing = isProcessing;
      if (wasProcessing) {
        console.log('Already processing, skipping to prevent loop');
        isProcessingEdgeCleanupRef.current = false;
        return;
      }
      
      setIsProcessing(true);
      
      // Get the current canvas data
      let currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Handle speckle processing first if needed
      if (needsSpeckleProcessing) {
        console.log('Manual edits detected, applying speckle processing');
        
        // Store pre-speckle state if we haven't already
        if (!preSpeckleImageData) {
          setPreSpeckleImageData(currentImageData);
          console.log('Stored pre-speckle state');
        }
        
        // Apply speckle processing to the pre-speckle data
        const baseData = preSpeckleImageData || currentImageData;
        const speckleResult = processSpecks(baseData, speckleSettings);
        currentImageData = speckleResult.processedData;
        
        // Update speck count
        if (onSpeckCountUpdate) {
          onSpeckCountUpdate(speckleResult.speckCount);
        }
        
        // Apply speckle result to canvas
        ctx.putImageData(currentImageData, 0, 0);
        console.log('Speckle processing applied to manual edits');
      } else if (needsSpeckleRestore) {
        console.log('Speckle disabled, restoring pre-speckle state');
        
        // Restore the pre-speckle state if available
        if (preSpeckleImageData) {
          currentImageData = preSpeckleImageData;
          ctx.putImageData(currentImageData, 0, 0);
          console.log('Restored pre-speckle state');
        }
      }
      
      // Handle edge cleanup
      if (needsEdgeCleanup) {
        console.log('Manual edits detected, applying edge cleanup');
        
        // Store pre-edge-cleanup state if we haven't already
        if (!preEdgeCleanupImageData) {
          setPreEdgeCleanupImageData(currentImageData);
          console.log('Stored pre-edge-cleanup state');
        }
        
        // Apply edge cleanup to the pre-edge-cleanup data (original manual edits)
        const baseData = preEdgeCleanupImageData || currentImageData;
        const edgeCleanedData = processEdgeCleanup(baseData, edgeCleanupSettings);
        
        // Apply the result back to canvas
        ctx.putImageData(edgeCleanedData, 0, 0);
        console.log('Edge cleanup applied to manual edits');
      } else if (needsEdgeRestore) {
        console.log('Edge cleanup disabled, restoring pre-edge-cleanup state');
        
        // Restore the pre-edge-cleanup state if available
        if (preEdgeCleanupImageData) {
          ctx.putImageData(preEdgeCleanupImageData, 0, 0);
          console.log('Restored pre-edge-cleanup state');
        }
      }
      
      setIsProcessing(false);
      isProcessingEdgeCleanupRef.current = false;
      return;
    }
    
    // Skip auto-processing if we already have processed data and no settings changed
    if (image?.processedData && !colorSettings.enabled && !effectSettings.background.enabled && !effectSettings.inkStamp.enabled && !edgeCleanupSettings.enabled) {
      console.log('Early return - no active settings requiring processing');
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Auto-processing triggered');
    setIsProcessing(true);

    // Use manual image data if available, otherwise original
    const baseImageData = manualImageData || originalImageData;

    // Use debounced processing to prevent rapid updates
    debouncedProcessImageData(baseImageData, colorSettings, effectSettings).then((processedData) => {
      // Only apply if we're still on the same canvas and no manual edits occurred during processing
      if (canvasRef.current === canvas && !hasManualEditsRef.current) {
        console.log('Applying auto-processed data');
        
        // Apply speckle processing if enabled
        if (speckleSettings.enabled) {
          const speckleResult = processSpecks(processedData, speckleSettings);
          processedData = speckleResult.processedData;
          
          // Update speck count if callback is provided
          if (onSpeckCountUpdate) {
            onSpeckCountUpdate(speckleResult.speckCount);
          }
        }
        
        // Apply edge cleanup processing if enabled
        console.log('Edge cleanup check:', { 
          enabled: edgeCleanupSettings.enabled, 
          trimRadius: edgeCleanupSettings.trimRadius
        });
        
        if (edgeCleanupSettings.enabled) {
          console.log('Calling processEdgeCleanup...');
          processedData = processEdgeCleanup(processedData, edgeCleanupSettings);
          console.log('processEdgeCleanup completed');
        } else {
          console.log('Edge cleanup is disabled, skipping');
        }
        
        // Only update canvas if the processed data is different
        const currentData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const isDifferent = !areImageDataEqual(currentData, processedData);
        
        if (isDifferent) {
          // Use requestAnimationFrame to ensure smooth canvas update
          requestAnimationFrame(() => {
            ctx.putImageData(processedData, 0, 0);
          });
        }
      } else {
        console.log('Skipping auto-processed data application');
      }
      setIsProcessing(false);
    }).catch((error) => {
      console.error('Auto-processing error:', error);
      setIsProcessing(false);
    });

  }, [originalImageData, colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, manualImageData, debouncedProcessImageData, processSpecks, processEdgeCleanup, onSpeckCountUpdate]);

  // Keyboard shortcut for spacebar (pan tool)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (tool !== 'pan') {
          setPreviousTool(tool);
          onToolChange('pan');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(false);
        onToolChange(previousTool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, isSpacePressed, previousTool, onToolChange]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z for redo
      else if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack]);

  // Define handleFitToScreen before it's used in handleCanvasClick
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const containerRect = container.getBoundingClientRect();
    const scaleX = (containerRect.width - 40) / canvas.width;
    const scaleY = (containerRect.height - 40) / canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    // Calculate center position
    const centerX = (containerRect.width - canvas.width * scale) / 2;
    const centerY = (containerRect.height - canvas.height * scale) / 2;
    
    setZoom(scale);
    setPan({ x: 0, y: 0 });
    setCenterOffset({ x: centerX, y: centerY });
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !image || !originalImageData || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle triple-click for fit to screen
    setClickCount(prev => prev + 1);
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 3) {
        // Triple-click detected - fit to screen
        handleFitToScreen();
        setClickCount(0);
        return;
      }
      setClickCount(0);
    }, 400); // 400ms timeout for triple-click detection

    // Get container bounds for proper coordinate calculation
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the actual canvas pixels
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Convert from container coordinates to canvas pixel coordinates
    const canvasX = (mouseX - centerOffset.x - pan.x) / zoom;
    const canvasY = (mouseY - centerOffset.y - pan.y) / zoom;
    
    // Round to pixel boundaries and ensure within canvas bounds
    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    if (tool === 'color-stack') {
      // Get color at clicked position from original image
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Add to picked colors and immediately remove this color
      onColorPicked(hex);
      
      // Save current state for undo (both local canvas undo and global undo)
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      // Add global undo action
      if (addUndoAction && image) {
        addUndoAction({
          type: 'canvas_edit',
          description: `Pick color ${hex}`,
          undo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.putImageData(currentImageData, 0, 0);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                onImageUpdate(updatedImage);
              }
            }
          },
          redo: () => {
            if (canvasRef.current && image) {
              removePickedColor(ctx, r, g, b, 30);
              const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const updatedImage = { ...image, processedData: newImageData };
              hasManualEditsRef.current = true;
              setManualImageData(newImageData);
              onImageUpdate(updatedImage);
            }
          }
        });
      }
      
      // Immediately remove this color with default threshold of 30
      removePickedColor(ctx, r, g, b, 30);
      
      // Mark that we have manual edits
      hasManualEditsRef.current = true;
      
      // Clear any stored pre-edge-cleanup and pre-speckle state since we're making new manual edits  
      setPreEdgeCleanupImageData(null);
      setPreSpeckleImageData(null);
      
      // Store the result
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        onImageUpdate(updatedImage);
      }
    } else if (tool === 'magic-wand') {
      // Magic wand tool - removes only connected pixels of clicked color
      console.log('Magic wand tool clicked at', x, y, 'threshold:', contiguousSettings.threshold);
      
      // Mark that we have manual edits IMMEDIATELY to prevent auto-processing from overriding
      hasManualEditsRef.current = true;
      
      // Clear any stored pre-edge-cleanup and pre-speckle state since we're making new manual edits
      setPreEdgeCleanupImageData(null);
      setPreSpeckleImageData(null);
      
      // Get color at clicked position from original image
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Save current state for undo (both local canvas undo and global undo)
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      // Add global undo action
      if (addUndoAction && image) {
        addUndoAction({
          type: 'canvas_edit',
          description: `Magic wand removal of ${hex}`,
          undo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.putImageData(currentImageData, 0, 0);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                onImageUpdate(updatedImage);
              }
            }
          },
          redo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                removeContiguousColorIndependent(ctx, x, y, contiguousSettings.threshold || 30);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                onImageUpdate(updatedImage);
              }
            }
          }
        });
      }
      
      // Remove contiguous color at clicked position using independent contiguous threshold
      console.log('Before removeContiguousColorIndependent, manual edits marked');
      removeContiguousColorIndependent(ctx, x, y, contiguousSettings.threshold || 30);
      console.log('After removeContiguousColorIndependent');
      
      // Get the image data after magic wand removal
      let newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // If speckle tools are enabled, apply speckle processing to clean up new speckles
      if (speckleSettings.enabled && (speckleSettings.removeSpecks || speckleSettings.highlightSpecks)) {
        console.log('Running speckle processing after magic wand removal');
        const speckleResult = processSpecks(newImageData, speckleSettings);
        newImageData = speckleResult.processedData;
        
        // Update speck count
        if (onSpeckCountUpdate) {
          onSpeckCountUpdate(speckleResult.speckCount);
        }
        
        // Apply the speckle-processed data back to canvas
        ctx.putImageData(newImageData, 0, 0);
        console.log('Speckle processing completed after magic wand');
      }
      
      // Store the manually edited result as base for future operations
      setManualImageData(newImageData);
      console.log('Stored manual image data');
      
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        console.log('Updating image with manually edited data');
        onImageUpdate(updatedImage);
        
        // Force a small delay to ensure the update sticks
        setTimeout(() => {
          console.log('Verifying canvas state after update');
          const verifyData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const transparentPixels = Array.from(verifyData.data).filter((_, i) => i % 4 === 3 && verifyData.data[i] === 0).length;
          console.log(`Canvas verification: ${transparentPixels} transparent pixels`);
        }, 100);
      }
    }
  }, [image, originalImageData, tool, zoom, pan, centerOffset, colorSettings, contiguousSettings, onColorPicked, onImageUpdate, addUndoAction, handleFitToScreen, clickCount]);

  const removeContiguousColor = (ctx: CanvasRenderingContext2D, startX: number, startY: number, settings: ColorRemovalSettings) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Get target color
    const index = (startY * width + startX) * 4;
    const targetR = data[index];
    const targetG = data[index + 1];
    const targetB = data[index + 2];
    
    // Flood fill algorithm to remove contiguous pixels
    const visited = new Set<string>();
    const stack = [[startX, startY]];
    
    const isColorSimilar = (r: number, g: number, b: number) => {
      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      return distance <= settings.threshold * 2.55;
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
      
      // Add neighbors to stack (always contiguous for interactive tool)
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // Independent contiguous removal function for the contiguous tool
  const removeContiguousColorIndependent = (ctx: CanvasRenderingContext2D, startX: number, startY: number, threshold: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    console.log(`Starting contiguous removal at (${startX}, ${startY}) with threshold ${threshold}`);
    console.log(`Canvas dimensions: ${width}x${height}`);
    
    // Get target color
    const index = (startY * width + startX) * 4;
    const targetR = data[index];
    const targetG = data[index + 1];
    const targetB = data[index + 2];
    const targetA = data[index + 3];
    
    console.log(`Target color: rgba(${targetR}, ${targetG}, ${targetB}, ${targetA})`);
    
    // Skip if pixel is already transparent
    if (targetA === 0) {
      console.log('Target pixel is already transparent, skipping');
      return;
    }
    
    // Flood fill algorithm to remove contiguous pixels
    const visited = new Set<string>();
    const stack = [[startX, startY]];
    let removedPixels = 0;
    
    const thresholdScaled = threshold * 2.55;
    console.log(`Threshold scaled: ${thresholdScaled}`);
    
    const isColorSimilar = (r: number, g: number, b: number) => {
      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      const similar = distance <= thresholdScaled;
      return similar;
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
      const a = data[pixelIndex + 3];
      
      // Skip if pixel is already transparent
      if (a === 0) continue;
      
      if (!isColorSimilar(r, g, b)) continue;
      
      // Make pixel transparent
      data[pixelIndex + 3] = 0;
      removedPixels++;
      
      // Add neighbors to stack
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    console.log(`Removed ${removedPixels} pixels`);
    
    if (removedPixels > 0) {
      ctx.putImageData(imageData, 0, 0);
      console.log('Applied image data to canvas');
    } else {
      console.log('No pixels were removed');
    }
  };

  const removePickedColor = (ctx: CanvasRenderingContext2D, targetR: number, targetG: number, targetB: number, threshold: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert threshold to proper scale
    const thresholdScaled = threshold * 2.55;

    // Remove all similar colors globally (non-contiguous for eyedropper)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      
      if (distance <= thresholdScaled) {
        data[i + 3] = 0; // Make transparent
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isDragging && tool === 'pan') {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, tool, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleZoom = useCallback((direction: 'in' | 'out', centerX?: number, centerY?: number) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    setZoom(prev => {
      const factor = direction === 'in' ? 1.2 : 0.8;
      const newZoom = Math.max(0.1, Math.min(5, prev * factor));
      
      // If no center coordinates provided (from button clicks), use container center
      const containerRect = container.getBoundingClientRect();
      const actualCenterX = centerX ?? containerRect.left + containerRect.width / 2;
      const actualCenterY = centerY ?? containerRect.top + containerRect.height / 2;
      
      // Calculate mouse/center position relative to canvas
      const centerCanvasX = (actualCenterX - containerRect.left - centerOffset.x - pan.x) / prev;
      const centerCanvasY = (actualCenterY - containerRect.top - centerOffset.y - pan.y) / prev;
      
      // Calculate new pan to keep the center point centered
      const newPanX = pan.x - (centerCanvasX * (newZoom - prev));
      const newPanY = pan.y - (centerCanvasY * (newZoom - prev));
      
      setPan({ x: newPanX, y: newPanY });
      
      return newZoom;
    });
  }, [centerOffset, pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Check for modifier keys
    if (e.shiftKey) {
      // Shift + scroll = pan up/down
      const deltaY = e.deltaY * 0.5; // Adjust sensitivity
      setPan(prev => ({ x: prev.x, y: prev.y - deltaY }));
    } else if (e.altKey) {
      // Alt + scroll = pan left/right
      const deltaX = e.deltaY * 0.5; // Adjust sensitivity
      setPan(prev => ({ x: prev.x - deltaX, y: prev.y }));
    } else {
      // Normal scroll = zoom
      const direction = e.deltaY < 0 ? 'in' : 'out';
      handleZoom(direction, e.clientX, e.clientY);
    }
  }, [handleZoom]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('Local undo - restoring previous state');
    const previousState = undoStack[undoStack.length - 1];
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    
    // Restore the previous canvas state
    ctx.putImageData(previousState, 0, 0);
    
    // Update the image with the restored state
    const restoredImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updatedImage = { ...image, processedData: restoredImageData };
    
    // Update manual image data to preserve the undo state
    hasManualEditsRef.current = true;
    setManualImageData(restoredImageData);
    
    console.log('Local undo completed, undoStack length:', undoStack.length - 1);
    onImageUpdate(updatedImage);
  }, [undoStack, image, onImageUpdate]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('Local redo - restoring next state');
    const nextState = redoStack[redoStack.length - 1];
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
    
    // Restore the next canvas state
    ctx.putImageData(nextState, 0, 0);
    
    // Update the image with the restored state
    const restoredImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updatedImage = { ...image, processedData: restoredImageData };
    
    // Update manual image data to preserve the redo state
    hasManualEditsRef.current = true;
    setManualImageData(restoredImageData);
    
    console.log('Local redo completed, redoStack length:', redoStack.length - 1);
    onImageUpdate(updatedImage);
  }, [redoStack, image, onImageUpdate]);


  const handleReset = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear manual edits and reprocess with automatic settings
    hasManualEditsRef.current = false;
    setManualImageData(null);
    setUndoStack([]);
    setRedoStack([]);
    
    // Reprocess the original image with current settings
    const processedData = processImageData(originalImageData, colorSettings, effectSettings);
    ctx.putImageData(processedData, 0, 0);
    
    if (image) {
      const updatedImage = { ...image, processedData };
      onImageUpdate(updatedImage);
    }
  }, [originalImageData, colorSettings, effectSettings, processImageData, image, onImageUpdate]);

  const handleDownload = useCallback(() => {
    if (!image || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Get current canvas data to pass to the download handler
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create a temporary image object with current canvas data
    const imageWithCurrentData = {
      ...image,
      processedData: currentImageData,
      status: 'completed' as const
    };
    
    onDownloadImage(imageWithCurrentData);
  }, [image, onDownloadImage]);

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg">
      {/* Toolbar */}
      <div className="h-12 bg-gradient-header border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
            title="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground px-2">
            {currentImageIndex} / {totalImages}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextImage}
            disabled={!canGoNext}
            title="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="flex items-center gap-1"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
            Redo
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Tools */}
          <Button
            variant={tool === 'pan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('pan')}
            className="flex items-center gap-1"
          >
            <Move className="w-4 h-4" />
            Move
          </Button>
          
          <Button
            variant={tool === 'color-stack' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('color-stack')}
            className="flex items-center gap-1"
          >
            <Pipette className="w-4 h-4" />
            Color Stack
          </Button>
          
          
          <Button
            variant={tool === 'magic-wand' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('magic-wand')}
            className="flex items-center gap-1"
            title="Magic Wand - Remove connected pixels"
          >
            <Wand className="w-4 h-4" />
            Magic Wand
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('out')}
            disabled={zoom <= 0.1}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span 
            className="text-sm text-muted-foreground min-w-12 text-center cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={handleFitToScreen}
            title="Double-click to fit to screen"
          >
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('in')}
            disabled={zoom >= 5}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToScreen}
          >
            <Maximize className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasManualEditsRef.current && !manualImageData}
            title="Reset image"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {image && (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={!image}
              title="Download PNG"
              className="flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download
            </Button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-canvas-bg"
        style={{ 
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--grid-lines)) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}
        onWheel={handleWheel}
      >
        {image ? (
          <>
            {/* Background backdrop layer */}
            {effectSettings.background.enabled && (
              <div
                className="absolute"
                style={{
                  transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  width: originalImageData?.width || 0,
                  height: originalImageData?.height || 0,
                  backgroundColor: effectSettings.background.color,
                }}
              />
            )}
            
            {/* Main image canvas */}
            <canvas
              ref={canvasRef}
              className={cn(
                "absolute cursor-crosshair border border-canvas-border",
                tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
                tool === 'color-stack' && 'cursor-crosshair',
                tool === 'magic-wand' && 'cursor-crosshair'
              )}
              style={{
                transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                imageRendering: zoom > 2 ? 'pixelated' : 'auto'
              }}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            />
          </>
        ) : (
          <Card className="absolute inset-4 flex items-center justify-center border-dashed border-2 border-border/50">
            <div className="text-center">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-lg font-medium text-foreground mb-2">No Image Selected</h3>
              <p className="text-muted-foreground">
                Add images or drag & drop files to get started
              </p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};