import * as React from "react"
import { VerticalSlider } from "@/components/ui/vertical-slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ChevronUp, ChevronDown, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface GraphicEQBandProps {
  label: string
  value: number
  onValueChange: (value: number) => void
  min: number
  max: number
  step?: number
  className?: string
  disabled?: boolean
}

export const GraphicEQBand = React.forwardRef<
  HTMLDivElement,
  GraphicEQBandProps
>(({ 
  label, 
  value, 
  onValueChange, 
  min, 
  max, 
  step = 1,
  className,
  disabled = false,
  ...props 
}, ref) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onValueChange(newValue)
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (isNaN(newValue) || newValue < min) {
      onValueChange(min)
    } else if (newValue > max) {
      onValueChange(max)
    }
  }

  const increment = () => {
    const newValue = Math.min(max, value + step)
    onValueChange(newValue)
  }

  const decrement = () => {
    const newValue = Math.max(min, value - step)
    onValueChange(newValue)
  }

  const resetToZero = () => {
    onValueChange(0)
  }

  const handleSliderDoubleClick = () => {
    resetToZero()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      increment()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      decrement()
    }
  }

  return (
    <div ref={ref} className={cn("flex flex-col items-center", className)} {...props}>
      {/* Label */}
      <div className="text-xs font-bold mb-3 text-foreground text-center h-6 flex items-center justify-center min-w-0">
        {label}
      </div>
      
      {/* Up Arrow */}
      <Button
        variant="outline"
        size="sm"
        onClick={increment}
        disabled={disabled || value >= max}
        className="h-6 w-6 p-0 mb-2 rounded-sm bg-gradient-to-b from-background to-muted border-accent-purple/30 hover:bg-accent-purple/10"
        title="Increase"
      >
        <ChevronUp className="h-3 w-3" />
      </Button>

      {/* Vertical Slider */}
      <div className="relative h-32 flex items-center justify-center mb-2 bg-gradient-to-b from-muted/30 to-muted/50 rounded-lg border border-accent-purple/20 px-2 py-1">
        <div className="absolute w-px h-1 bg-foreground/30 top-1/2 transform -translate-y-1/2 z-10 pointer-events-none" />
        <VerticalSlider
          value={[value]}
          onValueChange={([newValue]) => onValueChange(newValue)}
          min={min}
          max={max}
          step={step}
          className="h-28"
          disabled={disabled}
          onDoubleClick={handleSliderDoubleClick}
        />
      </div>

      {/* Down Arrow */}
      <Button
        variant="outline"
        size="sm"
        onClick={decrement}
        disabled={disabled || value <= min}
        className="h-6 w-6 p-0 mb-2 rounded-sm bg-gradient-to-b from-background to-muted border-accent-purple/30 hover:bg-accent-purple/10"
        title="Decrease"
      >
        <ChevronDown className="h-3 w-3" />
      </Button>

      {/* Reset Button and Input Field */}
      <div className="flex flex-col items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={resetToZero}
          disabled={disabled}
          className="h-6 w-6 p-0 bg-gradient-to-b from-background to-muted border-accent-purple/30"
          title="Reset to 0"
        >
          <RotateCcw className="h-3 w-3" />
        </Button>
        
        <Input
          type="number"
          value={value}
          onChange={handleInputChange}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="h-7 w-14 text-center text-xs px-1 bg-gradient-to-b from-background to-muted border-accent-purple/30 font-mono [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none [-moz-appearance:textfield]"
        />
      </div>
      
      {/* Value Range Indicators */}
      <div className="flex justify-between text-[10px] text-muted-foreground/60 w-full mt-1 px-1">
        <span>{max}</span>
        <span>{min}</span>
      </div>
    </div>
  )
})

GraphicEQBand.displayName = "GraphicEQBand"