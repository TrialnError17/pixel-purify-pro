import { useRef, useCallback, useEffect } from 'react';

export interface EraserToolOptions {
  brushSize: number;
  zoom?: number;
  pan?: { x: number; y: number };
  centerOffset?: { x: number; y: number };
  onImageChange?: (imageData: ImageData) => void;
}

export const useEraserTool = (canvas: HTMLCanvasElement | null, options: EraserToolOptions) => {
  const isErasingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Save brush size to localStorage
  const saveBrushSize = useCallback((size: number) => {
    try {
      localStorage.setItem('eraserBrushSize', size.toString());
    } catch (error) {
      console.warn('Failed to save eraser brush size:', error);
    }
  }, []);

  // Load brush size from localStorage
  const loadBrushSize = useCallback((): number => {
    try {
      const saved = localStorage.getItem('eraserBrushSize');
      if (saved) {
        const size = parseInt(saved, 10);
        return !isNaN(size) && size >= 1 && size <= 50 ? size : 10;
      }
    } catch (error) {
      console.warn('Failed to load eraser brush size:', error);
    }
    return 10;
  }, []);

  // Get canvas coordinates from mouse/touch event
  const getCanvasCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas) return null;
    
    const rect = canvas.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
    
    // Get raw coordinates relative to canvas element
    const rawX = clientX - rect.left;
    const rawY = clientY - rect.top;
    
    // Account for transformations (zoom, pan, centerOffset)
    const zoom = options.zoom || 1;
    const pan = options.pan || { x: 0, y: 0 };
    const centerOffset = options.centerOffset || { x: 0, y: 0 };
    
    // Transform coordinates back to image space
    const canvasX = (rawX - centerOffset.x - pan.x) / zoom;
    const canvasY = (rawY - centerOffset.y - pan.y) / zoom;
    
    return {
      x: canvasX,
      y: canvasY
    };
  }, [canvas, options.zoom, options.pan, options.centerOffset]);

  // Start erasing
  const startErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas) return;
    
    const coords = getCanvasCoords(e);
    if (!coords) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    isErasingRef.current = true;
    lastPosRef.current = coords;
    
    // Set up erasing mode
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = options.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    // Draw a single point for initial click
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, options.brushSize / 2, 0, Math.PI * 2);
    ctx.fill();
    
    e.preventDefault();
  }, [canvas, options.brushSize, getCanvasCoords]);

  // Continue erasing (drag)
  const continueErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !isErasingRef.current) return;
    
    const coords = getCanvasCoords(e);
    if (!coords || !lastPosRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Smooth line drawing between points
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineWidth = options.brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(lastPosRef.current.x, lastPosRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastPosRef.current = coords;
    e.preventDefault();
  }, [canvas, options.brushSize, getCanvasCoords]);

  // Stop erasing
  const stopErasing = useCallback((e?: MouseEvent | TouchEvent) => {
    if (!isErasingRef.current) return;
    
    isErasingRef.current = false;
    lastPosRef.current = null;
    
    // Restore normal drawing mode and trigger image change callback
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.globalCompositeOperation = 'source-over';
        
        // Notify about image change for undo stack
        if (options.onImageChange) {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          options.onImageChange(imageData);
        }
      }
    }
    
    if (e) e.preventDefault();
  }, [canvas, options.onImageChange]);

  // Get brush cursor style
  const getBrushCursor = useCallback(() => {
    const size = Math.max(8, Math.min(options.brushSize, 32)); // Clamp cursor size
    const radius = size / 2;
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="none" stroke="red" stroke-width="1"/>
        <circle cx="${radius}" cy="${radius}" r="1" fill="red"/>
      </svg>
    `;
    const encodedSvg = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encodedSvg}") ${radius} ${radius}, crosshair`;
  }, [options.brushSize]);

  return {
    startErasing,
    continueErasing,
    stopErasing,
    getBrushCursor,
    saveBrushSize,
    loadBrushSize,
    isErasing: isErasingRef.current
  };
};