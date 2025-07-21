import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings, PickedColor } from '@/pages/Index';
import { cn } from '@/lib/utils';

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'color-stack' | 'magic-wand';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: any;
  edgeCleanupSettings: EdgeCleanupSettings;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: React.Dispatch<React.SetStateAction<{ imageId: string; progress: number } | null>>;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number) => void;
}

const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  tool,
  onToolChange,
  colorSettings,
  contiguousSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  onImageUpdate,
  onColorPicked,
  onPreviousImage,
  onNextImage,
  canGoPrevious,
  canGoNext,
  currentImageIndex,
  totalImages,
  onDownloadImage,
  setSingleImageProgress,
  addUndoAction,
  onSpeckCountUpdate,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);

  // Load image into canvas when image changes
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // Optimize for large images - limit initial canvas size for performance
      const MAX_DIMENSION = 4000; // Updated from 2048 to match validation limit
      let displayWidth = img.naturalWidth;
      let displayHeight = img.naturalHeight;

      if (displayWidth > MAX_DIMENSION || displayHeight > MAX_DIMENSION) {
        const aspectRatio = displayWidth / displayHeight;
        if (displayWidth > displayHeight) {
          displayWidth = MAX_DIMENSION;
          displayHeight = Math.round(displayWidth / aspectRatio);
        } else {
          displayHeight = MAX_DIMENSION;
          displayWidth = Math.round(displayHeight * aspectRatio);
        }
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

      // Save original image data
      const originalData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      onImageUpdate({ ...image, canvas, originalData, processedData: originalData, status: 'completed' });
    };
    img.onerror = () => {
      console.error('Failed to load image');
    };
    img.src = URL.createObjectURL(image.file);
  }, [image, onImageUpdate]);

  // Handle mouse down for pan or tool interaction
  const handleMouseDown = (e: React.MouseEvent) => {
    if (tool === 'pan') {
      setIsDragging(true);
      setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    }
  };

  // Handle mouse move for pan or tool interaction
  const handleMouseMove = (e: React.MouseEvent) => {
    if (tool === 'pan' && isDragging && dragStart) {
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      setOffset({ x: newX, y: newY });
    }
  };

  // Handle mouse up to stop dragging
  const handleMouseUp = () => {
    if (tool === 'pan') {
      setIsDragging(false);
      setDragStart(null);
    }
  };

  // Handle wheel for zooming
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY;
    const zoomFactor = 0.001;
    let newScale = scale + delta * zoomFactor;
    newScale = Math.min(Math.max(newScale, 0.1), 10);
    setScale(newScale);
  };

  // Handle color picking on click when tool is color-stack or magic-wand
  const handleCanvasClick = (e: React.MouseEvent) => {
    if (!canvasRef.current || !image) return;
    if (tool !== 'color-stack' && tool !== 'magic-wand') return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - rect.left) / scale);
    const y = Math.floor((e.clientY - rect.top) / scale);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const pixel = ctx.getImageData(x, y, 1, 1).data;
    const color = `rgba(${pixel[0]},${pixel[1]},${pixel[2]},${pixel[3] / 255})`;

    onColorPicked(color);
  };

  return (
    <div className="relative flex flex-col flex-1 overflow-hidden bg-gray-100">
      <div className="flex items-center justify-between p-2 border-b border-gray-300 bg-white">
        <div>
          <button
            onClick={() => onToolChange('pan')}
            className={cn('px-2 py-1 rounded', tool === 'pan' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
          >
            Pan
          </button>
          <button
            onClick={() => onToolChange('color-stack')}
            className={cn('ml-2 px-2 py-1 rounded', tool === 'color-stack' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
          >
            Color Stack
          </button>
          <button
            onClick={() => onToolChange('magic-wand')}
            className={cn('ml-2 px-2 py-1 rounded', tool === 'magic-wand' ? 'bg-blue-500 text-white' : 'bg-gray-200')}
          >
            Magic Wand
          </button>
        </div>
        <div>
          <button
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
            className="mr-2 px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={onNextImage}
            disabled={!canGoNext}
            className="px-2 py-1 rounded bg-gray-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
        <div>
          <button
            onClick={onDownloadImage}
            disabled={!image || image.status !== 'completed'}
            className="px-2 py-1 rounded bg-green-500 text-white disabled:opacity-50"
          >
            Download
          </button>
        </div>
      </div>
      <div
        className="flex-1 overflow-auto bg-black flex justify-center items-center"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        onClick={handleCanvasClick}
        style={{ cursor: tool === 'pan' ? (isDragging ? 'grabbing' : 'grab') : 'crosshair' }}
      >
        <canvas
          ref={canvasRef}
          style={{
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            maxWidth: '100%',
            maxHeight: '100%',
            userSelect: 'none',
            imageRendering: 'pixelated',
          }}
        />
      </div>
      <div className="p-2 text-center text-sm text-gray-600">
        {image ? `Image ${currentImageIndex} of ${totalImages}` : 'No image selected'}
      </div>
    </div>
  );
};

export default MainCanvas;
