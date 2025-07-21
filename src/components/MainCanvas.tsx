import React, {
  useState,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import { Stage, Layer, Image, Rect, Text } from 'react-konva';
import { useDebounce } from 'use-debounce';
import { useHotkeys } from 'react-hotkeys-hook';
import { CirclePicker } from 'react-color';
import { UndoManager } from 'undo-manager';

import { processImage } from '../utils/imageProcessor';
import {
  ColorSettings,
  EffectSettings,
  SpeckleSettings,
  EdgeCleanupSettings,
} from '../types';
import { useAppSettings } from '../contexts/AppSettingsContext';
import { useImageSettings } from '../contexts/ImageSettingsContext';
import { useToolSettings } from '../contexts/ToolSettingsContext';
import { useFileContext } from '../contexts/FileContext';
import { useZoomContext } from '../contexts/ZoomContext';
import { usePanContext } from '../contexts/PanContext';
import { useHistoryContext } from '../contexts/HistoryContext';
import { useColorContext } from '../contexts/ColorContext';
import { useEffectContext } from '../contexts/EffectContext';
import { useSpeckleContext } from '../contexts/SpeckleContext';
import { useEdgeCleanupContext } from '../contexts/EdgeCleanupContext';
import { useDownloadContext } from '../contexts/DownloadContext';
import { useProcessingContext } from '../contexts/ProcessingContext';
import { useUndoContext } from '../contexts/UndoContext';
import { useRedoContext } from '../contexts/RedoContext';
import { useToolContext } from '../contexts/ToolContext';
import { optimizedMagicWandSelect } from '../utils/optimizedMagicWand';

interface MainCanvasProps {
  width: number;
  height: number;
}

const MainCanvas: React.FC<MainCanvasProps> = ({ width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const konvaContainerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<any>(null);
  const [konvaWidth, setKonvaWidth] = useState(width);
  const [konvaHeight, setKonvaHeight] = useState(height);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [konvaImage, setKonvaImage] = useState<any>(null);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const [processedImageData, setProcessedImageData] =
    useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingColor, setDrawingColor] = useState('#000000');
  const [drawingLineWidth, setDrawingLineWidth] = useState(5);
  const [lines, setLines] = useState<any[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [showMouseCoords, setShowMouseCoords] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);

  const { appSettings } = useAppSettings();
  const { imageSettings } = useImageSettings();
  const { toolSettings } = useToolSettings();
  const { file } = useFileContext();
  const { zoomLevel } = useZoomContext();
  const { pan } = usePanContext();
  const { addHistory } = useHistoryContext();
  const { colorSettings } = useColorContext();
  const { effectSettings } = useEffectContext();
  const { speckleSettings } = useSpeckleContext();
  const { edgeCleanupSettings } = useEdgeCleanupContext();
  const { setDownloadData } = useDownloadContext();
  const { setProcessing } = useProcessingContext();
  const { undoManager } = useUndoContext();
  const { redoManager } = useRedoContext();
  const { selectedTool, setSelectedTool } = useToolContext();

  const originalImageData = useMemo(() => {
    if (!image) return null;

    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(image, 0, 0);
    return ctx.getImageData(0, 0, image.width, image.height);
  }, [image]);

  // Load image when file changes
  useEffect(() => {
    if (!file) {
      setImage(null);
      setKonvaImage(null);
      setManualImageData(null);
      setProcessedImageData(null);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      if (!e.target || typeof e.target.result !== 'string') {
        console.error('Failed to load image.');
        return;
      }

      const img = new Image();
      img.onload = () => {
        setImage(img);
        setKonvaImage(img);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }, [file]);

  // Initialize canvas and Konva when image loads
  useEffect(() => {
    if (!image) return;

    setKonvaWidth(image.width);
    setKonvaHeight(image.height);

    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(image, 0, 0);
    const imageData = ctx.getImageData(0, 0, image.width, image.height);
    setManualImageData(imageData);
  }, [image]);

  // Process image when settings or manual image data change
  useEffect(() => {
    if (!originalImageData) return;
    if (!manualImageData) return;

    const process = async () => {
      setIsProcessing(true);
      setProcessing(true);
      try {
        const processed = await processImage(
          manualImageData,
          colorSettings,
          effectSettings,
          speckleSettings,
          edgeCleanupSettings
        );
        setProcessedImageData(processed);
      } catch (error) {
        console.error('Image processing error:', error);
      } finally {
        setIsProcessing(false);
        setProcessing(false);
      }
    };

    process();
  }, [
    manualImageData,
    colorSettings,
    effectSettings,
    speckleSettings,
    edgeCleanupSettings,
    originalImageData,
    setProcessing,
  ]);

  // Update Konva image data when processed image data changes
  useEffect(() => {
    if (!processedImageData) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.putImageData(processedImageData, 0, 0);
    const newImage = new Image();
    newImage.onload = () => {
      setKonvaImage(newImage);
    };
    newImage.src = canvas.toDataURL();
  }, [processedImageData]);

  // Download data
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const dataURL = canvas.toDataURL(
      imageSettings.outputFormat,
      imageSettings.outputQuality
    );
    setDownloadData(dataURL);
  }, [
    imageSettings.outputFormat,
    imageSettings.outputQuality,
    setDownloadData,
    processedImageData,
  ]);

  // Canvas Drag and Panning
  const handleMouseDown = useCallback(
    (e: any) => {
      if (selectedTool === 'pan') {
        setIsDragging(true);
        setDragStart({
          x: e.evt.clientX / zoomLevel - pan.x,
          y: e.evt.clientY / zoomLevel - pan.y,
        });
      } else if (selectedTool === 'draw') {
        setIsDrawing(true);
        const stage = stageRef.current;
        if (stage) {
          const point = stage.getPointerPosition();
          if (point) {
            setLines([...lines, { points: [point.x, point.y], color: drawingColor, lineWidth: drawingLineWidth }]);
          }
        }
      }
    },
    [zoomLevel, pan, selectedTool, lines, drawingColor, drawingLineWidth]
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      const stage = stageRef.current;
      if (stage) {
        const pointer = stage.getPointerPosition();
        if (pointer) {
          setMousePosition({
            x: Math.round(pointer.x),
            y: Math.round(pointer.y),
          });
        }
      }

      if (isDragging) {
        pan.setX(e.evt.clientX / zoomLevel - dragStart.x);
        pan.setY(e.evt.clientY / zoomLevel - dragStart.y);
      } else if (isDrawing) {
        const stage = stageRef.current;
        if (stage) {
          const point = stage.getPointerPosition();
          if (point) {
            const lastLine = lines[lines.length - 1];
            const newPoints = lastLine.points.concat([point.x, point.y]);
            lines.splice(lines.length - 1, 1, { points: newPoints, color: drawingColor, lineWidth: drawingLineWidth });
            setLines(lines.concat());
          }
        }
      }
    },
    [isDragging, dragStart, zoomLevel, pan, isDrawing, lines, drawingColor, drawingLineWidth]
  );

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    } else if (isDrawing) {
      setIsDrawing(false);
      undoManager.addState({
        imageData: manualImageData,
        colorSettings,
        effectSettings,
        speckleSettings,
        edgeCleanupSettings
      });
    }
  }, [isDragging, isDrawing, manualImageData, colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, undoManager]);

  const handleMouseLeave = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    } else if (isDrawing) {
      setIsDrawing(false);
    }
  }, [isDragging, isDrawing]);

  // Zooming
  const handleWheel = useCallback(
    (e: any) => {
      if (selectedTool === 'zoom') {
        e.evt.preventDefault();
        const scaleBy = 1.1;
        const stage = stageRef.current;
        if (stage) {
          const oldScale = stage.scaleX();
          const pointer = stage.getPointerPosition();

          if (pointer) {
            const mousePointTo = {
              x: pointer.x / oldScale - stage.x() / oldScale,
              y: pointer.y / oldScale - stage.y() / oldScale,
            };

            const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;

            zoomLevel.setZoom(newScale);

            const newPos = {
              x: pointer.x / newScale - mousePointTo.x * newScale,
              y: pointer.y / newScale - mousePointTo.y * newScale,
            };

            pan.setX(newPos.x);
            pan.setY(newPos.y);
          }
        }
      }
    },
    [zoomLevel, pan, selectedTool]
  );

  // Drawing
  const handleColorChange = (color: any) => {
    setDrawingColor(color.hex);
  };

  // Magic wand tool click handler with optimized algorithm
  const handleMagicWandClick = useCallback(async (event: React.MouseEvent) => {
    if (!canvasRef.current || !originalImageData || !effectSettings.background.enabled) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / zoomLevel);
    const y = Math.floor((event.clientY - rect.top) / zoomLevel);

    // Show progress for large operations
    setIsProcessing(true);
    
    try {
      console.log('Starting optimized magic wand selection at:', x, y);
      
      const selectedPixels = await optimizedMagicWandSelect(
        originalImageData,
        x,
        y,
        {
          threshold: colorSettings.threshold,
          onProgress: (progress) => {
            // Could add progress indicator here if needed
            console.log(`Magic wand progress: ${Math.round(progress * 100)}%`);
          },
          onCancel: () => false // Could implement cancellation if needed
        }
      );

      if (selectedPixels.size === 0) {
        console.log('No pixels selected by magic wand');
        return;
      }

      console.log(`Magic wand selected ${selectedPixels.size} pixels`);

      // Create new image data with selected pixels removed
      const newImageData = new ImageData(
        new Uint8ClampedArray(originalImageData.data),
        originalImageData.width,
        originalImageData.height
      );

      // Remove selected pixels by setting alpha to 0
      for (const pixelCoord of selectedPixels) {
        const [px, py] = pixelCoord.split(',').map(Number);
        const index = (py * originalImageData.width + px) * 4;
        if (index >= 0 && index < newImageData.data.length) {
          newImageData.data[index + 3] = 0; // Set alpha to 0 (transparent)
        }
      }

      // Update manual image data to trigger processing
      setManualImageData(newImageData);
      
      // Add to undo stack
      undoManager.addState({
        imageData: newImageData,
        colorSettings,
        effectSettings,
        speckleSettings,
        edgeCleanupSettings
      });

    } catch (error) {
      console.error('Error in magic wand operation:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [originalImageData, colorSettings.threshold, effectSettings.background.enabled, zoomLevel, colorSettings, effectSettings, speckleSettings, edgeCleanupSettings, undoManager]);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        position: 'relative',
      }}
      ref={konvaContainerRef}
    >
      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
        width={konvaWidth}
        height={konvaHeight}
      />
      <Stage
        width={konvaWidth}
        height={konvaHeight}
        scaleX={zoomLevel.zoom}
        scaleY={zoomLevel.zoom}
        x={pan.x}
        y={pan.y}
        style={{
          cursor:
            selectedTool === 'pan'
              ? 'grab'
              : selectedTool === 'zoom'
              ? 'zoom-in'
              : selectedTool === 'magic-wand'
              ? 'pointer'
              : selectedTool === 'draw'
              ? 'crosshair'
              : 'default',
        }}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onWheel={handleWheel}
        onClick={selectedTool === 'magic-wand' ? handleMagicWandClick : undefined}
        ref={stageRef}
      >
        <Layer>
          {konvaImage && (
            <Image image={konvaImage} width={konvaWidth} height={konvaHeight} />
          )}
          {lines.map((line, index) => (
            <Line
              key={index}
              points={line.points}
              stroke={line.color}
              strokeWidth={line.lineWidth}
              globalCompositeOperation="source-over"
              tension={0.5}
              lineCap="round"
              lineJoin="round"
            />
          ))}
        </Layer>
        {appSettings.showMouseCoordinates && (
          <Layer>
            <Text
              x={10}
              y={10}
              text={`Mouse: ${mousePosition.x}, ${mousePosition.y}`}
              fontSize={12}
              fill="white"
              shadowColor="black"
              shadowBlur={2}
              shadowOffsetX={1}
              shadowOffsetY={1}
              shadowOpacity={0.5}
            />
          </Layer>
        )}
      </Stage>
    </div>
  );
};

export default MainCanvas;

import { Line } from 'react-konva';
