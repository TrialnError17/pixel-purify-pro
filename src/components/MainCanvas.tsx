import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { useEraserTool } from '../hooks/useEraserTool';
import { useUndoManager } from '../hooks/useUndoManager';
import { ImageItem, ColorRemovalSettings, EffectSettings, EdgeCleanupSettings, EraserSettings, ContiguousToolSettings } from '../pages/Index';
import { SpeckleSettings } from '../hooks/useSpeckleTools';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, RotateCcw, Download, ChevronLeft, ChevronRight, Move, Pipette, Wand2, Eraser } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

export interface MainCanvasProps {
  image?: ImageItem;
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
  setSingleImageProgress: (progress: { imageId: string; progress: number } | null) => void;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
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
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState({ x: 0, y: 0 });
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // NEW: Track the last tool that made manual edits (specifically for eraser protection)
  const [lastManualEditTool, setLastManualEditTool] = useState<string | null>(null);

  const { toast } = useToast();
  const { processImage } = useImageProcessor();

  const { addUndoAction: addPanUndoAction } = useUndoManager();

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const scaleFactor = 0.05;
    const delta = event.deltaY > 0 ? -scaleFactor : scaleFactor;
    setZoom((prevZoom) => Math.max(0.1, prevZoom + delta));
  }, []);

  const handleMouseDownPan = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    event.preventDefault();
    setIsPanning(true);
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, []);

  const handleMouseMovePan = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPanning) return;
    const deltaX = event.clientX - lastPanPoint.x;
    const deltaY = event.clientY - lastPanPoint.y;
    setPan((prevPan) => ({
      x: prevPan.x + deltaX,
      y: prevPan.y + deltaY,
    }));
    setLastPanPoint({ x: event.clientX, y: event.clientY });
  }, [isPanning, lastPanPoint]);

  const handleMouseUpPan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleMouseLeavePan = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetPan = useCallback(() => {
    setPan({ x: 0, y: 0 });
  }, []);

  const resetZoom = useCallback(() => {
    setZoom(1);
  }, []);

  const rotateCanvas = useCallback(() => {
    // Implement rotate logic here
    toast({
      title: 'Canvas rotation',
      description: 'Canvas rotation is not yet implemented.',
    });
  }, [toast]);

  const { 
    startErasing, 
    continueErasing, 
    stopErasing,
    isErasing
  } = useEraserTool(canvasRef.current, {
    brushSize: eraserSettings.brushSize,
    zoom,
    pan,
    centerOffset: { x: 0, y: 0 },
    containerRef,
    manualImageDataRef: useRef(manualImageData),
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: (newImageData) => {
      console.log('Eraser onImageChange called');
      setManualImageData(newImageData);
      hasManualEditsRef.current = true;
      erasingInProgressRef.current = false;
      
      // NEW: Mark that the eraser was the last tool to make manual edits
      setLastManualEditTool('eraser');
      
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        onImageUpdate(updatedImage);
        
        addUndoAction({
          type: 'canvas_edit',
          description: 'Eraser tool edit',
          undo: () => {
            const prevData = image.processedData || image.originalData;
            if (prevData) {
              setManualImageData(prevData);
              hasManualEditsRef.current = false;
              setLastManualEditTool(null); // Reset on undo
              onImageUpdate({ ...image, processedData: prevData });
            }
          }
        });
      }
    }
  });

  useEffect(() => {
    if (!image) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(image.file);

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the original image onto the canvas
      ctx.drawImage(img, 0, 0);

      // Get the image data from the canvas
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Store the original image data
      onImageUpdate({ ...image, originalData: imageData, canvas: canvas });
    };
  }, [image, onImageUpdate]);

  // MODIFIED: Processing effect with eraser protection guard
  useEffect(() => {
    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!image?.originalData,
      hasCanvas: !!image?.canvas,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing,
      imageHasProcessedData: !!image?.processedData,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: effectSettings.background.enabled,
      inkStampEnabled: effectSettings.inkStamp.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled,
      lastManualEditTool,
      erasingInProgress: erasingInProgressRef.current
    });

    // NEW: Guard to protect eraser edits - if manual edits exist from eraser, skip auto-processing
    if (hasManualEditsRef.current && lastManualEditTool === 'eraser') {
      console.log('Skipping auto-processing to preserve eraser edits');
      return;
    }

    if (!image?.originalData || !image?.canvas || isProcessing || erasingInProgressRef.current) {
      console.log('Early return - missing requirements or processing in progress');
      return;
    }

    const needsProcessing = colorSettings.enabled || 
                           effectSettings.background.enabled || 
                           effectSettings.inkStamp.enabled || 
                           effectSettings.imageEffects.enabled ||
                           edgeCleanupSettings.enabled;

    if (!needsProcessing && !hasManualEditsRef.current) {
      console.log('Early return - no processing needed and no manual edits');
      return;
    }

    console.log('Starting image processing with settings');
    setIsProcessing(true);

    const baseImageData = hasManualEditsRef.current && manualImageData ? manualImageData : image.originalData;

    processImage(
      { ...image, originalData: baseImageData },
      colorSettings,
      effectSettings,
      (images: React.SetStateAction<ImageItem[]>) => {
        if (typeof images === 'function') {
          // Handle function form of setState
          const currentImages = [image];
          const updatedImages = images(currentImages);
          const updatedImage = updatedImages.find((img: ImageItem) => img.id === image.id);
          if (updatedImage) {
            onImageUpdate(updatedImage);
          }
        } else {
          // Handle direct array form
          const updatedImage = images.find((img: ImageItem) => img.id === image.id);
          if (updatedImage) {
            onImageUpdate(updatedImage);
          }
        }
      }
    ).finally(() => {
      setIsProcessing(false);
    });
  }, [
    image?.originalData,
    image?.canvas,
    image?.id,
    colorSettings,
    effectSettings,
    edgeCleanupSettings,
    manualImageData,
    processImage,
    onImageUpdate,
    isProcessing
  ]);

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    // Set the scale and translation for zooming and panning
    ctx.setTransform(1, 0, 0, 1, pan.x, pan.y);
    ctx.scale(zoom, zoom);

    if (image.processedData) {
      // Draw the processed image data onto the canvas
      ctx.putImageData(image.processedData, 0, 0);
    } else if (image.originalData) {
      // If there's no processed data, draw the original image data
      ctx.putImageData(image.originalData, 0, 0);
    }
    
    // Reset transformation matrix to identity matrix
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [image, zoom, pan]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas, image?.processedData, image?.originalData, zoom, pan]);

  const handleToolChange = useCallback((newTool: typeof tool) => {
    // Reset eraser protection when switching tools (except to eraser)
    if (newTool !== 'eraser') {
      setLastManualEditTool(null);
    }
    onToolChange(newTool);
  }, [onToolChange]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool === 'color-stack') {
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Get the image data from the canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixelData = imageData.data;

      // Calculate the index of the pixel
      const index = (Math.floor(y) * canvas.width + Math.floor(x)) * 4;

      // Get the RGBA values of the pixel
      const r = pixelData[index];
      const g = pixelData[index + 1];
      const b = pixelData[index + 2];
      // const a = pixelData[index + 3]; // Not needed for color picking

      // Convert the RGB values to a hex color
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      onColorPicked(color);
    }
    
    if (tool === 'eraser') {
      erasingInProgressRef.current = true;
      startErasing(e.nativeEvent);
    }
  }, [tool, startErasing, onColorPicked, erasingInProgressRef]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'eraser' && isErasing) {
      continueErasing(e.nativeEvent);
    }
  }, [tool, isErasing, continueErasing]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'eraser') {
      erasingInProgressRef.current = false;
      stopErasing();
    }
  }, [tool, stopErasing, erasingInProgressRef]);

  const handleMouseLeave = useCallback(() => {
    if (tool === 'eraser') {
      erasingInProgressRef.current = false;
      stopErasing();
    }
  }, [tool, stopErasing, erasingInProgressRef]);

  return (
    <div className="flex-1 flex flex-col bg-canvas overflow-hidden">
      {/* Tool Selection Bar */}
      <div className="flex items-center gap-2 p-2 bg-panel border-b border-border">
        <Button
          variant={tool === 'pan' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolChange('pan')}
          className="flex items-center gap-1"
        >
          <Move className="w-4 h-4" />
          Pan
        </Button>
        <Button
          variant={tool === 'color-stack' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolChange('color-stack')}
          className="flex items-center gap-1"
        >
          <Pipette className="w-4 h-4" />
          Pick
        </Button>
        <Button
          variant={tool === 'magic-wand' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolChange('magic-wand')}
          className="flex items-center gap-1"
        >
          <Wand2 className="w-4 h-4" />
          Magic Wand
        </Button>
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => handleToolChange('eraser')}
          className="flex items-center gap-1"
        >
          <Eraser className="w-4 h-4" />
          Eraser
        </Button>
      </div>

      {/* Canvas Container */}
      <div
        className="flex-1 relative overflow-hidden"
        onWheel={handleWheel}
      >
        <div
          ref={containerRef}
          className="absolute inset-0"
        >
          <canvas
            ref={canvasRef}
            className="block cursor-grab active:cursor-grabbing"
            style={{ touchAction: 'none' }}
            onMouseDown={tool === 'pan' ? handleMouseDownPan : handleMouseDown}
            onMouseMove={tool === 'pan' ? handleMouseMovePan : handleMouseMove}
            onMouseUp={tool === 'pan' ? handleMouseUpPan : handleMouseUp}
            onMouseLeave={tool === 'pan' ? handleMouseLeavePan : handleMouseLeave}
          />
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-between p-2 bg-panel border-t border-border">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <span>{currentImageIndex}/{totalImages}</span>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextImage}
            disabled={!canGoNext}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={resetZoom}>
            <ZoomOut className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={resetPan}>
            <ZoomIn className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={rotateCanvas}>
            <RotateCcw className="w-4 h-4" />
          </Button>
          <Button variant="default" size="sm" onClick={onDownloadImage}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>
    </div>
  );
};
