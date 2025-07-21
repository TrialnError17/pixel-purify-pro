import React, { useRef, useEffect, useState } from 'react';

interface MainCanvasProps {
  image: any;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings?: any;
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageUpdate: (image: any) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: () => void;
  setSingleImageProgress: (progress: any) => void;
  addUndoAction: (action: any) => void;
  onSpeckCountUpdate: (count: any) => void;
  onCanvasChange?: (canvas: HTMLCanvasElement) => void;
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
  onCanvasChange
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (image?.processedData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = image.processedData.width;
        canvas.height = image.processedData.height;
        ctx.putImageData(image.processedData, 0, 0);
        onCanvasChange?.(canvas);
      }
    }
  }, [image?.processedData, onCanvasChange]);

  return (
    <div className="flex-1 flex items-center justify-center bg-muted/10 rounded-lg border border-border">
      {image?.processedData ? (
        <canvas
          ref={canvasRef}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain'
          }}
        />
      ) : (
        <div className="text-muted-foreground">No image selected</div>
      )}
    </div>
  );
};
