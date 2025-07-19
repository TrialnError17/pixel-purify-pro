import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEraserTool } from '@/hooks/useEraserTool';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useSpeckleTools } from '@/hooks/useSpeckleTools';
import { useUndoManager } from '@/hooks/useUndoManager';
import type { ImageItem } from '@/pages/Index';

interface MainCanvasProps {
  image: ImageItem | null;
  tool: 'eraser' | 'pan' | 'color-stack' | 'magic-wand';
  onToolChange: React.Dispatch<React.SetStateAction<'eraser' | 'pan' | 'color-stack' | 'magic-wand'>>;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageUpdate: (updatedImage: ImageItem) => void;
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
  onSpeckCountUpdate: (count: number) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image: selectedImage,
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Image processing hook
  const imageProcessor = useImageProcessor();

  // Speckle tools hook
  const speckleTools = useSpeckleTools();

  // Undo/Redo manager hook
  const undoManager = useUndoManager();

  // Function to handle image changes and register state
  const handleImageChange = useCallback((imageData: ImageData) => {
    if (canvasRef.current) {
      undoManager.addUndoAction({
        type: 'canvas_edit',
        description: 'Eraser tool',
        undo: () => {
          // This would need to restore previous state
          console.log('Undo not implemented yet');
        }
      });
    }
  }, [undoManager]);

  // For now, provide default values for missing props
  const zoom = 1;
  const pan = { x: 0, y: 0 };
  const centerOffset = { x: 0, y: 0 };
  const isEraserActive = tool === 'eraser';
  const eraserBrushSize = eraserSettings?.brushSize || 15;
  
  // Eraser tool setup
  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize: eraserBrushSize,
    zoom,
    pan,
    centerOffset,
    containerRef: containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: handleImageChange
  });

  // Load image onto canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !selectedImage) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      // Initialize manual image data with the original image
      const initialImageData = ctx.getImageData(0, 0, img.width, img.height);
      manualImageDataRef.current = initialImageData;
    };
    
    // Create image URL from File object
    const imageUrl = URL.createObjectURL(selectedImage.file);
    img.src = imageUrl;

    return () => {
      img.onload = null; // Clean up event listener
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [selectedImage]);

  // Remove the pixelated and blurred effects handling for now
  // as these properties don't exist on ImageItem

  // Handle cursor updates with zoom-responsive eraser cursor
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) return;
    
    if (isEraserActive) {
      // Pass zoom to getBrushCursor for zoom-responsive sizing
      container.style.cursor = eraserTool.getBrushCursor(zoom);
    } else {
      container.style.cursor = 'default';
    }
    
    return () => {
      container.style.cursor = 'default';
    };
  }, [isEraserActive, eraserBrushSize, zoom, eraserTool]);

  // Mouse down event handler
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.startErasing(e.nativeEvent);
      setIsDragging(true);
    }
  };

  // Mouse move event handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEraserActive && isDragging && eraserTool) {
      eraserTool.continueErasing(e.nativeEvent);
    }
  };

  // Mouse up event handler
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.stopErasing(e.nativeEvent);
      setIsDragging(false);
    }
  };

  // Touch start event handler
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.startErasing(e.nativeEvent);
      setIsDragging(true);
    }
  };

  // Touch move event handler
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && isDragging && eraserTool) {
      eraserTool.continueErasing(e.nativeEvent);
    }
  };

  // Touch end event handler
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.stopErasing(e.nativeEvent);
      setIsDragging(false);
    }
  };

  return (
    <div 
      ref={containerRef}
      className="flex-1 bg-background border-2 border-dashed border-border rounded-lg overflow-hidden relative"
      style={{ 
        cursor: isEraserActive ? eraserTool.getBrushCursor(zoom) : 'default'
      }}
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
        className="absolute top-0 left-0"
      />
    </div>
  );
};
