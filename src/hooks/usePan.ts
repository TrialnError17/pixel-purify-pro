import { useState, useCallback, RefObject } from 'react';

export const usePan = (
  canvasRef: RefObject<HTMLCanvasElement>,
  containerRef: RefObject<HTMLDivElement>,
  setIsDragging: (isDragging: boolean) => void
) => {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  const handleMouseDown = useCallback((e: React.MouseEvent | MouseEvent) => {
    setIsDragging(true);
    setLastMousePos({ x: e.clientX, y: e.clientY });
  }, [setIsDragging]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
    if (e.buttons === 1) { // Left mouse button pressed
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, [setIsDragging]);

  return {
    pan,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
};