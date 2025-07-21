import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download, 
  Move, 
  Pipette, 
  Wand2, 
  Eraser,
  ZoomIn,
  ZoomOut,
  RotateCcw
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { ImageItem, ColorRemovalSettings, EffectSettings, EdgeCleanupSettings, ContiguousToolSettings, EraserSettings } from '@/pages/Index';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';
import { useEraserTool } from '@/hooks/useEraserTool';
import { useMagicWand } from '@/hooks/useMagicWand';

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
  setSingleImageProgress: React.Dispatch<React.SetStateAction<{ imageId: string; progress: number } | null>>;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number | undefined) => void;
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
  const [scale, setScale] = useState(1);
  const [translation, setTranslation] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const [rotation, setRotation] = useState(0);

  const { removeContiguousColor } = useMagicWand();
  const { 
    startErasing, 
    continueErasing, 
    stopErasing, 
    isErasing, 
    getEraserCursor 
  } = useEraserTool();

  const rgbToHex = (r: number, g: number, b: number): string => {
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  };

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image?.originalData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    
    // Get click coordinates relative to canvas
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    if (tool === 'magic-wand') {
      console.log(`Magic wand click at canvas coordinates: (${x}, ${y})`);
      
      // Get the current image data (prefer manually edited if available)
      const currentData = manualImageDataRef.current || 
                         image.processedData || 
                         image.originalData;
      
      // Create a copy to work with
      const workingData = new ImageData(
        new Uint8ClampedArray(currentData.data),
        currentData.width,
        currentData.height
      );

      // Apply magic wand removal using the simplified hook
      const result = removeContiguousColor(workingData, x, y, {
        threshold: contiguousSettings.threshold,
        debugMode: false // Set to true to enable debug visualization
      });

      if (result.pixelsRemoved > 0) {
        // Store the manually edited data
        setManualImageData(workingData);
        manualImageDataRef.current = workingData;
        
        // Apply to canvas immediately
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.putImageData(workingData, 0, 0);
          console.log('Magic wand: Applied changes to canvas');
        }

        // Update the image state without triggering edge cleanup
        onImageUpdate({
          ...image,
          processedData: workingData
        });

        // Add undo action
        addUndoAction({
          type: 'canvas_edit',
          description: `Magic wand removal at (${x}, ${y})`,
          undo: () => {
            if (manualImageDataRef.current) {
              setManualImageData(null);
              manualImageDataRef.current = null;
              
              // Restore previous state
              const restoreData = image.processedData || image.originalData;
              if (restoreData && canvasRef.current) {
                const ctx = canvasRef.current.getContext('2d');
                if (ctx) {
                  ctx.putImageData(restoreData, 0, 0);
                }
              }
              
              onImageUpdate({
                ...image,
                processedData: image.processedData
              });
            }
          }
        });
      }
    } else if (tool === 'color-stack') {
      const canvas = canvasRef.current;
      const rect = canvas.getBoundingClientRect();
      const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
      const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

      const currentData = manualImageDataRef.current || image.processedData || image.originalData;
      if (currentData && x >= 0 && x < currentData.width && y >= 0 && y < currentData.height) {
        const index = (y * currentData.width + x) * 4;
        const r = currentData.data[index];
        const g = currentData.data[index + 1];
        const b = currentData.data[index + 2];
        const hexColor = rgbToHex(r, g, b);
        onColorPicked(hexColor);
      }
    }
  }, [tool, image, contiguousSettings.threshold, removeContiguousColor, onImageUpdate, addUndoAction, setManualImageData, onColorPicked]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image?.originalData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    if (tool === 'eraser') {
      erasingInProgressRef.current = true;
      startErasing(
        canvasRef.current,
        x,
        y,
        eraserSettings.brushSize,
        manualImageDataRef.current || image.processedData || image.originalData,
        (updatedImageData: ImageData) => {
          setManualImageData(updatedImageData);
          manualImageDataRef.current = updatedImageData;
          onImageUpdate({ ...image, processedData: updatedImageData });
        },
        addUndoAction
      );
    }
  }, [image, tool, eraserSettings.brushSize, startErasing, onImageUpdate, addUndoAction, erasingInProgressRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image?.originalData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) * (canvas.width / rect.width));
    const y = Math.floor((e.clientY - rect.top) * (canvas.height / rect.height));

    if (tool === 'eraser' && isErasing) {
      continueErasing(x, y);
    }
  }, [image, tool, isErasing, continueErasing]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'eraser') {
      erasingInProgressRef.current = false;
      stopErasing();
    }
  }, [tool, stopErasing, erasingInProgressRef]);

  const handleMouseLeave = useCallback(() => {
    if (tool === 'eraser') {
      erasingInProgressRef.current = false;
      stopErasing();
    }
  }, [tool, stopErasing, erasingInProgressRef]);

  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(image.file);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Set initial scale to fit image in canvas
      const initialScale = Math.min(
        canvas.parentElement!.clientWidth / img.width,
        (canvas.parentElement!.clientHeight - 64) / img.height // Subtract header height
      );
      setScale(initialScale);
      setTranslation({ x: 0, y: 0 });

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save(); // Save the initial transformation state

      // Apply transformations
      ctx.translate(translation.x + canvas.width * scale / 2, translation.y + canvas.height * scale / 2);
      ctx.scale(scale, scale);
      ctx.rotate(rotation * Math.PI / 180);
      ctx.translate(-canvas.width / 2, -canvas.height / 2);

      ctx.drawImage(img, 0, 0);
      ctx.restore(); // Restore the transformation state after drawing

      // Store original image data
      ctx.save();
      ctx.scale(1, 1);
      const originalData = ctx.getImageData(0, 0, img.width, img.height);
      image.originalData = originalData;
      ctx.restore();

      // Apply manual edits if available
      if (manualImageDataRef.current) {
        ctx.putImageData(manualImageDataRef.current, 0, 0);
      } else if (image.processedData) {
        ctx.putImageData(image.processedData, 0, 0);
      }
    };
  }, [image, scale, translation, rotation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (manualImageDataRef.current) {
      ctx.putImageData(manualImageDataRef.current, 0, 0);
    } else if (image.processedData) {
      ctx.putImageData(image.processedData, 0, 0);
    }
  }, [image, manualImageDataRef]);

  return (
    <div className="flex flex-col flex-1 relative">
      {/* Canvas Toolbar */}
      <Card className="absolute top-2 left-2 z-10 bg-white/70 backdrop-blur-md p-2 rounded-md shadow-md">
        <div className="flex items-center space-x-2">
          <Button 
            variant={tool === 'pan' ? 'default' : 'outline'}
            onClick={() => onToolChange('pan')}
            size="icon"
            aria-label="Pan Tool"
          >
            <Move className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === 'color-stack' ? 'default' : 'outline'}
            onClick={() => onToolChange('color-stack')}
            size="icon"
            aria-label="Color Stack Tool"
          >
            <Pipette className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === 'magic-wand' ? 'default' : 'outline'}
            onClick={() => onToolChange('magic-wand')}
            size="icon"
            aria-label="Magic Wand Tool"
          >
            <Wand2 className="h-4 w-4" />
          </Button>
          <Button 
            variant={tool === 'eraser' ? 'default' : 'outline'}
            onClick={() => onToolChange('eraser')}
            size="icon"
            aria-label="Eraser Tool"
          >
            <Eraser className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Canvas Controls */}
      <Card className="absolute top-2 right-2 z-10 bg-white/70 backdrop-blur-md p-2 rounded-md shadow-md">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={() => setScale(prev => Math.max(0.1, prev - 0.1))}
            size="icon"
            aria-label="Zoom Out"
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setScale(prev => Math.min(5, prev + 0.1))}
            size="icon"
            aria-label="Zoom In"
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button 
            onClick={() => setRotation(prev => prev - 90)}
            size="icon"
            aria-label="Rotate Counterclockwise"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Canvas Navigation */}
      <Card className="absolute bottom-2 left-1/2 transform -translate-x-1/2 z-10 bg-white/70 backdrop-blur-md p-2 rounded-md shadow-md">
        <div className="flex items-center space-x-2">
          <Button 
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
            size="icon"
            aria-label="Previous Image"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span>{currentImageIndex}/{totalImages}</span>
          <Button 
            onClick={onNextImage}
            disabled={!canGoNext}
            size="icon"
            aria-label="Next Image"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </Card>

      {/* Download Button */}
      <Card className="absolute bottom-2 right-2 z-10 bg-white/70 backdrop-blur-md p-2 rounded-md shadow-md">
        <Button 
          onClick={onDownloadImage}
          size="icon"
          aria-label="Download Image"
        >
          <Download className="h-4 w-4" />
        </Button>
      </Card>

      {/* Main Canvas */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        <canvas
          ref={canvasRef}
          className={cn(
            "touch-none cursor-crosshair",
            tool === 'eraser' && isErasing && 'cursor-none',
            tool === 'eraser' && !isErasing && `cursor-[${getEraserCursor(eraserSettings.brushSize)}]`
          )}
          style={{
            transform: `translate(${translation.x}px, ${translation.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transformOrigin: 'center',
          }}
          onClick={handleCanvasClick}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
      </div>
    </div>
  );
};
