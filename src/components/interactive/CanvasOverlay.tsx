import React from 'react';
import { useCanvasStore } from '@/stores/canvasStore';

export const CanvasOverlay: React.FC = () => {
  const {
    showGrid,
    showRulers,
    scale,
    currentImage
  } = useCanvasStore();

  if (!currentImage) return null;

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Grid overlay */}
      {showGrid && (
        <div 
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px),
              linear-gradient(to bottom, hsl(var(--border)) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * scale}px ${20 * scale}px`,
          }}
        />
      )}
      
      {/* Rulers */}
      {showRulers && (
        <>
          {/* Top ruler */}
          <div className="absolute top-0 left-8 right-0 h-8 bg-background/90 border-b flex items-end text-xs text-muted-foreground">
            {Array.from({ length: Math.ceil(currentImage.width / 50) }, (_, i) => (
              <div
                key={i}
                className="absolute border-l border-muted-foreground/30"
                style={{
                  left: i * 50 * scale,
                  height: '100%',
                }}
              >
                <span className="absolute top-0 left-1">
                  {i * 50}
                </span>
              </div>
            ))}
          </div>
          
          {/* Left ruler */}
          <div className="absolute top-8 left-0 bottom-0 w-8 bg-background/90 border-r flex flex-col justify-start text-xs text-muted-foreground">
            {Array.from({ length: Math.ceil(currentImage.height / 50) }, (_, i) => (
              <div
                key={i}
                className="absolute border-t border-muted-foreground/30 w-full"
                style={{
                  top: i * 50 * scale,
                }}
              >
                <span className="absolute left-1" style={{ writingMode: 'vertical-rl' }}>
                  {i * 50}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};