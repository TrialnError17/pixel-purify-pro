import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ImageItem, ColorRemovalSettings, EffectSettings, EdgeCleanupSettings, ContiguousToolSettings } from '@/pages/Index';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';
import { optimizedMagicWandSelect } from '@/utils/optimizedMagicWand';

interface MainCanvasProps {
  image?: ImageItem;
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
}

const MainCanvas: React.FC<MainCanvasProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);

  // Load image when it changes
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // Store original image data for magic wand
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      setOriginalImageData(imageData);
      
      // Update image with original data if not already set
      if (!image.originalData) {
        onImageUpdate({
          ...image,
          originalData: imageData
        });
      }
    };
    img.src = URL.createObjectURL(image.file);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [image, onImageUpdate]);

  // Handle magic wand click
  const handleCanvasClick = useCallback(async (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool !== 'magic-wand' || !originalImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoomLevel);
    const y = Math.floor((event.clientY - rect.top) / zoomLevel);

    setIsProcessing(true);
    
    try {
      console.log('Starting optimized magic wand selection at:', x, y);
      
      const selectedPixels = await optimizedMagicWandSelect(
        originalImageData,
        x,
        y,
        {
          threshold: contiguousSettings.threshold,
          onProgress: (progress) => {
            console.log(`Magic wand progress: ${Math.round(progress * 100)}%`);
          },
          onCancel: () => false
        }
      );

      if (selectedPixels.size === 0) {
        console.log('No pixels selected by magic wand');
        return;
      }

      console.log(`Magic wand selected ${selectedPixels.size} pixels`);

      // Create new image data with selected pixels removed
      const newImageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
      );

      // Remove selected pixels by setting alpha to 0
      for (const pixelCoord of selectedPixels) {
        const [px, py] = pixelCoord.split(',').map(Number);
        const index = (py * originalImageData.width + px) * 4;
        if (index >= 0 && index < newImageData.data.length) {
          newImageData.data[index + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      // Update canvas with new image data
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(newImageData, 0, 0);
      }

      // Update image with processed data
      if (image) {
        onImageUpdate({
          ...image,
          processedData: newImageData,
          status: 'completed'
        });
      }

    } catch (error) {
      console.error('Error in magic wand operation:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [tool, originalImageData, contiguousSettings.threshold, zoomLevel, image, onImageUpdate]);

  // Handle mouse events for panning
  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setDragStart({
        x: event.clientX - pan.x,
        y: event.clientY - pan.y
      });
    }
  }, [tool, pan]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && tool === 'pan') {
      setPan({
        x: event.clientX - dragStart.x,
        y: event.clientY - dragStart.y
      });
    }
  }, [isDragging, tool, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle zoom with mouse wheel
  const handleWheel = useCallback((event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoomLevel(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <h3 className="text-lg font-medium text-muted-foreground">No image selected</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Upload an image to get started
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-background">
      {/* Toolbar */}
      <div className="border-b p-2 flex items-center gap-2">
        <Button
          variant={tool === 'pan' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('pan')}
        >
          Pan
        </Button>
        <Button
          variant={tool === 'magic-wand' ? 'default' : 'outline'}
          size="sm"
          onClick={() => onToolChange('magic-wand')}
        >
          Magic Wand
        </Button>
        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setZoomLevel(1)}
          >
            Fit
          </Button>
          <span className="text-sm text-muted-foreground">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-hidden relative bg-muted/20">
        <canvas
          ref={canvasRef}
          className="absolute"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoomLevel})`,
            transformOrigin: 'top left',
            cursor: tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 
                   tool === 'magic-wand' ? 'crosshair' : 'default'
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onWheel={handleWheel}
        />
        
        {/* Processing overlay */}
        {isProcessing && (
          <div className="absolute inset-0 bg-background/50 flex items-center justify-center">
            <div className="bg-background border rounded-lg p-4 shadow-lg">
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent" />
                <span className="text-sm">Processing magic wand selection...</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Status bar */}
      <div className="border-t p-2 text-xs text-muted-foreground flex justify-between">
        <span>
          Tool: {tool === 'pan' ? 'Pan' : tool === 'magic-wand' ? 'Magic Wand' : tool}
        </span>
        <span>
          Image {currentImageIndex} of {totalImages}
        </span>
      </div>
    </div>
  );
};

export default MainCanvas;