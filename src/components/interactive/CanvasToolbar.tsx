import React from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { useCanvasStore } from '@/stores/canvasStore';
import { 
  Move, 
  Wand, 
  Eraser, 
  Pipette, 
  ZoomIn, 
  ZoomOut, 
  Maximize,
  RotateCcw
} from 'lucide-react';

export const CanvasToolbar: React.FC = () => {
  const {
    tool,
    scale,
    magicWandThreshold,
    eraserSize,
    setTool,
    setScale,
    setMagicWandThreshold,
    setEraserSize,
    resetTransform,
    fitToView
  } = useCanvasStore();

  const handleZoomIn = () => setScale(scale * 1.2);
  const handleZoomOut = () => setScale(scale / 1.2);

  return (
    <div className="flex items-center gap-2 p-2 bg-background border rounded-lg mb-4">
      {/* Tools */}
      <div className="flex items-center gap-1">
        <Button
          variant={tool === 'pan' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('pan')}
          className="p-2"
        >
          <Move className="h-4 w-4" />
        </Button>
        
        <Button
          variant={tool === 'magic-wand' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('magic-wand')}
          className="p-2"
        >
          <Wand className="h-4 w-4" />
        </Button>
        
        <Button
          variant={tool === 'eraser' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eraser')}
          className="p-2"
        >
          <Eraser className="h-4 w-4" />
        </Button>
        
        <Button
          variant={tool === 'eyedropper' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTool('eyedropper')}
          className="p-2"
        >
          <Pipette className="h-4 w-4" />
        </Button>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <Button variant="outline" size="sm" onClick={handleZoomOut} className="p-2">
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <span className="text-sm font-mono w-12 text-center">
          {Math.round(scale * 100)}%
        </span>
        
        <Button variant="outline" size="sm" onClick={handleZoomIn} className="p-2">
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="sm" onClick={fitToView} className="p-2">
          <Maximize className="h-4 w-4" />
        </Button>
        
        <Button variant="outline" size="sm" onClick={resetTransform} className="p-2">
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
      
      <Separator orientation="vertical" className="h-6" />
      
      {/* Tool settings */}
      {tool === 'magic-wand' && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Threshold:</span>
          <div className="w-24">
            <Slider
              value={[magicWandThreshold]}
              onValueChange={([value]) => setMagicWandThreshold(value)}
              max={100}
              min={1}
              step={1}
              className="w-full"
            />
          </div>
          <span className="text-sm text-muted-foreground w-8">
            {magicWandThreshold}
          </span>
        </div>
      )}
      
      {tool === 'eraser' && (
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Size:</span>
          <div className="w-24">
            <Slider
              value={[eraserSize]}
              onValueChange={([value]) => setEraserSize(value)}
              max={100}
              min={5}
              step={5}
              className="w-full"
            />
          </div>
          <span className="text-sm text-muted-foreground w-8">
            {eraserSize}
          </span>
        </div>
      )}
    </div>
  );
};