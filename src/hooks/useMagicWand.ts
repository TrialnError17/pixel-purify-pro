
import { useRef, useCallback } from 'react';

export interface MagicWandOptions {
  threshold: number;
  debugMode?: boolean;
}

export interface MagicWandResult {
  pixelsRemoved: number;
  visitedMask?: ImageData;
}

export const useMagicWand = () => {
  const isProcessingRef = useRef(false);
  const lastClickTimeRef = useRef(0);
  const DEBOUNCE_MS = 200;

  const colorDistance = useCallback((color1: number[], color2: number[]): number => {
    const rDiff = color1[0] - color2[0];
    const gDiff = color1[1] - color2[1];
    const bDiff = color1[2] - color2[2];
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff);
  }, []);

  const removeContiguousColor = useCallback((
    imageData: ImageData,
    startX: number,
    startY: number,
    options: MagicWandOptions
  ): MagicWandResult => {
    const now = Date.now();
    
    // Debounce check
    if (now - lastClickTimeRef.current < DEBOUNCE_MS) {
      console.log('Magic wand: Debounced click ignored');
      return { pixelsRemoved: 0 };
    }
    lastClickTimeRef.current = now;

    // Prevent concurrent operations
    if (isProcessingRef.current) {
      console.log('Magic wand: Already processing, ignoring click');
      return { pixelsRemoved: 0 };
    }
    isProcessingRef.current = true;

    try {
      const { width, height, data } = imageData;
      console.log(`Magic wand: Click at pixel (${startX}, ${startY})`);

      // Bounds check
      if (startX < 0 || startX >= width || startY < 0 || startY >= height) {
        console.log('Magic wand: Click outside canvas bounds');
        return { pixelsRemoved: 0 };
      }

      // Get target color at click position
      const startIndex = (startY * width + startX) * 4;
      const targetColor = [
        data[startIndex],
        data[startIndex + 1],
        data[startIndex + 2],
        data[startIndex + 3]
      ];

      console.log(`Magic wand: Target color RGBA(${targetColor.join(', ')})`);

      // Skip if already transparent
      if (targetColor[3] === 0) {
        console.log('Magic wand: Target pixel is already transparent');
        return { pixelsRemoved: 0 };
      }

      // Create visited mask for tracking and optional debug visualization
      const visited = new Uint8Array(width * height);
      const visitedMask = options.debugMode ? new ImageData(width, height) : undefined;

      // Flood fill using stack (4-direction only)
      const stack: [number, number][] = [[startX, startY]];
      let pixelsRemoved = 0;
      const MAX_STACK_SIZE = 10000;

      while (stack.length > 0) {
        // Stack overflow protection
        if (stack.length > MAX_STACK_SIZE) {
          console.warn(`Magic wand: Stack size exceeded ${MAX_STACK_SIZE}, aborting to prevent overflow`);
          break;
        }

        const [x, y] = stack.pop()!;
        const pixelIndex = y * width + x;

        // Skip if already visited
        if (visited[pixelIndex]) continue;

        // Mark as visited
        visited[pixelIndex] = 1;

        // Get current pixel color
        const dataIndex = pixelIndex * 4;
        const currentColor = [
          data[dataIndex],
          data[dataIndex + 1],
          data[dataIndex + 2],
          data[dataIndex + 3]
        ];

        // Check if color matches within threshold
        const distance = colorDistance(targetColor.slice(0, 3), currentColor.slice(0, 3));
        if (distance <= options.threshold && currentColor[3] > 0) {
          // Remove pixel (make transparent)
          data[dataIndex + 3] = 0; // Set alpha to 0
          pixelsRemoved++;

          // Mark in debug mask if enabled
          if (visitedMask) {
            const maskIndex = pixelIndex * 4;
            visitedMask.data[maskIndex] = 255;     // Red channel
            visitedMask.data[maskIndex + 1] = 0;   // Green channel
            visitedMask.data[maskIndex + 2] = 0;   // Blue channel
            visitedMask.data[maskIndex + 3] = 128; // Semi-transparent
          }

          // Add 4-direction neighbors to stack (no diagonals)
          const neighbors = [
            [x, y - 1], // Up
            [x, y + 1], // Down
            [x - 1, y], // Left
            [x + 1, y]  // Right
          ];

          for (const [nx, ny] of neighbors) {
            // Bounds check
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const neighborIndex = ny * width + nx;
              if (!visited[neighborIndex]) {
                stack.push([nx, ny]);
              }
            }
          }
        }
      }

      console.log(`Magic wand: Removed ${pixelsRemoved} pixels`);
      
      return {
        pixelsRemoved,
        visitedMask
      };

    } finally {
      isProcessingRef.current = false;
    }
  }, [colorDistance]);

  return {
    removeContiguousColor
  };
};
