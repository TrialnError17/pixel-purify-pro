import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, ImagePlus, Download, Undo, Redo, Package, Loader2 } from 'lucide-react';

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
    <header className="h-14 bg-gradient-header border-b border-border flex items-center justify-between px-4 shadow-panel">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-rainbow rounded-lg flex items-center justify-center shadow-colorful">
            <Package className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-accent-blue to-accent-purple bg-clip-text text-transparent">
            BG Remover Pro
          </h1>
        </div>
        
        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center gap-3 ml-4 px-3 py-1 bg-accent-cyan/10 rounded-lg border border-accent-cyan/30">
            <Loader2 className="w-4 h-4 animate-spin text-accent-cyan" />
            <div className="text-sm">
              {processingProgress ? (
                <div className="space-y-1">
                  <div className="font-medium text-accent-cyan">
                    Processing {processingProgress.current}/{processingProgress.total}
                  </div>
                  {processingProgress.currentImage && (
                    <div className="text-xs text-muted-foreground truncate max-w-40">
                      {processingProgress.currentImage}
                    </div>
                  )}
                </div>
              ) : (
                <span className="font-medium text-accent-cyan">Processing...</span>
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onAddImages}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          Add Images
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onAddFolder}
          disabled={isProcessing}
          className="flex items-center gap-2"
        >
          <FolderPlus className="w-4 h-4" />
          Add Folder
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadPNG}
          disabled={!canDownload || isProcessing}
          className="flex items-center gap-2"
        >
          <Download className="w-4 h-4" />
          PNG
        </Button>
        
        {(onUndo || onRedo) && (
          <>
            <div className="w-px h-6 bg-border mx-2" />
            
            {onUndo && (
              <Button
                variant="outline"
                size="sm"
                onClick={onUndo}
                disabled={!canUndo || isProcessing}
                className="flex items-center gap-2"
                title="Undo last action"
              >
                <Undo className="w-4 h-4" />
                Undo
              </Button>
            )}
            
            {onRedo && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRedo}
                disabled={!canRedo || isProcessing}
                className="flex items-center gap-2"
                title="Redo last undone action"
              >
                <Redo className="w-4 h-4" />
                Redo
              </Button>
            )}
          </>
        )}
      </div>
    </header>
  );
};