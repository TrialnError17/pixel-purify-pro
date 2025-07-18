import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"
import { cn } from "@/lib/utils"

const VerticalSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
  <SliderPrimitive.Root
    ref={ref}
    orientation="vertical"
    className={cn(
      "relative flex h-full w-6 touch-none select-none items-center justify-center",
      className
    )}
    {...props}
  >
    <SliderPrimitive.Track className="relative h-full w-2 grow overflow-hidden rounded-full bg-secondary">
      <SliderPrimitive.Range className="absolute w-full bg-primary" />
    </SliderPrimitive.Track>
    <SliderPrimitive.Thumb className="block h-4 w-4 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
  </SliderPrimitive.Root>
))
VerticalSlider.displayName = "VerticalSlider"

export { VerticalSlider }