import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

export const CanvasCursor: React.FC = () => {
  const {
    tool,
    cursorPosition,
    eraserSize,
    scale,
    position,
    cursorPreview
  } = useCanvasStore();

  if (!cursorPosition || !cursorPreview) return null;

  // Convert image coordinates to screen coordinates
  const screenX = cursorPosition.x * scale + position.x;
  const screenY = cursorPosition.y * scale + position.y;

  const getCursorElement = () => {
    switch (tool) {
      case 'eraser':
        const size = eraserSize * scale;
        return (
          <div
            className="absolute pointer-events-none border-2 border-primary rounded-full bg-primary/20"
            style={{
              left: screenX - size / 2,
              top: screenY - size / 2,
              width: size,
              height: size,
              transform: 'translate(-1px, -1px)', // Adjust for border
            }}
          />
        );
        
      case 'magic-wand':
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-4 h-4 border-2 border-primary bg-background/80 rounded-full flex items-center justify-center">
              <div className="w-1 h-1 bg-primary rounded-full" />
            </div>
          </div>
        );
        
      case 'eyedropper':
        return (
          <div
            className="absolute pointer-events-none"
            style={{
              left: screenX,
              top: screenY,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="w-6 h-6 border-2 border-primary bg-background/80 rounded-sm flex items-center justify-center">
              <div className="w-2 h-2 bg-primary rounded-sm" />
            </div>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {getCursorElement()}
    </div>
  );
};