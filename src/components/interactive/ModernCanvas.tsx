import React, { useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image as KonvaImage } from 'react-konva';
import Konva from 'konva';
import { useCanvasStore } from '@/stores/canvasStore';
import { CanvasToolbar } from './CanvasToolbar';
import { CanvasCursor } from './CanvasCursor';
import { CanvasOverlay } from './CanvasOverlay';
import { useImageWorker } from '@/hooks/useImageWorker';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface ModernCanvasProps {
  image: HTMLImageElement | null;
  originalImageData: ImageData | null;
  currentImageData: ImageData | null;
  onImageDataChange: (imageData: ImageData) => void;
  onManualEdit: () => void;
  className?: string;
}

export const ModernCanvas: React.FC<ModernCanvasProps> = ({
  image,
  originalImageData,
  currentImageData,
  onImageDataChange,
  onManualEdit,
  className
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const layerRef = useRef<Konva.Layer>(null);
  const imageRef = useRef<Konva.Image>(null);
  
  const {
    tool,
    scale,
    position,
    isProcessing,
    magicWandThreshold,
    eraserSize,
    cursorPosition,
    setStageRef,
    setLayerRef,
    setCurrentImage,
    setOriginalImageData,
    setCurrentImageData,
    setScale,
    setPosition,
    setCursorPosition,
    setProcessing,
    fitToView
  } = useCanvasStore();
  
  const { removeContiguousColor, applyEraser } = useImageWorker();

  // Initialize store refs
  useEffect(() => {
    setStageRef(stageRef);
    setLayerRef(layerRef);
  }, [setStageRef, setLayerRef]);

  // Update store when props change
  useEffect(() => {
    setCurrentImage(image);
    setOriginalImageData(originalImageData);
    setCurrentImageData(currentImageData);
  }, [image, originalImageData, currentImageData, setCurrentImage, setOriginalImageData, setCurrentImageData]);

  // Fit image to view when first loaded
  useEffect(() => {
    if (image && stageRef.current) {
      fitToView();
    }
  }, [image, fitToView]);

  // Create canvas from current image data
  const imageElement = React.useMemo(() => {
    if (!currentImageData) return null;
    
    const canvas = document.createElement('canvas');
    canvas.width = currentImageData.width;
    canvas.height = currentImageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(currentImageData, 0, 0);
    }
    return canvas;
  }, [currentImageData]);

  // Handle mouse events
  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointerPosition = stage.getPointerPosition();
    if (!pointerPosition) return;
    
    // Convert to image coordinates
    const imagePos = {
      x: (pointerPosition.x - position.x) / scale,
      y: (pointerPosition.y - position.y) / scale
    };
    
    setCursorPosition(imagePos);
  }, [position, scale, setCursorPosition]);

  const handleMouseLeave = useCallback(() => {
    setCursorPosition(null);
  }, [setCursorPosition]);

  const handleClick = useCallback(async (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (!currentImageData || !cursorPosition || isProcessing) return;
    
    const x = Math.round(cursorPosition.x);
    const y = Math.round(cursorPosition.y);
    
    // Check bounds
    if (x < 0 || y < 0 || x >= currentImageData.width || y >= currentImageData.height) {
      return;
    }
    
    setProcessing(true);
    
    try {
      let newImageData: ImageData;
      
      switch (tool) {
        case 'magic-wand':
          newImageData = await removeContiguousColor(currentImageData, x, y, magicWandThreshold);
          break;
          
        case 'eraser':
          newImageData = await applyEraser(currentImageData, x, y, eraserSize);
          break;
          
        default:
          return;
      }
      
      onImageDataChange(newImageData);
      onManualEdit();
      
    } catch (error) {
      console.error('Tool operation failed:', error);
    } finally {
      setProcessing(false);
    }
  }, [
    currentImageData, 
    cursorPosition, 
    isProcessing, 
    tool, 
    magicWandThreshold, 
    eraserSize,
    setProcessing,
    removeContiguousColor,
    applyEraser,
    onImageDataChange,
    onManualEdit
  ]);

  // Handle zoom
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = e.target.getStage();
    if (!stage) return;
    
    const pointer = stage.getPointerPosition();
    if (!pointer) return;
    
    const scaleBy = 1.1;
    const oldScale = scale;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    
    const mousePointTo = {
      x: (pointer.x - position.x) / oldScale,
      y: (pointer.y - position.y) / oldScale,
    };
    
    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };
    
    setScale(newScale);
    setPosition(newPos);
  }, [scale, position, setScale, setPosition]);

  // Handle pan
  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    if (tool === 'pan') {
      setPosition({ x: e.target.x(), y: e.target.y() });
    }
  }, [tool, setPosition]);

  if (!image || !currentImageData) {
    return (
      <Card className={`flex items-center justify-center h-full bg-muted/50 ${className}`}>
        <div className="text-center text-muted-foreground">
          <p>No image loaded</p>
        </div>
      </Card>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <CanvasToolbar />
      
      <div className="relative h-full bg-checker overflow-hidden rounded-lg border">
        <Stage
          ref={stageRef}
          width={800}
          height={600}
          scaleX={scale}
          scaleY={scale}
          x={position.x}
          y={position.y}
          draggable={tool === 'pan'}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          onClick={handleClick}
          onWheel={handleWheel}
          onDragEnd={handleDragEnd}
          style={{ cursor: tool === 'pan' ? 'grab' : 'crosshair' }}
        >
          <Layer ref={layerRef}>
            {imageElement && (
              <KonvaImage
                ref={imageRef}
                image={imageElement}
                width={currentImageData.width}
                height={currentImageData.height}
              />
            )}
          </Layer>
        </Stage>
        
        <CanvasCursor />
        <CanvasOverlay />
        
        {isProcessing && (
          <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Processing...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};