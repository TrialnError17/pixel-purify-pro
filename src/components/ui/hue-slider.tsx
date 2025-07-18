import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

interface HueSliderProps {
  value: number[]
  onValueChange: (value: number[]) => void
  defaultValue?: number
  className?: string
}

export const HueSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  HueSliderProps
>(({ value, onValueChange, defaultValue = 0, className, ...props }, ref) => {
  const handleClick = (e: React.MouseEvent) => {
    if (e.altKey) {
      e.preventDefault()
      console.log('Hue reset to default:', { defaultValue })
      onValueChange([defaultValue])
    }
  }

  return (
  <SliderPrimitive.Root
    ref={ref}
    className={cn(
      "relative flex w-full touch-none select-none items-center",
      className
    )}
    value={value}
    onValueChange={onValueChange}
    onClick={handleClick}
    min={0}
    max={360}
    step={1}
    {...props}
  >
    <SliderPrimitive.Track 
      className="relative h-4 w-full grow overflow-hidden rounded-full"
      style={{
        background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)'
      }}
    >
      <SliderPrimitive.Range className="absolute h-full bg-transparent" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-6 w-6 rounded-full border-2 border-white bg-white shadow-lg ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 z-10" />
  </SliderPrimitive.Root>
)
})
HueSlider.displayName = "HueSlider"