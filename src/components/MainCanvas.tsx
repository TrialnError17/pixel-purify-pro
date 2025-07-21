import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { useEraserTool } from '../hooks/useEraserTool';
import { useSpeckleTools } from '../hooks/useSpeckleTools';
import { useUndoManager } from '../hooks/useUndoManager';
import { ImageItem, ColorRemovalSettings, EffectSettings, PickedColor } from '../pages/Index';

interface Point {
  x: number;
  y: number;
}

interface ImageParams {
  zoom: number;
  pan: Point;
  rotation: number;
}

interface MainCanvasProps {
  image: ImageItem | null;
  tool: "pan" | "eraser" | "color-stack" | "magic-wand";
  onToolChange: React.Dispatch<React.SetStateAction<"pan" | "eraser" | "color-stack" | "magic-wand">>;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: any;
  effectSettings: EffectSettings;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
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
  setSingleImageProgress: React.Dispatch<React.SetStateAction<any>>;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: number) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image: selectedImage,
  tool: currentToolProp,
  onToolChange,
  colorSettings,
  contiguousSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  eraserSettings,
  erasingInProgressRef: erasingInProgressRefProp,
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
  addUndoAction: addUndoActionProp,
  onSpeckCountUpdate
}) => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const [imageQueue, setImageQueue] = useState<any[]>([]);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [imageParams, setImageParams] = useState<ImageParams>({ zoom: 1, pan: { x: 0, y: 0 }, rotation: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<string>(currentToolProp);
  const [speckleStreamId, setSpeckleStreamId] = useState<string | null>(null);
  const [speckleBranchName, setSpeckleBranchName] = useState<string | null>('main');
  const [speckleCommitId, setSpeckleCommitId] = useState<string | null>(null);
  const [showInspector, setShowInspector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showStreamInput, setShowStreamInput] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [autoProcessing, setAutoProcessing] = useState(true);
  const [explicitProcessingTriggered, setExplicitProcessingTriggered] = useState(false);
  const [eraserBrushSize, setEraserBrushSize] = useState<number>(10);

  // Add state to track last manual edit tool
  const [lastManualEditTool, setLastManualEditTool] = useState<string | null>(null);

  const zoom = imageParams.zoom;
  const pan = imageParams.pan;

  const { processImage } = useImageProcessor();
  const {
    undo,
    redo,
    addUndoAction,
    undoStack,
    canUndo,
    canRedo,
    clearHistory
  } = useUndoManager();

  // Modified eraser tool with enhanced onImageChange callback
  const eraserTool = useEraserTool(canvas.current, {
    brushSize: eraserBrushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef: erasingInProgressRefProp,
    onImageChange: useCallback((imageData: ImageData) => {
      console.log('Eraser onImageChange called - copying to processedData');
      
      // Immediately copy eraser buffer data to main processedData
      setImageQueue(prevQueue => {
        const currentImage = prevQueue.find(img => img.id === currentImageId);
        if (currentImage) {
          // Create new ImageData for processedData
          const newProcessedData = new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
          );
          
          const updatedImage = {
            ...currentImage,
            processedData: newProcessedData
          };
          
          return prevQueue.map(img => 
            img.id === currentImageId ? updatedImage : img
          );
        }
        return prevQueue;
      });
      
      // Mark that the eraser made the last manual edit
      setLastManualEditTool('eraser');
      hasManualEditsRef.current = true;
      
      // Add to undo history
      addUndoAction({
        type: 'canvas_edit',
        description: 'Eraser tool',
        undo: () => {
          // Restore previous state logic would go here
        }
      });
    }, [currentImageId, addUndoAction])
  });

  const speckleTools = useSpeckleTools();

  // Reset manual edit tracking when switching tools
  useEffect(() => {
    setCurrentTool(currentToolProp);
    if (currentToolProp !== 'eraser') {
      setLastManualEditTool(null);
    }
  }, [currentToolProp]);

  // Main processing useEffect with guard for eraser edits
  useEffect(() => {
    // GUARD: If last manual edit was eraser and no explicit processing triggered, don't auto-process
    if (hasManualEditsRef.current && 
        lastManualEditTool === 'eraser' && 
        !explicitProcessingTriggered) {
      console.log('Skipping auto-processing: preserving eraser edits');
      return;
    }

    if (!currentImageId || !autoProcessing) {
      return;
    }

    const currentImage = imageQueue.find(img => img.id === currentImageId);
    if (!currentImage) {
      console.warn(`Image with id ${currentImageId} not found in queue.`);
      return;
    }

    if (!currentImage.originalData) {
      console.warn(`Image with id ${currentImageId} has no original data.`);
      return;
    }

    const process = async () => {
      setIsProcessing(true);
      try {
        if (currentImage.originalData) {
          const defaultColorSettings = {
            enabled: false,
            mode: 'auto' as const,
            targetColor: '#ffffff',
            threshold: 10,
            contiguous: false,
            pickedColors: [],
            minRegionSize: { enabled: false, value: 100 }
          };
          const defaultEffectSettings = {
            imageEffects: { enabled: false, brightness: 0, contrast: 0, vibrance: 0, hue: 0, colorize: { enabled: false, hue: 0, saturation: 50, lightness: 50 }, blackAndWhite: false, invert: false },
            alphaFeathering: { enabled: false, radius: 2, strength: 50 },
            download: { trimTransparentPixels: false },
            background: { enabled: false, color: '#ffffff', saveWithBackground: false },
            inkStamp: { enabled: false, color: '#000000', threshold: 128 }
          };
          // processImage works with side effects and doesn't return data directly
          await processImage(currentImage, defaultColorSettings, defaultEffectSettings, setImageQueue);
        }
      } catch (err) {
        setErrorMessage(`Image processing failed: ${err}`);
        console.error(err);
      } finally {
        setIsProcessing(false);
      }
    };

    process();
  }, [
    currentImageId,
    imageQueue,
    processImage,
    autoProcessing,
    lastManualEditTool,
    explicitProcessingTriggered
  ]);

  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerRef.current.offsetHeight;
      setCenterOffset({ x: containerWidth / 2, y: containerHeight / 2 });
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const currentImage = imageQueue.find(img => img.id === currentImageId);
    if (canvas.current) {
      const ctx = canvas.current.getContext('2d');
      if (ctx && currentImage) {
        if (currentImage.processedData) {
          canvas.current.width = currentImage.processedData.width;
          canvas.current.height = currentImage.processedData.height;
          ctx.putImageData(currentImage.processedData, 0, 0);
          manualImageDataRef.current = new ImageData(
            new Uint8ClampedArray(currentImage.processedData.data),
            currentImage.processedData.width,
            currentImage.processedData.height
          );
        } else if (currentImage.originalData) {
          canvas.current.width = currentImage.originalData.width;
          canvas.current.height = currentImage.originalData.height;
          ctx.putImageData(currentImage.originalData, 0, 0);
          manualImageDataRef.current = new ImageData(
            new Uint8ClampedArray(currentImage.originalData.data),
            currentImage.originalData.width,
            currentImage.originalData.height
          );
        }
      }
    }
  }, [currentImageId, imageQueue]);

  const handleExplicitProcessing = useCallback(() => {
    setLastManualEditTool(null);
    hasManualEditsRef.current = false;
    setExplicitProcessingTriggered(true);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full h-full">
      <div className="canvas-container">
        <div className="canvas-wrapper">
          {/* Canvas */}
          <canvas
            ref={canvas}
            style={{
              transformOrigin: `${centerOffset.x}px ${centerOffset.y}px`,
              transform: `
                translate(${pan.x}px, ${pan.y}px)
                rotate(${imageParams.rotation}deg)
                scale(${zoom})
              `,
              cursor: currentTool === 'eraser' && eraserTool ? eraserTool.getBrushCursor() : 'default'
            }}
          />
        </div>

        {/* UI Elements */}
        <div className="absolute top-4 left-4 space-y-2">
          {isLoading && (
            <div className="bg-background/80 backdrop-blur-sm rounded px-3 py-2">
              Loading...
            </div>
          )}
          {isProcessing && (
            <div className="bg-background/80 backdrop-blur-sm rounded px-3 py-2">
              Processing...
            </div>
          )}
          {errorMessage && (
            <div className="bg-destructive/80 backdrop-blur-sm rounded px-3 py-2 text-destructive-foreground">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="bg-primary/80 backdrop-blur-sm rounded px-3 py-2 text-primary-foreground">
              {successMessage}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
