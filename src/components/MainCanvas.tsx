import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageItem, ColorRemovalSettings, EffectSettings } from '@/pages/Index';
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
  Target,
  Undo
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'eyedropper' | 'remove' | 'contiguous';
  onToolChange: (tool: 'pan' | 'eyedropper' | 'remove' | 'contiguous') => void;
  colorSettings: ColorRemovalSettings;
  effectSettings: EffectSettings;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: (image: ImageItem) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  tool,
  onToolChange,
  colorSettings,
  effectSettings,
  onImageUpdate,
  onColorPicked,
  onPreviousImage,
  onNextImage,
  canGoPrevious,
  canGoNext,
  currentImageIndex,
  totalImages,
  onDownloadImage
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

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
    }

    // Apply background color if enabled and saveWithBackground is true
    if (effects.background.enabled && effects.background.saveWithBackground) {
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

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Load original image and store image data
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
      setHasManualEdits(false);
      setUndoStack([]);
      
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
  }, [image, onImageUpdate]);

  // Debounced processing to prevent flashing
  const debouncedProcessImageData = useMemo(() => {
    let timeoutId: NodeJS.Timeout;
    
    return (imageData: ImageData, colorSettings: ColorRemovalSettings, effectSettings: EffectSettings) => {
      return new Promise<ImageData>((resolve) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          const result = processImageData(imageData, colorSettings, effectSettings);
          resolve(result);
        }, 50); // 50ms debounce
      });
    };
  }, [processImageData]);

  // Process and display image when settings change (but not if there are manual edits)
  useEffect(() => {
    if (!originalImageData || !canvasRef.current || hasManualEdits) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsProcessing(true);

    // Use debounced processing to prevent rapid updates
    debouncedProcessImageData(originalImageData, colorSettings, effectSettings).then((processedData) => {
      // Only apply if we're still on the same canvas and no manual edits occurred during processing
      if (canvasRef.current === canvas && !hasManualEdits) {
        ctx.putImageData(processedData, 0, 0);
        setIsProcessing(false);
      }
    });

    return () => {
      setIsProcessing(false);
    };
  }, [originalImageData, colorSettings, effectSettings, debouncedProcessImageData, hasManualEdits]);

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

    if (tool === 'eyedropper') {
      // Get color at clicked position from original image
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Add to picked colors and immediately remove this color
      onColorPicked(hex);
      
      // Save current state for undo
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      
      // Immediately remove this color with default threshold of 30
      removePickedColor(ctx, r, g, b, 30);
      
      // Mark that we have manual edits
      setHasManualEdits(true);
      
      // Store the result
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        onImageUpdate(updatedImage);
      }
    } else if (tool === 'remove') {
      // Interactive removal tool should always work, regardless of color removal settings
      // Save current state for undo
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      
      // Remove contiguous color at clicked position (using manual threshold)
      removeContiguousColor(ctx, x, y, { 
        ...colorSettings, 
        threshold: colorSettings.threshold || 30 // Use current threshold or default
      });
      
      // Mark that we have manual edits to prevent auto-processing from overwriting
      setHasManualEdits(true);
      
      // Store the manually edited result
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        onImageUpdate(updatedImage);
      }
    } else if (tool === 'contiguous') {
      // Contiguous selection tool - adds color to picked colors for removal
      // Get color at clicked position from original image
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Add contiguous region to picked colors
      onColorPicked(hex);
    }
  }, [image, originalImageData, tool, zoom, pan, centerOffset, colorSettings, onColorPicked, onImageUpdate]);

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
    
    const previousState = undoStack[undoStack.length - 1];
    setUndoStack(prev => prev.slice(0, -1));
    
    ctx.putImageData(previousState, 0, 0);
    
    const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updatedImage = { ...image, processedData: newImageData };
    onImageUpdate(updatedImage);
  }, [undoStack, image, onImageUpdate]);

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
    setHasManualEdits(false);
    setUndoStack([]);
    
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
    
    // Get current canvas data
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
        <div className="flex items-center gap-2">
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
          
          {/* Undo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-2"
            title="Undo last manual edit"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Tools */}
          <Button
            variant={tool === 'pan' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('pan')}
            className="flex items-center gap-2"
          >
            <Move className="w-4 h-4" />
            Pan
          </Button>
          
          <Button
            variant={tool === 'eyedropper' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('eyedropper')}
            className="flex items-center gap-2"
          >
            <Pipette className="w-4 h-4" />
            Eyedropper
          </Button>
          
          <Button
            variant={tool === 'remove' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('remove')}
            className="flex items-center gap-2"
          >
            <MousePointer className="w-4 h-4" />
            Remove
          </Button>
          
          <Button
            variant={tool === 'contiguous' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => onToolChange('contiguous')}
            className="flex items-center gap-2"
          >
            <Target className="w-4 h-4" />
            Contiguous
          </Button>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('out')}
            disabled={zoom <= 0.1}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground min-w-16 text-center">
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
            onClick={handleUndo}
            disabled={undoStack.length === 0}
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasManualEdits}
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
            >
              <Download className="w-4 h-4" />
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
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute cursor-crosshair border border-canvas-border",
              tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
              tool === 'eyedropper' && 'cursor-crosshair',
              tool === 'remove' && 'cursor-pointer',
              tool === 'contiguous' && 'cursor-crosshair'
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