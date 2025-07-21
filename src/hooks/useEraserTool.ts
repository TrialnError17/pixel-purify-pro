
import { useRef, useCallback, useEffect } from 'react';

export interface EraserToolOptions {
  brushSize: number;
  zoom: number;
  pan: { x: number; y: number };
  centerOffset: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  manualImageDataRef: React.MutableRefObject<ImageData | null>;
  hasManualEditsRef: React.MutableRefObject<boolean>;
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageChange?: (imageData: ImageData) => void;
}

export const useEraserTool = (canvas: HTMLCanvasElement | null, options: EraserToolOptions) => {
  const isErasingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);

  // Save brush size to localStorage
  const saveBrushSize = useCallback((size: number) => {
    try {
      if (size >= 1 && size <= 50) {
        localStorage.setItem('eraserBrushSize', size.toString());
      }
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
    if (!canvas || !options.containerRef.current) {
      console.log('getCanvasCoords: Missing canvas or containerRef');
      return null;
    }
    
    const containerRect = options.containerRef.current.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) {
      console.log('getCanvasCoords: Missing clientX or clientY');
      return null;
    }
    
    // Get coordinates relative to container
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;
    
    // Transform to image data coordinates
    const dataX = Math.floor((mouseX - options.centerOffset.x - options.pan.x) / Math.max(options.zoom, 0.01));
    const dataY = Math.floor((mouseY - options.centerOffset.y - options.pan.y) / Math.max(options.zoom, 0.01));
    
    console.log('Coordinate transform:', {
      screenX: clientX,
      screenY: clientY,
      containerLeft: containerRect.left,
      containerTop: containerRect.top,
      mouseX,
      mouseY,
      centerOffset: options.centerOffset,
      pan: options.pan,
      zoom: options.zoom,
      dataX,
      dataY
    });
    
    // Clamp to image bounds if we have image data
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
    let pixelsModified = 0;
    
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distanceSquared = dx * dx + dy * dy;
        if (distanceSquared <= radiusSquared) {
          const x = centerX + dx;
          const y = centerY + dy;
          
          if (x >= 0 && x < width && y >= 0 && y < height) {
            const index = (y * width + x) * 4;
            if (data[index + 3] > 0) { // Only count if pixel was not already transparent
              data[index + 3] = 0; // Set alpha to 0 (transparent)
              pixelsModified++;
            }
          }
        }
      }
    }
    
    console.log(`Erased ${pixelsModified} pixels at (${centerX}, ${centerY}) with radius ${radius}`);
  }, []);

  // Start erasing
  const startErasing = useCallback((e: MouseEvent | TouchEvent) => {
    console.log('startErasing called');
    
    // Reset erasing progress flag to prevent race conditions
    options.erasingInProgressRef.current = false;
    
    if (!canvas || !options.containerRef.current) {
      console.log('startErasing: Missing canvas or containerRef');
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log('startErasing: Could not get canvas context');
      return;
    }
    
    // Initialize manualImageDataRef if it's null
    if (!options.manualImageDataRef.current) {
      console.log('Initializing manualImageDataRef with canvas data');
      try {
        options.manualImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
        console.log('Initialized manualImageData:', {
          width: options.manualImageDataRef.current.width,
          height: options.manualImageDataRef.current.height
        });
      } catch (error) {
        console.error('Failed to initialize manualImageDataRef:', error);
        return;
      }
    }
    
    const coords = getCanvasCoords(e);
    if (!coords) {
      console.log('startErasing: Could not get coordinates');
      return;
    }
    
    console.log('Starting erase at coordinates:', coords);
    
    // Set erasing state
    isErasingRef.current = true;
    lastPosRef.current = coords;
    options.hasManualEditsRef.current = true;
    options.erasingInProgressRef.current = true;
    
    // Erase pixels in the manual image data
    const radius = Math.floor(options.brushSize / 2);
    erasePixels(options.manualImageDataRef.current, coords.x, coords.y, radius);
    
    // Update canvas display
    try {
      ctx.putImageData(options.manualImageDataRef.current, 0, 0);
      console.log('Canvas updated after start erasing');
    } catch (error) {
      console.error('Failed to update canvas after start erasing:', error);
    }
    
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, options.hasManualEditsRef, options.erasingInProgressRef, options.containerRef, getCanvasCoords, erasePixels]);

  // Continue erasing (drag) - use Bresenham's line algorithm for smooth strokes
  const continueErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !isErasingRef.current || !options.manualImageDataRef.current) {
      return;
    }
    
    const coords = getCanvasCoords(e);
    if (!coords || !lastPosRef.current) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
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
    try {
      ctx.putImageData(options.manualImageDataRef.current, 0, 0);
    } catch (error) {
      console.error('Failed to update canvas during continue erasing:', error);
    }
    
    lastPosRef.current = coords;
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, getCanvasCoords, erasePixels]);

  // Stop erasing
  const stopErasing = useCallback((e?: MouseEvent | TouchEvent) => {
    console.log('stopErasing called, isErasing:', isErasingRef.current);
    
    if (!isErasingRef.current) {
      // Always reset the progress flag even if we weren't erasing
      options.erasingInProgressRef.current = false;
      return;
    }
    
    isErasingRef.current = false;
    lastPosRef.current = null;
    options.erasingInProgressRef.current = false;
    
    // Trigger image change callback for undo/redo system and persistence
    if (options.onImageChange && options.manualImageDataRef.current) {
      console.log('Calling onImageChange with updated image data');
      options.onImageChange(options.manualImageDataRef.current);
    }
    
    if (e) e.preventDefault();
  }, [options.onImageChange, options.manualImageDataRef, options.erasingInProgressRef]);

  // Get brush cursor style - adjust size based on zoom to show true pixel area
  const getBrushCursor = useCallback(() => {
    // Calculate the display size: eraser size in image pixels multiplied by zoom
    const displaySize = options.brushSize * Math.max(options.zoom, 0.01);
    const clampedSize = Math.max(8, Math.min(displaySize, 64)); // Clamp for usability
    const radius = clampedSize / 2;
    const svg = `
      <svg width="${clampedSize}" height="${clampedSize}" viewBox="0 0 ${clampedSize} ${clampedSize}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${radius}" cy="${radius}" r="${radius - 1}" fill="none" stroke="red" stroke-width="1"/>
        <circle cx="${radius}" cy="${radius}" r="1" fill="red"/>
      </svg>
    `;
    const encodedSvg = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encodedSvg}") ${radius} ${radius}, crosshair`;
  }, [options.brushSize, options.zoom]);

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
