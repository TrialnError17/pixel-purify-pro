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

// Random tip sets for Image Queue empty state
const ImageQueueTips: React.FC = () => {
  const tipSets = [
    // Set 1: Quick Start & Pro Tips
    {
      tips: [
        {
          icon: "🚀",
          title: "Quick Start Tips",
          gradient: "from-accent-blue/10 to-accent-cyan/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          items: [
            "Drag & drop images directly onto the canvas",
            "Use \"Add Images\" button in the header",
            "Process multiple images at once for efficiency"
          ]
        },
        {
          icon: "💡",
          title: "Pro Tips",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          items: [
            "Higher resolution images = better precision",
            "PNG format preserves transparency",
            "Good lighting reduces color variation"
          ]
        }
      ]
    },
    // Set 2: Workflow & Quality
    {
      tips: [
        {
          icon: "🔄",
          title: "Workflow Optimization",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          items: [
            "Sort similar images together for batch processing",
            "Save intermediate results before major changes",
            "Use queue fullscreen mode for better overview"
          ]
        },
        {
          icon: "⭐",
          title: "Quality Guidelines",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          items: [
            "Avoid blurry or low-contrast images",
            "JPEG for smaller files, PNG for transparency",
            "Even lighting prevents color variation issues"
          ]
        }
      ]
    },
    // Set 3: Tools & Techniques
    {
      tips: [
        {
          icon: "🛠️",
          title: "Tool Mastery",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          items: [
            "Start with Magic Wand for precise selection",
            "Use Color Stack for multiple color removal",
            "Edge cleanup smooths jagged boundaries"
          ]
        },
        {
          icon: "🎯",
          title: "Advanced Techniques",
          gradient: "from-accent-lime/10 to-accent-green/10",
          border: "border-accent-lime/30",
          textColor: "text-accent-lime",
          items: [
            "Lower thresholds for precise removal",
            "Higher thresholds for broader selection",
            "Combine tools for complex backgrounds"
          ]
        }
      ]
    },
    // Set 4: Troubleshooting & Performance
    {
      tips: [
        {
          icon: "🔧",
          title: "Troubleshooting",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          items: [
            "Color won't remove? Try different thresholds",
            "Too much removed? Switch to manual mode",
            "Jagged edges? Enable edge cleanup"
          ]
        },
        {
          icon: "⚡",
          title: "Performance Tips",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          items: [
            "Resize large images for faster processing",
            "Process smaller areas for complex removal",
            "Use auto mode for simple backgrounds"
          ]
        }
      ]
    },
    // Set 5: Best Practices & Shortcuts
    {
      tips: [
        {
          icon: "🏆",
          title: "Best Practices",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          items: [
            "Always keep backups of original images",
            "Preview changes before applying permanently",
            "Start conservative, increase settings gradually"
          ]
        },
        {
          icon: "⌨️",
          title: "Keyboard Shortcuts",
          gradient: "from-accent-teal/10 to-accent-cyan/10",
          border: "border-accent-teal/30",
          textColor: "text-accent-teal",
          items: [
            "Space + drag to pan around image",
            "Mouse wheel to zoom in/out",
            "Triple-click for auto-zoom to fit"
          ]
        }
      ]
    }
  ];

  // Select random tip set on component mount
  const selectedTipSet = React.useMemo(() => {
    return tipSets[Math.floor(Math.random() * tipSets.length)];
  }, []);

  return (
    <div className="space-y-3 text-sm animate-fade-in">
      {selectedTipSet.tips.map((tip, index) => (
        <div key={index} className={`bg-gradient-to-r ${tip.gradient} border ${tip.border} rounded-lg p-3`}>
          <div className={`font-medium ${tip.textColor} mb-2`}>
            {tip.icon} <span>{tip.title}</span>
          </div>
          <div className="text-xs space-y-1">
            {tip.items.map((item, itemIndex) => (
              <div key={itemIndex}>• {item}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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
  onCancelProcessing?: () => void;
  isProcessing?: boolean;
  forceFullscreen?: boolean;
  singleImageProgress?: { imageId: string; progress: number } | null;
  processingProgress?: {
    current: number;
    total: number;
    currentImage?: string;
  };
  isFullscreen?: boolean;
  onSetFullscreen?: (value: boolean) => void;
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
  onCancelProcessing,
  isProcessing = false,
  forceFullscreen = false,
  singleImageProgress,
  processingProgress,
  isFullscreen: externalIsFullscreen,
  onSetFullscreen
}) => {
  const [internalIsFullscreen, setInternalIsFullscreen] = React.useState(false);
  
  // Use external fullscreen state if provided, otherwise use internal state
  const isFullscreen = externalIsFullscreen !== undefined ? externalIsFullscreen : internalIsFullscreen;
  const setIsFullscreen = onSetFullscreen || setInternalIsFullscreen;
  

  // Auto-switch to fullscreen when processing starts
  React.useEffect(() => {
    if (forceFullscreen && isProcessing) {
      setIsFullscreen(true);
    } else if (!isProcessing && forceFullscreen) {
      // Keep fullscreen until processing is completely done
      setIsFullscreen(false);
    }
  }, [forceFullscreen, isProcessing]);
  
  // Handle escape key to exit fullscreen
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    if (isFullscreen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
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
        ? "fixed top-14 bottom-0 left-0 right-0 z-40"
        : visible 
          ? "h-48" 
          : "h-12"
    )}>
      {/* Header */}
      <div className="h-12 flex items-center justify-between px-4 border-b border-border">
        <div className="flex items-center gap-3">
          {/* Process & Clear All buttons on the left */}
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
                Process All ({pendingCount})
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
          
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible();
            }}
            className="flex items-center gap-2"
          >
            {visible ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            Image Queue ({images.length})
          </Button>
          
          {isProcessing && processingProgress && (
            <div className="flex items-center gap-2 text-accent-cyan animate-fade-in">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm font-medium">
                Processing {processingProgress.current}/{processingProgress.total}
              </span>
            </div>
          )}
          
          {images.length > 0 && (!isFullscreen || !isProcessing) && (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {pendingCount > 0 && <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {pendingCount} pending
              </span>}
              {processingCount > 0 && <span className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                {processingCount} processing
              </span>}
              {completedCount > 0 && <span className="flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                {completedCount} completed
              </span>}
              {errorCount > 0 && <span className="flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errorCount} failed
              </span>}
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isFullscreen && isProcessing && onCancelProcessing && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onCancelProcessing}
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel Processing
            </Button>
          )}
          
          {/* Fullscreen Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsFullscreen(!isFullscreen)}
            disabled={forceFullscreen && isProcessing}
            className="flex items-center gap-2"
            title={isFullscreen ? "Exit fullscreen (Esc)" : "Enter fullscreen"}
          >
            {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            {isFullscreen ? "Exit" : "Fullscreen"}
          </Button>
        </div>
      </div>

      {/* Single Image Progress Bar - appears beneath header when downloading from preview */}
      {singleImageProgress && (
        <div className="px-4 py-2 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-primary animate-spin" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-primary">
                  Downloading image...
                </span>
              </div>
              <Progress 
                value={singleImageProgress.progress} 
                className="h-1 bg-background"
              />
            </div>
          </div>
        </div>
      )}

      {/* Queue Content */}
      {(visible || isFullscreen) && (
        <div className={cn(
          "overflow-y-auto",
          isFullscreen 
            ? "h-[calc(100vh-8rem)]" // Full height minus header and queue header
            : "h-36"
        )}>
          {images.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              <div className="text-center max-w-md mx-auto px-4">
                <div className="text-4xl mb-4">📁</div>
                <p className="text-lg font-medium mb-4">No images in queue</p>
                <ImageQueueTips />
              </div>
            </div>
          ) : (
            <div className="grid gap-3 p-4 auto-rows-max" 
            style={{ 
              gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' 
            }}>
              {images.map((image) => (
                <Card
                  key={image.id}
                  className={cn(
                    "relative cursor-pointer transition-all hover:bg-accent/5 border p-3",
                    selectedImageId === image.id ? "ring-2 ring-primary border-primary" : "border-border/50"
                  )}
                  onClick={() => onSelectImage(image.id)}
                >
                  <div className="flex items-start gap-3">
                    {/* Thumbnail */}
                    <div className="bg-muted rounded flex-shrink-0 flex items-center justify-center w-12 h-12">
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
                        <span className="font-medium truncate text-sm">{image.name}</span>
                      </div>
                      
                      <div className="flex items-center gap-2 mb-2">
                        {getStatusBadge(image.status)}
                        <span className="text-xs text-muted-foreground">
                          {(image.file.size / 1024 / 1024).toFixed(1)} MB
                        </span>
                      </div>
                      
                      {image.status === 'processing' && (
                        <div className="space-y-1">
                          <Progress value={image.progress} className="h-1" />
                        </div>
                      )}
                      
                      {image.error && (
                        <div className="text-error mt-1 text-xs">
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
                          className="p-0 w-8 h-8"
                          title="Process this image"
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
                        disabled={isProcessing}
                        className="p-0 text-muted-foreground hover:text-destructive w-8 h-8"
                        title="Remove this image"
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
