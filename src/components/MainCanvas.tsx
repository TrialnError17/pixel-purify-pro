import React, { useRef, useEffect, useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EraserSettings } from '@/pages/Index';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useSpeckleTools, SpeckleSettings } from '@/hooks/useSpeckleTools';
import { useEraserTool } from '@/hooks/useEraserTool';
import { getImageData, setImageData } from '@/utils/memoryCache';
import { ZoomIn, ZoomOut, RotateCcw, Download, Eye, Move, Wand2, Eraser } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';

export interface PixelData {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface EdgeCleanupSettings {
  enabled: boolean;
  trimRadius: number;
  legacyEnabled: boolean;
  legacyRadius: number;
  softening: {
    enabled: boolean;
    iterations: number;
  };
}

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: SpeckleSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  eraserSettings: EraserSettings;
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: (progress: { imageId: string; progress: number } | null) => void;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number) => void;
}

export const MainCanvas = ({ 
  image, 
  tool, 
  onToolChange,
  colorSettings, 
  contiguousSettings, 
  effectSettings, 
  speckleSettings,
  edgeCleanupSettings,
  eraserSettings,
  erasingInProgressRef,
  onImageUpdate,
  onColorPicked,
  onPreviousImage,
  onNextImage,
  canGoPrevious,
  canGoNext,
  currentImageIndex,
  totalImages,
  onDownloadImage,
  setSingleImageProgress,
  addUndoAction,
  onSpeckCountUpdate
}: MainCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [clickedPixel, setClickedPixel] = useState<{ x: number; y: number; color: string } | null>(null);
  const [previewOverlay, setPreviewOverlay] = useState<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef<boolean>(false);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const { toast } = useToast();

  const { processImageDataUnified } = useImageProcessor();
  const { processSpecks } = useSpeckleTools();

  // Load brush size from localStorage on component mount
  const initialBrushSize = useRef(10);
  useEffect(() => {
    const savedSize = localStorage.getItem('eraserBrushSize');
    if (savedSize) {
      const parsedSize = parseInt(savedSize, 10);
      if (!isNaN(parsedSize) && parsedSize >= 1 && parsedSize <= 50) {
        initialBrushSize.current = parsedSize;
      }
    }
  }, []);

  const {
    startErasing,
    continueErasing,
    stopErasing,
    getBrushCursor,
    saveBrushSize,
    loadBrushSize
  } = useEraserTool(canvasRef.current, {
    brushSize: eraserSettings.brushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: undefined
  });

  // Main useEffect for loading and displaying images - ONLY SHOW ORIGINAL
  useEffect(() => {
    const loadAndDisplayImage = async () => {
      if (!image || !canvasRef.current) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        // Clear any existing preview overlay
        setPreviewOverlay(null);
        setClickedPixel(null);

        // Check if we have cached original data
        const cachedData = getImageData(image.id);
        let originalImageData = cachedData?.originalData;

        if (!originalImageData) {
          // Load image from file
          const img = new Image();
          await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(image.file);
          });

          // Set canvas size to match image
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;

          // Draw image and get image data
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0);
          originalImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          // Cache the original data
          setImageData(image.id, originalImageData);
          
          // Clean up
          URL.revokeObjectURL(img.src);
        } else {
          // Use cached data - set canvas size and draw
          canvas.width = originalImageData.width;
          canvas.height = originalImageData.height;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.putImageData(originalImageData, 0, 0);
        }

        // Store references for tools to use
        originalImageDataRef.current = originalImageData;
        manualImageDataRef.current = new ImageData(
          new Uint8ClampedArray(originalImageData.data),
          originalImageData.width,
          originalImageData.height
        );
        hasManualEditsRef.current = false;

        // Calculate center offset for proper positioning
        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          setCenterOffset({
            x: (containerRect.width - canvas.width * zoom) / 2,
            y: (containerRect.height - canvas.height * zoom) / 2
          });
        }

        console.log('✅ Image loaded and displayed - ORIGINAL ONLY, no processing');

      } catch (error) {
        console.error('Error loading image:', error);
        toast({
          title: "Error",
          description: "Failed to load image",
          variant: "destructive"
        });
      }
    };

    loadAndDisplayImage();
  }, [image?.id, zoom, toast]);

  // Zoom functionality
  const handleZoomIn = useCallback(() => {
    setZoom(prevZoom => Math.min(prevZoom + 0.25, 10));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prevZoom => Math.max(prevZoom - 0.25, 0.1));
  }, []);

  // Reset zoom and pan
  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Pan functionality
  const handlePanStart = useCallback((e: React.MouseEvent) => {
    setIsPanning(true);
    setLastPanPoint({ x: e.clientX, y: e.clientY });
    setIsDragging(true);
  }, []);

  const handlePanMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    const deltaX = e.clientX - lastPanPoint.x;
    const deltaY = e.clientY - lastPanPoint.y;
    setPan(prevPan => ({
      x: prevPan.x + deltaX,
      y: prevPan.y + deltaY
    }));
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  }, [isPanning, lastPanPoint]);

  const handlePanEnd = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
  }, []);

  // Touch event handlers for pan and zoom
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Multi-touch (zoom)
      setIsPanning(false);
      setIsDragging(false);
    } else if (e.touches.length === 1) {
      // Single touch (pan)
      setIsPanning(true);
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
      setIsDragging(true);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Handle zoom
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        (touch2.clientX - touch1.clientX) ** 2 + (touch2.clientY - touch1.clientY) ** 2
      );

      // Calculate zoom based on touch distance
      const initialDistance = useRef(0);
      if (initialDistance.current === 0) {
        initialDistance.current = distance;
      }
      const zoomFactor = distance / initialDistance.current;
      setZoom(prevZoom => Math.max(0.1, Math.min(10, prevZoom * zoomFactor)));

      // Calculate pan based on touch center
      const centerX = (touch1.clientX + touch2.clientX) / 2;
      const centerY = (touch1.clientY + touch2.clientY) / 2;
      setPan(prevPan => ({
        x: prevPan.x + (centerX - (containerRef.current?.getBoundingClientRect().width || 0) / 2),
        y: prevPan.y + (centerY - (containerRef.current?.getBoundingClientRect().height || 0) / 2)
      }));
    } else if (e.touches.length === 1 && isPanning) {
      // Handle pan
      const deltaX = e.touches[0].clientX - lastPanPoint.x;
      const deltaY = e.touches[0].clientY - lastPanPoint.y;
      setPan(prevPan => ({
        x: prevPan.x + deltaX,
        y: prevPan.y + deltaY
      }));
      setLastPanPoint({ x: e.touches[0].clientX, y: e.touches[0].clientY });
    }
  }, [isPanning]);

  const handleTouchEnd = useCallback(() => {
    setIsPanning(false);
    setIsDragging(false);
  }, []);

  // Resize canvas on container resize
  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !containerRef.current || !originalImageDataRef.current) return;
      
      const canvas = canvasRef.current;
      const containerRect = containerRef.current.getBoundingClientRect();
      
      // Adjust center offset based on new container size
      setCenterOffset({
        x: (containerRect.width - canvas.width * zoom) / 2,
        y: (containerRect.height - canvas.height * zoom) / 2
      });
    };

    // Call handler right away so state gets updated with initial window size
    handleResize();
    
    const resizeObserver = new ResizeObserver(handleResize);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [zoom]);

  // DISABLED: Magic wand tool - preview only, no automatic processing
  const handleMagicWandClick = useCallback(async (e: React.MouseEvent) => {
    if (tool !== 'magic-wand' || !canvasRef.current || !originalImageDataRef.current) return;

    const canvas = canvasRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Get click coordinates
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    const dataX = Math.floor((mouseX - centerOffset.x - pan.x) / zoom);
    const dataY = Math.floor((mouseY - centerOffset.y - pan.y) / zoom);
    
    if (dataX < 0 || dataY < 0 || dataX >= originalImageDataRef.current.width || dataY >= originalImageDataRef.current.height) {
      return;
    }

    try {
      // Create preview using current settings
      const previewSettings = {
        ...colorSettings,
        enabled: true,
        mode: 'auto' as const,
        contiguous: true
      };

      // Get the starting pixel data for flood fill
      const pixelIndex = (dataY * originalImageDataRef.current.width + dataX) * 4;
      const targetR = originalImageDataRef.current.data[pixelIndex];
      const targetG = originalImageDataRef.current.data[pixelIndex + 1];
      const targetB = originalImageDataRef.current.data[pixelIndex + 2];

      console.log(`🎯 Magic wand clicked at (${dataX}, ${dataY}) - RGB(${targetR}, ${targetG}, ${targetB})`);

      // PREVIEW ONLY: Create processed preview for visual feedback
      const previewData = await processImageDataUnified(originalImageDataRef.current, previewSettings);
      setPreviewOverlay(previewData);

      // Show clicked pixel info
      setClickedPixel({
        x: dataX,
        y: dataY,
        color: `rgb(${targetR}, ${targetG}, ${targetB})`
      });

      console.log('🔍 Magic wand preview created - NO AUTOMATIC PROCESSING');

      // DISABLED: No automatic image updates
      // onImageUpdate({ ...image, /* processed data */ });

    } catch (error) {
      console.error('Magic wand preview error:', error);
      toast({
        title: "Preview Error",
        description: "Failed to generate magic wand preview",
        variant: "destructive"
      });
    }
  }, [tool, colorSettings, zoom, pan, centerOffset, processImageDataUnified, toast]);

  // DISABLED: Color picker - preview only, no automatic processing  
  const handleColorPickerClick = useCallback(async (e: React.MouseEvent) => {
    if (tool !== 'color-stack' || !canvasRef.current || !originalImageDataRef.current) return;

    const canvas = canvasRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;

    // Get click coordinates
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    const dataX = Math.floor((mouseX - centerOffset.x - pan.x) / zoom);
    const dataY = Math.floor((mouseY - centerOffset.y - pan.y) / zoom);
    
    if (dataX < 0 || dataY < 0 || dataX >= originalImageDataRef.current.width || dataY >= originalImageDataRef.current.height) {
      return;
    }

    // Get pixel color
    const pixelIndex = (dataY * originalImageDataRef.current.width + dataX) * 4;
    const r = originalImageDataRef.current.data[pixelIndex];
    const g = originalImageDataRef.current.data[pixelIndex + 1];
    const b = originalImageDataRef.current.data[pixelIndex + 2];
    
    const hexColor = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    
    console.log(`🎨 Color picked: ${hexColor} at (${dataX}, ${dataY})`);
    
    // Add to picked colors list
    onColorPicked(hexColor);

    // Show visual feedback
    setClickedPixel({
      x: dataX,
      y: dataY,
      color: `rgb(${r}, ${g}, ${b})`
    });

    // DISABLED: No automatic processing preview
    console.log('🎨 Color picked - NO AUTOMATIC PROCESSING');

  }, [tool, zoom, pan, centerOffset, onColorPicked]);

  // DISABLED: Handle reset - visual only, no automatic processing
  const handleReset = useCallback(() => {
    if (!originalImageDataRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset to original image data
    manualImageDataRef.current = new ImageData(
      new Uint8ClampedArray(originalImageDataRef.current.data),
      originalImageDataRef.current.width,
      originalImageDataRef.current.height
    );
    hasManualEditsRef.current = false;

    // Clear canvas and redraw original
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.putImageData(originalImageDataRef.current, 0, 0);

    // Clear any overlays
    setPreviewOverlay(null);
    setClickedPixel(null);

    console.log('🔄 Reset to original - NO AUTOMATIC PROCESSING');

    // DISABLED: No automatic image updates
    // onImageUpdate(updatedImage);

  }, []);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      startErasing(e.nativeEvent);
      return;
    }

    if (tool === 'pan') {
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }

    if (tool === 'magic-wand') {
      handleMagicWandClick(e);
      return;
    }

    if (tool === 'color-stack') {
      handleColorPickerClick(e);
      return;
    }
  }, [tool, startErasing, handleMagicWandClick, handleColorPickerClick]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      continueErasing(e.nativeEvent);
      return;
    }

    if (isPanning && tool === 'pan') {
      const deltaX = e.clientX - lastPanPoint.x;
      const deltaY = e.clientY - lastPanPoint.y;
      
      setPan(prevPan => ({
        x: prevPan.x + deltaX,
        y: prevPan.y + deltaY
      }));
      
      setLastPanPoint({ x: e.clientX, y: e.clientY });
      return;
    }
  }, [tool, continueErasing, isPanning, lastPanPoint]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      stopErasing(e.nativeEvent);
      return;
    }

    if (tool === 'pan') {
      setIsPanning(false);
      return;
    }
  }, [tool, stopErasing]);

  // Get cursor style based on current tool
  const getCursorStyle = useCallback(() => {
    switch (tool) {
      case 'pan':
        return isPanning ? 'grabbing' : 'grab';
      case 'color-stack':
        return 'crosshair';
      case 'magic-wand':
        return 'crosshair';
      case 'eraser':
        return getBrushCursor();
      default:
        return 'default';
    }
  }, [tool, isPanning, getBrushCursor]);

  // Render preview overlay if it exists
  const renderPreviewOverlay = useCallback(() => {
    if (!previewOverlay || !canvasRef.current) return null;

    const canvas = document.createElement('canvas');
    canvas.width = previewOverlay.width;
    canvas.height = previewOverlay.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.putImageData(previewOverlay, 0, 0);
    const dataUrl = canvas.toDataURL();

    return (
      <img
        src={dataUrl}
        alt="Preview overlay"
        className="absolute inset-0 pointer-events-none opacity-80"
        style={{
          width: `${previewOverlay.width * zoom}px`,
          height: `${previewOverlay.height * zoom}px`,
          transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px)`,
          imageRendering: 'pixelated'
        }}
      />
    );
  }, [previewOverlay, zoom, centerOffset, pan]);

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/50 rounded-lg border-2 border-dashed border-muted-foreground/25">
        <div className="text-center space-y-4">
          <div className="text-muted-foreground text-lg">No image selected</div>
          <div className="text-sm text-muted-foreground">
            Upload images to get started
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="flex items-center space-x-2">
          <Button variant="outline" size="icon" onClick={handleZoomIn} disabled={isDragging}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleZoomOut} disabled={isDragging}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleResetZoom} disabled={isDragging}>
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center space-x-4">
          <Badge variant="secondary">
            {currentImageIndex} / {totalImages}
          </Badge>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={onPreviousImage} disabled={!canGoPrevious || isDragging}>
              <Eye className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={onNextImage} disabled={!canGoNext || isDragging}>
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant={tool === 'pan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('pan')}
            active={tool === 'pan'}
            disabled={isDragging}
          >
            <Move className="w-4 h-4 mr-2" />
            Pan
          </Button>
          <Button
            variant={tool === 'color-stack' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('color-stack')}
            active={tool === 'color-stack'}
            disabled={isDragging}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Color Stack
          </Button>
          <Button
            variant={tool === 'magic-wand' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('magic-wand')}
            active={tool === 'magic-wand'}
            disabled={isDragging}
          >
            <Wand2 className="w-4 h-4 mr-2" />
            Magic Wand
          </Button>
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('eraser')}
            active={tool === 'eraser'}
            disabled={isDragging}
          >
            <Eraser className="w-4 h-4 mr-2" />
            Eraser
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleReset}
            disabled={isDragging}
          >
            Reset
          </Button>
        </div>
      </div>

      {/* Canvas Container */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden bg-checker"
        style={{ cursor: getCursorStyle() }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            imageRendering: zoom > 2 ? 'pixelated' : 'auto'
          }}
        />
        
        {/* Preview overlay */}
        {renderPreviewOverlay()}

        {/* Clicked pixel indicator */}
        {clickedPixel && (
          <div
            className="absolute w-3 h-3 border-2 border-red-500 bg-red-500/20 rounded-full pointer-events-none animate-pulse"
            style={{
              left: `${centerOffset.x + pan.x + clickedPixel.x * zoom - 6}px`,
              top: `${centerOffset.y + pan.y + clickedPixel.y * zoom - 6}px`,
            }}
          >
            <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
              {clickedPixel.color}
            </div>
          </div>
        )}

        {/* Navigation arrows for mobile */}
        <div className="absolute left-4 bottom-4 space-x-2 sm:hidden">
          <Button variant="outline" size="icon" onClick={onPreviousImage} disabled={!canGoPrevious}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={onNextImage} disabled={!canGoNext}>
            <Download className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between p-2 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 text-muted-foreground text-xs">
        <div className="flex items-center space-x-2">
          <span>Zoom: {(zoom * 100).toFixed(0)}%</span>
          <span>|</span>
          <span>Pan: X: {pan.x.toFixed(0)}, Y: {pan.y.toFixed(0)}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span>Canvas Size: {canvasRef.current?.width}x{canvasRef.current?.height}</span>
        </div>
      </div>
    </div>
  );
};
