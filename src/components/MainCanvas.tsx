import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useEraserTool } from '../hooks/useEraserTool';
import { cn } from '../lib/utils';

interface MainCanvasProps {
  image: any;
  tool: 'pan' | 'eraser' | 'color-stack' | 'magic-wand';
  onToolChange: (tool: 'pan' | 'eraser' | 'color-stack' | 'magic-wand') => void;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
  erasingInProgressRef: any;
  onImageUpdate: (image: any) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: (progress: any) => void;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: any) => void;
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
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize: eraserSettings?.brushSize || 10,
    zoom: 1,
    pan: { x: 0, y: 0 },
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: (imageData) => {
      if (onImageUpdate && image) {
        // Create updated image with new image data
        const updatedImage = { ...image, processedData: imageData };
        onImageUpdate(updatedImage);
      }
    }
  });

  // Update cursor position for both cursors
  const updateCursorPosition = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0]?.clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0]?.clientY : e.clientY;
    
    if (clientX === undefined || clientY === undefined) return;

    // Store mouse position relative to viewport for cursor positioning
    setMousePosition({ x: clientX, y: clientY });

    // Position both cursors if eraser tool is active
    if (tool === 'eraser') {
      const cursor = document.getElementById("eraser-cursor");
      const outerCursor = document.getElementById("eraser-outer-cursor");
      
      // Calculate cursor size - start with brushSize and iteratively adjust
      const brushSize = eraserSettings?.brushSize || 10;
      const cursorSize = Math.max(4, brushSize * 2); // Initial attempt: double brush size to match ~20px erase area
      
      if (cursor) {
        cursor.style.width = `${cursorSize}px`;
        cursor.style.height = `${cursorSize}px`;
        cursor.style.left = `${clientX - cursorSize/2}px`;
        cursor.style.top = `${clientY - cursorSize/2}px`;
        cursor.style.display = 'block';
      }
      
      if (outerCursor) {
        outerCursor.style.width = `${cursorSize}px`;
        outerCursor.style.height = `${cursorSize}px`;
        outerCursor.style.left = `${clientX - cursorSize/2}px`;
        outerCursor.style.top = `${clientY - cursorSize/2}px`;
        outerCursor.style.display = 'block';
      }
      
      // Console logging for debugging cursor size alignment
      console.log('Cursor positioning:', {
        clientX,
        clientY,
        cursorSize,
        brushSize,
        eraserRadius: Math.floor(brushSize / 2),
        expectedEraseArea: Math.PI * Math.pow(Math.floor(brushSize / 2), 2)
      });
    }
  }, [tool, eraserSettings]);

  // Load and display image on canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Set canvas size to match image
      canvas.width = img.width;
      canvas.height = img.height;

      // Clear canvas and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Reset manual edits when new image is loaded
      hasManualEditsRef.current = false;
      manualImageDataRef.current = null;

      // Calculate center offset to center the image in the container
      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newCenterOffset = {
          x: (containerRect.width - img.width) / 2,
          y: (containerRect.height - img.height) / 2
        };
        setCenterOffset(newCenterOffset);
      }
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', error);
    };

    img.src = image;
  }, [image]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    updateCursorPosition(e);
  }, [updateCursorPosition]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      eraserTool.startErasing(e as any);
    }
  }, [tool, eraserTool]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      eraserTool.stopErasing(e as any);
    }
  }, [tool, eraserTool]);

  const handleMouseEnter = useCallback(() => {
    setIsMouseOver(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsMouseOver(false);
    // Hide cursors when mouse leaves canvas
    const cursor = document.getElementById("eraser-cursor");
    const outerCursor = document.getElementById("eraser-outer-cursor");
    if (cursor) cursor.style.display = 'none';
    if (outerCursor) outerCursor.style.display = 'none';
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    updateCursorPosition(e);
  }, [updateCursorPosition]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Handle tool interactions here
  }, [tool]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    // Handle tool interactions here
  }, [tool]);

  return (
    <div 
      ref={containerRef}
      className={cn(
        "relative w-full h-full bg-background overflow-hidden",
        tool !== 'eraser' && "cursor-crosshair"
      )}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onTouchMove={handleTouchMove}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {!image && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-muted/50">
            <p className="text-lg font-medium text-foreground mb-2">
              Drag and drop an image here
            </p>
            <p className="text-sm text-muted-foreground">
              or select one from the queue
            </p>
          </div>
        </div>
      )}
      
      <canvas
        ref={canvasRef}
        className="absolute"
        style={{
          transform: `translate(${centerOffset.x}px, ${centerOffset.y}px) scale(1)`,
          transformOrigin: 'top left',
        }}
      />

      {/* Original eraser cursor - keep for compatibility */}
      <div
        id="eraser-cursor"
        className="absolute pointer-events-none z-10"
        style={{
          display: tool === 'eraser' && isMouseOver ? 'block' : 'none',
          border: '1px solid rgba(255, 0, 0, 0.5)',
          borderRadius: '50%',
          backgroundColor: 'transparent',
        }}
      />

      {/* New outer cursor to match actual erasing area */}
      <div
        id="eraser-outer-cursor"
        className="absolute pointer-events-none z-10"
        style={{
          display: tool === 'eraser' && isMouseOver ? 'block' : 'none',
          border: '2px solid rgba(255, 0, 0, 0.8)',
          borderRadius: '50%',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
};
