import { useCallback, RefObject } from 'react';

export const useImageTransform = (
  canvasRef: RefObject<HTMLCanvasElement>,
  currentImage: HTMLImageElement | null,
  zoom: number,
  centerOffset: { x: number; y: number },
  pan: { x: number; y: number }
) => {
  const applyImageTransform = useCallback(() => {
    if (!canvasRef.current || !currentImage) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    
    // Draw image
    ctx.drawImage(currentImage, 0, 0);
  }, [canvasRef, currentImage, zoom, centerOffset, pan]);

  return {
    applyImageTransform
  };
};