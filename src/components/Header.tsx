import React from 'react';
import { Button } from '@/components/ui/button';
import { FolderPlus, ImagePlus, Download, Package } from 'lucide-react';

interface HeaderProps {
  onAddImages: () => void;
  onAddFolder: () => void;
  onDownloadPNG: () => void;
  onDownloadAll: () => void;
  canDownload: boolean;
  canDownloadAll: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  onAddImages,
  onAddFolder,
  onDownloadPNG,
  onDownloadAll,
  canDownload,
  canDownloadAll
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
        
        <Button
          variant="outline"
          size="sm"
          onClick={onDownloadAll}
          disabled={!canDownloadAll}
          className="flex items-center gap-2"
        >
          <Package className="w-4 h-4" />
          ZIP All
        </Button>
      </div>
    </header>
  );
};