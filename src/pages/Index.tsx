import React, { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { MainCanvas } from '@/components/MainCanvas';
import { ImageQueue } from '@/components/ImageQueue';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useUndoManager } from '@/hooks/useUndoManager';
import { useToast } from '@/hooks/use-toast';
import { useSpeckleTools, SpeckleSettings } from '@/hooks/useSpeckleTools';

console.log('Index.tsx is loading');

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  originalData?: ImageData;
  processedData?: ImageData;
  canvas?: HTMLCanvasElement;
  error?: string;
}

export interface PickedColor {
  id: string;
  color: string;
  threshold: number;
}

export interface ColorRemovalSettings {
  enabled: boolean;
  mode: 'auto' | 'manual';
  targetColor: string;
  threshold: number;
  contiguous: boolean;
  minRegionSize: number;
  minRegionEnabled: boolean;
  pickedColors: PickedColor[];
}

export interface EffectSettings {
  background: {
    enabled: boolean;
    color: string;
    saveWithBackground: boolean;
  };
  inkStamp: {
    enabled: boolean;
    color: string;
    threshold: number;
  };
  imageEffects: {
    enabled: boolean;
    brightness: number;
    contrast: number;
    vibrance: number;
    hue: number;
    colorize: {
      enabled: boolean;
      hue: number;
      lightness: number;
      saturation: number;
    };
    blackAndWhite: boolean;
    invert: boolean;
  };
  download: {
    trimTransparentPixels: boolean;
  };
}

export interface EdgeCleanupSettings {
  enabled: boolean;
  trimRadius: number;
}

export interface ContiguousToolSettings {
  threshold: number;
}

const Index = () => {
  console.log('Index component is rendering');
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [queueVisible, setQueueVisible] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pan' | 'color-stack' | 'magic-wand'>('pan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleImageProgress, setSingleImageProgress] = useState<{ imageId: string; progress: number } | null>(null);
  const [isQueueFullscreen, setIsQueueFullscreen] = useState(false);
  
  // Check if any individual image is being processed (for disabling controls)
  const isAnyImageProcessing = isProcessing || singleImageProgress !== null;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [colorSettings, setColorSettings] = useState<ColorRemovalSettings>({
    enabled: true,
    mode: 'auto',
    targetColor: '#ffffff',
    threshold: 30,
    contiguous: false,
    minRegionSize: 100,
    minRegionEnabled: false,
    pickedColors: []
  });

  const [contiguousSettings, setContiguousSettings] = useState<ContiguousToolSettings>({
    threshold: 10
  });

  const [speckleSettings, setSpeckleSettings] = useState<SpeckleSettings>({
    enabled: false,
    minSpeckSize: 50,
    highlightSpecks: false,
    removeSpecks: false
  });

  const [speckCount, setSpeckCount] = useState<number | undefined>(undefined);
  
  const [effectSettings, setEffectSettings] = useState<EffectSettings>({
    background: {
      enabled: false,
      color: '#ffffff',
      saveWithBackground: false,
    },
    inkStamp: {
      enabled: false,
      color: '#000000',
      threshold: 50,
    },
    imageEffects: {
      enabled: false,
      brightness: 0,
      contrast: 0,
      vibrance: 0,
      hue: 0,
      colorize: {
        enabled: false,
        hue: 0,
        lightness: 50,
        saturation: 50,
      },
      blackAndWhite: false,
      invert: false,
    },
    download: {
      trimTransparentPixels: false,
    },
  });

  const [edgeCleanupSettings, setEdgeCleanupSettings] = useState<EdgeCleanupSettings>({
    enabled: false,
    trimRadius: 1
  });

  const { processImage, processAllImages, cancelProcessing, downloadImage } = useImageProcessor();
  const { processSpecks } = useSpeckleTools();
  const { addUndoAction, undo, redo, canUndo, canRedo } = useUndoManager();

  const handleFilesSelected = useCallback((files: FileList) => {
    const newImages: ImageItem[] = Array.from(files).map(file => ({
      id: crypto.randomUUID(),
      file,
      name: file.name,
      status: 'pending' as const,
      progress: 0,
    }));

    setImages(prev => {
      const updated = [...prev, ...newImages];
      // Select first image if none selected
      if (!selectedImageId && updated.length > 0) {
        setSelectedImageId(updated[0].id);
      }
      return updated;
    });

    // Show queue when images are added
    setQueueVisible(true);
  }, [selectedImageId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesSelected(files);
    }
  }, [handleFilesSelected]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleFileInput = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFolderInput = useCallback(() => {
    // Create input for folder selection
    const input = document.createElement('input');
    input.type = 'file';
    input.webkitdirectory = true;
    input.multiple = true;
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files) {
        handleFilesSelected(target.files);
      }
    };
    input.click();
  }, [handleFilesSelected]);

  const selectedImage = images.find(img => img.id === selectedImageId);
  const selectedImageIndex = images.findIndex(img => img.id === selectedImageId);

  const handlePreviousImage = useCallback(() => {
    if (selectedImageIndex > 0) {
      setSelectedImageId(images[selectedImageIndex - 1].id);
    }
  }, [selectedImageIndex, images]);

  const handleNextImage = useCallback(() => {
    if (selectedImageIndex < images.length - 1) {
      setSelectedImageId(images[selectedImageIndex + 1].id);
    }
  }, [selectedImageIndex, images]);

  const handleClearAll = useCallback(() => {
    const prevImages = [...images];
    const prevSelectedId = selectedImageId;
    
    setImages([]);
    setSelectedImageId(null);
    
    // Add undo action
    addUndoAction({
      type: 'image_queue',
      description: 'Clear all images',
      undo: () => {
        setImages(prevImages);
        setSelectedImageId(prevSelectedId);
      }
    });
  }, [images, selectedImageId, addUndoAction]);

  return (
    <div className="min-h-screen max-h-screen bg-background text-foreground flex overflow-x-auto overflow-y-hidden" style={{ minWidth: '1200px' }}>
      {/* Main App Content */}
      <div 
        className="flex-1 flex flex-col overflow-hidden"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <Header 
          onAddImages={handleFileInput}
          onAddFolder={handleFolderInput}
          onDownloadPNG={() => {
            if (selectedImage) {
              const prevImages = [...images];
              const wasQueueVisible = queueVisible;
              
              // Show queue for progress feedback
              setQueueVisible(true);
              
              // Add undo action before processing
              addUndoAction({
                type: 'batch_operation',
                description: `Download ${selectedImage.name}`,
                undo: () => {
                  setImages(prevImages);
                  setIsProcessing(false);
                  setQueueVisible(wasQueueVisible);
                }
              });
              
              setIsProcessing(true);
              processImage(selectedImage, colorSettings, effectSettings, setImages).finally(() => {
                setIsProcessing(false);
                // Auto-hide queue after processing if it wasn't visible before
                if (!wasQueueVisible) {
                  setTimeout(() => setQueueVisible(false), 1000); // Hide after 1 second
                }
              });
            }
          }}
          canDownload={selectedImage?.status === 'completed'}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          isProcessing={isProcessing}
          processingProgress={
            isProcessing 
                ? {
                  current: images.filter(img => img.status === 'processing' || img.status === 'completed').length,
                  total: images.length
                }
              : undefined
          }
        />
        
        <div className="flex flex-1 min-h-0 overflow-hidden relative">
          {/* Left Tools Sidebar - Full Height with disabled state */}
          <LeftSidebar
            disabled={isAnyImageProcessing}
            settings={colorSettings}
            onSettingsChange={(newSettings) => {
              const prevSettings = { ...colorSettings };
              setColorSettings(newSettings);
              
              // Add undo action for settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change color removal settings',
                undo: () => setColorSettings(prevSettings)
              });
            }}
            speckleSettings={speckleSettings}
            onSpeckleSettingsChange={(newSpeckleSettings) => {
              const prevSpeckleSettings = { ...speckleSettings };
              setSpeckleSettings(newSpeckleSettings);
              
              console.log('Speckle settings changed:', { 
                enabled: newSpeckleSettings.enabled, 
                highlight: newSpeckleSettings.highlightSpecks,
                remove: newSpeckleSettings.removeSpecks,
                hasProcessedData: !!selectedImage?.processedData,
                hasOriginalData: !!selectedImage?.originalData 
              });
              
              // Process speckles when settings change and image is selected
              if (selectedImage?.processedData || selectedImage?.originalData) {
                // Use processedData if available (includes color effects), otherwise fall back to originalData
                const baseData = selectedImage.processedData || selectedImage.originalData!;
                
                // Create a fresh copy to avoid modifying the original
                const cleanBaseData = new ImageData(
                  new Uint8ClampedArray(baseData.data),
                  baseData.width,
                  baseData.height
                );
                
                console.log('Processing speckles from', selectedImage.processedData ? 'processed' : 'original', 'data');
                const result = processSpecks(cleanBaseData, newSpeckleSettings);
                setSpeckCount(result.speckCount);
                
                // Update image with speckle processing result immediately
                setImages(prev => prev.map(img => 
                  img.id === selectedImage.id 
                    ? { ...img, processedData: result.processedData }
                    : img
                ));
              }
              
              // Add undo action for speckle settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change speckle detection settings',
                undo: () => setSpeckleSettings(prevSpeckleSettings)
              });
            }}
            effectSettings={effectSettings}
            onEffectSettingsChange={(newEffectSettings) => {
              const prevEffectSettings = { ...effectSettings };
              setEffectSettings(newEffectSettings);
              
              // Add undo action for effect settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change effect settings',
                undo: () => setEffectSettings(prevEffectSettings)
              });
            }}
            contiguousSettings={contiguousSettings}
            onContiguousSettingsChange={(newContiguousSettings) => {
              const prevContiguousSettings = { ...contiguousSettings };
              setContiguousSettings(newContiguousSettings);
              
              // Add undo action for contiguous tool settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change magic wand tool settings',
                undo: () => setContiguousSettings(prevContiguousSettings)
              });
            }}
            edgeCleanupSettings={edgeCleanupSettings}
            onEdgeCleanupSettingsChange={(newEdgeCleanupSettings) => {
              const prevEdgeCleanupSettings = { ...edgeCleanupSettings };
              setEdgeCleanupSettings(newEdgeCleanupSettings);
              
              // Add undo action for edge cleanup settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change edge cleanup settings',
                undo: () => setEdgeCleanupSettings(prevEdgeCleanupSettings)
              });
            }}
             onAddImages={handleFileInput}
             onAddFolder={handleFolderInput}
           />
          
          {/* Main Content Area - Canvas and Queue */}
          <div className="flex flex-1 min-h-0 flex-col">
            <MainCanvas 
              disabled={isAnyImageProcessing}
              image={selectedImage}
              tool={currentTool}
              onToolChange={setCurrentTool}
              colorSettings={colorSettings}
              contiguousSettings={contiguousSettings}
              effectSettings={effectSettings}
              speckleSettings={speckleSettings}
              edgeCleanupSettings={edgeCleanupSettings}
              
              onImageUpdate={(updatedImage) => {
                setImages(prev => prev.map(img => 
                  img.id === updatedImage.id ? updatedImage : img
                ));
              }}
              onColorPicked={(color) => {
                // Add color to picked colors list with default threshold of 30
                const newPickedColor: PickedColor = {
                  id: crypto.randomUUID(),
                  color,
                  threshold: 30
                };
                setColorSettings(prev => ({ 
                  ...prev, 
                  pickedColors: [...prev.pickedColors, newPickedColor] 
                }));
              }}
              onPreviousImage={handlePreviousImage}
              onNextImage={handleNextImage}
              canGoPrevious={selectedImageIndex > 0}
              canGoNext={selectedImageIndex < images.length - 1}
              currentImageIndex={selectedImageIndex + 1}
              totalImages={images.length}
              onDownloadImage={() => {
                if (selectedImage) {
                  downloadImage(selectedImage, colorSettings, effectSettings, setSingleImageProgress);
                }
              }}
              addUndoAction={addUndoAction}
              onSpeckCountUpdate={(count) => setSpeckCount(count)}
            />
            
            {/* Image Queue - At bottom between sidebars */}
            <ImageQueue 
              images={images}
              selectedImageId={selectedImageId}
              visible={queueVisible}
              onToggleVisible={() => setQueueVisible(!queueVisible)}
              onSelectImage={setSelectedImageId}
              singleImageProgress={singleImageProgress}
              processingProgress={
                isProcessing 
                    ? {
                      current: images.filter(img => img.status === 'processing' || img.status === 'completed').length,
                      total: images.filter(img => img.status !== 'error').length
                    }
                  : undefined
              }
              isFullscreen={isQueueFullscreen}
              onSetFullscreen={setIsQueueFullscreen}
              onRemoveImage={(imageId) => {
                const targetImage = images.find(img => img.id === imageId);
                if (!targetImage) return;
                
                const prevImages = [...images];
                const prevSelectedId = selectedImageId;
                
                // Remove the image
                setImages(prev => prev.filter(img => img.id !== imageId));
                
                // If removing selected image, select the next one or previous one
                if (selectedImageId === imageId) {
                  const currentIndex = images.findIndex(img => img.id === imageId);
                  const remainingImages = images.filter(img => img.id !== imageId);
                  
                  if (remainingImages.length > 0) {
                    // Select next image, or previous if we're at the end
                    const nextIndex = currentIndex < remainingImages.length ? currentIndex : currentIndex - 1;
                    setSelectedImageId(remainingImages[nextIndex]?.id || null);
                  } else {
                    setSelectedImageId(null);
                  }
                }
                
                // Add undo action
                addUndoAction({
                  type: 'canvas_edit',
                  description: `Remove ${targetImage.name}`,
                  undo: () => {
                    setImages(prevImages);
                    setSelectedImageId(prevSelectedId);
                  }
                });
              }}
              onProcessAll={() => {
                const prevImages = [...images];
                
                // Add undo action for batch processing
                addUndoAction({
                  type: 'batch_operation',
                  description: `Process ${images.length} image${images.length !== 1 ? 's' : ''}`,
                  undo: () => {
                    setImages(prevImages);
                  }
                });
                
                setIsProcessing(true);
                processAllImages(images, colorSettings, effectSettings, setImages).finally(() => {
                  setIsProcessing(false);
                });
              }}
              onProcessImage={(image) => {
                setIsProcessing(true);
                processImage(image, colorSettings, effectSettings, setImages).then(() => {
                  // After processing is complete, automatically download the image
                  // Find the processed image in the updated state
                  setImages(currentImages => {
                    const processedImage = currentImages.find(img => img.id === image.id);
                     if (processedImage && processedImage.status === 'completed') {
                       // Trigger download
                       downloadImage(processedImage, colorSettings, effectSettings, setSingleImageProgress, setIsQueueFullscreen);
                     }
                    return currentImages;
                  });
                }).finally(() => {
                  setIsProcessing(false);
                });
              }}
              onCancelProcessing={() => {
                cancelProcessing();
                setIsProcessing(false);
                // Removed cancel toast
              }}
              isProcessing={isProcessing}
              forceFullscreen={isProcessing}
              onClearAll={handleClearAll}
            />
          </div>
          
          {/* Right Advertisement Sidebar */}
          <RightSidebar />
        </div>
        
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*"
          onChange={(e) => e.target.files && handleFilesSelected(e.target.files)}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default Index;