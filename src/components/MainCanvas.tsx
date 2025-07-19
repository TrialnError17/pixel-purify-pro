import React, { useRef, useEffect, useCallback, useState } from 'react';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings } from '@/pages/Index';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

interface MainCanvasProps {
  images: ImageItem[];
  currentImageIndex: number;
  colorSettings: ColorRemovalSettings;
  effectSettings: EffectSettings;
  contiguousSettings: ContiguousToolSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  speckleSettings: SpeckleSettings;
  onSpeckCountChange: (count: number) => void;
  onSettingsChange: (settings: ColorRemovalSettings) => void;
  onImageUpdate: (imageId: string, updates: Partial<ImageItem>) => void;
  currentTool: 'pan' | 'color-stack' | 'magic-wand';
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  setSingleImageProgress: (progress: { imageId: string; progress: number } | null) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  images,
  currentImageIndex,
  colorSettings,
  effectSettings,
  contiguousSettings,
  edgeCleanupSettings,
  speckleSettings,
  onSpeckCountChange,
  onSettingsChange,
  onImageUpdate,
  currentTool,
  isFullscreen,
  onToggleFullscreen,
  setSingleImageProgress
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [displayImageData, setDisplayImageData] = useState<ImageData | null>(null);
  const [speckCount, setSpeckCount] = useState<number>(0);
  const { downloadImage } = useImageProcessor();

  const currentImage = images[currentImageIndex];

  // Weighted RGB color distance calculation for better perceptual accuracy
  // Uses weights: Red (0.30), Green (0.59), Blue (0.11) based on human eye sensitivity
  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(0.30 * dr * dr + 0.59 * dg * dg + 0.11 * db * db);
  }, []);

  // Process image data with current settings
  const processImageDataUnified = useCallback((imageData: ImageData, settings: ColorRemovalSettings): ImageData => {
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
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Apply edge cleanup (trimming)
  const applyEdgeCleanup = useCallback((imageData: ImageData, settings: EdgeCleanupSettings): ImageData => {
    if (!settings.enabled) return imageData;
    
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    
    // Trim pixels from edges based on radius
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Check if pixel is within trim radius from any edge
        const distanceFromEdge = Math.min(x, y, width - 1 - x, height - 1 - y);
        
        if (distanceFromEdge < settings.trimRadius) {
          const index = (y * width + x) * 4;
          data[index + 3] = 0; // Make transparent
        }
      }
    }
    
    return new ImageData(data, width, height);
  }, []);

  // Apply speckle detection and processing
  const applySpeckleProcessing = useCallback((imageData: ImageData, settings: SpeckleSettings): { processedData: ImageData; speckCount: number } => {
    if (!settings.enabled) {
      return { processedData: imageData, speckCount: 0 };
    }
    
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const visited = new Set<string>();
    let detectedSpeckCount = 0;
    
    // Find connected components (specks)
    const findConnectedComponent = (startX: number, startY: number): [number, number][] => {
      const component: [number, number][] = [];
      const stack = [[startX, startY]];
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
        visited.add(key);
        
        const index = (y * width + x) * 4;
        if (data[index + 3] === 0) continue; // Skip transparent pixels
        
        component.push([x, y]);
        
        // Add 8-connected neighbors
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            stack.push([x + dx, y + dy]);
          }
        }
      }
      
      return component;
    };
    
    // Process all pixels to find specks
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const key = `${x},${y}`;
        if (visited.has(key)) continue;
        
        const index = (y * width + x) * 4;
        if (data[index + 3] === 0) continue; // Skip transparent pixels
        
        const component = findConnectedComponent(x, y);
        
        if (component.length > 0 && component.length <= settings.minSpeckSize) {
          detectedSpeckCount++;
          
          // Apply speckle processing based on settings
          component.forEach(([px, py]) => {
            const pIndex = (py * width + px) * 4;
            
            if (settings.removeSpecks) {
              // Remove speck (make transparent)
              data[pIndex + 3] = 0;
            } else if (settings.highlightSpecks) {
              // Highlight speck (make it bright magenta)
              data[pIndex] = 255;     // Red
              data[pIndex + 1] = 0;   // Green
              data[pIndex + 2] = 255; // Blue
              data[pIndex + 3] = 255; // Alpha
            }
          });
        }
      }
    }
    
    return { 
      processedData: new ImageData(data, width, height), 
      speckCount: detectedSpeckCount 
    };
  }, []);

  // Apply display effects (background, ink stamp, image effects)
  const applyDisplayEffects = useCallback((imageData: ImageData, settings: EffectSettings): ImageData => {
    let processedData = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );

    // Apply image effects first
    if (settings.imageEffects.enabled) {
      const data = processedData.data;
      
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent pixels
        
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness
        if (settings.imageEffects.brightness !== 0) {
          const brightness = settings.imageEffects.brightness * 2.55;
          r = Math.max(0, Math.min(255, r + brightness));
          g = Math.max(0, Math.min(255, g + brightness));
          b = Math.max(0, Math.min(255, b + brightness));
        }

        // Apply contrast
        if (settings.imageEffects.contrast !== 0) {
          const contrast = (settings.imageEffects.contrast + 100) / 100;
          r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
          g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
          b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
        }

        // Apply vibrance
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
    }

    const data = processedData.data;
    const width = processedData.width;
    const height = processedData.height;

    // Apply background color for preview
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
      const threshold = (100 - settings.inkStamp.threshold) * 2.55;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance < threshold) {
            data[i] = stampR;
            data[i + 1] = stampG;
            data[i + 2] = stampB;
            data[i + 3] = 255;
          } else {
            data[i + 3] = 0;
          }
        }
      }
    }

    return new ImageData(data, width, height);
  }, []);

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
    
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    let r, g, b;
    
    if (s === 0) {
      r = g = b = l;
    } else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    
    return [r * 255, g * 255, b * 255];
  };

  // Load and process image
  useEffect(() => {
    if (!currentImage || !canvasRef.current) return;

    const loadImage = async () => {
      try {
        const img = new Image();
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;

        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error('Failed to load image'));
          
          if (currentImage.processedData || currentImage.originalData) {
            // Create a temporary canvas to convert ImageData to image
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d')!;
            const sourceData = currentImage.processedData || currentImage.originalData!;
            
            tempCanvas.width = sourceData.width;
            tempCanvas.height = sourceData.height;
            tempCtx.putImageData(sourceData, 0, 0);
            
            img.src = tempCanvas.toDataURL();
          } else {
            img.src = URL.createObjectURL(currentImage.file);
          }
        });

        // Set canvas size
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        // Get original image data
        ctx.drawImage(img, 0, 0);
        const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setOriginalImageData(originalData);

        // Process the image with current settings
        let processedData = processImageDataUnified(originalData, colorSettings);
        
        // Apply edge cleanup
        processedData = applyEdgeCleanup(processedData, edgeCleanupSettings);
        
        // Apply speckle processing and get speck count
        const { processedData: speckProcessedData, speckCount: detectedSpeckCount } = applySpeckleProcessing(processedData, speckleSettings);
        processedData = speckProcessedData;
        
        // Update speck count
        setSpeckCount(detectedSpeckCount);
        onSpeckCountChange(detectedSpeckCount);
        
        setImageData(processedData);

        // Apply display effects for preview
        const displayData = applyDisplayEffects(processedData, effectSettings);
        setDisplayImageData(displayData);

        // Clean up
        if (!currentImage.processedData && !currentImage.originalData) {
          URL.revokeObjectURL(img.src);
        }

      } catch (error) {
        console.error('Error loading image:', error);
      }
    };

    loadImage();
  }, [currentImage, colorSettings, effectSettings, edgeCleanupSettings, speckleSettings, processImageDataUnified, applyEdgeCleanup, applySpeckleProcessing, applyDisplayEffects, onSpeckCountChange]);

  // Render canvas
  useEffect(() => {
    if (!displayImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw processed image
    ctx.putImageData(displayImageData, 0, 0);
  }, [displayImageData]);

  // Handle canvas click for color picking and magic wand
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !originalImageData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((event.clientX - rect.left) * scaleX);
    const y = Math.floor((event.clientY - rect.top) * scaleY);

    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    const pixelIndex = (y * canvas.width + x) * 4;
    const r = originalImageData.data[pixelIndex];
    const g = originalImageData.data[pixelIndex + 1];
    const b = originalImageData.data[pixelIndex + 2];
    const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;

    if (currentTool === 'color-stack') {
      // Add picked color to the list
      const newPickedColor = {
        id: Date.now().toString(),
        color,
        threshold: colorSettings.threshold
      };

      onSettingsChange({
        ...colorSettings,
        mode: 'manual',
        pickedColors: [...colorSettings.pickedColors, newPickedColor]
      });
    } else if (currentTool === 'magic-wand') {
      // Magic wand tool - remove contiguous area
      if (!imageData) return;

      const processedData = new Uint8ClampedArray(imageData.data);
      const width = imageData.width;
      const height = imageData.height;
      const threshold = contiguousSettings.threshold * 2.55;
      const visited = new Set<string>();
      const stack = [[x, y]];

      const isColorSimilar = (px: number, py: number) => {
        const pIndex = (py * width + px) * 4;
        const pr = originalImageData.data[pIndex];
        const pg = originalImageData.data[pIndex + 1];
        const pb = originalImageData.data[pIndex + 2];
        const distance = calculateColorDistance(pr, pg, pb, r, g, b);
        return distance <= threshold;
      };

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        const key = `${cx},${cy}`;

        if (visited.has(key) || cx < 0 || cy < 0 || cx >= width || cy >= height) continue;
        visited.add(key);

        if (!isColorSimilar(cx, cy)) continue;

        const pIndex = (cy * width + cx) * 4;
        processedData[pIndex + 3] = 0; // Make transparent

        // Add neighbors
        stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
      }

      const newImageData = new ImageData(processedData, width, height);
      setImageData(newImageData);

      // Apply display effects
      const displayData = applyDisplayEffects(newImageData, effectSettings);
      setDisplayImageData(displayData);

      // Update the image with manual edits
      onImageUpdate(currentImage.id, { processedData: newImageData });
    }
  }, [originalImageData, imageData, currentTool, colorSettings, contiguousSettings, effectSettings, onSettingsChange, onImageUpdate, currentImage, calculateColorDistance, applyDisplayEffects]);

  // Handle mouse events for panning
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (currentTool === 'pan' || isSpacePressed) {
      setIsDragging(true);
      setDragStart({ x: event.clientX - pan.x, y: event.clientY - pan.y });
    }
  }, [currentTool, isSpacePressed, pan]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && (currentTool === 'pan' || isSpacePressed)) {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  }, [isDragging, currentTool, isSpacePressed, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel events for zooming and panning
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();

    if (event.shiftKey) {
      // Pan up/down
      setPan(prev => ({ ...prev, y: prev.y - event.deltaY }));
    } else if (event.altKey) {
      // Pan left/right
      setPan(prev => ({ ...prev, x: prev.x - event.deltaY }));
    } else {
      // Zoom
      const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
      setZoom(prev => Math.max(0.1, Math.min(5, prev * zoomFactor)));
    }
  }, []);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(true);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === 'Space') {
        event.preventDefault();
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Handle download
  const handleDownload = useCallback(() => {
    if (!currentImage) return;
    
    setSingleImageProgress({ imageId: currentImage.id, progress: 50 });
    
    setTimeout(() => {
      downloadImage(currentImage, colorSettings, effectSettings, setSingleImageProgress, () => {});
    }, 100);
  }, [currentImage, colorSettings, effectSettings, downloadImage, setSingleImageProgress]);

  if (!currentImage) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-panel">
        <div className="text-center text-muted-foreground">
          <p className="text-lg mb-2">No image selected</p>
          <p className="text-sm">Upload images to get started</p>
        </div>
      </div>
    );
  }

  const canvasStyle = {
    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
    transformOrigin: '0 0',
    cursor: currentTool === 'pan' || isSpacePressed ? 'grab' : 
           currentTool === 'color-stack' ? 'crosshair' :
           currentTool === 'magic-wand' ? 'crosshair' : 'default'
  };

  return (
    <div 
      ref={containerRef}
      className={`flex-1 overflow-hidden bg-gradient-panel relative ${isFullscreen ? 'fixed inset-0 z-50' : ''}`}
    >
      <div className="w-full h-full flex items-center justify-center">
        <canvas
          ref={canvasRef}
          style={canvasStyle}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
          className="max-w-none"
        />
      </div>
      
      {/* Controls overlay */}
      <div className="absolute top-4 right-4 flex gap-2">
        <button
          onClick={() => setZoom(1)}
          className="px-3 py-1 bg-background/80 border border-border rounded text-sm hover:bg-background/90"
        >
          Reset Zoom
        </button>
        <button
          onClick={() => setPan({ x: 0, y: 0 })}
          className="px-3 py-1 bg-background/80 border border-border rounded text-sm hover:bg-background/90"
        >
          Center
        </button>
        <button
          onClick={handleDownload}
          className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm hover:bg-primary/90"
        >
          Download
        </button>
        <button
          onClick={onToggleFullscreen}
          className="px-3 py-1 bg-background/80 border border-border rounded text-sm hover:bg-background/90"
        >
          {isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
        </button>
      </div>

      {/* Tool indicator */}
      <div className="absolute bottom-4 left-4 px-3 py-1 bg-background/80 border border-border rounded text-sm">
        Tool: {currentTool === 'pan' ? 'Pan' : currentTool === 'color-stack' ? 'Color Stack' : 'Magic Wand'}
        {isSpacePressed && ' (Space: Pan)'}
      </div>

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 px-3 py-1 bg-background/80 border border-border rounded text-sm">
        Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  );
};
