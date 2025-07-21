import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Stage, Layer, Image, Rect, Transformer } from 'react-konva';
import Konva from 'konva';
import { useColorSettings } from '../contexts/ColorSettingsContext';
import { useEffectSettings } from '../contexts/EffectSettingsContext';
import { useSpeckleSettings } from '../contexts/SpeckleSettingsContext';
import { useEdgeCleanupSettings } from '../contexts/EdgeCleanupSettingsContext';
import { useSpeckleTools } from '../hooks/useSpeckleTools';
import { useEdgeCleanup } from '../hooks/useEdgeCleanup';
import { useDebounce } from '../hooks/useDebounce';

interface MainCanvasProps {
  image: HTMLImageElement | null;
  tool: string;
  brushSize: number;
  colorSettings: {
    enabled: boolean;
    removeColor: string;
    threshold: number;
  };
  effectSettings: {
    background: {
      enabled: boolean;
      color: string;
    };
    inkStamp: {
      enabled: boolean;
      color: string;
    };
  };
  speckleSettings: {
    enabled: boolean;
    speckSize: number;
    speckDensity: number;
    colorDiversity: number;
    fuzziness: number;
  };
  edgeCleanupSettings: {
    enabled: boolean;
    radius: number;
    threshold: number;
  };
  onImageUpdate: (imageData: ImageData) => void;
  onImageChange: (newImage: HTMLImageElement) => void;
  onSelectionChange: (selection: { x: number; y: number; width: number; height: number } | null) => void;
  isProcessing: boolean;
  onProcessingChange: (processing: boolean) => void;
  processAllTrigger: boolean;
  onDownloadImage: () => void;
  setSingleImageProgress: (progress: number) => void;
  addUndoAction: (imageData: ImageData) => void;
  onSpeckCountUpdate: (speckCount: number) => void;
  triggerExplicitProcessing: React.MutableRefObject<(() => void) | null>;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  tool,
  brushSize,
  colorSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  onImageUpdate,
  onImageChange,
  onSelectionChange,
  isProcessing: externalIsProcessing,
  onProcessingChange,
  processAllTrigger,
  onDownloadImage,
  setSingleImageProgress,
  addUndoAction,
  onSpeckCountUpdate,
  triggerExplicitProcessing
}) => {
  const { processSpecks } = useSpeckleTools();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedImageData, setProcessedImageData] = useState<ImageData | null>(null);
  const isDraggingRef = useRef(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedArea, setSelectedArea] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const selectionRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const [previousTool, setPreviousTool] = useState<string>('');
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  const hasManualEditsRef = useRef(false);
  const isProcessingEdgeCleanupRef = useRef(false);
  const explicitProcessingRef = useRef(false);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  const { processEdgeCleanup } = useEdgeCleanup();
  const [stageWidth, setStageWidth] = useState(0);
  const stageRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [lastDist, setLastDist] = useState(0);
  const [isSelectionBox, setIsSelectionBox] = useState(false);
  const selectionBoxRef = useRef<Konva.Rect>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [selectionStartPoint, setSelectionStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [selectionEndPoint, setSelectionEndPoint] = useState<{ x: number; y: number } | null>(null);

  const debouncedProcessImageData = useDebounce(processedImageData, 500);

  useEffect(() => {
    if (externalIsProcessing) {
      setIsProcessing(true);
    } else {
      setIsProcessing(false);
    }
  }, [externalIsProcessing]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current) return;
      setStageWidth(canvasRef.current.offsetWidth);
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    if (image && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0);

      const imageData = ctx.getImageData(0, 0, image.width, image.height);
      setOriginalImageData(imageData);
      setProcessedImageData(imageData);
      onImageUpdate(imageData);
    }
  }, [image, onImageUpdate]);

  useEffect(() => {
    if (originalImageData) {
      addUndoAction(originalImageData);
    }
  }, [originalImageData, addUndoAction]);

  useEffect(() => {
    if (processAllTrigger && originalImageData) {
      setProcessedImageData(originalImageData);
    }
  }, [processAllTrigger, originalImageData]);

  useEffect(() => {
    if (debouncedProcessImageData) {
      onImageUpdate(debouncedProcessImageData);
    }
  }, [debouncedProcessImageData, onImageUpdate]);

  const handleDownload = () => {
    setIsDownloading(true);
    if (canvasRef.current && processedImageData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Create a temporary canvas to draw the processed image data
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = processedImageData.width;
      tempCanvas.height = processedImageData.height;
      const tempCtx = tempCanvas.getContext('2d');
      if (!tempCtx) return;

      // Put the processed image data onto the temporary canvas
      tempCtx.putImageData(processedImageData, 0, 0);

      // Convert the temporary canvas to a data URL
      const dataURL = tempCanvas.toDataURL('image/png');

      // Create a temporary link element to trigger the download
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = 'processed_image.png'; // Set the filename
      document.body.appendChild(link); // Append to the document
      link.click(); // Simulate a click
      document.body.removeChild(link); // Remove the link after download

      setIsDownloading(false);
      onDownloadImage();
    }
  };

  const handleUndo = () => {
    // Placeholder for undo functionality
  };

  const handleRedo = () => {
    // Placeholder for redo functionality
  };

  const handleStageMouseDown = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      const stage = e.target.getStage();
      if (!stage) return;
      setIsSelectionBox(true);
      const mousePoint = stage.getPointerPosition();
      if (mousePoint) {
        setSelectionStartPoint({
          x: mousePoint.x / scale - position.x / scale,
          y: mousePoint.y / scale - position.y / scale,
        });
        setSelectionEndPoint({
          x: mousePoint.x / scale - position.x / scale,
          y: mousePoint.y / scale - position.y / scale,
        });
      }
    }
  };

  const handleStageMouseUp = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select') {
      setIsSelectionBox(false);
      if (selectionStartPoint && selectionEndPoint) {
        const x = Math.min(selectionStartPoint.x, selectionEndPoint.x);
        const y = Math.min(selectionStartPoint.y, selectionEndPoint.y);
        const width = Math.abs(selectionEndPoint.x - selectionStartPoint.x);
        const height = Math.abs(selectionEndPoint.y - selectionStartPoint.y);
        setSelectedArea({ x, y, width, height });
        onSelectionChange({ x, y, width, height });
      }
    }
  };

  const handleStageMouseMove = (e: Konva.KonvaEventObject<MouseEvent>) => {
    if (tool === 'select' && isSelectionBox) {
      const stage = e.target.getStage();
      if (!stage) return;
      const mousePoint = stage.getPointerPosition();
      if (mousePoint) {
        setSelectionEndPoint({
          x: mousePoint.x / scale - position.x / scale,
          y: mousePoint.y / scale - position.y / scale,
        });
      }
    }
  };

  const handleTransformerDragStart = () => {
    isDraggingRef.current = true;
    setIsDragging(true);
  };

  const handleTransformerDragEnd = () => {
    isDraggingRef.current = false;
    setIsDragging(false);
    if (selectedArea) {
      const node = transformerRef.current?.getNode();
      if (node) {
        const newX = node.x();
        const newY = node.y();
        const newWidth = node.width();
        const newHeight = node.height();
        setSelectedArea({ x: newX, y: newY, width: newWidth, height: newHeight });
        onSelectionChange({ x: newX, y: newY, width: newWidth, height: newHeight });
      }
    }
  };

  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.container().focus();
    }
  }, []);

  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const stage = stageRef.current;
    if (!stage) return;

    const scaleBy = 1.1;
    const oldScale = stage.scaleX();

    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.deltaY > 0 ? 1 : -1;

    const newScale = direction > 0 ? oldScale / scaleBy : oldScale * scaleBy;

    setScale(newScale);
    setPosition({
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    });
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const dist = Math.sqrt(
        (touch2.clientX - touch1.clientX) ** 2 +
        (touch2.clientY - touch1.clientY) ** 2
      );

      setLastDist(dist);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    const stage = stageRef.current;
    if (!stage) return;

    e.preventDefault();

    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];

      const dist = Math.sqrt(
        (touch2.clientX - touch1.clientX) ** 2 +
        (touch2.clientY - touch1.clientY) ** 2
      );

      if (!lastDist) {
        setLastDist(dist);
        return;
      }

      const scaleBy = dist / lastDist;
      const oldScale = stage.scaleX();
      const newScale = oldScale * scaleBy;

      const pointer = stage.getPointerPosition();
      if (!pointer) return;

      const mousePointTo = {
        x: (pointer.x - stage.x()) / oldScale,
        y: (pointer.y - stage.y()) / oldScale,
      };

      setScale(newScale);
      setPosition({
        x: pointer.x - mousePointTo.x * newScale,
        y: pointer.y - mousePointTo.y * newScale,
      });
      setLastDist(dist);
    }
  };

  // Track tool changes to update previousTool
  useEffect(() => {
    console.log(`Tool changed from ${previousTool} to ${tool}`);
    if (previousTool && previousTool !== tool) {
      // When switching away from eraser, we want to preserve what the previous tool was
      setPreviousTool(previousTool);
    } else if (!previousTool) {
      // First time setting the tool
      setPreviousTool(tool);
    }
  }, [tool, previousTool]);

  const handleErase = useCallback(
    (x: number, y: number) => {
      if (!canvasRef.current || !originalImageData) return;

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const width = originalImageData.width;
      const height = originalImageData.height;

      // Ensure manualImageData is initialized
      if (!manualImageDataRef.current) {
        manualImageDataRef.current = new ImageData(
          new Uint8ClampedArray(originalImageData.data),
          width,
          height
        );
      }

      const localManualImageData = manualImageDataRef.current;

      // Perform the erasing operation directly on manualImageData
      for (let i = -brushSize; i <= brushSize; i++) {
        for (let j = -brushSize; j <= brushSize; j++) {
          if (i * i + j * j <= brushSize * brushSize) {
            const pixelX = Math.round(x + i);
            const pixelY = Math.round(y + j);

            if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
              const pixelIndex = (pixelY * width + pixelX) * 4;
              localManualImageData.data[pixelIndex + 3] = 0; // Set alpha to 0
            }
          }
        }
      }

      // Update the canvas with the modified manualImageData
      ctx.putImageData(localManualImageData, 0, 0);
      setManualImageData(new ImageData(new Uint8ClampedArray(localManualImageData.data), width, height));
      hasManualEditsRef.current = true;
    },
    [brushSize, originalImageData]
  );

  const handleMouseDown = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'eraser' && canvasRef.current && originalImageData) {
        isDraggingRef.current = true;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleErase(x, y);
      }
    },
    [tool, handleErase]
  );

  const handleMouseUp = useCallback(() => {
    if (tool === 'eraser') {
      isDraggingRef.current = false;
      if (canvasRef.current && originalImageData && manualImageDataRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.putImageData(manualImageDataRef.current, 0, 0);
        const newImageData = ctx.getImageData(0, 0, originalImageData.width, originalImageData.height);
        setProcessedImageData(newImageData);
        onImageUpdate(newImageData);
        addUndoAction(originalImageData);
      }
    }
  }, [tool, originalImageData, onImageUpdate, addUndoAction]);

  const handleMouseMove = useCallback(
    (event: React.MouseEvent<HTMLCanvasElement>) => {
      if (tool === 'eraser' && isDraggingRef.current && canvasRef.current && originalImageData) {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        handleErase(x, y);
      }
    },
    [tool, handleErase]
  );

  // Main processing useEffect 
  useEffect(() => {
    console.log('Processing effect triggered - checking conditions:', {
      hasOriginalImageData: !!originalImageData,
      hasCanvas: !!canvasRef.current,
      hasManualEdits: hasManualEditsRef.current,
      isProcessing,
      imageHasProcessedData: !!processedImageData,
      colorSettingsEnabled: colorSettings.enabled,
      backgroundEnabled: effectSettings.background.enabled,
      inkStampEnabled: effectSettings.inkStamp.enabled,
      edgeCleanupEnabled: edgeCleanupSettings.enabled,
      previousTool,
      explicitProcessing: explicitProcessingRef.current
    });

    if (!originalImageData || !canvasRef.current || isProcessing) {
      if (!originalImageData) console.log('Early return - no original image data');
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
    
    // Skip ALL processing if color removal is disabled and no other effects are enabled
    const hasAnyProcessingEnabled = colorSettings.enabled || 
      effectSettings.background.enabled || 
      effectSettings.inkStamp.enabled || 
      edgeCleanupSettings.enabled;

    if (!hasAnyProcessingEnabled) {
      console.log('Early return - no processing needed');
      return;
    }

    setIsProcessing(true);
    onProcessingChange(true);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = originalImageData.width;
    const height = originalImageData.height;

    let newImageData = new ImageData(new Uint8ClampedArray(originalImageData.data), width, height);

    const processImage = async () => {
      let progress = 0;
      const totalSteps = (colorSettings.enabled ? 1 : 0) +
        (effectSettings.background.enabled ? 1 : 0) +
        (effectSettings.inkStamp.enabled ? 1 : 0) +
        (speckleSettings.enabled ? 1 : 0) +
        (edgeCleanupSettings.enabled ? 1 : 0);
      let currentStep = 0;

      const updateProgress = () => {
        currentStep++;
        progress = currentStep / totalSteps;
        setSingleImageProgress(progress);
      };

      // Color Removal
      if (colorSettings.enabled) {
        const removeColor = colorSettings.removeColor;
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
        updateProgress();
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
          }
        }
        updateProgress();
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
        updateProgress();
      }

      // Speckle Effect
      if (speckleSettings.enabled) {
        const { speckSize, speckDensity, colorDiversity, fuzziness } = speckleSettings;
        newImageData = processSpecks(newImageData, speckSize, speckDensity, colorDiversity, fuzziness, onSpeckCountUpdate);
        updateProgress();
      }

      // Edge Cleanup
      if (edgeCleanupSettings.enabled) {
        const { radius, threshold } = edgeCleanupSettings;
        isProcessingEdgeCleanupRef.current = true;
        newImageData = await processEdgeCleanup(newImageData, radius, threshold, setSingleImageProgress);
        isProcessingEdgeCleanupRef.current = false;
        updateProgress();
      }

      return newImageData;
    };

    processImage().then(processed => {
      if (processed) {
        ctx.putImageData(processed, 0, 0);
        setProcessedImageData(processed);
      }
      setIsProcessing(false);
      onProcessingChange(false);
      explicitProcessingRef.current = false;
      setSingleImageProgress(0);
    });

  }, [originalImageData, colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, manualImageData, debouncedProcessImageData, processSpecks, processEdgeCleanup, onSpeckCountUpdate, isDragging, previousTool]);

  useEffect(() => {
    if (selectedArea && transformerRef.current) {
      transformerRef.current.nodes([selectionBoxRef.current]);
    } else if (transformerRef.current) {
      transformerRef.current.nodes([]);
    }
  }, [selectedArea]);

  // Function to trigger explicit processing (overrides eraser protection)
  const handleTriggerExplicitProcessing = useCallback(() => {
    console.log('Explicit processing triggered - will override eraser protection');
    explicitProcessingRef.current = true;
    // Force a re-render to trigger the processing effect
    setProcessedImageData(prev => prev);
  }, []);

  // Expose triggerExplicitProcessing to parent component
  useEffect(() => {
    if (triggerExplicitProcessing) {
      triggerExplicitProcessing.current = handleTriggerExplicitProcessing;
    }
  }, [triggerExplicitProcessing, handleTriggerExplicitProcessing]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        position: 'relative'
      }}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <div
        ref={canvasRef}
        style={{
          width: '100%',
          maxWidth: '100%',
          maxHeight: '100%',
          aspectRatio: image ? `${image.width} / ${image.height}` : 'auto',
          position: 'relative',
          cursor: tool === 'eraser' ? 'crosshair' : 'default',
        }}
        onMouseDown={tool === 'eraser' ? handleMouseDown : undefined}
        onMouseUp={tool === 'eraser' ? handleMouseUp : undefined}
        onMouseMove={tool === 'eraser' ? handleMouseMove : undefined}
      >
        {image && (
          <Stage
            width={stageWidth}
            height={canvasRef.current ? canvasRef.current.offsetHeight : 0}
            style={{
              width: '100%',
              height: '100%',
            }}
            scaleX={scale}
            scaleY={scale}
            x={position.x}
            y={position.y}
            ref={stageRef}
            onMouseDown={handleStageMouseDown}
            onMouseUp={handleStageMouseUp}
            onMouseMove={handleStageMouseMove}
          >
            <Layer>
              <Image image={image} width={image.width} height={image.height} />
              {isSelectionBox && selectionStartPoint && selectionEndPoint && (
                <Rect
                  x={Math.min(selectionStartPoint.x, selectionEndPoint.x)}
                  y={Math.min(selectionStartPoint.y, selectionEndPoint.y)}
                  width={Math.abs(selectionEndPoint.x - selectionStartPoint.x)}
                  height={Math.abs(selectionEndPoint.y - selectionStartPoint.y)}
                  fill="rgba(0,0,255,0.2)"
                  stroke="blue"
                  strokeWidth={1}
                />
              )}
              {selectedArea && (
                <Rect
                  x={selectedArea.x}
                  y={selectedArea.y}
                  width={selectedArea.width}
                  height={selectedArea.height}
                  stroke="red"
                  strokeWidth={2}
                  visible={tool === 'select'}
                  ref={selectionBoxRef}
                  draggable
                  onDragStart={handleTransformerDragStart}
                  onDragEnd={handleTransformerDragEnd}
                />
              )}
              {selectedArea && tool === 'select' && (
                <Transformer
                  ref={transformerRef}
                  rotateEnabled={false}
                  keepRatio={false}
                />
              )}
            </Layer>
          </Stage>
        )}
      </div>
    </div>
  );
};
