import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useEraserTool } from '@/hooks/useEraserTool';
import { ImageItem, ColorRemovalSettings, ContiguousToolSettings, EffectSettings, EdgeCleanupSettings, EraserSettings } from '@/pages/Index';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: SpeckleSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  eraserSettings: EraserSettings;
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: React.Dispatch<{ imageId: string; progress: number } | null>;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number | undefined) => void;
}

export const MainCanvas = ({ 
  image, 
  tool, 
  onToolChange, 
  colorSettings, 
  contiguousSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  eraserSettings,
  erasingInProgressRef,
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
  onSpeckCountUpdate
}: MainCanvasProps) => {
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const [hasManualEdits, setHasManualEdits] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  
  // Basic pan and zoom functionality
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(5, prev * delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool !== 'pan') return;
    e.preventDefault();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startPan = { ...pan };
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = moveEvent.clientX - startX;
      const deltaY = moveEvent.clientY - startY;
      setPan({
        x: startPan.x + deltaX,
        y: startPan.y + deltaY
      });
    };
    
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [tool, pan]);

  // Initialize eraser tool with zoom-responsive cursor
  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize: eraserSettings.brushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: handleImageChange
  });

  // Load image onto canvas
  useEffect(() => {
    if (!image) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const loadImage = async () => {
      const img = new Image();
      img.src = URL.createObjectURL(image.file);
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        
        // Store original image data
        const originalImageData = ctx.getImageData(0, 0, img.width, img.height);
        
        // Update image item with original data
        onImageUpdate({
          ...image,
          originalData: originalImageData,
          processedData: null, // Reset processed data when loading new image
          status: 'completed',
          canvas: canvas
        });
        
        // Reset manual edits
        setManualImageData(null);
        manualImageDataRef.current = null;
        hasManualEditsRef.current = false;
        setHasManualEdits(false);
        setPan({ x: 0, y: 0 });
        setZoom(1);
        setCenterOffset({ x: 0, y: 0 });
      };
    };
    
    loadImage();
  }, [image, onImageUpdate]);

  // Update canvas with processed data
  useEffect(() => {
    if (!image?.originalData) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Use processedData if available, otherwise fall back to originalData
    const imageData = manualImageData || image.processedData || image.originalData;
    
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    // Adjust canvas size to image dimensions
    canvas.style.width = `${imageData.width}px`;
    canvas.style.height = `${imageData.height}px`;
    
    ctx.putImageData(imageData, 0, 0);
  }, [image?.originalData, image?.processedData, manualImageData]);

  // Handle image data changes
  function handleImageChange(imageData: ImageData) {
    if (!image) return;
    
    // Update image item with processed data
    const updatedImage: ImageItem = {
      ...image,
      processedData: imageData,
      status: 'completed' as const
    };
    
    onImageUpdate(updatedImage);
  }

  // Start/Stop drawing
  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Handle pan and zoom
    if (tool === 'pan') {
      handleMouseDown(e);
      return;
    }
    
    // Handle eraser tool
    if (tool === 'eraser') {
      eraserTool?.startErasing(e.nativeEvent);
      return;
    }
  };
  
  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Handle eraser tool
    if (tool === 'eraser' && erasingInProgressRef.current) {
      eraserTool?.continueErasing(e.nativeEvent);
      return;
    }
  };
  
  const handleCanvasMouseUp = (e: React.MouseEvent) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Handle eraser tool
    if (tool === 'eraser') {
      eraserTool?.stopErasing(e.nativeEvent);
      return;
    }
  };
  
  const handleCanvasMouseLeave = (e: React.MouseEvent) => {
    if (!canvasRef.current || !containerRef.current) return;
    
    // Handle eraser tool
    if (tool === 'eraser') {
      eraserTool?.stopErasing(e.nativeEvent);
      return;
    }
  };

  // Update cursor style when tool, brush size, or zoom changes
  useEffect(() => {
    if (!containerRef.current) return;
    
    if (tool === 'eraser') {
      // Pass current zoom level to getBrushCursor for zoom-responsive sizing
      const cursorStyle = eraserTool.getBrushCursor(zoom);
      containerRef.current.style.cursor = cursorStyle;
      console.log('Applied zoom-responsive eraser cursor:', { zoom, brushSize: eraserSettings.brushSize });
    } else {
      containerRef.current.style.cursor = 'crosshair';
    }
  }, [tool, eraserSettings.brushSize, zoom, eraserTool]);

  return (
    <div className="flex flex-col flex-1 relative min-h-0">
      {/* Canvas Toolbar */}
      <div className="absolute top-2 left-2 z-10 bg-panel/80 backdrop-blur-md rounded-md shadow-md p-2 flex items-center space-x-2">
        <button
          className={`p-2 rounded-md hover:bg-accent-purple/20 ${tool === 'pan' ? 'bg-accent-purple/50' : ''}`}
          onClick={() => onToolChange('pan')}
          title="Pan Tool (Drag to move)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM15.75 17.625a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM7.5 18.375a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM6.375 7.5a.75.75 0 001.5 0v9a.75.75 0 00-1.5 0v-9zM16.5 7.5a.75.75 0 000 1.5h9a.75.75 0 000-1.5h-9zM16.5 16.5a.75.75 0 001.5 0v9a.75.75 0 00-1.5 0v-9z" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-md hover:bg-accent-purple/20 ${tool === 'color-stack' ? 'bg-accent-purple/50' : ''}`}
          onClick={() => onToolChange('color-stack')}
          title="Color Stack (Click to remove color)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zm-1.72 6.97a.75.75 0 10-1.06 1.06L10.94 12l-1.72 1.72a.75.75 0 101.06 1.06L12 13.06l1.72 1.72a.75.75 0 101.06-1.06L13.06 12l1.72-1.72a.75.75 0 10-1.06-1.06L12 10.94l-1.72-1.72z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-md hover:bg-accent-purple/20 ${tool === 'magic-wand' ? 'bg-accent-purple/50' : ''}`}
          onClick={() => onToolChange('magic-wand')}
          title="Magic Wand (Click to select contiguous area)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M10.5 5.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5zM15.75 14.25a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
            <path fillRule="evenodd" d="M1.5 6.375a3 3 0 013-3h15a3 3 0 013 3v10.5a3 3 0 01-3 3H4.5a3 3 0 01-3-3V6.375zM7.53 4.69a4.5 4.5 0 00-1.644 8.747l1.057 1.057a.75.75 0 01-1.06 1.06l-1.058-1.057a6 6 0 012.19-11.662l1.525 1.525zm9.94 11.11a4.5 4.5 0 00-6.364-6.364L12 8.636a.75.75 0 011.061 1.061l2.122-2.121a6 6 0 018.485 8.485l-1.524 1.524a.75.75 0 01-1.061-1.061l1.524-1.524zm-4.884 4.884a3 3 0 104.243-4.243l-2.122 2.122a.75.75 0 01-1.061-1.061l2.121-2.121a3 3 0 00-4.242 4.242l2.121 2.121a.75.75 0 01-1.06 1.06l-2.122-2.121z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          className={`p-2 rounded-md hover:bg-accent-purple/20 ${tool === 'eraser' ? 'bg-accent-purple/50' : ''}`}
          onClick={() => onToolChange('eraser')}
          title="Eraser (Click and drag to erase)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M5.47 5.47a.75.75 0 011.06 0L12 10.94l5.47-5.47a.75.75 0 111.06 1.06L13.06 12l5.47 5.47a.75.75 0 11-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 01-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 010-1.06z" />
          </svg>
        </button>
      </div>
      
      {/* Canvas Container */}
      <div 
        className="flex-1 relative min-h-0 overflow-hidden"
        ref={containerRef}
        onWheel={handleWheel}
      >
        {image ? (
          <canvas
            ref={canvasRef}
            className="absolute top-1/2 left-1/2"
            style={{
              transform: `translate(-50%, -50%) scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
              cursor: 'crosshair',
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleCanvasMouseMove}
            onMouseUp={handleCanvasMouseUp}
            onMouseLeave={handleCanvasMouseLeave}
          />
        ) : (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 text-lg italic">
            No image selected
          </div>
        )}
      </div>

      {/* Canvas Footer */}
      <div className="absolute bottom-2 left-2 right-2 z-10 bg-panel/80 backdrop-blur-md rounded-md shadow-md p-2 flex items-center justify-between">
        <button
          className="bg-accent-purple hover:bg-accent-blue text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={onPreviousImage}
          disabled={!canGoPrevious}
        >
          Previous
        </button>
        <span className="text-sm text-gray-400">
          {currentImageIndex} of {totalImages}
        </span>
        <button
          className="bg-accent-purple hover:bg-accent-blue text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={onNextImage}
          disabled={!canGoNext}
        >
          Next
        </button>
        <button
          className="bg-accent-purple hover:bg-accent-blue text-white font-bold py-2 px-4 rounded disabled:opacity-50"
          onClick={onDownloadImage}
          disabled={!image?.processedData}
        >
          Download
        </button>
      </div>
    </div>
  );
};
