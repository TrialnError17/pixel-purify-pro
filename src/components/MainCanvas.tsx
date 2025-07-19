import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useEraserTool } from '@/hooks/useEraserTool';
import { cn } from '@/lib/utils';
import { Upload, Image as ImageIcon } from 'lucide-react';

interface MainCanvasProps {
  image: any;
  tool: 'pan' | 'color-picker' | 'magic-wand' | 'eraser';
  onToolChange: any;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
  erasingInProgressRef: any;
  onImageUpdate: any;
  onColorPicked: any;
  onPreviousImage: any;
  onNextImage: any;
  canGoPrevious: any;
  canGoNext: any;
  currentImageIndex: any;
  totalImages: any;
  onDownloadImage: any;
  setSingleImageProgress: any;
  addUndoAction: any;
  onSpeckCountUpdate: any;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ 
  image, 
  tool, 
  eraserSettings,
  onColorPicked,
  onImageUpdate 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });

  // Get current image from different sources
  const currentImage = image?.canvas || image?.processedData || image?.originalData;
  const brushSize = eraserSettings?.brushSize || 10;

  // Simple pan functionality
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan' && isDragging) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool, isDragging, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'pan') {
      setIsDragging(false);
    }
  }, [tool]);

  // Draw image to canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (currentImage) {
      if (currentImage instanceof HTMLCanvasElement) {
        // Draw from canvas
        ctx.drawImage(currentImage, 0, 0);
      } else if (currentImage instanceof ImageData) {
        // Draw from ImageData
        canvas.width = currentImage.width;
        canvas.height = currentImage.height;
        ctx.putImageData(currentImage, 0, 0);
      } else if (image?.file) {
        // Load from file
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
        };
        img.src = URL.createObjectURL(image.file);
      }
    }
  }, [currentImage, image]);

  // Calculate canvas position and size
  const getCanvasStyle = () => {
    if (!currentImage && !image?.file) return {};
    
    return {
      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
      transformOrigin: '0 0',
    };
  };

  // Render drag and drop area when no image
  if (!image) {
    return (
      <div 
        className="relative w-full h-full overflow-hidden bg-canvas-bg flex items-center justify-center"
        ref={containerRef}
      >
        <div className="text-center p-8 border-2 border-dashed border-border rounded-lg bg-card/50">
          <Upload className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-xl font-semibold text-foreground mb-2">
            Drag & Drop Images Here
          </h3>
          <p className="text-muted-foreground mb-4">
            Or use the "Add Images" button in the header
          </p>
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <ImageIcon className="w-4 h-4" />
            <span>Supports JPG, PNG, WebP</span>
          </div>
        </div>
      </div>
    );
  }

  // Get canvas dimensions
  const getCanvasDimensions = () => {
    if (currentImage instanceof ImageData) {
      return { width: currentImage.width, height: currentImage.height };
    }
    if (currentImage instanceof HTMLCanvasElement) {
      return { width: currentImage.width, height: currentImage.height };
    }
    return { width: 800, height: 600 };
  };

  const { width, height } = getCanvasDimensions();

  return (
    <div 
      className="relative w-full h-full overflow-hidden bg-canvas-bg"
      ref={containerRef}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        className={cn(
          "absolute",
          tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
          tool === 'color-picker' && 'cursor-crosshair',
          tool === 'magic-wand' && 'cursor-crosshair',
          tool === 'eraser' && 'cursor-crosshair'
        )}
        style={getCanvasStyle()}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
    </div>
  );
};

export default MainCanvas;