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
  Loader2,
  Maximize,
  Minimize
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
  isProcessing?: boolean;
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
  onClearAll,
  isProcessing = false
}) => {
  const [isFullscreen, setIsFullscreen] = React.useState(false);
  
  // Handle escape key to exit fullscreen
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isFullscreen]);

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
      isFullscreen 
        ? "fixed inset-0 z-50 h-screen" 
        : visible 
          ? "h-48" 
          : "h-12"
    )}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-4">
          {!isFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleVisible}
              className="flex items-center gap-2"
            >
              {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              Image Queue ({images.length})
            </Button>
          )}
          
          {isFullscreen && (
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold">Image Queue ({images.length})</div>
              {isProcessing && (
                <div className="flex items-center gap-2 text-accent-cyan">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Processing...</span>
                </div>
              )}
            </div>
          )}
          
          {images.length > 0 && (!isFullscreen || !isProcessing) && (
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
        
        <div className="flex items-center gap-2">
          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="flex items-center gap-2"
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
          
          {images.length > 0 && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={onProcessAll}
                disabled={pendingCount === 0 || isProcessing}
                className="flex items-center gap-2"
              >
                {isProcessing ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <PlayCircle className="w-4 h-4" />
                )}
                Process & Download All ({pendingCount})
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={onClearAll}
                disabled={isProcessing}
                className="flex items-center gap-2 text-destructive hover:text-destructive border-destructive/30 hover:border-destructive"
              >
                <Trash2 className="w-4 h-4" />
                Clear All
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Queue Content */}
      {(visible || isFullscreen) && (
        <div className={cn(
          "overflow-y-auto",
          isFullscreen ? "h-[calc(100vh-3rem)]" : "h-36"
        )}>
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-lg font-medium mb-2">No images in queue</p>
                <p className="text-sm">Add images or drag & drop files to get started</p>
              </div>
            </div>
          ) : (
            <div className={cn(
              "grid gap-3 p-4",
              isFullscreen 
                ? "grid-cols-auto-fit-large" 
                : "grid-cols-auto-fit",
              "auto-rows-max"
            )} 
            style={{ 
              gridTemplateColumns: isFullscreen 
                ? 'repeat(auto-fill, minmax(280px, 1fr))' 
                : 'repeat(auto-fill, minmax(200px, 1fr))' 
            }}>
              {images.map((image) => (
                <Card
                  key={image.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:bg-accent/5 border",
                    isFullscreen ? "p-4" : "p-3",
                    selectedImageId === image.id ? "ring-2 ring-primary border-primary" : "border-border/50"
                  )}
                  onClick={() => onSelectImage(image.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className={cn(
                      "bg-muted rounded flex-shrink-0 flex items-center justify-center",
                      isFullscreen ? "w-16 h-16" : "w-12 h-12"
                    )}>
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
                        <span className={cn(
                          "font-medium truncate",
                          isFullscreen ? "text-base" : "text-sm"
                        )}>{image.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(image.status)}
                        <span className="text-xs text-muted-foreground">
                          {(image.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                        {isFullscreen && (
                          <span className="text-xs text-muted-foreground">
                            {image.file.type}
                          </span>
                        )}
                      </div>
                      
                      {image.status === 'processing' && (
                        <div className="space-y-1">
                          <Progress value={image.progress} className="h-2" />
                          {isFullscreen && (
                            <div className="text-xs text-muted-foreground text-center">
                              {image.progress}% complete
                            </div>
                          )}
                        </div>
                      )}
                      
                      {image.error && (
                        <div className={cn(
                          "text-error mt-1",
                          isFullscreen ? "text-sm" : "text-xs"
                        )}>
                          <p>{image.error}</p>
                        </div>
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
                          disabled={isProcessing}
                          className={cn(
                            "p-0",
                            isFullscreen ? "w-10 h-10" : "w-8 h-8"
                          )}
                          title="Process this image"
                        >
                          <Play className={cn(isFullscreen ? "w-4 h-4" : "w-3 h-3")} />
                        </Button>
                      )}
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveImage(image.id);
                        }}
                        disabled={isProcessing}
                        className={cn(
                          "p-0 text-muted-foreground hover:text-destructive",
                          isFullscreen ? "w-10 h-10" : "w-8 h-8"
                        )}
                        title="Remove this image"
                      >
                        <X className={cn(isFullscreen ? "w-4 h-4" : "w-3 h-3")} />
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