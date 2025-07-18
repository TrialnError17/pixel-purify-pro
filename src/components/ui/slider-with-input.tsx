import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Minus } from "lucide-react"
import { cn } from "@/lib/utils"

interface SliderWithInputProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
  className?: string
  sliderClassName?: string
  inputClassName?: string
  label?: string
  showInput?: boolean
  disabled?: boolean
}

export const SliderWithInput = React.forwardRef<
  HTMLDivElement,
  SliderWithInputProps
>(({ 
  value, 
  onValueChange, 
  min, 
  max, 
  step, 
  className,
  sliderClassName,
  inputClassName,
  label,
  showInput = true,
  disabled = false,
  ...props 
}, ref) => {
  const currentValue = value[0] ?? 0

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (!isNaN(newValue) && newValue >= min && newValue <= max) {
      onValueChange([newValue])
    }
  }

  const handleInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    if (isNaN(newValue) || newValue < min) {
      onValueChange([min])
    } else if (newValue > max) {
      onValueChange([max])
    }
  }

  const increment = () => {
    const newValue = Math.min(max, currentValue + step)
    console.log('Increment:', { currentValue, step, newValue, min, max })
    onValueChange([newValue])
  }

  const decrement = () => {
    const newValue = Math.max(min, currentValue - step)
    console.log('Decrement:', { currentValue, step, newValue, min, max })
    onValueChange([newValue])
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
    <div ref={ref} className={cn("space-y-2", className)} {...props}>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <Slider
            value={value}
            onValueChange={onValueChange}
            min={min}
            max={max}
            step={step}
            className={cn("w-full", sliderClassName)}
            disabled={disabled}
          />
        </div>
        
        {showInput && (
          <div className="flex items-center gap-0.5 min-w-0">
            <Button
              variant="outline"
              size="sm"
              onClick={decrement}
              disabled={disabled || currentValue <= min}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <Minus className="h-2.5 w-2.5" />
            </Button>
            
            <Input
              type="number"
              value={currentValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleKeyDown}
              min={min}
              max={max}
              step={step}
              disabled={disabled}
              className={cn("h-6 w-12 text-center text-xs px-1", inputClassName)}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={increment}
              disabled={disabled || currentValue >= max}
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <Plus className="h-2.5 w-2.5" />
            </Button>
          </div>
        )}
      </div>
      
      {label && (
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>{min}</span>
          <span>{label}</span>
          <span>{max}</span>
        </div>
      )}
    </div>
  )
})

SliderWithInput.displayName = "SliderWithInput"