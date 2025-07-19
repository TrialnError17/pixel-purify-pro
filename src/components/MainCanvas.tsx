import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { useEraserTool } from '../hooks/useEraserTool';
import { useSpeckleTools } from '../hooks/useSpeckleTools';
import { cn } from '../lib/utils';

interface MainCanvasProps {
  selectedImage: string | null;
  tool: 'pan' | 'eraser' | 'color-stack' | 'magic-wand';
  brushSize: number;
  onBrushSizeChange: (size: number) => void;
  zoom: number;
  pan: { x: number; y: number };
  onZoomChange: (zoom: number) => void;
  onPanChange: (pan: { x: number; y: number }) => void;
  onImageChange?: (imageData: ImageData) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  selectedImage,
  tool,
  brushSize,
  onBrushSizeChange,
  zoom,
  pan,
  onZoomChange,
  onPanChange,
  onImageChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const erasingInProgressRef = useRef(false);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isMouseOver, setIsMouseOver] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  const { processedImageUrl, isProcessing, processImage } = useImageProcessor();

  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange
  });

  const speckleTools = useSpeckleTools(canvasRef.current, {
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    onImageChange
  });

  // Update cursor position for both cursors
  const updateCursorPosition = useCallback((e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) return;

    // Store mouse position relative to viewport for cursor positioning
    setMousePosition({ x: clientX, y: clientY });

    // Position both cursors if eraser tool is active
    if (tool === 'eraser') {
      const cursor = document.getElementById("eraser-cursor");
      const outerCursor = document.getElementById("eraser-outer-cursor");
      
      // Calculate cursor size - start with brushSize and iteratively adjust
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
  }, [tool, brushSize]);

  // Load and display image on canvas
  useEffect(() => {
    if (!selectedImage || !canvasRef.current) return;

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
          x: (containerRect.width - img.width * zoom) / 2,
          y: (containerRect.height - img.height * zoom) / 2
        };
        setCenterOffset(newCenterOffset);
      }
    };

    img.onerror = (error) => {
      console.error('Failed to load image:', error);
    };

    img.src = selectedImage;
  }, [selectedImage, zoom]);

  // Update center offset when zoom changes
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const containerRect = containerRef.current.getBoundingClientRect();
    
    const newCenterOffset = {
      x: (containerRect.width - canvas.width * zoom) / 2,
      y: (containerRect.height - canvas.height * zoom) / 2
    };
    setCenterOffset(newCenterOffset);
  }, [zoom]);

  // Handle mouse events
  const handleMouseMove = useCallback((e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return;
    
    // Update cursor position with throttling
    requestAnimationFrame(() => updateCursorPosition(e));
    
    // Continue with existing tool logic
    if (tool === 'eraser') {
      eraserTool.continueErasing(e);
    } else if (tool === 'magic-wand') {
      speckleTools.continueRemoving(e);
    }
  }, [tool, eraserTool, speckleTools, updateCursorPosition]);

  const handleMouseDown = useCallback((e: MouseEvent | TouchEvent) => {
    if (tool === 'eraser') {
      eraserTool.startErasing(e);
    } else if (tool === 'magic-wand') {
      speckleTools.startRemoving(e);
    }
  }, [tool, eraserTool, speckleTools]);

  const handleMouseUp = useCallback((e: MouseEvent | TouchEvent) => {
    if (tool === 'eraser') {
      eraserTool.stopErasing(e);
    } else if (tool === 'magic-wand') {
      speckleTools.stopRemoving(e);
    }
  }, [tool, eraserTool, speckleTools]);

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

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Mouse events
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mousedown', handleMouseDown);
    container.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('mouseenter', handleMouseEnter);
    container.addEventListener('mouseleave', handleMouseLeave);

    // Touch events
    container.addEventListener('touchmove', handleMouseMove);
    container.addEventListener('touchstart', handleMouseDown);
    container.addEventListener('touchend', handleMouseUp);

    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mousedown', handleMouseDown);
      container.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('mouseenter', handleMouseEnter);
      container.removeEventListener('mouseleave', handleMouseLeave);
      container.removeEventListener('touchmove', handleMouseMove);
      container.removeEventListener('touchstart', handleMouseDown);
      container.removeEventListener('touchend', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseDown, handleMouseUp, handleMouseEnter, handleMouseLeave]);

  // Process image when requested
  useEffect(() => {
    if (!selectedImage || !canvasRef.current || !hasManualEditsRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Process the image
    processImage(imageData);
  }, [selectedImage, processImage]);

  // Load brush size from localStorage on mount
  useEffect(() => {
    const savedBrushSize = eraserTool.loadBrushSize();
    if (savedBrushSize !== brushSize) {
      onBrushSizeChange(savedBrushSize);
    }
  }, [eraserTool, brushSize, onBrushSizeChange]);

  // Save brush size to localStorage when it changes
  useEffect(() => {
    eraserTool.saveBrushSize(brushSize);
  }, [eraserTool, brushSize]);

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
      onTouchMove={handleMouseMove}
      onTouchStart={handleMouseDown}
      onTouchEnd={handleMouseUp}
    >
      {!selectedImage && (
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
          transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
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
