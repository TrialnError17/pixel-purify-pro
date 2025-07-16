import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, ImagePlus, Download, Undo, Redo, Package } from 'lucide-react';

interface HeaderProps {
  onAddImages: () => void;
  onAddFolder: () => void;
  onDownloadPNG: () => void;
  canDownload: boolean;
  onUndo?: () => void;
  onRedo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddImages,
  onAddFolder,
  onDownloadPNG,
  canDownload,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false
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
      </div>
      
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddImages}
          className="flex items-center gap-2"
        >
          <ImagePlus className="w-4 h-4" />
          Add Images
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          onClick={onAddFolder}
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
          disabled={!canDownload}
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
                disabled={!canUndo}
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
                disabled={!canRedo}
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