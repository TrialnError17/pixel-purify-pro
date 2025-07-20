import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ImageItem, ColorRemovalSettings, EffectSettings, EdgeCleanupSettings, ContiguousToolSettings, EraserSettings } from '@/pages/Index';
import { applyColorRemoval } from '@/utils/colorRemoval';
import { applyBackgroundColor } from '@/utils/background';
import { applyInkStampEffect } from '@/utils/inkStamp';
import { applyImageEffects } from '@/utils/imageEffects';
import { applyEdgeCleanup, applyLegacyEdgeCleanup, applySoftenEdges } from '@/utils/edgeCleanup';
import { floodFill, getMousePosition } from '@/utils/canvasUtils';
import { useToast } from '@/hooks/use-toast';
import { useSpeckleTools } from '@/hooks/useSpeckleTools';

interface MainCanvasProps {
  image: ImageItem | null;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: any;
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
  setSingleImageProgress: React.Dispatch<React.SetStateAction<{ imageId: string; progress: number; } | null>>;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate?: (count: number) => void;
}

const MainCanvas = ({
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
  const [isProcessing, setIsProcessing] = useState(false);
  const [isErasing, setIsErasing] = useState(false);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [scale, setScale] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [lastPosition, setLastPosition] = useState({ x: 0, y: 0 });
  const [manualEdits, setManualEdits] = useState(false);
  const [preSpeckleImageData, setPreSpeckleImageData] = useState<ImageData | null>(null);
  const [preEdgeCleanupImageData, setPreEdgeCleanupImageData] = useState<ImageData | null>(null);
  const [preInkStampImageData, setPreInkStampImageData] = useState<ImageData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const manualEditsCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { processSpecks } = useSpeckleTools();

  // Clear all effect states when image changes or manual edits occur
  const clearEffectStates = useCallback(() => {
    setPreSpeckleImageData(null);
    setPreEdgeCleanupImageData(null);
    setPreInkStampImageData(null);
  }, []);

  // Load image onto canvas
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = URL.createObjectURL(image.file);

    img.onload = () => {
      // Set canvas dimensions to image dimensions
      canvas.width = img.width;
      canvas.height = img.height;

      // Draw the image onto the canvas
      ctx.drawImage(img, 0, 0, img.width, img.height);

      // Get image data from the canvas
      const imageData = ctx.getImageData(0, 0, img.width, img.height);

      // Update the image item with the original data
      const updatedImage = {
        ...image,
        originalData: imageData,
        status: 'pending' as const,
        canvas: canvas
      };
      onImageUpdate(updatedImage);
    };

    img.onerror = () => {
      toast({
        title: "Image failed to load",
        description: "There was an error loading the image. Please try again.",
        variant: "destructive",
      });
      const updatedImage = {
        ...image,
        status: 'error' as const,
        error: 'Failed to load image'
      };
      onImageUpdate(updatedImage);
    };
  }, [image, onImageUpdate, toast]);

  // Update canvas when selected image changes
  useEffect(() => {
    if (!image?.originalData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear any existing content on the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Put the image data onto the canvas
    ctx.putImageData(image.originalData, 0, 0);

  }, [image?.originalData]);

  // Reset pan and zoom when image changes
  useEffect(() => {
    setPanOffset({ x: 0, y: 0 });
    setScale(1);
  }, [image]);

  // Process effects whenever settings change
  useEffect(() => {
    // Skip processing if no image or if currently processing
    if (!image?.originalData || isProcessing) return;

    processEffects();
  }, [colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, image, isProcessing, processEffects]);

  // Sync manual edits with main canvas
  useEffect(() => {
    if (!manualEditsCanvasRef.current || !canvasRef.current || !image?.originalData) return;

    const manualCanvas = manualEditsCanvasRef.current;
    const mainCanvas = canvasRef.current;
    manualCanvas.width = mainCanvas.width;
    manualCanvas.height = mainCanvas.height;

    const manualCtx = manualCanvas.getContext('2d');
    const mainCtx = mainCanvas.getContext('2d');

    if (!manualCtx || !mainCtx) return;

    // Clear the manual edits canvas
    manualCtx.clearRect(0, 0, manualCanvas.width, manualCanvas.height);

    // Redraw the original image on the main canvas
    mainCtx.putImageData(image.originalData, 0, 0);

    // If there's processed data, draw it on top of the original image
    if (image.processedData) {
      mainCtx.putImageData(image.processedData, 0, 0);
    }
  }, [image?.originalData, image?.processedData]);

  const processEffects = useCallback(() => {
    if (!image?.originalData || !canvasRef.current || isProcessing) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!image.originalData,
      hasCanvas: !!canvas,
      hasManualEdits: !!manualEditsCanvasRef.current,
      isProcessing,
      imageHasProcessedData: !!image.processedData,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: effectSettings.background.enabled,
      inkStampEnabled: effectSettings.inkStamp.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled
    });

    try {
      // Determine restoration needs
      const needsSpeckleRestore = !speckleSettings.enabled && preSpeckleImageData;
      const needsEdgeCleanupRestore = !edgeCleanupSettings.enabled && preEdgeCleanupImageData;
      const needsInkStampRestore = !effectSettings.inkStamp.enabled && preInkStampImageData;

      let currentImageData: ImageData;

      // Handle restorations first
      if (needsSpeckleRestore) {
        console.log('Restoring from speckle processing');
        currentImageData = new ImageData(
          new Uint8ClampedArray(preSpeckleImageData.data),
          preSpeckleImageData.width,
          preSpeckleImageData.height
        );
        setPreSpeckleImageData(null);
      } else if (needsEdgeCleanupRestore) {
        console.log('Restoring from edge cleanup');
        currentImageData = new ImageData(
          new Uint8ClampedArray(preEdgeCleanupImageData.data),
          preEdgeCleanupImageData.width,
          preEdgeCleanupImageData.height
        );
        setPreEdgeCleanupImageData(null);
      } else if (needsInkStampRestore) {
        console.log('Restoring from ink stamp');
        currentImageData = new ImageData(
          new Uint8ClampedArray(preInkStampImageData.data),
          preInkStampImageData.width,
          preInkStampImageData.height
        );
        setPreInkStampImageData(null);
      } else {
        // Start with appropriate base data
        if (manualEditsCanvasRef.current && (effectSettings.inkStamp.enabled || effectSettings.imageEffects.enabled)) {
          console.log('Manual edits detected, applying ink stamp and/or image effects');
          const manualCanvas = manualEditsCanvasRef.current;
          const manualCtx = manualCanvas.getContext('2d');
          if (manualCtx) {
            currentImageData = manualCtx.getImageData(0, 0, manualCanvas.width, manualCanvas.height);
          } else {
            currentImageData = image.processedData || image.originalData;
          }
        } else {
          currentImageData = image.processedData || image.originalData;
        }
      }

      // Apply effects in order: Speckle -> Edge Cleanup -> Ink Stamp -> Image Effects

      // 1. Speckle processing
      if (speckleSettings.enabled && !needsSpeckleRestore) {
        if (!preSpeckleImageData) {
          setPreSpeckleImageData(new ImageData(
            new Uint8ClampedArray(currentImageData.data),
            currentImageData.width,
            currentImageData.height
          ));
        }
        
        const result = processSpecks(currentImageData, speckleSettings);
        currentImageData = result.processedData;
        onSpeckCountUpdate?.(result.speckCount);
      }

      // 2. Edge cleanup processing
      if (edgeCleanupSettings.enabled && !needsEdgeCleanupRestore) {
        if (!preEdgeCleanupImageData) {
          setPreEdgeCleanupImageData(new ImageData(
            new Uint8ClampedArray(currentImageData.data),
            currentImageData.width,
            currentImageData.height
          ));
        }
        
        if (edgeCleanupSettings.legacyEnabled) {
          currentImageData = applyLegacyEdgeCleanup(currentImageData, edgeCleanupSettings.legacyRadius);
        } else {
          currentImageData = applyEdgeCleanup(currentImageData, edgeCleanupSettings.trimRadius);
        }

        if (edgeCleanupSettings.softening.enabled && edgeCleanupSettings.softening.iterations > 0) {
          currentImageData = applySoftenEdges(currentImageData, edgeCleanupSettings.softening.iterations);
        }
      }

      // 3. Ink stamp processing
      if (effectSettings.inkStamp.enabled && !needsInkStampRestore) {
        if (!preInkStampImageData) {
          setPreInkStampImageData(new ImageData(
            new Uint8ClampedArray(currentImageData.data),
            currentImageData.width,
            currentImageData.height
          ));
        }
        
        console.log('Applying ink stamp effect');
        currentImageData = applyInkStampEffect(currentImageData, effectSettings.inkStamp);
      }

      // 4. Image effects processing
      if (effectSettings.imageEffects.enabled) {
        console.log('Applying image effects');
        currentImageData = applyImageEffects(currentImageData, effectSettings.imageEffects);
      }

      if (manualEditsCanvasRef.current && (effectSettings.inkStamp.enabled || effectSettings.imageEffects.enabled)) {
        console.log('Ink stamp and/or image effects applied to manual edits');
      }

      // Apply background if enabled
      if (effectSettings.background.enabled) {
        currentImageData = applyBackgroundColor(currentImageData, effectSettings.background.color);
      }

      // Update canvas
      canvas.width = currentImageData.width;
      canvas.height = currentImageData.height;
      ctx.putImageData(currentImageData, 0, 0);

      // Update image state
      const updatedImage = {
        ...image,
        processedData: currentImageData,
        status: 'completed' as const
      };
      onImageUpdate(updatedImage);

    } catch (error) {
      console.error('Error in processEffects:', error);
    }
  }, [
    image,
    colorSettings,
    effectSettings,
    speckleSettings,
    edgeCleanupSettings,
    isProcessing,
    preSpeckleImageData,
    preEdgeCleanupImageData,
    preInkStampImageData,
    processSpecks,
    onImageUpdate,
    onSpeckCountUpdate
  ]);

  const handleMouseDown = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image?.originalData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    switch (tool) {
      case 'pan':
        setIsDragging(true);
        setLastPosition({ x: event.clientX, y: event.clientY });
        break;
      case 'eraser':
        startErasing(x, y);
        break;
      case 'magic-wand':
        handleMagicWandClick(x, y);
        break;
      case 'color-stack':
        handleColorStackClick(x, y);
        break;
      default:
        break;
    }
  }, [tool, startErasing, handleMagicWandClick, handleColorStackClick]);

  const handleMouseMove = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !image?.originalData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    if (tool === 'pan' && isDragging) {
      const deltaX = event.clientX - lastPosition.x;
      const deltaY = event.clientY - lastPosition.y;

      setPanOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));

      setLastPosition({ x: event.clientX, y: event.clientY });
    } else if (tool === 'eraser' && isErasing) {
      erase(x, y);
    }
  }, [tool, isDragging, lastPosition, isErasing, erase]);

  const handleMouseUp = useCallback(() => {
    if (tool === 'pan') {
      setIsDragging(false);
    } else if (tool === 'eraser') {
      stopErasing();
    }
  }, [tool, stopErasing]);

  const handleMouseLeave = useCallback(() => {
    if (tool === 'pan') {
      setIsDragging(false);
    } else if (tool === 'eraser') {
      stopErasing();
    }
  }, [tool, stopErasing]);

  const handleWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const zoomSpeed = 0.1;
    const delta = event.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    const newScale = Math.max(0.1, scale + delta); // Prevent scale from going too small
    setScale(newScale);
  }, [scale]);

  const startErasing = useCallback((x: number, y: number) => {
    if (!canvasRef.current || !image?.originalData) return;

    console.log(`startErasing called at (${x}, ${y})`);
    setIsErasing(true);
    erasingInProgressRef.current = true;

    // Clear effect states when starting manual edits
    clearEffectStates();

    const canvas = manualEditsCanvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, eraserSettings.brushSize, 0, 2 * Math.PI);
    ctx.fill();

    setManualEdits(true);
    erase(x, y);

    // Add undo action
    addUndoAction({
      type: 'canvas_edit',
      description: 'Erase pixels',
      undo: () => {
        // Restore the original image data
        const mainCanvas = canvasRef.current;
        const mainCtx = mainCanvas?.getContext('2d');
        if (mainCtx && image.originalData) {
          mainCtx.putImageData(image.originalData, 0, 0);
        }

        // Clear the manual edits canvas
        const manualCanvas = manualEditsCanvasRef.current;
        const manualCtx = manualCanvas?.getContext('2d');
        if (manualCtx) {
          manualCtx.clearRect(0, 0, manualCanvas.width, manualCanvas.height);
        }
        setManualEdits(false);
      }
    });
  }, [image, eraserSettings.brushSize, clearEffectStates, addUndoAction]);

  const erase = useCallback((x: number, y: number) => {
    if (!manualEditsCanvasRef.current) return;

    const canvas = manualEditsCanvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, eraserSettings.brushSize, 0, 2 * Math.PI);
    ctx.fill();
  }, [eraserSettings.brushSize]);

  const stopErasing = useCallback(() => {
    setIsErasing(false);
    erasingInProgressRef.current = false;
  }, []);

  const handleMagicWandClick = useCallback((x: number, y: number) => {
    if (!canvasRef.current || !image?.originalData) return;

    console.log(`Magic wand clicked at (${x}, ${y})`);

    // Clear effect states when starting manual edits
    clearEffectStates();

    const canvas = manualEditsCanvasRef.current;
    const ctx = canvas?.getContext('2d');

    if (!ctx) return;

    const imageData = image.originalData;
    const clickedColor = imageData.data[(y * imageData.width + x) * 4] +
      imageData.data[(y * imageData.width + x) * 4 + 1] +
      imageData.data[(y * imageData.width + x) * 4 + 2];

    floodFill(x, y, contiguousSettings.threshold, imageData, (pixelIndex: number) => {
      imageData.data[pixelIndex] = 0;
      imageData.data[pixelIndex + 1] = 0;
      imageData.data[pixelIndex + 2] = 0;
      imageData.data[pixelIndex + 3] = 0;
    });

    ctx.putImageData(imageData, 0, 0);
    setManualEdits(true);

    // Add undo action
    addUndoAction({
      type: 'canvas_edit',
      description: 'Magic wand selection',
      undo: () => {
        // Restore the original image data
        const mainCanvas = canvasRef.current;
        const mainCtx = mainCanvas?.getContext('2d');
        if (mainCtx && image.originalData) {
          mainCtx.putImageData(image.originalData, 0, 0);
        }

        // Clear the manual edits canvas
        const manualCanvas = manualEditsCanvasRef.current;
        const manualCtx = manualCanvas?.getContext('2d');
        if (manualCtx) {
          manualCtx.clearRect(0, 0, manualCanvas.width, manualCanvas.height);
        }
        setManualEdits(false);
      }
    });
  }, [image, contiguousSettings.threshold, colorSettings, clearEffectStates, addUndoAction]);

  const handleColorStackClick = useCallback((x: number, y: number) => {
    if (!canvasRef.current || !image?.originalData) return;

    console.log(`Color stack clicked at (${x}, ${y})`);

    // Clear effect states when starting manual edits  
    clearEffectStates();

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const imageData = image.originalData;
    const color = `rgba(${imageData.data[(y * imageData.width + x) * 4]}, ${imageData.data[(y * imageData.width + x) * 4 + 1]}, ${imageData.data[(y * imageData.width + x) * 4 + 2]}, ${imageData.data[(y * imageData.width + x) * 4 + 3] / 255})`;
    onColorPicked(color);
  }, [image, onColorPicked, clearEffectStates]);

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center overflow-hidden"
      onWheel={handleWheel}
      ref={imageContainerRef}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center">
        <button
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md mr-2"
          onClick={onPreviousImage}
          disabled={!canGoPrevious}
        >
          Previous
        </button>
        <span>{currentImageIndex}/{totalImages}</span>
        <button
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md ml-2"
          onClick={onNextImage}
          disabled={!canGoNext}
        >
          Next
        </button>
        <button
          className="px-4 py-2 bg-blue-500 text-white rounded-md ml-4"
          onClick={onDownloadImage}
        >
          Download
        </button>
      </div>

      <div
        className="relative"
        style={{
          transform: `scale(${scale}) translateX(${panOffset.x}px) translateY(${panOffset.y}px)`,
          transformOrigin: 'center center',
          cursor: tool === 'pan' ? 'grab' : 'default',
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0"
          style={{
            opacity: manualEdits ? 0.5 : 1,
            zIndex: 1,
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />
        <canvas
          ref={manualEditsCanvasRef}
          className="absolute top-0 left-0"
          style={{
            zIndex: 2,
            pointerEvents: tool === 'pan' ? 'none' : 'auto',
          }}
        />
      </div>
    </div>
  );
};

export default MainCanvas;
