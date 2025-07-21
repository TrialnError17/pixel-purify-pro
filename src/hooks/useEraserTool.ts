
import { useRef, useCallback, useEffect } from 'react';
import { throttle } from '@/utils/performance';

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
  const directionRef = useRef<"none" | "vertical" | "horizontal">("none");
  const pendingUpdateRef = useRef<boolean>(false);

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

  // OPTIMIZED: Throttled canvas update function at 60 FPS (16ms)
  const updateCanvasDisplay = useCallback(
    throttle(() => {
      if (!canvas || !options.manualImageDataRef.current) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      try {
        ctx.putImageData(options.manualImageDataRef.current, 0, 0);
        pendingUpdateRef.current = false;
      } catch (error) {
        console.error('Failed to update canvas display:', error);
      }
    }, 16), // 60 FPS
    [canvas, options.manualImageDataRef]
  );

  // Get canvas coordinates from mouse/touch event using container reference
  const getCanvasCoords = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !options.containerRef.current) {
      return null;
    }
    
    const containerRect = options.containerRef.current.getBoundingClientRect();
    const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0]?.clientX;
    const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
    
    if (clientX === undefined || clientY === undefined) {
      return null;
    }
    
    // Get coordinates relative to container
    const mouseX = clientX - containerRect.left;
    const mouseY = clientY - containerRect.top;
    
    // Transform to image data coordinates
    const dataX = Math.floor((mouseX - options.centerOffset.x - options.pan.x) / Math.max(options.zoom, 0.01));
    const dataY = Math.floor((mouseY - options.centerOffset.y - options.pan.y) / Math.max(options.zoom, 0.01));
    
    // Clamp to image bounds if we have image data
    const imageData = options.manualImageDataRef.current;
    if (imageData) {
      const clampedX = Math.max(0, Math.min(dataX, imageData.width - 1));
      const clampedY = Math.max(0, Math.min(dataY, imageData.height - 1));
      return { x: clampedX, y: clampedY };
    }
    
    return { x: dataX, y: dataY };
  }, [canvas, options.containerRef, options.centerOffset, options.pan, options.zoom, options.manualImageDataRef]);

  // Constrain position for Shift-key straight line drawing
  const constrainPosition = useCallback((lastPos: { x: number; y: number }, currentPos: { x: number; y: number }) => {
    const dx = Math.abs(currentPos.x - lastPos.x);
    const dy = Math.abs(currentPos.y - lastPos.y);
    
    // Determine direction if not set and movement is significant
    if (directionRef.current === "none" && (dx > 5 || dy > 5)) {
      directionRef.current = dx > dy ? "horizontal" : "vertical";
    }
    
    // Apply constraint based on direction
    let constrainedPos = { ...currentPos };
    if (directionRef.current === "horizontal") {
      constrainedPos.y = lastPos.y;
    } else if (directionRef.current === "vertical") {
      constrainedPos.x = lastPos.x;
    }
    
    return constrainedPos;
  }, []);

  // OPTIMIZED: Erase pixels in a circle around the given point (in-place modification)
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
            data[index + 3] = 0; // Set alpha to 0 (transparent) - in-place modification
          }
        }
      }
    }
  }, []);

  // Start erasing
  const startErasing = useCallback((e: MouseEvent | TouchEvent) => {
    // Reset erasing progress flag and direction to prevent race conditions
    options.erasingInProgressRef.current = false;
    directionRef.current = "none";
    
    if (!canvas || !options.containerRef.current) {
      return;
    }
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      return;
    }
    
    // Initialize manualImageDataRef if it's null
    if (!options.manualImageDataRef.current) {
      try {
        options.manualImageDataRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (error) {
        console.error('Failed to initialize manualImageDataRef:', error);
        return;
      }
    }
    
    const coords = getCanvasCoords(e);
    if (!coords) {
      return;
    }
    
    // Set erasing state
    isErasingRef.current = true;
    lastPosRef.current = coords;
    options.hasManualEditsRef.current = true;
    options.erasingInProgressRef.current = true;
    
    // Erase pixels in the manual image data (in-place)
    const radius = Math.floor(options.brushSize / 2);
    erasePixels(options.manualImageDataRef.current, coords.x, coords.y, radius);
    
    // Schedule canvas update
    pendingUpdateRef.current = true;
    updateCanvasDisplay();
    
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, options.hasManualEditsRef, options.erasingInProgressRef, options.containerRef, getCanvasCoords, erasePixels, updateCanvasDisplay]);

  // OPTIMIZED: Continue erasing with Bresenham's line algorithm
  const continueErasing = useCallback((e: MouseEvent | TouchEvent) => {
    if (!canvas || !isErasingRef.current || !options.manualImageDataRef.current) {
      return;
    }
    
    const coords = getCanvasCoords(e);
    if (!coords || !lastPosRef.current) {
      return;
    }
    
    let currentPos = coords;
    
    // Apply Shift-key constraint for straight lines (mouse only)
    if (e instanceof MouseEvent && e.shiftKey) {
      currentPos = constrainPosition(lastPosRef.current, coords);
    }
    
    // Draw line between last position and current position using Bresenham's algorithm
    const x0 = lastPosRef.current.x;
    const y0 = lastPosRef.current.y;
    const x1 = currentPos.x;
    const y1 = currentPos.y;
    
    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    
    let x = x0;
    let y = y0;
    const radius = Math.floor(options.brushSize / 2);
    
    // Erase pixels along the line (in-place modification)
    while (true) {
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
    
    // Schedule canvas update (throttled)
    pendingUpdateRef.current = true;
    updateCanvasDisplay();
    
    lastPosRef.current = currentPos;
    e.preventDefault();
  }, [canvas, options.brushSize, options.manualImageDataRef, getCanvasCoords, erasePixels, constrainPosition, updateCanvasDisplay]);

  // Stop erasing
  const stopErasing = useCallback((e?: MouseEvent | TouchEvent) => {
    // Reset direction constraint
    directionRef.current = "none";
    
    if (!isErasingRef.current) {
      // Always reset the progress flag even if we weren't erasing
      options.erasingInProgressRef.current = false;
      return;
    }
    
    isErasingRef.current = false;
    lastPosRef.current = null;
    options.erasingInProgressRef.current = false;
    
    // Force final canvas update if one is pending
    if (pendingUpdateRef.current) {
      updateCanvasDisplay();
    }
    
    // Trigger image change callback for undo/redo system and persistence
    if (options.onImageChange && options.manualImageDataRef.current) {
      options.onImageChange(options.manualImageDataRef.current);
    }
    
    if (e) e.preventDefault();
  }, [options.onImageChange, options.manualImageDataRef, options.erasingInProgressRef, updateCanvasDisplay]);

  // OPTIMIZED: Get brush cursor style - scale with zoom
  const getBrushCursor = useCallback(() => {
    const radius = Math.floor(options.brushSize / 2);
    const zoom = Math.max(options.zoom || 1, 0.01);
    const size = Math.max(4, radius * 2 * zoom);
    
    const strokeWidth = Math.max(1, Math.min(2, options.brushSize / 20));
    
    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <circle cx="${size/2}" cy="${size/2}" r="${radius * zoom - strokeWidth/2}" fill="none" stroke="rgba(255, 0, 0, 0.8)" stroke-width="${strokeWidth}"/>
        <circle cx="${size/2}" cy="${size/2}" r="1" fill="rgba(255, 0, 0, 0.8)"/>
      </svg>
    `;
    const encodedSvg = encodeURIComponent(svg);
    return `url("data:image/svg+xml,${encodedSvg}") ${size/2} ${size/2}, crosshair`;
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
