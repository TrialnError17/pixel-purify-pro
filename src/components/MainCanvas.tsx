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
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'eyedropper' | 'remove';
  onToolChange: (tool: 'pan' | 'eyedropper' | 'remove') => void;
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
  totalImages
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
      let targetR, targetG, targetB;

      if (settings.mode === 'auto') {
        // Use top-left corner color
        targetR = data[0];
        targetG = data[1];
        targetB = data[2];
      } else {
        // Use manual color
        const hex = settings.targetColor.replace('#', '');
        targetR = parseInt(hex.substr(0, 2), 16);
        targetG = parseInt(hex.substr(2, 2), 16);
        targetB = parseInt(hex.substr(4, 2), 16);
      }

      // Convert threshold (0-100) to color distance threshold
      const threshold = settings.threshold * 2.55; // Scale to 0-255 range

      if (settings.contiguous) {
        // Contiguous removal - use flood fill from borders
        const visited = new Set<string>();
        
        const isColorSimilar = (r: number, g: number, b: number) => {
          const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
          return distance <= threshold;
        };

        const floodFill = (startX: number, startY: number) => {
          const stack = [[startX, startY]];
          
          while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
            visited.add(key);
            
            const index = (y * width + x) * 4;
            const r = data[index];
            const g = data[index + 1];
            const b = data[index + 2];
            const a = data[index + 3];
            
            if (a === 0 || !isColorSimilar(r, g, b)) continue;
            
            // Make pixel transparent
            data[index + 3] = 0;
            
            // Add neighbors to stack
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
        };

        // Start flood fill from all border pixels
        // Top and bottom borders
        for (let x = 0; x < width; x++) {
          floodFill(x, 0); // Top border
          floodFill(x, height - 1); // Bottom border
        }
        // Left and right borders  
        for (let y = 0; y < height; y++) {
          floodFill(0, y); // Left border
          floodFill(width - 1, y); // Right border
        }
        
      } else {
        // Non-contiguous removal - remove all similar colors
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
      // Only apply if we're still on the same canvas
      if (canvasRef.current === canvas) {
        ctx.putImageData(processedData, 0, 0);
        setIsProcessing(false);
      }
    });

    return () => {
      setIsProcessing(false);
    };
  }, [originalImageData, colorSettings, effectSettings, debouncedProcessImageData, hasManualEdits]);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !image || !originalImageData) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left - centerOffset.x - pan.x) / zoom);
    const y = Math.floor((e.clientY - rect.top - centerOffset.y - pan.y) / zoom);
    
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    if (tool === 'eyedropper') {
      // Get color at clicked position from original image
      const index = (y * originalImageData.width + x) * 4;
      const r = originalImageData.data[index];
      const g = originalImageData.data[index + 1];
      const b = originalImageData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Update target color and switch to manual mode
      onColorPicked(hex);
    } else if (tool === 'remove') {
      // Save current state for undo
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      
      // Remove contiguous color at clicked position (additive to existing processing)
      removeContiguousColor(ctx, x, y, colorSettings);
      
      // Mark that we have manual edits to prevent auto-processing from overwriting
      setHasManualEdits(true);
      
      // Store the manually edited result
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        onImageUpdate(updatedImage);
      }
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

  const handleZoom = useCallback((direction: 'in' | 'out') => {
    setZoom(prev => {
      const factor = direction === 'in' ? 1.2 : 0.8;
      return Math.max(0.1, Math.min(5, prev * factor));
    });
  }, []);

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
      >
        {image ? (
          <canvas
            ref={canvasRef}
            className={cn(
              "absolute cursor-crosshair border border-canvas-border",
              tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
              tool === 'eyedropper' && 'cursor-crosshair',
              tool === 'remove' && 'cursor-pointer'
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