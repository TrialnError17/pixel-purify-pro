import React, { useRef, useEffect, useState } from 'react';

interface ImageItem {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  originalData?: ImageData;
  processedData?: ImageData;
  canvas?: HTMLCanvasElement;
  error?: string;
}

interface MainCanvasProps {
  image: ImageItem | null;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
  erasingInProgressRef: React.RefObject<boolean>;
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

export const MainCanvas: React.FC<MainCanvasProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastPosition, setLastPosition] = useState<{ x: number; y: number } | null>(null);

  // Set up canvas when image changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    console.log('Setting up canvas with new image data');
    
    // If we have original data, use it to set up the canvas
    if (image.originalData) {
      canvas.width = image.originalData.width;
      canvas.height = image.originalData.height;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.putImageData(image.originalData, 0, 0);
      }
    } else {
      // If no original data, try to load from file
      const img = new Image();
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          
          // Store original data
          const imageData = ctx.getImageData(0, 0, img.width, img.height);
          const updatedImage = { ...image, originalData: imageData };
          onImageUpdate(updatedImage);
        }
      };
      img.src = URL.createObjectURL(image.file);
    }
  }, [image, onImageUpdate]);

  // Get canvas coordinates from mouse event
  const getCanvasCoordinates = (e: MouseEvent | React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  // Handle eraser tool
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool !== 'eraser') return;
    
    setIsDrawing(true);
    if (erasingInProgressRef.current !== null) {
      // Use a direct assignment through the ref object
      (erasingInProgressRef as any).current = true;
    }
    
    const coords = getCanvasCoordinates(e);
    if (coords) {
      setLastPosition(coords);
      erase(coords.x, coords.y);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing || tool !== 'eraser') return;
    
    const coords = getCanvasCoordinates(e);
    if (coords && lastPosition) {
      // Draw line from last position to current position
      eraseLine(lastPosition.x, lastPosition.y, coords.x, coords.y);
      setLastPosition(coords);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && tool === 'eraser') {
      setIsDrawing(false);
      setLastPosition(null);
      
      if (erasingInProgressRef.current !== null) {
        // Use a direct assignment through the ref object
        (erasingInProgressRef as any).current = false;
      }
      
      // Commit eraser changes to image data
      const canvas = canvasRef.current;
      if (canvas && image) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const updatedImage = { 
            ...image, 
            originalData: newImageData, // Update the original data with erased pixels
            processedData: newImageData // Also update processed data
          };
          onImageUpdate(updatedImage);
        }
      }
    }
  };

  // Erase at a single point
  const erase = (x: number, y: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const brushSize = eraserSettings?.brushSize || 10;
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // Erase along a line
  const eraseLine = (x1: number, y1: number, x2: number, y2: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const brushSize = eraserSettings?.brushSize || 10;
    
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
  };

  return (
    <div className="flex-1 flex items-center justify-center bg-background">
      <canvas
        ref={canvasRef}
        className="max-w-full max-h-full border border-border"
        style={{
          cursor: tool === 'eraser' ? 'crosshair' : 'default',
          touchAction: tool === 'eraser' ? 'none' : 'auto'
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};