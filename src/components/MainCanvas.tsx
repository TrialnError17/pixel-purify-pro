import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useSpeckleTools } from '../hooks/useSpeckleTools';
import { ImageItem, ColorRemovalSettings, EffectSettings, EdgeCleanupSettings, EraserSettings, ContiguousToolSettings } from '../pages/Index';
import { SpeckleSettings } from '../hooks/useSpeckleTools';

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
  onImageUpdate: (updatedImage: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: (progress: number) => void;
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
  onSpeckCountUpdate,
}) => {
  const { processSpecks } = useSpeckleTools();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousTool, setPreviousTool] = useState<string>('');
  const hasManualEditsRef = useRef(false);
  const explicitProcessingRef = useRef(false);

  // Track tool changes to update previousTool
  useEffect(() => {
    console.log(`Tool changed from ${previousTool} to ${tool}`);
    if (previousTool && previousTool !== tool) {
      setPreviousTool(previousTool);
    } else if (!previousTool) {
      setPreviousTool(tool);
    }
  }, [tool, previousTool]);

  // Main processing useEffect 
  useEffect(() => {
    console.log('Processing effect triggered - checking conditions:', {
      hasImage: !!image,
      hasOriginalData: !!image?.originalData,
      hasCanvas: !!canvasRef.current,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: effectSettings.background.enabled,
      inkStampEnabled: effectSettings.inkStamp.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled,
      previousTool,
      explicitProcessing: explicitProcessingRef.current
    });

    if (!image?.originalData || !canvasRef.current || isProcessing) {
      if (!image?.originalData) console.log('Early return - no original image data');
      if (!canvasRef.current) console.log('Early return - no canvas');
      if (isProcessing) console.log('Early return - already processing');
      return;
    }

    // Early return guard to prevent overwriting eraser edits
    if (
      hasManualEditsRef.current === true &&
      previousTool === 'eraser' &&
      !explicitProcessingRef.current
    ) {
      console.log('Early return - eraser edits protection active');
      return;
    }
    
    // Skip ALL processing if no effects are enabled
    const hasAnyProcessingEnabled = colorSettings.enabled || 
      effectSettings.background.enabled || 
      effectSettings.inkStamp.enabled || 
      edgeCleanupSettings.enabled;

    if (!hasAnyProcessingEnabled) {
      console.log('Early return - no processing needed');
      return;
    }

    setIsProcessing(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const originalImageData = image.originalData;
    const width = originalImageData.width;
    const height = originalImageData.height;

    let newImageData = new ImageData(new Uint8ClampedArray(originalImageData.data), width, height);

    const processImage = async () => {
      // Color Removal
      if (colorSettings.enabled) {
        const removeColor = colorSettings.targetColor;
        const threshold = colorSettings.threshold;

        const targetColor = {
          r: parseInt(removeColor.slice(1, 3), 16),
          g: parseInt(removeColor.slice(3, 5), 16),
          b: parseInt(removeColor.slice(5, 7), 16),
        };

        for (let i = 0; i < newImageData.data.length; i += 4) {
          const r = newImageData.data[i];
          const g = newImageData.data[i + 1];
          const b = newImageData.data[i + 2];

          const distance = Math.sqrt(
            (r - targetColor.r) ** 2 +
            (g - targetColor.g) ** 2 +
            (b - targetColor.b) ** 2
          );

          if (distance < threshold) {
            newImageData.data[i + 3] = 0;
          }
        }
      }

      // Background Color
      if (effectSettings.background.enabled) {
        const backgroundColor = effectSettings.background.color;
        const bgR = parseInt(backgroundColor.slice(1, 3), 16);
        const bgG = parseInt(backgroundColor.slice(3, 5), 16);
        const bgB = parseInt(backgroundColor.slice(5, 7), 16);

        for (let i = 0; i < newImageData.data.length; i += 4) {
          if (newImageData.data[i + 3] === 0) {
            newImageData.data[i] = bgR;
            newImageData.data[i + 1] = bgG;
            newImageData.data[i + 2] = bgB;
            newImageData.data[i + 3] = 255;
          }
        }
      }

      // Ink Stamp Effect
      if (effectSettings.inkStamp.enabled) {
        const inkStampColor = effectSettings.inkStamp.color;
        const inkR = parseInt(inkStampColor.slice(1, 3), 16);
        const inkG = parseInt(inkStampColor.slice(3, 5), 16);
        const inkB = parseInt(inkStampColor.slice(5, 7), 16);

        for (let i = 0; i < newImageData.data.length; i += 4) {
          if (newImageData.data[i + 3] !== 0) {
            newImageData.data[i] = inkR;
            newImageData.data[i + 1] = inkG;
            newImageData.data[i + 2] = inkB;
          }
        }
      }

      // Speckle Processing  
      if (speckleSettings.enabled) {
        const result = processSpecks(newImageData, speckleSettings);
        newImageData = result.processedData;
      }

      return newImageData;
    };

    processImage().then(processed => {
      if (processed) {
        ctx.putImageData(processed, 0, 0);
        
        // Update the image with processed data
        const updatedImage: ImageItem = {
          ...image,
          processedData: processed,
          status: 'completed'
        };
        
        onImageUpdate(updatedImage);
      }
      setIsProcessing(false);
      explicitProcessingRef.current = false;
    });

  }, [image?.originalData, colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, processSpecks, previousTool, onImageUpdate]);

  // Draw image on canvas when it changes
  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Use processed data if available, otherwise original data
      const imageData = image.processedData || image.originalData;
      if (imageData) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        ctx.putImageData(imageData, 0, 0);
      }
    }
  }, [image]);

  const handleCanvasMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'eraser' && image?.originalData) {
        erasingInProgressRef.current = true;
        hasManualEditsRef.current = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Simple eraser implementation
        const brushSize = eraserSettings.brushSize;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    [tool, image, erasingInProgressRef, eraserSettings.brushSize]
  );

  const handleCanvasMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'eraser' && erasingInProgressRef.current && image?.originalData) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Simple eraser implementation
        const brushSize = eraserSettings.brushSize;
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
    },
    [tool, erasingInProgressRef, image, eraserSettings.brushSize]
  );

  const handleCanvasMouseUp = useCallback(() => {
    if (tool === 'eraser') {
      erasingInProgressRef.current = false;
      
      // Update image with eraser changes
      if (canvasRef.current && image) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const updatedImage: ImageItem = {
            ...image,
            processedData: newImageData
          };
          onImageUpdate(updatedImage);
        }
      }
    }
  }, [tool, erasingInProgressRef, image, onImageUpdate]);

  if (!image) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        No image selected
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="relative max-w-full max-h-full">
        <canvas
          ref={canvasRef}
          className="max-w-full max-h-full border border-border rounded-lg shadow-lg"
          style={{
            cursor: tool === 'eraser' ? 'crosshair' : 'default',
          }}
          onMouseDown={handleCanvasMouseDown}
          onMouseMove={handleCanvasMouseMove}
          onMouseUp={handleCanvasMouseUp}
          onMouseLeave={handleCanvasMouseUp}
        />
      </div>
    </div>
  );
};