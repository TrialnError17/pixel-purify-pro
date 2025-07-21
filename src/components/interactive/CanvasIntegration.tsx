import React, { useCallback, useEffect, useMemo } from 'react';
import { ModernCanvas } from './ModernCanvas';
import { CanvasNavigation } from './CanvasNavigation';
import { useCanvasStore } from '@/stores/canvasStore';
import { ImageItem } from '@/pages/Index';

interface CanvasIntegrationProps {
  // Props from existing system
  image: ImageItem | null;
  originalImageData: ImageData | null;
  tool: 'pan' | 'color-stack' | 'magic-wand';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand') => void;
  onImageDataChange: (imageData: ImageData) => void;
  onManualEdit: () => void;
  className?: string;
  
  // Navigation props (optional)
  currentImageIndex?: number;
  totalImages?: number;
  onPreviousImage?: () => void;
  onNextImage?: () => void;
  onDownloadImage?: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export const CanvasIntegration: React.FC<CanvasIntegrationProps> = ({
  image,
  originalImageData,
  tool: externalTool,
  onToolChange,
  onImageDataChange,
  onManualEdit,
  className,
  currentImageIndex = 0,
  totalImages = 0,
  onPreviousImage,
  onNextImage,
  onDownloadImage,
  canGoPrevious = false,
  canGoNext = false
}) => {
  const { 
    tool: internalTool, 
    setTool,
    currentImageData,
    setCurrentImageData
  } = useCanvasStore();

  // Sync external tool with internal tool
  useEffect(() => {
    const toolMapping: Record<typeof externalTool, any> = {
      'pan': 'pan',
      'magic-wand': 'magic-wand', 
      'color-stack': 'magic-wand' // Map color-stack to magic-wand in new system
    };
    
    if (toolMapping[externalTool] && toolMapping[externalTool] !== internalTool) {
      setTool(toolMapping[externalTool]);
    }
  }, [externalTool, internalTool, setTool]);

  // Sync internal tool changes back to external system
  useEffect(() => {
    const reverseMapping: Record<string, typeof externalTool> = {
      'pan': 'pan',
      'magic-wand': 'magic-wand',
      'eraser': 'magic-wand', // Map eraser back to magic-wand for compatibility
      'eyedropper': 'magic-wand' // Map eyedropper back to magic-wand for compatibility
    };
    
    if (reverseMapping[internalTool] && reverseMapping[internalTool] !== externalTool) {
      onToolChange(reverseMapping[internalTool]);
    }
  }, [internalTool, externalTool, onToolChange]);

  // Update current image data when image changes
  useEffect(() => {
    if (image?.processedData) {
      setCurrentImageData(image.processedData);
    } else if (originalImageData) {
      setCurrentImageData(originalImageData);
    }
  }, [image, originalImageData, setCurrentImageData]);

  // Create HTMLImageElement from canvas or file
  const imageElement = useMemo(() => {
    if (!image) return null;
    
    if (image.canvas) {
      // Convert canvas to image
      const img = new Image();
      img.src = image.canvas.toDataURL();
      return img;
    }
    
    // Create image from file URL
    const img = new Image();
    img.src = URL.createObjectURL(image.file);
    return img;
  }, [image]);

  const handleImageDataChange = useCallback((newImageData: ImageData) => {
    setCurrentImageData(newImageData);
    onImageDataChange(newImageData);
  }, [setCurrentImageData, onImageDataChange]);

  return (
    <div className={`flex flex-col ${className}`}>
      <ModernCanvas
        image={imageElement}
        originalImageData={originalImageData}
        currentImageData={currentImageData}
        onImageDataChange={handleImageDataChange}
        onManualEdit={onManualEdit}
        className="flex-1"
      />
      {totalImages > 0 && onPreviousImage && onNextImage && onDownloadImage && (
        <CanvasNavigation
          currentImageIndex={currentImageIndex}
          totalImages={totalImages}
          onPreviousImage={onPreviousImage}
          onNextImage={onNextImage}
          onDownloadImage={onDownloadImage}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
        />
      )}
    </div>
  );
};