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
        {/* Undo/Redo Controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={onUndo}
          disabled={!canUndo}
          className="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <span className="text-xs">Undo</span>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRedo}
          disabled={!canRedo}
          className="h-8 px-2 text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <span className="text-xs">Redo</span>
        </Button>
        
        {/* Add Images Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddImages}
          className="h-8 px-3 border-accent-cyan/30 text-accent-cyan hover:bg-accent-cyan/10"
        >
          <ImagePlus className="w-4 h-4 mr-2" />
          Add Images
        </Button>
        
        {/* Add Folder Button */}
        <Button
          variant="outline"
          size="sm"
          onClick={onAddFolder}
          className="h-8 px-3 border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10"
        >
          <FolderPlus className="w-4 h-4 mr-2" />
          Add Folder
        </Button>
        
        {/* Download Button */}
        <Button
          variant="default"
          size="sm"
          onClick={onDownloadPNG}
          disabled={!canDownload}
          className="h-8 px-3 bg-accent-green hover:bg-accent-green/80 disabled:opacity-50"
        >
          Download PNG
        </Button>
      </div>
    </header>
  );
};