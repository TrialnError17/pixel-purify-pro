import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings } from '@/pages/Index';
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
  Wand
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
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: (image: ImageItem) => void;
  addUndoAction?: (action: { type: string; description: string; undo: () => void }) => void;
  
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
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousTool, setPreviousTool] = useState<'pan' | 'color-stack' | 'magic-wand'>('pan');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Color processing functions
  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    const dr = r1 - r2;
    const dg = g1 - g2;
    const db = b1 - b2;
    return Math.sqrt(dr * dr + dg * dg + db * db);
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
      if (settings.minRegionSize > 0) {
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
              if (regionPixels.length < settings.minRegionSize) {
                for (const pixelIndex of regionPixels) {
                  data[pixelIndex * 4 + 3] = 255; // Make opaque
                }
              }
            }
          }
        }
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
      const hex = effects.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = (100 - effects.inkStamp.threshold) * 2.55; // Convert to 0-255 range, invert for intuitive control

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
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

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
      ctx.putImageData(image.processedData, 0, 0);
      return;
    }

    // If image has processedData and no manual edits, use that
    if (image.processedData && !hasManualEditsRef.current) {
      console.log('Using existing processedData');
      ctx.putImageData(image.processedData, 0, 0);
      
      // Store as original data if not set
      if (!originalImageData) {
        setOriginalImageData(image.processedData);
      }
      return;
    }

    console.log('Loading image from file');
    const img = new Image();
    img.onload = () => {
      // Set canvas size to image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Store original image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
    if (!originalImageData || !canvasRef.current || hasManualEditsRef.current || isProcessing) {
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
          ctx.putImageData(speckleResult.processedData, 0, 0);
          
          // Update speck count if callback is provided
          if (onSpeckCountUpdate) {
            onSpeckCountUpdate(speckleResult.speckCount);
          }
        } else {
          ctx.putImageData(processedData, 0, 0);
        }
      } else {
        console.log('Skipping auto-processed data application');
      }
      setIsProcessing(false);
    }).catch((error) => {
      console.error('Auto-processing error:', error);
      setIsProcessing(false);
    });

  }, [originalImageData, colorSettings, effectSettings, speckleSettings, manualImageData, debouncedProcessImageData, processSpecks, onSpeckCountUpdate]);

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

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !image || !originalImageData || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
                onImageUpdate(updatedImage);
              }
            }
          }
        });
      }
      
      // Immediately remove this color with default threshold of 30
      removePickedColor(ctx, r, g, b, 30);
      
      // Mark that we have manual edits
      hasManualEditsRef.current = true;
      
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
                onImageUpdate(updatedImage);
                // Reset manual edits state on undo
                hasManualEditsRef.current = false;
                setManualImageData(null);
              }
            }
          }
        });
      }
      
      // Remove contiguous color at clicked position using independent contiguous threshold
      console.log('Before removeContiguousColorIndependent, manual edits marked');
      removeContiguousColorIndependent(ctx, x, y, contiguousSettings.threshold || 30);
      console.log('After removeContiguousColorIndependent');
      
      // Store the manually edited result as base for future operations
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
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
  }, [image, originalImageData, tool, zoom, pan, centerOffset, colorSettings, contiguousSettings, onColorPicked, onImageUpdate, addUndoAction]);

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
      
      // If center coordinates are provided (from wheel event), adjust pan to keep that point centered
      if (centerX !== undefined && centerY !== undefined) {
        const containerRect = container.getBoundingClientRect();
        
        // Calculate mouse position relative to canvas
        const mouseCanvasX = (centerX - containerRect.left - centerOffset.x - pan.x) / prev;
        const mouseCanvasY = (centerY - containerRect.top - centerOffset.y - pan.y) / prev;
        
        // Calculate new pan to keep the mouse position centered
        const newPanX = pan.x - (mouseCanvasX * (newZoom - prev));
        const newPanY = pan.y - (mouseCanvasY * (newZoom - prev));
        
        setPan({ x: newPanX, y: newPanY });
      }
      
      return newZoom;
    });
  }, [centerOffset, pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Determine zoom direction based on wheel delta
    const direction = e.deltaY < 0 ? 'in' : 'out';
    
    // Use mouse position as zoom center
    handleZoom(direction, e.clientX, e.clientY);
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
    setManualImageData(restoredImageData);
    
    console.log('Local redo completed, redoStack length:', redoStack.length - 1);
    onImageUpdate(updatedImage);
  }, [redoStack, image, onImageUpdate]);

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
          
          <span className="text-sm text-muted-foreground min-w-12 text-center">
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
            title="Reset to automatic processing"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {image && (
            <Button
              variant="ghost"
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