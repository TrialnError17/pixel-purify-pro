import { useRef, useCallback, useEffect } from 'react';

export interface EraserToolOptions {
  brushSize: number;
  zoom: number;
  pan: { x: number; y: number };
  centerOffset: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  manualImageDataRef: React.MutableRefObject<ImageData | null>;
  hasManualEditsRef: React.MutableRefObject<boolean>;
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

  // Get canvas coordinates from mouse/touch event using container reference
  const getCanvasCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !options.containerRef.current) return null;
    
    const containerRect = options.containerRef.current.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) return null;
    
    // Get coordinates relative to container
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;
    
    // Transform to image data coordinates (same as magic wand tool)
    const dataX = Math.floor((mouseX - options.centerOffset.x - options.pan.x) / options.zoom);
    const dataY = Math.floor((mouseY - options.centerOffset.y - options.pan.y) / options.zoom);
    
    // Clamp to image bounds
    const imageData = options.manualImageDataRef.current;
    if (imageData) {
      const clampedX = Math.max(0, Math.min(dataX, imageData.width - 1));
      const clampedY = Math.max(0, Math.min(dataY, imageData.height - 1));
      return { x: clampedX, y: clampedY };
    }
    
    return { x: dataX, y: dataY };
  }, [canvas, options.containerRef, options.centerOffset, options.pan, options.zoom, options.manualImageDataRef]);

  // Erase pixels in a circle around the given point
  const erasePixels = useCallback((imageData: ImageData, centerX: number, centerY: number, radius: number) => {
    const { data, width, height } = imageData;
    const radiusSquared = radius * radius;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= radiusSquared) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = (y * width + x) * 4;
            data[index + 3] = 0; // Set alpha to 0 (transparent)
          }
        }
      }
    }
  }, []);

  // Start erasing
  const startErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !options.manualImageDataRef.current) return;
    
    const coords = getCanvasCoords(e);
    if (!coords) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    isErasingRef.current = true;
    lastPosRef.current = coords;
    options.hasManualEditsRef.current = true;
    
    // Erase pixels in the manual image data
    const radius = Math.floor(options.brushSize / 2);
    erasePixels(options.manualImageDataRef.current, coords.x, coords.y, radius);
    
    // Update canvas display
    ctx.putImageData(options.manualImageDataRef.current, 0, 0);
    
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, options.hasManualEditsRef, getCanvasCoords, erasePixels]);

  // Continue erasing (drag) - use Bresenham's line algorithm for smooth strokes
  const continueErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !isErasingRef.current || !options.manualImageDataRef.current) return;
    
    const coords = getCanvasCoords(e);
    if (!coords || !lastPosRef.current) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Draw line between last position and current position using Bresenham's algorithm
    const x0 = lastPosRef.current.x;
    const y0 = lastPosRef.current.y;
    const x1 = coords.x;
    const y1 = coords.y;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    const radius = Math.floor(options.brushSize / 2);
    
    while (true) {
      // Erase pixels at current point
      erasePixels(options.manualImageDataRef.current, x, y, radius);
      
      if (x === x1 && y === y1) break;
      
      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x += sx;
      }
      if (e2 < dx) {
        err += dx;
        y += sy;
      }
    }
    
    // Update canvas display
    ctx.putImageData(options.manualImageDataRef.current, 0, 0);
    
    lastPosRef.current = coords;
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, getCanvasCoords, erasePixels]);

  // Stop erasing
  const stopErasing = useCallback((e?: MouseEvent | TouchEvent) => {
    if (!isErasingRef.current) return;
    
    isErasingRef.current = false;
    lastPosRef.current = null;
    
    // Trigger image change callback for undo/redo system
    if (options.onImageChange && options.manualImageDataRef.current) {
      options.onImageChange(options.manualImageDataRef.current);
    }
    
    if (e) e.preventDefault();
  }, [options.onImageChange, options.manualImageDataRef]);

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