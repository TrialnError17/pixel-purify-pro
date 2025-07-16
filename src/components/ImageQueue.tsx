import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ImageItem } from '@/pages/Index';
import { Trash2 } from 'lucide-react';
import { 
  ChevronUp, 
  ChevronDown, 
  Play, 
  PlayCircle, 
  X, 
  CheckCircle, 
  AlertCircle,
  Clock,
  Loader2
} from 'lucide-react';

interface ImageQueueProps {
  images: ImageItem[];
  selectedImageId: string | null;
  visible: boolean;
  onToggleVisible: () => void;
  onSelectImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onProcessAll: () => void;
  onProcessImage: (image: ImageItem) => void;
  onClearAll: () => void;
}

export const ImageQueue: React.FC<ImageQueueProps> = ({
  images,
  selectedImageId,
  visible,
  onToggleVisible,
  onSelectImage,
  onRemoveImage,
  onProcessAll,
  onProcessImage,
  onClearAll
}) => {
  const getStatusIcon = (status: ImageItem['status']) => {
    switch (status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-accent-yellow" />;
      case 'processing':
        return <Loader2 className="w-4 h-4 text-accent-cyan animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-accent-green" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-accent-red" />;
    }
  };

  const getStatusBadge = (status: ImageItem['status']) => {
    const badgeConfig = {
      pending: { variant: 'secondary' as const, className: 'bg-gradient-to-r from-accent-yellow/20 to-accent-orange/20 text-accent-yellow border-accent-yellow/30' },
      processing: { variant: 'outline' as const, className: 'bg-gradient-processing text-white border-accent-cyan' },
      completed: { variant: 'default' as const, className: 'bg-gradient-success text-white' },
      error: { variant: 'destructive' as const, className: 'bg-gradient-error text-white' }
    };

    const config = badgeConfig[status];
    return (
      <Badge variant={config.variant} className={cn("text-xs", config.className)}>
        {status}
      </Badge>
    );
  };

  const pendingCount = images.filter(img => img.status === 'pending').length;
  const processingCount = images.filter(img => img.status === 'processing').length;
  const completedCount = images.filter(img => img.status === 'completed').length;
  const errorCount = images.filter(img => img.status === 'error').length;

  return (
    <div className={cn(
      "bg-gradient-panel border-t border-border transition-all duration-300",
      visible ? "h-48" : "h-12"
    )}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleVisible}
            className="flex items-center gap-2"
          >
            {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            Image Queue ({images.length})
          </Button>
          
          {images.length > 0 && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {pendingCount > 0 && <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> {pendingCount}
              </span>}
              {processingCount > 0 && <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" /> {processingCount}
              </span>}
              {completedCount > 0 && <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" /> {completedCount}
              </span>}
              {errorCount > 0 && <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {errorCount}
              </span>}
            </div>
          )}
        </div>
        
        {images.length > 0 && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onProcessAll}
              disabled={pendingCount === 0}
              className="flex items-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Process All ({pendingCount})
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onClearAll}
              className="flex items-center gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </Button>
          </div>
        )}
      </div>

      {/* Queue Content */}
      {visible && (
        <div className="h-36 overflow-y-auto">
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-2xl mb-2">📁</div>
                <p className="text-sm">No images in queue</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-auto-fit gap-3 p-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
              {images.map((image) => (
                <Card
                  key={image.id}
                  className={cn(
                    "relative p-3 cursor-pointer transition-all hover:bg-accent/5 border",
                    selectedImageId === image.id ? "ring-2 ring-primary border-primary" : "border-border/50"
                  )}
                  onClick={() => onSelectImage(image.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                      <img
                        src={URL.createObjectURL(image.file)}
                        alt={image.name}
                        className="w-full h-full object-cover rounded"
                        onLoad={(e) => URL.revokeObjectURL((e.target as HTMLImageElement).src)}
                      />
                    </div>
                    
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getStatusIcon(image.status)}
                        <span className="text-sm font-medium truncate">{image.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(image.status)}
                        <span className="text-xs text-muted-foreground">
                          {(image.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                      
                      {image.status === 'processing' && (
                        <Progress value={image.progress} className="h-1" />
                      )}
                      
                      {image.error && (
                        <p className="text-xs text-error mt-1">{image.error}</p>
                      )}
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-1">
                      {image.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onProcessImage(image);
                          }}
                          className="w-8 h-8 p-0"
                        >
                          <Play className="w-3 h-3" />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(image.id);
                        }}
                        className="w-8 h-8 p-0 text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};