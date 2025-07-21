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
import { createOptimizedImage, createThumbnail } from '@/utils/imageOptimization';
import { loadImagesBatch } from '@/utils/batchImageLoader';
import { memoryCache, getImageData, setImageData, clearImageData } from '@/utils/memoryCache';
import { generateThumbnail } from '@/utils/thumbnailGenerator';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { BookOpen } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

console.log('Index.tsx is loading');

export interface ImageItem {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  // Remove heavy data from React state - use memory cache instead
  // originalData?: ImageData;
  // processedData?: ImageData;
  // canvas?: HTMLCanvasElement;
  error?: string;
  thumbnailUrl?: string; // For queue display
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
  pickedColors: PickedColor[];
  minRegionSize: {
    enabled: boolean;
    value: number;
  };
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
  legacyEnabled: boolean;
  legacyRadius: number;
  softening: {
    enabled: boolean;
    iterations: number;
  };
}

export interface ContiguousToolSettings {
  threshold: number;
}

export interface EraserSettings {
  brushSize: number;
}

const Index = () => {
  console.log('Index component is rendering');
  
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [queueVisible, setQueueVisible] = useState(true);
  const [currentTool, setCurrentTool] = useState<'pan' | 'color-stack' | 'magic-wand' | 'eraser'>('pan');
  const [isProcessing, setIsProcessing] = useState(false);
  const [singleImageProgress, setSingleImageProgress] = useState<{ imageId: string; progress: number } | null>(null);
  const [isQueueFullscreen, setIsQueueFullscreen] = useState(false);
  const [isBatchLoading, setIsBatchLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  // Add erasingInProgressRef to prevent auto-processing during erasing
  const erasingInProgressRef = useRef<boolean>(false);
  
  const [colorSettings, setColorSettings] = useState<ColorRemovalSettings>({
    enabled: false, // Changed from true to false - color removal off by default
    mode: 'auto',
    targetColor: '#ffffff',
    threshold: 30,
    contiguous: false,
    pickedColors: [],
    minRegionSize: {
      enabled: false,
      value: 100
    }
  });

  const [contiguousSettings, setContiguousSettings] = useState<ContiguousToolSettings>({
    threshold: 30 // Changed from 10 to 30
  });

  const [speckleSettings, setSpeckleSettings] = useState<SpeckleSettings>({
    enabled: false,
    minSpeckSize: 50,
    highlightSpecks: false,
    removeSpecks: false
  });

  const [speckCount, setSpeckCount] = useState<number | undefined>(undefined);
  const [isProcessingSpeckles, setIsProcessingSpeckles] = useState(false);
  
  // Track last interacted feature for Learning Center
  const [lastInteractedFeature, setLastInteractedFeature] = useState<string | null>(null);
  
  // Handle feature interaction for Learning Center
  const handleFeatureInteraction = useCallback((feature: string) => {
    setLastInteractedFeature(feature);
  }, []);
  
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
    trimRadius: 1, // Changed from 3 to 1
    legacyEnabled: false,
    legacyRadius: 2,
    softening: {
      enabled: false,
      iterations: 1,
    },
  });

  const [eraserSettings, setEraserSettings] = useState<EraserSettings>({
    brushSize: 10
  });

  // Track if edge trim was auto-disabled by ink stamp
  const [edgeTrimAutoDisabled, setEdgeTrimAutoDisabled] = useState(false);

  const { processImage, processAllImages, cancelProcessing, downloadImage } = useImageProcessor();
  const { processSpecks } = useSpeckleTools();
  const { addUndoAction, undo, redo, canUndo, canRedo } = useUndoManager();

  // OPTIMIZED: Batch image loading with thumbnail generation and memory management
  const handleFilesSelected = useCallback(async (files: FileList) => {
    if (files.length === 0) return;
    
    setIsBatchLoading(true);
    
    try {
      // Load images in optimized batches with progress feedback
      const batchResults = await loadImagesBatch(Array.from(files), (results) => {
        // Update progress during loading
        const newImages: ImageItem[] = results.map(result => ({
          id: result.id,
          file: result.file,
          name: result.name,
          status: result.status as 'pending' | 'processing' | 'completed' | 'error',
          progress: result.progress,
          error: result.error,
        }));
        
        // Live update state with current progress
        setImages(prev => {
          const existing = prev.filter(img => !newImages.some(newImg => newImg.id === img.id));
          return [...existing, ...newImages];
        });
      });
      
      // Generate thumbnails for successful images (in parallel)
      const thumbnailPromises = batchResults
        .filter(result => result.status === 'completed')
        .map(async result => {
          try {
            const thumbnailUrl = await generateThumbnail(result.file);
            return { id: result.id, thumbnailUrl };
          } catch (error) {
            console.warn(`Failed to generate thumbnail for ${result.name}:`, error);
            return { id: result.id, thumbnailUrl: undefined };
          }
        });
      
      const thumbnails = await Promise.all(thumbnailPromises);
      
      // Final update with thumbnails
      const newImages: ImageItem[] = batchResults.map(result => {
        const thumbnail = thumbnails.find(t => t.id === result.id);
        return {
          id: result.id,
          file: result.file,
          name: result.name,
          status: result.status as 'pending' | 'processing' | 'completed' | 'error',
          progress: result.progress,
          error: result.error,
          thumbnailUrl: thumbnail?.thumbnailUrl,
        };
      });

      // FINAL state update with complete data
      setImages(prev => {
        const existing = prev.filter(img => !newImages.some(newImg => newImg.id === img.id));
        const updated = [...existing, ...newImages];
        
        // Select first image if none selected
        if (!selectedImageId && updated.length > 0) {
          setSelectedImageId(updated[0].id);
        }
        
        return updated;
      });

      // Show queue when images are added
      setQueueVisible(true);
      
      // Cleanup memory cache for removed images
      const currentImageIds = images.map(img => img.id);
      memoryCache.cleanup([...currentImageIds, ...newImages.map(img => img.id)]);
      
      // SINGLE undo action for the entire batch
      addUndoAction({
        type: 'batch_operation',
        description: `Add ${newImages.length} image${newImages.length !== 1 ? 's' : ''}`,
        undo: () => {
          // Clean up memory cache and thumbnails
          newImages.forEach(img => {
            clearImageData(img.id);
            if (img.thumbnailUrl && img.thumbnailUrl.startsWith('data:')) {
              // Thumbnail cleanup is automatic for data URLs
            }
          });
          
          setImages(prev => prev.filter(img => !newImages.some(newImg => newImg.id === img.id)));
          if (newImages.some(img => img.id === selectedImageId)) {
            setSelectedImageId(null);
          }
        }
      });

    } catch (error) {
      console.error('Batch loading failed:', error);
      toast({
        title: 'Error loading images',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsBatchLoading(false);
    }
  }, [selectedImageId, addUndoAction, toast, images]);

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
    <div className="h-screen bg-background text-foreground flex overflow-hidden">
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
              (async () => {
                try {
                  await processImage(selectedImage, colorSettings, effectSettings, setImages);
                } finally {
                  setIsProcessing(false);
                  // Auto-hide queue after processing if it wasn't visible before
                  if (!wasQueueVisible) {
                    setTimeout(() => setQueueVisible(false), 1000); // Hide after 1 second
                  }
                }
              })();
            }
          }}
          canDownload={selectedImage?.status === 'completed'}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          isProcessing={isProcessing || isBatchLoading}
          processingProgress={
            isBatchLoading 
              ? { 
                  current: images.filter(img => img.status === 'completed').length, 
                  total: Math.max(1, images.length),
                  currentImage: 'Loading images...'
                }
              : isProcessing 
                ? {
                  current: images.filter(img => img.status === 'processing' || img.status === 'completed').length,
                  total: images.length
                }
              : undefined
          }
        />
        
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* Left Tools Sidebar - Hidden on mobile */}
          <div className="hidden sm:block">
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
              const prevEdgeCleanupSettings = { ...edgeCleanupSettings };
              const prevEdgeTrimAutoDisabled = edgeTrimAutoDisabled;
              
              // Check if ink stamp is being turned on
              if (!effectSettings.inkStamp.enabled && newEffectSettings.inkStamp.enabled) {
                // Ink stamp is being turned ON
                if (edgeCleanupSettings.enabled) {
                  // Edge trim is currently enabled, auto-disable it
                  setEdgeCleanupSettings(prev => ({ ...prev, enabled: false }));
                  setEdgeTrimAutoDisabled(true);
                }
              }
              // Check if ink stamp is being turned off
              else if (effectSettings.inkStamp.enabled && !newEffectSettings.inkStamp.enabled) {
                // Ink stamp is being turned OFF
                if (edgeTrimAutoDisabled) {
                  // We auto-disabled edge trim, so re-enable it
                  setEdgeCleanupSettings(prev => ({ ...prev, enabled: true }));
                  setEdgeTrimAutoDisabled(false);
                }
              }
              
              setEffectSettings(newEffectSettings);
              
              // Add undo action for effect settings changes
              addUndoAction({
                type: 'settings',
                description: 'Change effect settings',
                undo: () => {
                  setEffectSettings(prevEffectSettings);
                  setEdgeCleanupSettings(prevEdgeCleanupSettings);
                  setEdgeTrimAutoDisabled(prevEdgeTrimAutoDisabled);
                }
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
            eraserSettings={eraserSettings}
            onEraserSettingsChange={setEraserSettings}
            currentTool={currentTool}
            onAddImages={handleFileInput}
            onAddFolder={handleFolderInput}
            onFeatureInteraction={handleFeatureInteraction}
          />
          </div>
          
          {/* Main Content Area - Canvas and Queue */}
          <div className="flex flex-1 min-h-0 flex-col">
            <MainCanvas 
              image={selectedImage}
              tool={currentTool}
              onToolChange={setCurrentTool}
              colorSettings={colorSettings}
              contiguousSettings={contiguousSettings}
              effectSettings={effectSettings}
              speckleSettings={speckleSettings}
              edgeCleanupSettings={edgeCleanupSettings}
              eraserSettings={eraserSettings}
              erasingInProgressRef={erasingInProgressRef}
              
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
                  (async () => {
                    await downloadImage(selectedImage, colorSettings, effectSettings, setSingleImageProgress);
                  })();
                }
              }}
              setSingleImageProgress={setSingleImageProgress}
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
                isBatchLoading 
                  ? { current: 0, total: 1 } // Show loading state
                  : isProcessing 
                    ? {
                      current: images.filter(img => img.status === 'processing' || img.status === 'completed').length,
                      total: images.length
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
                (async () => {
                  try {
                    await processAllImages(images, colorSettings, effectSettings, setImages);
                  } finally {
                    setIsProcessing(false);
                  }
                })();
              }}
              onProcessImage={(image) => {
                setIsProcessing(true);
                (async () => {
                  try {
                    await processImage(image, colorSettings, effectSettings, setImages);
                  } finally {
                    setIsProcessing(false);
                  }
                })();
              }}
              onCancelProcessing={() => {
                cancelProcessing();
                setIsProcessing(false);
                // Removed cancel toast
              }}
              isProcessing={isProcessing || isBatchLoading}
              forceFullscreen={isProcessing}
              onClearAll={handleClearAll}
            />
          </div>
          
          {/* Right Learning Sidebar - Responsive */}
          {/* Desktop: Always visible */}
          <div className="hidden lg:block">
            <RightSidebar 
              currentTool={currentTool}
              colorSettings={colorSettings}
              speckleSettings={speckleSettings}
              effectSettings={effectSettings}
              edgeCleanupSettings={edgeCleanupSettings}
              lastInteractedFeature={lastInteractedFeature}
              onFeatureInteraction={setLastInteractedFeature}
            />
          </div>
          
          {/* Mobile/Tablet: Sheet overlay */}
          <div className="lg:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="fixed top-20 right-4 z-40 bg-gradient-to-r from-accent-purple to-accent-blue text-white border-accent-purple/30 hover:from-accent-purple/80 hover:to-accent-blue/80"
                >
                  <BookOpen className="w-4 h-4 mr-1" />
                  Tips
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 sm:w-96 bg-gradient-panel border-accent-purple/30 overflow-y-auto">
                <RightSidebar 
                  currentTool={currentTool}
                  colorSettings={colorSettings}
                  speckleSettings={speckleSettings}
                  effectSettings={effectSettings}
                  edgeCleanupSettings={edgeCleanupSettings}
                  lastInteractedFeature={lastInteractedFeature}
                  onFeatureInteraction={setLastInteractedFeature}
                />
              </SheetContent>
            </Sheet>
          </div>
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