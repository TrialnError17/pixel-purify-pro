import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImageProcessing } from '../hooks/useImageProcessing';
import { useEraserTool } from '../hooks/useEraserTool';
import { useUndoRedo } from '../hooks/useUndoRedo';
import { ColorSettings, BackgroundSettings, InkStampSettings, EdgeCleanupSettings } from '../types/settings';

interface MainCanvasProps {
  imageData: ImageData | null;
  colorSettings: ColorSettings;
  backgroundSettings: BackgroundSettings;
  inkStampSettings: InkStampSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  zoom: number;
  pan: { x: number; y: number };
  centerOffset: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  eraserMode: boolean;
  brushSize: number;
  onImageChange?: (imageData: ImageData) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  imageData,
  colorSettings,
  backgroundSettings,
  inkStampSettings,
  edgeCleanupSettings,
  zoom,
  pan,
  centerOffset,
  containerRef,
  eraserMode,
  brushSize,
  onImageChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageDataRef = useRef<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const erasingInProgressRef = useRef(false);
  const [processedData, setProcessedData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const { processImageData, debouncedProcessImageData } = useImageProcessing();

  // Initialize undo/redo system
  const { saveState, undo, redo, canUndo, canRedo } = useUndoRedo({
    onRestore: (imageData: ImageData) => {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          manualImageDataRef.current = imageData;
          hasManualEditsRef.current = true;
          ctx.putImageData(imageData, 0, 0);
          onImageChange?.(imageData);
        }
      }
    }
  });

  // Handle image change for undo/redo system
  const handleImageChange = useCallback((newImageData: ImageData) => {
    saveState(newImageData);
    onImageChange?.(newImageData);
  }, [saveState, onImageChange]);

  // Initialize eraser tool
  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: handleImageChange
  });

  // Set up canvas when imageData changes
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !imageData) return;

    console.log('Setting up canvas with new image data');
    
    // Set canvas size to match image
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    
    // Store original image data
    originalImageDataRef.current = imageData;
    
    // Reset manual edits when new image is loaded
    manualImageDataRef.current = null;
    hasManualEditsRef.current = false;
    erasingInProgressRef.current = false;
    
    // Clear processed data
    setProcessedData(null);
    
    // Draw image to canvas
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
    }
  }, [imageData]);

  // Auto-processing effect - Apply effects when settings change
  useEffect(() => {
    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!originalImageDataRef.current,
      hasCanvas: !!canvasRef.current,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing,
      imageHasProcessedData: !!processedData,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: backgroundSettings.enabled,
      inkStampEnabled: inkStampSettings.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled,
      erasingInProgress: erasingInProgressRef.current
    });

    // Don't process if erasing is in progress
    if (erasingInProgressRef.current) {
      console.log('Early return - erasing in progress');
      return;
    }

    // Don't process if we have manual edits and no effects are enabled
    const hasAnyEffectEnabled = colorSettings.enabled || backgroundSettings.enabled || 
                               inkStampSettings.enabled || edgeCleanupSettings.enabled;
    
    if (hasManualEditsRef.current && !hasAnyEffectEnabled) {
      console.log('Early return - has manual edits and no effects enabled');
      return;
    }

    // Don't process if basic conditions aren't met
    if (!originalImageDataRef.current || !canvasRef.current || isProcessing) {
      console.log('Early return - missing requirements or processing');
      return;
    }

    // If we have manual edits and some effects are enabled, we need to be careful
    // Only reprocess if the user explicitly enabled new effects
    if (hasManualEditsRef.current && hasAnyEffectEnabled && processedData) {
      console.log('Early return - has manual edits with existing processed data');
      return;
    }

    // If no effects are enabled and we have processed data, clear it
    if (!hasAnyEffectEnabled && processedData) {
      console.log('Clearing processed data - no effects enabled');
      setProcessedData(null);
      
      // If we have manual edits, apply them to the canvas
      if (hasManualEditsRef.current && manualImageDataRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.putImageData(manualImageDataRef.current, 0, 0);
        }
      } else {
        // Otherwise, show original image
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.putImageData(originalImageDataRef.current, 0, 0);
        }
      }
      return;
    }

    // Only process if we actually need effects
    if (!hasAnyEffectEnabled) {
      console.log('Early return - no processing needed');
      return;
    }

    console.log('Starting image processing...');
    setIsProcessing(true);

    // Use debounced processing to avoid excessive processing
    debouncedProcessImageData(
      originalImageDataRef.current,
      colorSettings,
      backgroundSettings,
      inkStampSettings,
      edgeCleanupSettings
    ).then((result) => {
      // Double-check that erasing isn't in progress and we still need this result
      if (erasingInProgressRef.current) {
        console.log('Discarding processed result - erasing started during processing');
        setIsProcessing(false);
        return;
      }

      // If manual edits exist and no effects are enabled anymore, don't apply processed data
      const currentHasAnyEffect = colorSettings.enabled || backgroundSettings.enabled || 
                                 inkStampSettings.enabled || edgeCleanupSettings.enabled;
      
      if (hasManualEditsRef.current && !currentHasAnyEffect) {
        console.log('Discarding processed result - manual edits exist and no effects enabled');
        setIsProcessing(false);
        return;
      }

      console.log('Applying processed image data');
      setProcessedData(result);
      
      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) {
        // If we have manual edits, apply them on top of the processed data
        if (hasManualEditsRef.current && manualImageDataRef.current) {
          console.log('Applying manual edits on top of processed data');
          ctx.putImageData(manualImageDataRef.current, 0, 0);
        } else {
          ctx.putImageData(result, 0, 0);
        }
      }
      
      setIsProcessing(false);
    }).catch((error) => {
      console.error('Error processing image:', error);
      setIsProcessing(false);
    });
  }, [
    originalImageDataRef.current,
    colorSettings,
    backgroundSettings, 
    inkStampSettings,
    edgeCleanupSettings,
    canvasRef.current,
    isProcessing,
    processedData,
    debouncedProcessImageData,
    // Remove manualImageData from dependencies to prevent unwanted reprocessing
    // manualImageData - commented out to prevent eraser updates from triggering reprocessing
  ]);

  // Handle mouse events for eraser
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !eraserMode) return;

    const handleMouseDown = (e: MouseEvent) => eraserTool.startErasing(e);
    const handleMouseMove = (e: MouseEvent) => eraserTool.continueErasing(e);
    const handleMouseUp = (e: MouseEvent) => eraserTool.stopErasing(e);
    const handleMouseLeave = () => eraserTool.stopErasing();

    canvas.addEventListener('mousedown', handleMouseDown);
    canvas.addEventListener('mousemove', handleMouseMove);
    canvas.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      canvas.removeEventListener('mousedown', handleMouseDown);
      canvas.removeEventListener('mousemove', handleMouseMove);
      canvas.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [eraserMode, eraserTool]);

  // Handle touch events for eraser
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !eraserMode) return;

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      eraserTool.startErasing(e);
    };
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      eraserTool.continueErasing(e);
    };
    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      eraserTool.stopErasing(e);
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
    };
  }, [eraserMode, eraserTool]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        cursor: eraserMode ? eraserTool.getBrushCursor() : 'default',
        touchAction: eraserMode ? 'none' : 'auto'
      }}
    />
  );
};
