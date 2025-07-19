import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEraserTool } from '@/hooks/useEraserTool';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useSpeckleTools } from '@/hooks/useSpeckleTools';
import { useUndoManager } from '@/hooks/useUndoManager';
import type { ImageItem } from '@/pages/Index';

interface MainCanvasProps {
  selectedImage: ImageItem | null;
  eraserBrushSize: number;
  isEraserActive: boolean;
  speckleSettings: any;
  zoom: number;
  pan: { x: number; y: number };
  centerOffset: { x: number; y: number };
  onImageUpdate: (updatedImage: ImageItem) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  selectedImage,
  eraserBrushSize,
  isEraserActive,
  speckleSettings,
  zoom,
  pan,
  centerOffset,
  onImageUpdate
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const erasingInProgressRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);

  // Image processing hook
  const { applyPixelation, applyBlur } = useImageProcessor();

  // Speckle tools hook
  const { updateSpeckleObject } = useSpeckleTools();

  // Undo/Redo manager hook
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    registerImageState
  } = useUndoManager();

  // Function to handle image changes and register state
  const handleImageChange = useCallback((imageData: ImageData) => {
    if (canvasRef.current) {
      registerImageState(imageData);
    }
  }, [registerImageState]);

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
      registerImageState(initialImageData); // Register initial state
    };
    img.src = selectedImage.imageUrl;

    return () => {
      img.onload = null; // Clean up event listener
    };
  }, [selectedImage, registerImageState]);

  // Update canvas when selectedImage.pixelated changes
  useEffect(() => {
    if (!selectedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedImage.pixelated) {
      applyPixelation(ctx, canvas.width, canvas.height, 5); // Apply pixelation
    } else {
      // Re-draw the original image if not pixelated
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = selectedImage.imageUrl;
    }
  }, [selectedImage, applyPixelation]);

  // Update canvas when selectedImage.blurred changes
  useEffect(() => {
    if (!selectedImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (selectedImage.blurred) {
      applyBlur(ctx, canvas.width, canvas.height, 3); // Apply blur
    } else {
      // Re-draw the original image if not blurred
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
      };
      img.src = selectedImage.imageUrl;
    }
  }, [selectedImage, applyBlur]);

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
      eraserTool.startErasing(e);
      setIsDragging(true);
    }
  };

  // Mouse move event handler
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEraserActive && isDragging && eraserTool) {
      eraserTool.continueErasing(e);
    }
  };

  // Mouse up event handler
  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.stopErasing(e);
      setIsDragging(false);
    }
  };

  // Touch start event handler
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.startErasing(e);
      setIsDragging(true);
    }
  };

  // Touch move event handler
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && isDragging && eraserTool) {
      eraserTool.continueErasing(e);
    }
  };

  // Touch end event handler
  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (isEraserActive && eraserTool) {
      eraserTool.stopErasing(e);
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
