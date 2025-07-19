import React, { useRef, useState, useEffect, useCallback } from 'react';
import { usePan } from '@/hooks/usePan';
import { useZoom } from '@/hooks/useZoom';
import { useImageTransform } from '@/hooks/useImageTransform';
import { useDebounce } from '@/hooks/useDebounce';
import { useTouchEvents } from '@/hooks/useTouchEvents';
import { useColorPicker } from '@/hooks/useColorPicker';
import { useMagicWand } from '@/hooks/useMagicWand';
import { useEraserTool } from '@/hooks/useEraserTool';
import { cn } from '@/lib/utils';

interface MainCanvasProps {
  currentImage: HTMLImageElement | null;
  tool: 'pan' | 'brush' | 'color-picker' | 'magic-wand' | 'eraser' | null;
  brushSize: number;
  onImageChange: (imageData: ImageData) => void;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ currentImage, tool, brushSize, onImageChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
	const erasingInProgressRef = useRef(false);

  // Pan Hook
  const { pan, handleMouseDown: handlePanMouseDown, handleMouseMove: handlePanMouseMove, handleMouseUp: handlePanMouseUp } = usePan(canvasRef, containerRef, setIsDragging);
  
  // Zoom Hook
  const { zoom, centerOffset } = useZoom(currentImage, containerRef);

  // Image Transform Hook
  const { applyImageTransform } = useImageTransform(canvasRef, currentImage, zoom, centerOffset, pan);

  // Touch Events Hook
  const { handleTouchStart, handleTouchMove, handleTouchEnd } = useTouchEvents(
    tool === 'pan' ? handlePanMouseDown : () => {},
    tool === 'pan' ? handlePanMouseMove : () => {},
    tool === 'pan' ? handlePanMouseUp : () => {}
  );

  // Color Picker Hook
  const { handleColorSelection } = useColorPicker(canvasRef, currentImage);

  // Magic Wand Hook
  const { handleMagicWandSelection } = useMagicWand(canvasRef, currentImage, setManualImageData, manualImageDataRef);

  // Eraser Hook
  const { startErasing, continueErasing, stopErasing, getBrushCursor, saveBrushSize, loadBrushSize, isErasing } = useEraserTool(canvasRef.current, {
    brushSize: brushSize,
    zoom: zoom,
    pan: pan,
    centerOffset: centerOffset,
    containerRef: containerRef,
    manualImageDataRef: manualImageDataRef,
		hasManualEditsRef: hasManualEditsRef,
		erasingInProgressRef: erasingInProgressRef,
    onImageChange: onImageChange
  });

  // Load initial brush size from localStorage
  useEffect(() => {
    const initialBrushSize = loadBrushSize();
  }, [loadBrushSize]);

  // Debounced effect to apply image transform
  const debouncedApplyImageTransform = useDebounce(applyImageTransform, 100);

  useEffect(() => {
    if (currentImage) {
      debouncedApplyImageTransform();
    }
  }, [currentImage, zoom, centerOffset, pan, debouncedApplyImageTransform]);

  // Update manual image data on canvas
  useEffect(() => {
    if (canvasRef.current && manualImageData) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.putImageData(manualImageData, 0, 0);
      }
    }
  }, [manualImageData]);

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    if (tool === 'pan') {
      handlePanMouseDown(e);
    } else if (tool === 'color-picker' && currentImage) {
      handleColorSelection(e);
    } else if (tool === 'magic-wand' && currentImage) {
      handleMagicWandSelection(e);
    } else if (tool === 'eraser') {
      startErasing(e);
    }
  }, [tool, currentImage, handlePanMouseDown, handleColorSelection, handleMagicWandSelection, startErasing]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    if (tool === 'pan') {
      handlePanMouseMove(e);
    } else if (tool === 'eraser' && erasingInProgressRef.current) {
      continueErasing(e);
    }
  }, [tool, handlePanMouseMove, continueErasing]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;

    if (tool === 'pan') {
      handlePanMouseUp(e);
    } else if (tool === 'eraser') {
      stopErasing(e);
    }
  }, [tool, handlePanMouseUp, stopErasing]);

  const handleMouseLeave = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      handlePanMouseUp(e);
    } else if (tool === 'eraser') {
      stopErasing(e);
    }
  }, [tool, handlePanMouseUp, stopErasing]);

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-neutral-100"
      ref={containerRef}
    >
      {currentImage && (
          <canvas
            ref={canvasRef}
            width={currentImage?.width || 800}
            height={currentImage?.height || 600}
            className={cn(
              "absolute",
              tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
              tool === 'color-stack' && 'cursor-crosshair',
              tool === 'magic-wand' && 'cursor-crosshair',
              tool !== 'eraser' && tool !== 'pan' && tool !== 'color-stack' && tool !== 'magic-wand' && 'cursor-crosshair'
            )}
            style={{
              transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
              transformOrigin: '0 0',
              ...(tool === 'eraser' && { cursor: getBrushCursor() })
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          />
      )}
    </div>
  );
};

export default MainCanvas;
