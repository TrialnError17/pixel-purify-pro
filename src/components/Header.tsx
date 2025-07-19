import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, ImagePlus, Loader2 } from 'lucide-react';

interface HeaderProps {
  onAddImages: () => void;
  onAddFolder: () => void;
  onDownloadPNG: () => void;
  canDownload: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  isProcessing?: boolean;
  processingProgress?: { current: number; total: number; currentImage?: string };
}

export const Header: React.FC<HeaderProps> = ({
  onAddImages,
  onAddFolder,
  onDownloadPNG,
  canDownload,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  isProcessing = false,
  processingProgress
}) => {
  return (
    <header className="h-14 bg-black border-b border-border flex items-center justify-between px-4 shadow-panel">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <img 
              src="/lovable-uploads/692a11d9-d069-4748-a1fa-f3281996fa0a.png" 
              alt="iScalePOD Logo" 
              className="h-8 w-auto"
            />
            <h1 className="text-lg font-semibold text-foreground">
              Image Color Remover
            </h1>
          </div>
          
          {/* Add Images and Folder Buttons */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddImages}
              className="border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10"
            >
              <ImagePlus className="w-4 h-4 mr-1" />
              Images
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFolder}
              className="border-accent-green text-accent-green hover:bg-accent-green/10"
            >
              <FolderPlus className="w-4 h-4 mr-1" />
              Folder
            </Button>
          </div>
        </div>
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 ml-4 px-3 py-1 bg-accent-cyan/10 rounded-lg border border-accent-cyan/30">
            <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
            <div className="text-sm">
              {processingProgress ? (
                <div className="font-medium text-accent-cyan">
                  Processing {processingProgress.current}/{processingProgress.total}
                </div>
              ) : (
                <span className="font-medium text-accent-cyan">Processing...</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Empty space for right side */}
      </div>
    </header>
  );
};