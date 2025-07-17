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
}

export interface ContiguousToolSettings {
  threshold: number;
}

const Index = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [queueVisible, setQueueVisible] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pan' | 'color-stack' | 'magic-wand'>('pan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleImageProgress, setSingleImageProgress] = useState<{ imageId: string; progress: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [colorSettings, setColorSettings] = useState<ColorRemovalSettings>({
    enabled: true,
    mode: 'auto',
    targetColor: '#ffffff',
    threshold: 30,
    contiguous: false,
    minRegionSize: 100,
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
      saveWithBackground: false
    },
    inkStamp: {
      enabled: false,
      color: '#000000',
      threshold: 50
    }
  });

  const { processImage, processAllImages, cancelProcessing, downloadImage, processSpecks } = useImageProcessor();
  const { addUndoAction, undo, redo, canUndo, canRedo } = useUndoManager({
    onImageStateChange: setImages,
    onSettingsChange: setColorSettings,
    onSelectedImageChange: setSelectedImageId,
  });

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
    <div 
      className="h-screen bg-background text-foreground flex flex-col overflow-hidden"
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
      
      <div className="flex flex-1 min-h-0 overflow-hidden">
        <div className="flex flex-1 min-h-0 flex-col">
          <div className="flex flex-1 min-h-0">
            <LeftSidebar 
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
                
                // Process speckles when settings change and image is selected
                if (selectedImage?.processedData) {
                  const result = processSpecks(selectedImage.processedData, newSpeckleSettings);
                  setSpeckCount(result.speckCount);
                  
                  // Update image with speckle processing result
                  setImages(prev => prev.map(img => 
                    img.id === selectedImage.id 
                      ? { ...img, processedData: result.processedData }
                      : img
                  ));
                }
                
                // Add undo action for speckle settings changes
                addUndoAction({
                  type: 'settings',
                  description: 'Change speckle tool settings',
                  undo: () => setSpeckleSettings(prevSpeckleSettings)
                });
              }}
              speckCount={speckCount}
              effectSettings={effectSettings}
              onEffectSettingsChange={(newSettings) => {
                const prevSettings = { ...effectSettings };
                setEffectSettings(newSettings);
                
                // Add undo action for effect settings changes
                addUndoAction({
                  type: 'settings',
                  description: 'Change effect settings',
                  undo: () => setEffectSettings(prevSettings)
                });
              }}
              contiguousSettings={contiguousSettings}
              onContiguousSettingsChange={(newContiguousSettings) => {
                const prevContiguousSettings = { ...contiguousSettings };
                setContiguousSettings(newContiguousSettings);
                
                // Add undo action for magic wand settings changes
                addUndoAction({
                  type: 'settings',
                  description: 'Change magic wand tool settings',
                  undo: () => setContiguousSettings(prevContiguousSettings)
                });
              }}
            />
            
            <MainCanvas 
              image={selectedImage}
              tool={currentTool}
              onToolChange={setCurrentTool}
              colorSettings={colorSettings}
              contiguousSettings={contiguousSettings}
              effectSettings={effectSettings}
              speckleSettings={speckleSettings}
              
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
              onDownloadPNG={() => {
                if (selectedImage) {
                  setSingleImageProgress({ imageId: selectedImage.id, progress: 0 });
                  
                  // Simulate download progress
                  setTimeout(() => setSingleImageProgress({ imageId: selectedImage.id, progress: 50 }), 100);
                  setTimeout(() => setSingleImageProgress({ imageId: selectedImage.id, progress: 100 }), 500);
                  
                  // Download directly using the current canvas data (what user sees)
                  setTimeout(() => {
                    // For preview downloads, disable all effects to get exactly what's shown
                    const previewEffectSettings = {
                      background: { enabled: false, color: '#ffffff', saveWithBackground: false },
                      inkStamp: { enabled: false, color: '#000000', threshold: 50 },
                      download: { trimTransparentPixels: false }
                    };
                    
                    downloadImage(selectedImage, colorSettings, previewEffectSettings);
                    
                    // Clear progress after download
                    setTimeout(() => setSingleImageProgress(null), 1000);
                  }, 1000);
                }
              }}
              addUndoAction={addUndoAction}
              onSpeckCountUpdate={(count) => setSpeckCount(count)}
            />
          </div>
          
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
                type: 'image_operation',
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
            onProcessAndDownload={(image) => {
              setIsProcessing(true);
              processImage(image, colorSettings, effectSettings, setImages).then(() => {
                // After processing is complete, automatically download the image
                // Find the processed image in the updated state
                setImages(currentImages => {
                  const processedImage = currentImages.find(img => img.id === image.id);
                  if (processedImage && processedImage.status === 'completed') {
                    // Trigger download
                    downloadImage(processedImage, colorSettings, effectSettings);
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
  );
};

export default Index;