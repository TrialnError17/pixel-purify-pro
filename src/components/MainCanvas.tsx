import React, { useRef, useEffect, useState, useCallback } from 'react';
import { fabric } from 'fabric';

interface MainCanvasProps {
  imageFile: File | null;
  colorRemovalEnabled: boolean;
  speckleRemovalEnabled: boolean;
  speckleAdditionEnabled: boolean;
  verticalLineDetectionEnabled: boolean;
  horizontalLineDetectionEnabled: boolean;
  colorToRemove: string;
  tolerance: number;
  speckleThreshold: number;
  minSpeckleSize: number;
  maxSpeckleSize: number;
  speckleCount: number;
  speckleDensity: number;
  lineThreshold: number;
  minLineLength: number;
  verticalLineThreshold: number;
  verticalMinLineLength: number;
  horizontalLineThreshold: number;
  horizontalMinLineLength: number;
  eraserEnabled: boolean;
  eraserSize: number;
}

const MainCanvas: React.FC<MainCanvasProps> = ({
  imageFile,
  colorRemovalEnabled,
  speckleRemovalEnabled,
  speckleAdditionEnabled,
  verticalLineDetectionEnabled,
  horizontalLineDetectionEnabled,
  colorToRemove,
  tolerance,
  speckleThreshold,
  minSpeckleSize,
  maxSpeckleSize,
  speckleCount,
  speckleDensity,
  lineThreshold,
  minLineLength,
  verticalLineThreshold,
  verticalMinLineLength,
  horizontalLineThreshold,
  horizontalMinLineLength,
  eraserEnabled,
  eraserSize,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricCanvasRef = useRef<fabric.Canvas | null>(null);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const hasManualEditsRef = useRef(false);

  // Initialize Fabric.js canvas
  useEffect(() => {
    if (!canvasRef.current) return;

    const fabricCanvas = new fabric.Canvas(canvasRef.current, {
      isDrawingMode: false,
      selection: false,
    });

    fabricCanvasRef.current = fabricCanvas;

    return () => {
      fabricCanvas.dispose();
    };
  }, []);

  // Handle eraser mode
  useEffect(() => {
    const fabricCanvas = fabricCanvasRef.current;
    if (!fabricCanvas) return;

    if (eraserEnabled) {
      fabricCanvas.isDrawingMode = true;
      fabricCanvas.freeDrawingBrush = new fabric.EraserBrush(fabricCanvas);
      fabricCanvas.freeDrawingBrush.width = eraserSize;
      
      // Track when manual edits are made
      const handlePathCreated = () => {
        hasManualEditsRef.current = true;
      };
      
      fabricCanvas.on('path:created', handlePathCreated);
      
      return () => {
        fabricCanvas.off('path:created', handlePathCreated);
      };
    } else {
      fabricCanvas.isDrawingMode = false;
    }
  }, [eraserEnabled, eraserSize]);

  // Load image
  useEffect(() => {
    if (!imageFile || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      
      // Update Fabric.js canvas size
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.setDimensions({
          width: img.width,
          height: img.height
        });
      }
      
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(imageData);
      setCanvas(canvas);
      hasManualEditsRef.current = false; // Reset manual edits flag
    };

    img.src = URL.createObjectURL(imageFile);

    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [imageFile]);

  // Color removal function
  const removeColor = useCallback((imageData: ImageData, targetColor: string, tolerance: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const target = hexToRgb(targetColor);
    if (!target) return new ImageData(data, imageData.width, imageData.height);

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = Math.sqrt(
        Math.pow(r - target.r, 2) +
        Math.pow(g - target.g, 2) +
        Math.pow(b - target.b, 2)
      );

      if (distance <= tolerance) {
        data[i + 3] = 0; // Set alpha to 0 (transparent)
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  // Speckle removal function
  const removeSpeckles = useCallback((imageData: ImageData, threshold: number, minSize: number, maxSize: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;
    const visited = new Array(width * height).fill(false);

    const getPixelIndex = (x: number, y: number) => (y * width + x) * 4;
    const isValidPixel = (x: number, y: number) => x >= 0 && x < width && y >= 0 && y < height;
    const getGrayscale = (x: number, y: number) => {
      const idx = getPixelIndex(x, y);
      return (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
    };

    const floodFill = (startX: number, startY: number, targetValue: number): number[] => {
      const stack = [[startX, startY]];
      const component: number[] = [];

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const idx = y * width + x;

        if (!isValidPixel(x, y) || visited[idx]) continue;

        const currentValue = getGrayscale(x, y);
        if (Math.abs(currentValue - targetValue) > threshold) continue;

        visited[idx] = true;
        component.push(x, y);

        // Check 8-connected neighbors
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            if (dx === 0 && dy === 0) continue;
            stack.push([x + dx, y + dy]);
          }
        }
      }

      return component;
    };

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (visited[idx]) continue;

        const component = floodFill(x, y, getGrayscale(x, y));
        const componentSize = component.length / 2;

        if (componentSize >= minSize && componentSize <= maxSize) {
          // Remove this speckle by setting pixels to transparent
          for (let i = 0; i < component.length; i += 2) {
            const px = component[i];
            const py = component[i + 1];
            const pixelIdx = getPixelIndex(px, py);
            data[pixelIdx + 3] = 0; // Set alpha to 0
          }
        }
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  // Speckle addition function
  const addSpeckles = useCallback((imageData: ImageData, count: number, density: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let i = 0; i < count; i++) {
      const centerX = Math.floor(Math.random() * width);
      const centerY = Math.floor(Math.random() * height);
      const speckleSize = Math.floor(Math.random() * 10) + 1;

      for (let dy = -speckleSize; dy <= speckleSize; dy++) {
        for (let dx = -speckleSize; dx <= speckleSize; dx++) {
          const x = centerX + dx;
          const y = centerY + dy;

          if (x >= 0 && x < width && y >= 0 && y < height) {
            const distance = Math.sqrt(dx * dx + dy * dy);
            if (distance <= speckleSize && Math.random() < density) {
              const idx = (y * width + x) * 4;
              data[idx] = 0;     // R
              data[idx + 1] = 0; // G
              data[idx + 2] = 0; // B
              data[idx + 3] = 255; // A
            }
          }
        }
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  // Line detection functions
  const detectVerticalLines = useCallback((imageData: ImageData, threshold: number, minLength: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let x = 0; x < width; x++) {
      let lineStart = -1;
      for (let y = 0; y < height; y++) {
        const idx = (y * width + x) * 4;
        const grayscale = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        if (grayscale < threshold) {
          if (lineStart === -1) lineStart = y;
        } else {
          if (lineStart !== -1 && y - lineStart >= minLength) {
            // Mark line for removal
            for (let ly = lineStart; ly < y; ly++) {
              const lineIdx = (ly * width + x) * 4;
              data[lineIdx + 3] = 0; // Set alpha to 0
            }
          }
          lineStart = -1;
        }
      }

      // Check if line extends to the bottom
      if (lineStart !== -1 && height - lineStart >= minLength) {
        for (let ly = lineStart; ly < height; ly++) {
          const lineIdx = (ly * width + x) * 4;
          data[lineIdx + 3] = 0;
        }
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  const detectHorizontalLines = useCallback((imageData: ImageData, threshold: number, minLength: number): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
      let lineStart = -1;
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        const grayscale = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;

        if (grayscale < threshold) {
          if (lineStart === -1) lineStart = x;
        } else {
          if (lineStart !== -1 && x - lineStart >= minLength) {
            // Mark line for removal
            for (let lx = lineStart; lx < x; lx++) {
              const lineIdx = (y * width + lx) * 4;
              data[lineIdx + 3] = 0; // Set alpha to 0
            }
          }
          lineStart = -1;
        }
      }

      // Check if line extends to the right edge
      if (lineStart !== -1 && width - lineStart >= minLength) {
        for (let lx = lineStart; lx < width; lx++) {
          const lineIdx = (y * width + lx) * 4;
          data[lineIdx + 3] = 0;
        }
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  // Helper function to convert hex to RGB
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  };

  // Main processing effect
  useEffect(() => {
    if (!canvas || !originalImageData) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Get current processing state
    const hasAnyProcessingEnabled = 
      colorRemovalEnabled ||
      speckleRemovalEnabled ||
      speckleAdditionEnabled ||
      verticalLineDetectionEnabled ||
      horizontalLineDetectionEnabled;

    // If no processing is enabled but we have manual edits, preserve them
    if (!hasAnyProcessingEnabled) {
      if (!hasManualEditsRef.current) {
        // Only restore original data if there are no manual edits
        ctx.putImageData(originalImageData, 0, 0);
      }
      // If there are manual edits, don't restore - keep the current state
      return;
    }

    let processedData = new ImageData(
      new Uint8ClampedArray(originalImageData.data),
      originalImageData.width,
      originalImageData.height
    );

    // Apply color removal
    if (colorRemovalEnabled) {
      processedData = removeColor(processedData, colorToRemove, tolerance);
    }

    // Apply speckle removal
    if (speckleRemovalEnabled) {
      processedData = removeSpeckles(processedData, speckleThreshold, minSpeckleSize, maxSpeckleSize);
    }

    // Apply speckle addition
    if (speckleAdditionEnabled) {
      processedData = addSpeckles(processedData, speckleCount, speckleDensity);
    }

    // Apply vertical line detection
    if (verticalLineDetectionEnabled) {
      processedData = detectVerticalLines(processedData, verticalLineThreshold, verticalMinLineLength);
    }

    // Apply horizontal line detection
    if (horizontalLineDetectionEnabled) {
      processedData = detectHorizontalLines(processedData, horizontalLineThreshold, horizontalMinLineLength);
    }

    ctx.putImageData(processedData, 0, 0);
    hasManualEditsRef.current = false; // Reset manual edits flag when processing is applied
  }, [
    canvas,
    originalImageData,
    colorRemovalEnabled,
    speckleRemovalEnabled,
    speckleAdditionEnabled,
    verticalLineDetectionEnabled,
    horizontalLineDetectionEnabled,
    colorToRemove,
    tolerance,
    speckleThreshold,
    minSpeckleSize,
    maxSpeckleSize,
    speckleCount,
    speckleDensity,
    lineThreshold,
    minLineLength,
    verticalLineThreshold,
    verticalMinLineLength,
    horizontalLineThreshold,
    horizontalMinLineLength,
  ]);

  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          className="border border-gray-300 shadow-lg max-w-full max-h-full"
          style={{ 
            display: originalImageData ? 'block' : 'none',
            cursor: eraserEnabled ? 'crosshair' : 'default'
          }}
        />
        {!originalImageData && (
          <div className="text-gray-500 text-center p-8">
            Upload an image to get started
          </div>
        )}
      </div>
    </div>
  );
};

export default MainCanvas;
