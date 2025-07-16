import React, { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { MainCanvas } from '@/components/MainCanvas';
import { ImageQueue } from '@/components/ImageQueue';
import { useImageProcessor } from '@/hooks/useImageProcessor';
import { useUndoManager } from '@/hooks/useUndoManager';
import { useToast } from '@/hooks/use-toast';

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
  featherRadius: number;
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
  download: {
    trimTransparentPixels: boolean;
  };
}

const Index = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [queueVisible, setQueueVisible] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pan' | 'eyedropper' | 'remove' | 'contiguous'>('pan');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [colorSettings, setColorSettings] = useState<ColorRemovalSettings>({
    enabled: true,
    mode: 'auto',
    targetColor: '#ffffff',
    threshold: 30,
    contiguous: true,
    minRegionSize: 100,
    featherRadius: 2,
    pickedColors: []
  });
  
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
    },
    download: {
      trimTransparentPixels: false
    }
  });

  const { processImage, processAllImages, downloadImage, cancelProcessing } = useImageProcessor();
  const { addUndoAction, undo, redo, canUndo, canRedo, clearHistory } = useUndoManager();

  const handleFilesSelected = useCallback((files: FileList) => {
    const newImages: ImageItem[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.type.startsWith('image/')) {
        const newImage: ImageItem = {
          id: crypto.randomUUID(),
          file,
          name: file.name,
          status: 'pending',
          progress: 0
        };
        newImages.push(newImage);
      }
    }
    
    const prevImages = [...images];
    setImages(prev => [...prev, ...newImages]);
    
    // Add undo action
    addUndoAction({
      type: 'image_queue',
      description: `Add ${newImages.length} image(s)`,
      undo: () => {
        setImages(prevImages);
        if (newImages.some(img => img.id === selectedImageId)) {
          setSelectedImageId(prevImages.length > 0 ? prevImages[0].id : null);
        }
      }
    });
    
    if (newImages.length > 0 && !selectedImageId) {
      setSelectedImageId(newImages[0].id);
    }
    
    toast({
      title: "Images Added",
      description: `Added ${newImages.length} image(s) to the queue`
    });
  }, [images, selectedImageId, toast, addUndoAction]);

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
  }, [images, selectedImageIndex]);

  const handleNextImage = useCallback(() => {
    if (selectedImageIndex < images.length - 1) {
      setSelectedImageId(images[selectedImageIndex + 1].id);
    }
  }, [images, selectedImageIndex]);

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
      className="min-h-screen bg-background text-foreground flex flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Header 
        onAddImages={handleFileInput}
        onAddFolder={handleFolderInput}
        onDownloadPNG={() => selectedImage && downloadImage(selectedImage, effectSettings)}
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
                total: images.length,
                currentImage: images.find(img => img.status === 'processing')?.name
              }
            : undefined
        }
      />
      
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
        />
        
        <MainCanvas 
          image={selectedImage}
          tool={currentTool}
          onToolChange={setCurrentTool}
          colorSettings={colorSettings}
          effectSettings={effectSettings}
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
              targetColor: color, 
              mode: 'manual',
              pickedColors: [...prev.pickedColors, newPickedColor]
            }));
          }}
          onPreviousImage={handlePreviousImage}
          onNextImage={handleNextImage}
          canGoPrevious={selectedImageIndex > 0}
          canGoNext={selectedImageIndex < images.length - 1}
          currentImageIndex={selectedImageIndex + 1}
          totalImages={images.length}
          onDownloadImage={(image) => downloadImage(image, effectSettings)}
          addUndoAction={addUndoAction}
        />
        
        <RightSidebar 
          settings={effectSettings}
          onSettingsChange={(newSettings) => {
            const prevSettings = { ...effectSettings };
            setEffectSettings(newSettings);
            
            // Add undo action for effect settings changes
            addUndoAction({
              type: 'settings',
              description: 'Change effect settings',
              undo: () => setEffectSettings(prevSettings)
            });
          }}
        />
      </div>
      
      <ImageQueue 
        images={images}
        selectedImageId={selectedImageId}
        visible={queueVisible}
        onToggleVisible={() => setQueueVisible(!queueVisible)}
        onSelectImage={setSelectedImageId}
        processingProgress={
          isProcessing 
            ? {
                current: images.filter(img => img.status === 'processing' || img.status === 'completed').length,
                total: images.filter(img => img.status !== 'error').length,
                currentImage: images.find(img => img.status === 'processing')?.name
              }
            : undefined
        }
        onRemoveImage={(id) => {
          const removedImage = images.find(img => img.id === id);
          const prevImages = [...images];
          const prevSelectedId = selectedImageId;
          
          setImages(prev => prev.filter(img => img.id !== id));
          if (selectedImageId === id) {
            const remaining = images.filter(img => img.id !== id);
            setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
          }
          
          // Add undo action
          if (removedImage) {
            addUndoAction({
              type: 'image_queue',
              description: `Remove ${removedImage.name}`,
              undo: () => {
                setImages(prevImages);
                setSelectedImageId(prevSelectedId);
              }
            });
          }
        }}
        onProcessAll={() => {
          const prevImages = [...images];
          
          // Add undo action before processing
          addUndoAction({
            type: 'batch_operation',
            description: 'Process all images',
            undo: () => {
              setImages(prevImages);
              setIsProcessing(false);
              toast({
                title: "Batch Processing Undone",
                description: "Reverted all processed images to their previous state"
              });
            }
          });
          
          setIsProcessing(true);
          processAllImages(images, colorSettings, effectSettings, setImages).finally(() => {
            setIsProcessing(false);
          });
        }}
        onProcessImage={(image) => {
          const prevImages = [...images];
          
          // Add undo action before processing
          addUndoAction({
            type: 'batch_operation',
            description: `Process ${image.name}`,
            undo: () => {
              setImages(prevImages);
              setIsProcessing(false);
              toast({
                title: "Processing Undone",
                description: `Reverted ${image.name} to its previous state`
              });
            }
          });
          
          setIsProcessing(true);
          processImage(image, colorSettings, effectSettings, setImages).finally(() => {
            setIsProcessing(false);
          });
        }}
        onCancelProcessing={() => {
          cancelProcessing();
          setIsProcessing(false);
          toast({
            title: "Processing Cancelled",
            description: "All processing has been stopped"
          });
        }}
        isProcessing={isProcessing}
        forceFullscreen={isProcessing}
        onClearAll={handleClearAll}
      />
      
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
