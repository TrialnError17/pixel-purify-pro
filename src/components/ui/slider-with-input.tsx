import * as React from "react"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Minus, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

interface SliderWithInputProps {
  value: number[]
  onValueChange: (value: number[]) => void
  min: number
  max: number
  step: number
  buttonStep?: number
  defaultValue?: number
  className?: string
  sliderClassName?: string
  inputClassName?: string
  label?: string
  showInput?: boolean
  showReset?: boolean
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
  buttonStep = 10,
  defaultValue = 0,
  className,
  sliderClassName,
  inputClassName,
  label,
  showInput = true,
  showReset = false,
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
    const newValue = Math.min(max, currentValue + buttonStep)
    console.log('Increment:', { currentValue, buttonStep, newValue, min, max })
    onValueChange([newValue])
  }

  const decrement = () => {
    const newValue = Math.max(min, currentValue - buttonStep)
    console.log('Decrement:', { currentValue, buttonStep, newValue, min, max })
    onValueChange([newValue])
  }

  const resetToDefault = () => {
    console.log('Reset to default:', { defaultValue })
    onValueChange([defaultValue])
  }

  const handleSliderClick = (e: React.MouseEvent) => {
    if (e.altKey) {
      e.preventDefault()
      resetToDefault()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const newValue = Math.min(max, currentValue + step)
      onValueChange([newValue])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const newValue = Math.max(min, currentValue - step)
      onValueChange([newValue])
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
            onClick={handleSliderClick}
          />
        </div>
        
        {showReset && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefault}
            disabled={disabled}
            className="h-6 w-6 p-0 flex-shrink-0 ml-1"
            title={`Reset to ${defaultValue}`}
          >
            <RotateCcw className="h-2.5 w-2.5" />
          </Button>
        )}

        {showInput && (
          <div className="flex items-center gap-0 min-w-0 ml-1">
            <Button
              variant="outline"
              size="sm"
              onClick={decrement}
              disabled={disabled || currentValue <= min}
              className="h-6 w-6 p-0 flex-shrink-0 hover:bg-accent-purple/10 hover:border-accent-purple rounded-r-none border-r-0"
              title={`-${buttonStep}`}
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
              className={cn("h-6 w-12 text-center text-xs px-1 rounded-none border-x-0", inputClassName)}
              style={{
                appearance: 'textfield'
              }}
            />
            
            <Button
              variant="outline"
              size="sm"
              onClick={increment}
              disabled={disabled || currentValue >= max}
              className="h-6 w-6 p-0 flex-shrink-0 hover:bg-accent-blue/10 hover:border-accent-blue rounded-l-none border-l-0"
              title={`+${buttonStep}`}
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