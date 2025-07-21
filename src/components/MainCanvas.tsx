import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as fabric from 'fabric';

interface MainCanvasProps {
  image: any; // ImageItem type
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: any;
  contiguousSettings: any;
  effectSettings: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
  eraserSettings: any;
  erasingInProgressRef: any;
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
}

const MainCanvas: React.FC<MainCanvasProps> = ({
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
  return (
    <div className="flex-1 flex items-center justify-center bg-gray-100 p-4">
      <div className="relative">
        {image ? (
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-4">{image.name}</h2>
            <p>Current tool: {tool}</p>
            <p>Image {currentImageIndex} of {totalImages}</p>
            <div className="mt-4 space-x-2">
              <button 
                onClick={onPreviousImage} 
                disabled={!canGoPrevious}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Previous
              </button>
              <button 
                onClick={onNextImage} 
                disabled={!canGoNext}
                className="px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        ) : (
          <div className="text-gray-500 text-center p-8">
            Upload an image to get started
          </div>
        )}
      </div>
    </div>
  );
};

export default MainCanvas;
