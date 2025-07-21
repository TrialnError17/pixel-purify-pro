import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';

interface CanvasNavigationProps {
  currentImageIndex: number;
  totalImages: number;
  onPreviousImage: () => void;
  onNextImage: () => void;
  onDownloadImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
}

export const CanvasNavigation: React.FC<CanvasNavigationProps> = ({
  currentImageIndex,
  totalImages,
  onPreviousImage,
  onNextImage,
  onDownloadImage,
  canGoPrevious,
  canGoNext
}) => {
  if (totalImages === 0) return null;

  return (
    <div className="flex items-center justify-between p-2 bg-background border-t">
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousImage}
          disabled={!canGoPrevious}
          className="p-2"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <span className="text-sm text-muted-foreground font-mono">
          {currentImageIndex} / {totalImages}
        </span>
        
        <Button
          variant="outline" 
          size="sm"
          onClick={onNextImage}
          disabled={!canGoNext}
          className="p-2"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
      
      <Button
        variant="outline"
        size="sm"
        onClick={onDownloadImage}
        className="flex items-center gap-2"
      >
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
};