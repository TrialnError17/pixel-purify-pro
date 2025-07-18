import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StudioKnobProps {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  defaultValue?: number;
  label: string;
  icon?: string;
  accentColor?: string;
  className?: string;
}

export const StudioKnob = React.forwardRef<HTMLDivElement, StudioKnobProps>(({
  value,
  onChange,
  min,
  max,
  step = 1,
  defaultValue = 0,
  label,
  icon,
  accentColor = 'accent-blue',
  className,
  ...props
}, ref) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ y: 0, value: 0 });
  const knobRef = useRef<HTMLDivElement>(null);

  // Calculate rotation angle based on value (-150° to +150°)
  const normalizedValue = (value - min) / (max - min);
  const rotation = -150 + (normalizedValue * 300);

  // Calculate LED state based on value
  const getLedState = (ledIndex: number) => {
    const ledValue = ledIndex / 11; // 12 LEDs (0-11)
    const threshold = Math.abs(normalizedValue - 0.5) * 2; // Distance from center
    return threshold > ledValue;
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ y: e.clientY, value });

    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = dragStart.y - e.clientY; // Inverted for natural feel
      const sensitivity = (max - min) / 200; // Adjust sensitivity
      const newValue = Math.min(max, Math.max(min, dragStart.value + (deltaY * sensitivity)));
      onChange(Math.round(newValue / step) * step);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [value, min, max, step, onChange, dragStart]);

  const handleIncrement = () => {
    const newValue = Math.min(max, value + step);
    onChange(newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(min, value - step);
    onChange(newValue);
  };

  const handleReset = () => {
    onChange(defaultValue);
  };

  return (
    <div ref={ref} className={cn("flex flex-col items-center space-y-3", className)} {...props}>
      {/* Label */}
      <div className="text-center">
        <div className={`text-xs font-medium bg-gradient-to-r from-${accentColor} to-accent-purple bg-clip-text text-transparent flex items-center justify-center gap-1`}>
          {icon && <span className="text-sm">{icon}</span>}
          {label}
        </div>
      </div>

      {/* LED Ring */}
      <div className="relative">
        <div className="w-20 h-20 relative">
          {/* LED indicators around the knob */}
          {Array.from({ length: 12 }, (_, i) => {
            const angle = -150 + (i * 25); // Spread LEDs across 300° arc
            const radian = (angle * Math.PI) / 180;
            const x = 35 + Math.cos(radian) * 28;
            const y = 35 + Math.sin(radian) * 28;
            const isActive = getLedState(i);

            return (
              <div
                key={i}
                className={cn(
                  "absolute w-1 h-1 rounded-full transition-all duration-100",
                  isActive 
                    ? `bg-${accentColor} shadow-[0_0_4px_currentColor] opacity-100` 
                    : "bg-muted/30 opacity-40"
                )}
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  transform: 'translate(-50%, -50%)',
                }}
              />
            );
          })}

          {/* Main knob body */}
          <div
            ref={knobRef}
            className={cn(
              "absolute inset-2 w-16 h-16 rounded-full cursor-pointer select-none",
              "bg-gradient-to-br from-muted via-card to-muted/80",
              "border-2 border-border shadow-[inset_0_2px_4px_rgba(0,0,0,0.3),_0_4px_8px_rgba(0,0,0,0.2)]",
              "transition-all duration-150",
              isDragging ? "scale-98 shadow-[inset_0_1px_2px_rgba(0,0,0,0.4)]" : "hover:scale-105"
            )}
            onMouseDown={handleMouseDown}
            style={{
              transform: `translate(-50%, -50%) rotate(${rotation}deg) ${isDragging ? 'scale(0.98)' : ''}`,
              left: '50%',
              top: '50%',
            }}
          >
            {/* Knob indicator mark */}
            <div 
              className={`absolute top-1 left-1/2 w-0.5 h-3 bg-${accentColor} rounded-full transform -translate-x-1/2 shadow-[0_0_2px_currentColor]`}
            />
            
            {/* Center dot */}
            <div className="absolute top-1/2 left-1/2 w-1 h-1 bg-foreground/60 rounded-full transform -translate-x-1/2 -translate-y-1/2" />
          </div>
        </div>
      </div>

      {/* Value display */}
      <div className="text-center">
        <div className={`text-xs font-mono bg-background/50 px-2 py-1 rounded border border-${accentColor}/30 min-w-[2.5rem]`}>
          {value > 0 ? '+' : ''}{value}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleDecrement}
          disabled={value <= min}
        >
          <ChevronDown className="h-3 w-3" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={handleReset}
        >
          ZERO
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleIncrement}
          disabled={value >= max}
        >
          <ChevronUp className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
});

StudioKnob.displayName = "StudioKnob";