import React, { useState, useCallback, useRef } from 'react';
import { Header } from '@/components/Header';
import { LeftSidebar } from '@/components/LeftSidebar';
import { RightSidebar } from '@/components/RightSidebar';
import { MainCanvas } from '@/components/MainCanvas';
import { ImageQueue } from '@/components/ImageQueue';
import { useImageProcessor } from '@/hooks/useImageProcessor';
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

export interface ColorRemovalSettings {
  enabled: boolean;
  mode: 'auto' | 'manual';
  targetColor: string;
  threshold: number;
  contiguous: boolean;
  minRegionSize: number;
  featherRadius: number;
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

const Index = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const [queueVisible, setQueueVisible] = useState(false);
  const [currentTool, setCurrentTool] = useState<'pan' | 'eyedropper' | 'remove'>('pan');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  
  const [colorSettings, setColorSettings] = useState<ColorRemovalSettings>({
    enabled: true,
    mode: 'auto',
    targetColor: '#ffffff',
    threshold: 30,
    contiguous: true,
    minRegionSize: 100,
    featherRadius: 2
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
    }
  });

  const { processImage, processAllImages, downloadImage, downloadAllImages } = useImageProcessor();

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
    
    setImages(prev => [...prev, ...newImages]);
    
    if (newImages.length > 0 && !selectedImageId) {
      setSelectedImageId(newImages[0].id);
    }
    
    toast({
      title: "Images Added",
      description: `Added ${newImages.length} image(s) to the queue`
    });
  }, [selectedImageId, toast]);

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

  return (
    <div 
      className="min-h-screen bg-background text-foreground flex flex-col"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Header 
        onAddImages={handleFileInput}
        onAddFolder={handleFolderInput}
        onDownloadPNG={() => selectedImage && downloadImage(selectedImage)}
        onDownloadAll={() => downloadAllImages(images)}
        canDownload={selectedImage?.status === 'completed'}
        canDownloadAll={images.some(img => img.status === 'completed')}
      />
      
      <div className="flex flex-1 min-h-0">
        <LeftSidebar 
          settings={colorSettings}
          onSettingsChange={setColorSettings}
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
            setColorSettings(prev => ({ ...prev, targetColor: color, mode: 'manual' }));
          }}
          onPreviousImage={handlePreviousImage}
          onNextImage={handleNextImage}
          canGoPrevious={selectedImageIndex > 0}
          canGoNext={selectedImageIndex < images.length - 1}
          currentImageIndex={selectedImageIndex + 1}
          totalImages={images.length}
        />
        
        <RightSidebar 
          settings={effectSettings}
          onSettingsChange={setEffectSettings}
        />
      </div>
      
      <ImageQueue 
        images={images}
        selectedImageId={selectedImageId}
        visible={queueVisible}
        onToggleVisible={() => setQueueVisible(!queueVisible)}
        onSelectImage={setSelectedImageId}
        onRemoveImage={(id) => {
          setImages(prev => prev.filter(img => img.id !== id));
          if (selectedImageId === id) {
            const remaining = images.filter(img => img.id !== id);
            setSelectedImageId(remaining.length > 0 ? remaining[0].id : null);
          }
        }}
        onProcessAll={() => processAllImages(images, colorSettings, effectSettings, setImages)}
        onProcessImage={(image) => processImage(image, colorSettings, effectSettings, setImages)}
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
