import { useCallback, useState, useRef } from 'react';

export interface SemiTransparencyResult {
  hasSemiTransparent: boolean;
  count: number;
  positions: Array<{ x: number; y: number }>;
}

export interface SemiTransparencySettings {
  enabled: boolean;
  showOverlay: boolean;
  highlightColor: string;
  blinkEffect: boolean;
}

export const useSemiTransparencyDetector = () => {
  const [result, setResult] = useState<SemiTransparencyResult>({
    hasSemiTransparent: false,
    count: 0,
    positions: []
  });
  
  const [isScanning, setIsScanning] = useState(false);
  const overlayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const scanImageData = useCallback(async (imageData: ImageData): Promise<SemiTransparencyResult> => {
    return new Promise((resolve) => {
      setIsScanning(true);
      
      const processChunk = (startIndex: number, chunkSize: number) => {
        const endIndex = Math.min(startIndex + chunkSize, imageData.data.length);
        const positions: Array<{ x: number; y: number }> = [];
        let count = 0;
        
        for (let i = startIndex; i < endIndex; i += 4) {
          const alpha = imageData.data[i + 3];
          
          // Check if alpha is semi-transparent (between 1 and 254)
          if (alpha > 0 && alpha < 255) {
            const pixelIndex = i / 4;
            const x = pixelIndex % imageData.width;
            const y = Math.floor(pixelIndex / imageData.width);
            positions.push({ x, y });
            count++;
          }
        }
        
        return { positions, count };
      };

      // Process in chunks for better performance
      const chunkSize = 100000; // Process 25k pixels at a time
      let totalCount = 0;
      let allPositions: Array<{ x: number; y: number }> = [];
      let currentIndex = 0;

      const processNextChunk = () => {
        if (currentIndex >= imageData.data.length) {
          const finalResult = {
            hasSemiTransparent: totalCount > 0,
            count: totalCount,
            positions: allPositions
          };
          setResult(finalResult);
          setIsScanning(false);
          resolve(finalResult);
          return;
        }

        const { positions, count } = processChunk(currentIndex, chunkSize);
        totalCount += count;
        allPositions = allPositions.concat(positions);
        currentIndex += chunkSize;

        // Use requestAnimationFrame for non-blocking processing
        animationFrameRef.current = requestAnimationFrame(processNextChunk);
      };

      processNextChunk();
    });
  }, []);

  const createOverlay = useCallback((
    canvas: HTMLCanvasElement,
    result: SemiTransparencyResult,
    settings: SemiTransparencySettings
  ) => {
    if (!overlayCanvasRef.current) {
      overlayCanvasRef.current = document.createElement('canvas');
      overlayCanvasRef.current.style.position = 'absolute';
      overlayCanvasRef.current.style.top = '0';
      overlayCanvasRef.current.style.left = '0';
      overlayCanvasRef.current.style.pointerEvents = 'none';
      overlayCanvasRef.current.style.zIndex = '10';
    }

    const overlay = overlayCanvasRef.current;
    overlay.width = canvas.width;
    overlay.height = canvas.height;
    
    const ctx = overlay.getContext('2d');
    if (!ctx) return overlay;

    // Clear previous overlay
    ctx.clearRect(0, 0, overlay.width, overlay.height);

    if (settings.showOverlay && result.hasSemiTransparent) {
      // Create highlight overlay
      const imageData = ctx.createImageData(overlay.width, overlay.height);
      const data = imageData.data;

      // Set all pixels to transparent initially
      for (let i = 0; i < data.length; i += 4) {
        data[i + 3] = 0; // Alpha = 0 (transparent)
      }

      // Highlight semi-transparent pixels
      result.positions.forEach(({ x, y }) => {
        const index = (y * overlay.width + x) * 4;
        if (index < data.length) {
          // Parse color (expecting hex format)
          const color = settings.highlightColor.replace('#', '');
          const r = parseInt(color.substr(0, 2), 16);
          const g = parseInt(color.substr(2, 2), 16);
          const b = parseInt(color.substr(4, 2), 16);
          
          data[index] = r;     // Red
          data[index + 1] = g; // Green
          data[index + 2] = b; // Blue
          data[index + 3] = 180; // Semi-transparent highlight
        }
      });

      ctx.putImageData(imageData, 0, 0);

      // Add blinking effect if enabled
      if (settings.blinkEffect) {
        overlay.style.animation = 'semi-transparency-blink 1s infinite';
      } else {
        overlay.style.animation = 'none';
      }
    }

    return overlay;
  }, []);

  const attachOverlay = useCallback((canvas: HTMLCanvasElement, overlay: HTMLCanvasElement) => {
    const container = canvas.parentElement;
    if (container && !container.contains(overlay)) {
      container.style.position = 'relative';
      container.appendChild(overlay);
    }
  }, []);

  const removeOverlay = useCallback(() => {
    if (overlayCanvasRef.current && overlayCanvasRef.current.parentElement) {
      overlayCanvasRef.current.parentElement.removeChild(overlayCanvasRef.current);
    }
  }, []);

  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    removeOverlay();
    setIsScanning(false);
  }, [removeOverlay]);

  return {
    result,
    isScanning,
    scanImageData,
    createOverlay,
    attachOverlay,
    removeOverlay,
    cleanup
  };
};