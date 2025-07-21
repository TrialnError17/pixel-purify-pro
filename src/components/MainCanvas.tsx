import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useImageProcessor } from '../hooks/useImageProcessor';
import { useEraserTool } from '../hooks/useEraserTool';
import { useSpeckleTools } from '../hooks/useSpeckleTools';
import { useUndoManager } from '../hooks/useUndoManager';

interface Point {
  x: number;
  y: number;
}

interface ImageParams {
  zoom: number;
  pan: Point;
  rotation: number;
}

export const MainCanvas = () => {
  const canvas = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const erasingInProgressRef = useRef(false);
  const [imageQueue, setImageQueue] = useState<any[]>([]);
  const [currentImageId, setCurrentImageId] = useState<string | null>(null);
  const [imageParams, setImageParams] = useState<ImageParams>({ zoom: 1, pan: { x: 0, y: 0 }, rotation: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [currentTool, setCurrentTool] = useState<string>('pan');
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
    addToHistory,
    history,
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
    erasingInProgressRef,
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
      addToHistory({
        type: 'manual-edit',
        imageData: new ImageData(
          new Uint8ClampedArray(imageData.data),
          imageData.width,
          imageData.height
        )
      });
    }, [currentImageId, addToHistory])
  });

  const speckleTools = useSpeckleTools({
    streamId: speckleStreamId,
    branchName: speckleBranchName,
    commitId: speckleCommitId,
    setImageQueue,
    setErrorMessage,
    setIsLoading,
    manualImageDataRef,
    hasManualEditsRef,
    clearHistory
  });

  // Reset manual edit tracking when switching tools
  useEffect(() => {
    if (currentTool !== 'eraser') {
      setLastManualEditTool(null);
    }
  }, [currentTool]);

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
          const processedImageData = await processImage(currentImage.originalData);

          setImageQueue(prevQueue => {
            const updatedQueue = prevQueue.map(img => {
              if (img.id === currentImageId) {
                return { ...img, processedData: processedImageData };
              }
              return img;
            });
            return updatedQueue;
          });
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
        

        {/* UI Elements */}
        
          {isLoading &&
            
              Loading...
            
          }
          {isProcessing &&
            
              Processing...
            
          }
          {errorMessage &&
            
              {errorMessage}
            
          }
          {successMessage &&
            
              {successMessage}
            
          }
        
      
    
  );
};
