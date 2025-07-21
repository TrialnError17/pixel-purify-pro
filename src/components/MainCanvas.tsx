import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings } from '@/pages/Index';
import { SpeckleSettings, useSpeckleTools } from '@/hooks/useSpeckleTools';
import { useEraserTool } from '@/hooks/useEraserTool';
import { debounce, throttle, areImageDataEqual } from '@/utils/performance';
import { getImageData, setImageData } from '@/utils/memoryCache';
import { 
  Move, 
  Pipette, 
  MousePointer, 
  ZoomIn, 
  ZoomOut, 
  RotateCcw,
  Maximize,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Download,
  Wand,
  Undo,
  Redo,
  Loader2,
  Eraser
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Random tip sets for Main Canvas empty state
const MainCanvasTips: React.FC = () => {
  const tipSets = [
    // Set 1: Getting Started & Best Results
    {
      tips: [
        {
          icon: "🎯",
          title: "Getting Started",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          items: [
            { text: "Drag & Drop:", desc: "Simply drop image files here" },
            { text: "Upload Button:", desc: "Use \"Add Images\" in the header" },
            { text: "Batch Processing:", desc: "Add multiple images to the queue" }
          ]
        },
        {
          icon: "⚡",
          title: "Best Results",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          items: [
            { text: "High Resolution:", desc: "Better precision for color removal" },
            { text: "Good Contrast:", desc: "Clear distinction between colors" },
            { text: "Even Lighting:", desc: "Reduces color variation issues" }
          ]
        }
      ]
    },
    // Set 2: Tool Selection & Workflow
    {
      tips: [
        {
          icon: "🛠️",
          title: "Choose Your Tool",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          items: [
            { text: "Magic Wand:", desc: "For precise, connected selections" },
            { text: "Color Stack:", desc: "Remove multiple colors at once" },
            { text: "Pan Tool:", desc: "Navigate and zoom around images" }
          ]
        },
        {
          icon: "📋",
          title: "Efficient Workflow",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          items: [
            { text: "Start Simple:", desc: "Begin with auto mode for backgrounds" },
            { text: "Refine Settings:", desc: "Adjust thresholds for precision" },
            { text: "Apply Effects:", desc: "Add backgrounds or enhance images" }
          ]
        }
      ]
    },
    // Set 3: Pro Techniques & Navigation
    {
      tips: [
        {
          icon: "🎨",
          title: "Pro Techniques",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          items: [
            { text: "Layer Effects:", desc: "Combine color removal with backgrounds" },
            { text: "Threshold Tuning:", desc: "Lower = precise, higher = broad" },
            { text: "Edge Cleanup:", desc: "Smooth rough edges automatically" }
          ]
        },
        {
          icon: "🗺️",
          title: "Navigation Tips",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          items: [
            { text: "Mouse Wheel:", desc: "Zoom in and out smoothly" },
            { text: "Space + Drag:", desc: "Pan around large images" },
            { text: "Triple Click:", desc: "Auto-fit image to screen" }
          ]
        }
      ]
    },
    // Set 4: File Formats & Quality
    {
      tips: [
        {
          icon: "📁",
          title: "File Format Guide",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          items: [
            { text: "PNG Files:", desc: "Best for preserving transparency" },
            { text: "JPEG Files:", desc: "Smaller size, good for solid backgrounds" },
            { text: "High DPI:", desc: "Better detail preservation" }
          ]
        },
        {
          icon: "🎛️",
          title: "Quality Control",
          gradient: "from-accent-teal/10 to-accent-cyan/10",
          border: "border-accent-teal/30",
          textColor: "text-accent-teal",
          items: [
            { text: "Preview First:", desc: "Check results before downloading" },
            { text: "Adjust Settings:", desc: "Fine-tune for perfect results" },
            { text: "Save Originals:", desc: "Keep backups of source files" }
          ]
        }
      ]
    },
    // Set 5: Advanced Features & Shortcuts
    {
      tips: [
        {
          icon: "🚀",
          title: "Advanced Features",
          gradient: "from-accent-violet/10 to-accent-purple/10",
          border: "border-accent-violet/30",
          textColor: "text-accent-violet",
          items: [
            { text: "Speckle Removal:", desc: "Clean up small unwanted spots" },
            { text: "Ink Stamp Effect:", desc: "Create stylized silhouettes" },
            { text: "Image Effects:", desc: "Adjust brightness, contrast, hue" }
          ]
        },
        {
          icon: "⌨️",
          title: "Power User Shortcuts",
          gradient: "from-accent-emerald/10 to-accent-green/10",
          border: "border-accent-emerald/30",
          textColor: "text-accent-emerald",
          items: [
            { text: "Ctrl+Z:", desc: "Undo last action" },
            { text: "Ctrl+Y:", desc: "Redo action" },
            { text: "Escape:", desc: "Exit fullscreen mode" }
          ]
        }
      ]
    },
    // Set 6: Troubleshooting & Performance
    {
      tips: [
        {
          icon: "🔧",
          title: "Common Issues",
          gradient: "from-accent-red/10 to-accent-rose/10",
          border: "border-accent-red/30",
          textColor: "text-accent-red",
          items: [
            { text: "Colors Not Removing:", desc: "Try different color spaces or thresholds" },
            { text: "Jagged Edges:", desc: "Enable edge cleanup for smoother results" },
            { text: "Too Much Removed:", desc: "Lower threshold or use manual mode" }
          ]
        },
        {
          icon: "⚡",
          title: "Performance Tips",
          gradient: "from-accent-blue/10 to-accent-indigo/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          items: [
            { text: "Large Images:", desc: "May process slower but with better quality" },
            { text: "Batch Mode:", desc: "Process multiple similar images efficiently" },
            { text: "Simple Backgrounds:", desc: "Use auto mode for faster processing" }
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
    <div className="space-y-4 animate-fade-in">
      {selectedTipSet.tips.map((tip, index) => (
        <div key={index} className={`bg-gradient-to-r ${tip.gradient} border ${tip.border} rounded-lg p-4`}>
          <div className={`font-medium ${tip.textColor} mb-3`}>
            {tip.icon} <span>{tip.title}</span>
          </div>
          <div className="text-sm text-muted-foreground space-y-2">
            {tip.items.map((item, itemIndex) => (
              <div key={itemIndex}>
                • <strong>{item.text}</strong> {item.desc}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

interface MainCanvasProps {
  image: ImageItem | undefined;
  tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand' | 'eraser') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: SpeckleSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  eraserSettings: { brushSize: number };
  erasingInProgressRef: React.MutableRefObject<boolean>;
  onImageUpdate: (image: ImageItem) => void;
  onColorPicked: (color: string) => void;
  onPreviousImage: () => void;
  onNextImage: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
  currentImageIndex: number;
  totalImages: number;
  onDownloadImage: (image: ImageItem) => void;
  setSingleImageProgress?: (progress: { imageId: string; progress: number } | null) => void;
  addUndoAction?: (action: { type: string; description: string; undo: () => void; redo?: () => void }) => void;
  
  onSpeckCountUpdate?: (count: number) => void;
}

export const MainCanvas: React.FC<MainCanvasProps> = ({
  image,
  tool,
  onToolChange,
  colorSettings,
  contiguousSettings,
  effectSettings,
  speckleSettings,
  edgeCleanupSettings,
  eraserSettings,
  erasingInProgressRef,
  onImageUpdate,
  onColorPicked,
  onPreviousImage,
  onNextImage,
  canGoPrevious,
  canGoNext,
  currentImageIndex,
  totalImages,
  onDownloadImage,
  setSingleImageProgress,
  addUndoAction,
  onSpeckCountUpdate
}) => {
  const { processSpecks } = useSpeckleTools();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [lastMousePos, setLastMousePos] = useState({ x: 0, y: 0 });
  const [undoStack, setUndoStack] = useState<ImageData[]>([]);
  const [redoStack, setRedoStack] = useState<ImageData[]>([]);
  const [originalImageData, setOriginalImageData] = useState<ImageData | null>(null);
  
  // Get original image data lazily only when needed for processing
  const getOriginalImageData = useCallback((): ImageData | null => {
    if (originalImageData) return originalImageData;
    
    if (!canvasRef.current) return null;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setOriginalImageData(imageData);
    return imageData;
  }, [originalImageData]);
  const hasManualEditsRef = useRef(false);
  const isProcessingEdgeCleanupRef = useRef(false);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const manualImageDataRef = useRef<ImageData | null>(null);
  
  // Sync manualImageDataRef with manualImageData state
  useEffect(() => {
    manualImageDataRef.current = manualImageData;
  }, [manualImageData]);
  
  // Eraser tool integration
  const eraserTool = useEraserTool(canvasRef.current, {
    brushSize: eraserSettings.brushSize,
    zoom,
    pan,
    centerOffset,
    containerRef,
    manualImageDataRef,
    hasManualEditsRef,
    erasingInProgressRef,
    onImageChange: (imageData) => {
      if (!canvasRef.current) return;
      
      // Save current state to local undo stack before applying eraser change
      const ctx = canvasRef.current.getContext('2d');
      if (ctx && manualImageData) {
        setUndoStack(prev => [...prev, manualImageData]);
        setRedoStack([]); // Clear redo stack when new action is performed
        
      }
      
      setManualImageData(imageData);
      
      // Update the memory cache so changes persist
      if (image) {
        const cachedData = getImageData(image.id);
        setImageData(image.id, cachedData?.originalData, imageData);
      }
    }
  });
  const [preEdgeCleanupImageData, setPreEdgeCleanupImageData] = useState<ImageData | null>(null);
  const [preSpeckleImageData, setPreSpeckleImageData] = useState<ImageData | null>(null);
  const [preImageEffectsImageData, setPreImageEffectsImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Simple state management without complex processing
  const [previousTool, setPreviousTool] = useState<'pan' | 'color-stack' | 'magic-wand' | 'eraser'>('pan');
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  
  // Triple-click detection state
  const [clickCount, setClickCount] = useState(0);
  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Color processing functions with LAB color space support
  const rgbToLab = useCallback((r: number, g: number, b: number): [number, number, number] => {
    // Convert RGB to XYZ
    let x = r / 255;
    let y = g / 255;
    let z = b / 255;

    x = x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
    y = y > 0.04045 ? Math.pow((y + 0.055) / 1.055, 2.4) : y / 12.92;
    z = z > 0.04045 ? Math.pow((z + 0.055) / 1.055, 2.4) : z / 12.92;

    x *= 100;
    y *= 100;
    z *= 100;

    // Observer = 2°, Illuminant = D65
    x = x / 95.047;
    y = y / 100.000;
    z = z / 108.883;

    x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
    y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
    z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

    const L = (116 * y) - 16;
    const A = 500 * (x - y);
    const B = 200 * (y - z);

    return [L, A, B];
  }, []);

  const calculateColorDistance = useCallback((r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number => {
    // Use LAB color space for more perceptual color matching
    const [l1, a1, b1Lab] = rgbToLab(r1, g1, b1);
    const [l2, a2, b2Lab] = rgbToLab(r2, g2, b2);
    
    const dl = l1 - l2;
    const da = a1 - a2;
    const db = b1Lab - b2Lab;
    
    // Delta E CIE76 formula for perceptual color difference
    return Math.sqrt(dl * dl + da * da + db * db);
  }, [rgbToLab]);

  // Helper function to compare ImageData objects
  const areImageDataEqual = useCallback((data1: ImageData, data2: ImageData): boolean => {
    if (data1.width !== data2.width || data1.height !== data2.height) {
      return false;
    }
    
    // Sample comparison - check every 10th pixel for performance
    const step = 40; // Check every 10th pixel (4 bytes per pixel)
    for (let i = 0; i < data1.data.length; i += step) {
      if (data1.data[i] !== data2.data[i] ||
          data1.data[i + 1] !== data2.data[i + 1] ||
          data1.data[i + 2] !== data2.data[i + 2] ||
          data1.data[i + 3] !== data2.data[i + 3]) {
        return false;
      }
    }
    return true;
  }, []);


  const processImageData = useCallback((imageData: ImageData, settings: ColorRemovalSettings, effects: EffectSettings): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Only process if color removal is enabled
    if (settings.enabled) {
      if (settings.mode === 'auto') {
        // Use top-left corner color
        const targetR = data[0];
        const targetG = data[1];
        const targetB = data[2];
        const threshold = settings.threshold * 2.5; // Scale threshold to make it more sensitive (was too high)

        if (settings.contiguous) {
          // Contiguous removal starting from top-left corner
          const visited = new Set<string>();
          const stack = [[0, 0]];
          
          const isColorSimilar = (r: number, g: number, b: number) => {
            const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
            return distance <= threshold;
          };
          
          while (stack.length > 0) {
            const [x, y] = stack.pop()!;
            const key = `${x},${y}`;
            
            if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
            visited.add(key);
            
            const pixelIndex = (y * width + x) * 4;
            const r = data[pixelIndex];
            const g = data[pixelIndex + 1];
            const b = data[pixelIndex + 2];
            
            if (!isColorSimilar(r, g, b)) continue;
            
            // Make pixel transparent
            data[pixelIndex + 3] = 0;
            
            // Add neighbors to stack
            stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
          }
        } else {
          // Simple non-contiguous removal for auto mode
          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
            
            if (distance <= threshold) {
              data[i + 3] = 0; // Make transparent
            }
          }
        }
      } else {
        // Manual mode - handle both single target color and picked colors
        let colorsToRemove = [];
        
        // Add the main target color
        const hex = settings.targetColor.replace('#', '');
        colorsToRemove.push({
          r: parseInt(hex.substr(0, 2), 16),
          g: parseInt(hex.substr(2, 2), 16),
          b: parseInt(hex.substr(4, 2), 16),
          threshold: settings.threshold
        });
        
        // Add all picked colors with their individual thresholds
        settings.pickedColors.forEach(pickedColor => {
          const pickedHex = pickedColor.color.replace('#', '');
          colorsToRemove.push({
            r: parseInt(pickedHex.substr(0, 2), 16),
            g: parseInt(pickedHex.substr(2, 2), 16),
            b: parseInt(pickedHex.substr(4, 2), 16),
            threshold: pickedColor.threshold
          });
        });

        // Process each pixel against all target colors (always non-contiguous in manual mode)
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Check against each target color
          for (const targetColor of colorsToRemove) {
            const distance = calculateColorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
            const threshold = targetColor.threshold * 2.5; // Scale threshold to make it more sensitive (was too high)
            
            if (distance <= threshold) {
              data[i + 3] = 0; // Make transparent
              break; // No need to check other colors once removed
            }
          }
        }
      }

      // Apply minimum region size filtering
      if (settings.minRegionSize.enabled && settings.minRegionSize.value > 0) {
        const alphaData = new Uint8ClampedArray(width * height);
        
        // Extract alpha channel
        for (let i = 0; i < data.length; i += 4) {
          alphaData[i / 4] = data[i + 3];
        }
        
        // Find and remove small transparent regions
        const visited = new Array(width * height).fill(false);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = y * width + x;
            
            if (!visited[index] && alphaData[index] === 0) {
              // Found a transparent pixel, flood fill to measure region size
              const regionPixels: number[] = [];
              const stack = [index];
              
              while (stack.length > 0) {
                const currentIndex = stack.pop()!;
                if (visited[currentIndex]) continue;
                
                const currentX = currentIndex % width;
                const currentY = Math.floor(currentIndex / width);
                
                if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue;
                if (alphaData[currentIndex] !== 0) continue;
                
                visited[currentIndex] = true;
                regionPixels.push(currentIndex);
                
                // Add neighbors
                if (currentX > 0) stack.push(currentIndex - 1);
                if (currentX < width - 1) stack.push(currentIndex + 1);
                if (currentY > 0) stack.push(currentIndex - width);
                if (currentY < height - 1) stack.push(currentIndex + width);
              }
              
              // If region is smaller than minimum size, restore it
              if (regionPixels.length < settings.minRegionSize.value) {
                for (const pixelIndex of regionPixels) {
                  data[pixelIndex * 4 + 3] = 255; // Make opaque
                }
              }
            }
          }
        }
      }
    }

    // Apply edge trimming only (alpha feathering and edge softening are applied at download)
    if (edgeCleanupSettings.enabled) {
      const edgeCleanupResult = processEdgeCleanup(new ImageData(data, width, height), edgeCleanupSettings);
      data.set(edgeCleanupResult.data);
    }

    // Apply background color for preview only (regardless of saveWithBackground setting)
    if (effects.background.enabled) {
      const hex = effects.background.color.replace('#', '');
      const bgR = parseInt(hex.substr(0, 2), 16);
      const bgG = parseInt(hex.substr(2, 2), 16);
      const bgB = parseInt(hex.substr(4, 2), 16);

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) {
          data[i] = bgR;
          data[i + 1] = bgG;
          data[i + 2] = bgB;
          data[i + 3] = 255;
        }
      }
    }

    // Apply ink stamp effect
    if (effects.inkStamp.enabled) {
      const hex = effects.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = effects.inkStamp.threshold === 1 ? 255 : (100 - effects.inkStamp.threshold) * 2.55;

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Only process non-transparent pixels
          // Convert to luminance (perceived brightness)
          const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
          
          if (luminance < threshold) {
            // Dark areas become stamp color
            data[i] = stampR;
            data[i + 1] = stampG;
            data[i + 2] = stampB;
            data[i + 3] = 255;
          } else {
            // Light areas become transparent
            data[i + 3] = 0;
          }
        }
      }
    }

    // Apply image effects at the end of the processing chain
    if (effects.imageEffects.enabled) {
      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] === 0) continue; // Skip transparent pixels
        
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Apply brightness
        if (effects.imageEffects.brightness !== 0) {
          const brightness = effects.imageEffects.brightness * 2.55; // Scale to 0-255
          r = Math.max(0, Math.min(255, r + brightness));
          g = Math.max(0, Math.min(255, g + brightness));
          b = Math.max(0, Math.min(255, b + brightness));
        }

        // Apply contrast
        if (effects.imageEffects.contrast !== 0) {
          const contrast = (effects.imageEffects.contrast + 100) / 100; // Convert to multiplier
          r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
          g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
          b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
        }

        // Apply vibrance (enhance muted colors)
        if (effects.imageEffects.vibrance !== 0) {
          const max = Math.max(r, g, b);
          const avg = (r + g + b) / 3;
          const amt = ((Math.abs(max - avg) * 2 / 255) * (effects.imageEffects.vibrance / 100));
          
          if (r !== max) r += (max - r) * amt;
          if (g !== max) g += (max - g) * amt;
          if (b !== max) b += (max - b) * amt;
          
          r = Math.max(0, Math.min(255, r));
          g = Math.max(0, Math.min(255, g));
          b = Math.max(0, Math.min(255, b));
        }

        // Apply hue shift
        if (effects.imageEffects.hue !== 0) {
          const [h, s, l] = rgbToHsl(r, g, b);
          const newHue = (h + effects.imageEffects.hue) % 360;
          [r, g, b] = hslToRgb(newHue, s, l);
        }

        // Apply colorize
        if (effects.imageEffects.colorize.enabled) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          const [colorR, colorG, colorB] = hslToRgb(
            effects.imageEffects.colorize.hue,
            effects.imageEffects.colorize.saturation / 100,
            effects.imageEffects.colorize.lightness / 100
          );
          
          // Blend with original based on lightness
          const blend = 0.5;
          r = Math.max(0, Math.min(255, gray * (1 - blend) + colorR * blend));
          g = Math.max(0, Math.min(255, gray * (1 - blend) + colorG * blend));
          b = Math.max(0, Math.min(255, gray * (1 - blend) + colorB * blend));
        }

        // Apply black and white
        if (effects.imageEffects.blackAndWhite) {
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;
          r = g = b = gray;
        }

        // Apply invert
        if (effects.imageEffects.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = Math.round(r);
        data[i + 1] = Math.round(g);
        data[i + 2] = Math.round(b);
      }
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Helper functions for HSL conversion
  const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case r: h = (g - b) / diff + (g < b ? 6 : 0); break;
        case g: h = (b - r) / diff + 2; break;
        case b: h = (r - g) / diff + 4; break;
      }
      h /= 6;
    }
    
    return [h * 360, s, l];
  };

  const hslToRgb = (h: number, s: number, l: number): [number, number, number] => {
    h /= 360;
    
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    if (s === 0) {
      const gray = l * 255;
      return [gray, gray, gray];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = hue2rgb(p, q, h + 1/3) * 255;
    const g = hue2rgb(p, q, h) * 255;
    const b = hue2rgb(p, q, h - 1/3) * 255;
    
    return [r, g, b];
  };

  // Edge cleanup processing function - only edge trimming for preview
  const processEdgeCleanup = useCallback((imageData: ImageData, settings: EdgeCleanupSettings): ImageData => {
    if (!settings.enabled) {
      return imageData;
    }

    const data = new Uint8ClampedArray(imageData.data);
    const width = imageData.width;
    const height = imageData.height;

    // Edge trimming - removes pixels layer by layer
    if (settings.trimRadius > 0) {
      const radius = settings.trimRadius;
      
      // Apply trimming layer by layer
      for (let layer = 0; layer < radius; layer++) {
        // Create a copy to work from for this layer
        const layerData = new Uint8ClampedArray(data);
        
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            
            if (layerData[index + 3] > 0) { // Only process non-transparent pixels
              let hasTransparentNeighbor = false;
              
              // Check immediate neighbors (8-connected)
              for (let dy = -1; dy <= 1 && !hasTransparentNeighbor; dy++) {
                for (let dx = -1; dx <= 1 && !hasTransparentNeighbor; dx++) {
                  if (dx === 0 && dy === 0) continue; // Skip center pixel
                  
                  const checkX = x + dx;
                  const checkY = y + dy;
                  
                  if (checkX < 0 || checkX >= width || checkY < 0 || checkY >= height) {
                    // Out of bounds = transparent
                    hasTransparentNeighbor = true;
                  } else {
                    const checkIndex = (checkY * width + checkX) * 4;
                    if (layerData[checkIndex + 3] === 0) {
                      hasTransparentNeighbor = true;
                    }
                  }
                }
              }
              
              // If this pixel is on the edge, remove it
              if (hasTransparentNeighbor) {
                data[index + 3] = 0; // Make transparent
              }
            }
          }
        }
      }
    }


    const result = new ImageData(data, width, height);
    return result;
  }, []);

  // Load original image and store image data
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // ALWAYS load and display the original image file, never processed data
    // This eliminates automatic processing and ensures only originals are shown
    const img = new Image();
    img.onload = () => {
      // Set canvas size to image size
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      // Clear and draw image
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      
      // OPTIMIZATION: Don't extract image data on load - only when needed for processing
      // This prevents the 1-minute delay - ImageData extraction is expensive
      setOriginalImageData(null);
      
      // Reset manual edits when new image is loaded
      hasManualEditsRef.current = false;
      setManualImageData(null);
      setUndoStack([]);
      setRedoStack([]);
      
      // Calculate center offset for the image
      if (containerRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const scaleX = (containerRect.width - 40) / canvas.width;
        const scaleY = (containerRect.height - 40) / canvas.height;
        const scale = Math.min(scaleX, scaleY, 1);
        
        // Calculate center position
        const centerX = (containerRect.width - canvas.width * scale) / 2;
        const centerY = (containerRect.height - canvas.height * scale) / 2;
        
        setZoom(scale);
        setPan({ x: 0, y: 0 });
        setCenterOffset({ x: centerX, y: centerY });
      }
    };
    
    img.onerror = (error) => {
      console.error('Failed to load image:', error);
    };
    
    img.src = URL.createObjectURL(image.file);
    
    return () => {
      URL.revokeObjectURL(img.src);
    };
  }, [image]);

  // Cleanup handled in the main effect

  // Auto-processing completely disabled to prevent performance issues on image load

  // Keyboard shortcut for spacebar (pan tool)

  // Keyboard shortcut for spacebar (pan tool)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
        if (tool !== 'pan') {
          setPreviousTool(tool);
          onToolChange('pan');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space' && isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(false);
        onToolChange(previousTool);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [tool, isSpacePressed, previousTool, onToolChange]);

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+Z for undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Shift+Z for redo
      else if (e.ctrlKey && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [undoStack, redoStack]);

  // Define handleFitToScreen before it's used in handleCanvasClick
  const handleFitToScreen = useCallback(() => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    const containerRect = container.getBoundingClientRect();
    const scaleX = (containerRect.width - 40) / canvas.width;
    const scaleY = (containerRect.height - 40) / canvas.height;
    const scale = Math.min(scaleX, scaleY, 1);
    
    // Calculate center position
    const centerX = (containerRect.width - canvas.width * scale) / 2;
    const centerY = (containerRect.height - canvas.height * scale) / 2;
    
    setZoom(scale);
    setPan({ x: 0, y: 0 });
    setCenterOffset({ x: centerX, y: centerY });
  }, []);

  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const origData = getOriginalImageData();
    if (!canvasRef.current || !image || !origData || !containerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle triple-click for fit to screen
    setClickCount(prev => prev + 1);
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount + 1 >= 3) {
        // Triple-click detected - fit to screen
        handleFitToScreen();
        setClickCount(0);
        return;
      }
      setClickCount(0);
    }, 400); // 400ms timeout for triple-click detection

    // Get container bounds for proper coordinate calculation
    const containerRect = containerRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the actual canvas pixels
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    // Convert from container coordinates to canvas pixel coordinates
    const canvasX = (mouseX - centerOffset.x - pan.x) / zoom;
    const canvasY = (mouseY - centerOffset.y - pan.y) / zoom;
    
    // Round to pixel boundaries and ensure within canvas bounds
    const x = Math.floor(canvasX);
    const y = Math.floor(canvasY);
    
    if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;

    if (tool === 'color-stack') {
      // Get color at clicked position from original image
      const index = (y * origData.width + x) * 4;
      const r = origData.data[index];
      const g = origData.data[index + 1];
      const b = origData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Add to picked colors and immediately remove this color
      onColorPicked(hex);
      
      // Save current state for undo (both local canvas undo and global undo)
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      // Add global undo action
      if (addUndoAction && image) {
        addUndoAction({
          type: 'canvas_edit',
          description: `Pick color ${hex}`,
          undo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.putImageData(currentImageData, 0, 0);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
              }
            }
          },
          redo: () => {
            if (canvasRef.current && image) {
              removePickedColor(ctx, r, g, b, 30);
              const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
              const updatedImage = { ...image, processedData: newImageData };
              hasManualEditsRef.current = true;
              setManualImageData(newImageData);
              // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
            }
          }
        });
      }
      
      // Immediately remove this color with default threshold of 30
      removePickedColor(ctx, r, g, b, 30);
      
      // Mark that we have manual edits
      hasManualEditsRef.current = true;
      
      // Clear any stored pre-edge-cleanup and pre-speckle state since we're making new manual edits  
      setPreEdgeCleanupImageData(null);
      setPreSpeckleImageData(null);
      
      // Store the result
      const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
      }
    } else if (tool === 'magic-wand') {
      // Magic wand tool - removes only connected pixels of clicked color
      
      // Mark that we have manual edits IMMEDIATELY to prevent auto-processing from overriding
      hasManualEditsRef.current = true;
      
      // Clear any stored pre-edge-cleanup and pre-speckle state since we're making new manual edits
      setPreEdgeCleanupImageData(null);
      setPreSpeckleImageData(null);
      
      // Get color at clicked position from original image
      const index = (y * origData.width + x) * 4;
      const r = origData.data[index];
      const g = origData.data[index + 1];
      const b = origData.data[index + 2];
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      
      // Save current state for undo (both local canvas undo and global undo)
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, currentImageData]);
      setRedoStack([]); // Clear redo stack when new action is performed
      
      // Add global undo action
      if (addUndoAction && image) {
        addUndoAction({
          type: 'canvas_edit',
          description: `Magic wand removal of ${hex}`,
          undo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.putImageData(currentImageData, 0, 0);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
              }
            }
          },
          redo: () => {
            if (canvasRef.current && image) {
              const canvas = canvasRef.current;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                removeContiguousColorIndependent(ctx, x, y, contiguousSettings.threshold || 30);
                const newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const updatedImage = { ...image, processedData: newImageData };
                hasManualEditsRef.current = true;
                setManualImageData(newImageData);
                // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
              }
            }
          }
        });
      }
      
      // Remove contiguous color at clicked position using independent contiguous threshold
      console.log('Before removeContiguousColorIndependent, manual edits marked');
      const removedPixelsMap = removeContiguousColorIndependentWithTracking(ctx, x, y, contiguousSettings.threshold || 30);
      console.log('After removeContiguousColorIndependent');
      
      // Get the image data after magic wand removal
      let newImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      // Apply edge cleanup only to newly removed areas if enabled
      if ((edgeCleanupSettings.enabled || edgeCleanupSettings.legacyEnabled || edgeCleanupSettings.softening.enabled) && removedPixelsMap.size > 0) {
        newImageData = processEdgeCleanupSelective(newImageData, edgeCleanupSettings, removedPixelsMap);
        // Apply the edge-cleaned data back to canvas
        ctx.putImageData(newImageData, 0, 0);
      }
      
      // Store the image data after magic wand removal and reset all effect states
      setManualImageData(newImageData);
      
      // Clear ALL effect states to ensure clean processing with fresh manual edits
      if (preSpeckleImageData || preEdgeCleanupImageData || preImageEffectsImageData) {
        setPreSpeckleImageData(null);
        setPreEdgeCleanupImageData(null);
        setPreImageEffectsImageData(null);
        console.log('Cleared all effect states for fresh magic wand processing');
      }
      
      // DON'T run speckle processing here - let the main effect handle it to avoid threshold corruption
      console.log('Magic wand removal completed, manual edits stored, all states reset');
      
      // Store the manually edited result as base for future operations
      setManualImageData(newImageData);
      console.log('Stored manual image data');
      
      if (image) {
        const updatedImage = { ...image, processedData: newImageData };
        console.log('Tool interaction completed - visual preview only, no state update');
        // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
        
        // Visual feedback only - no state persistence until "Process All"
        console.log('Canvas shows preview only, awaiting Process All button');
      }
    }
  }, [image, getOriginalImageData, tool, zoom, pan, centerOffset, colorSettings, contiguousSettings, onColorPicked, onImageUpdate, addUndoAction, handleFitToScreen, clickCount]);

  const removeContiguousColor = (ctx: CanvasRenderingContext2D, startX: number, startY: number, settings: ColorRemovalSettings) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    // Get target color
    const index = (startY * width + startX) * 4;
    const targetR = data[index];
    const targetG = data[index + 1];
    const targetB = data[index + 2];
    
    // Flood fill algorithm to remove contiguous pixels
    const visited = new Set<string>();
    const stack = [[startX, startY]];
    
    const isColorSimilar = (r: number, g: number, b: number) => {
      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      return distance <= settings.threshold * 2.5; // Scale threshold to make it more sensitive (was too high)
    };
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
      visited.add(key);
      
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      
      if (!isColorSimilar(r, g, b)) continue;
      
      // Make pixel transparent
      data[pixelIndex + 3] = 0;
      
      // Add neighbors to stack (always contiguous for interactive tool)
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  // Independent contiguous removal function for the contiguous tool
  const removeContiguousColorIndependent = (ctx: CanvasRenderingContext2D, startX: number, startY: number, threshold: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    
    
    // Get target color
    const index = (startY * width + startX) * 4;
    const targetR = data[index];
    const targetG = data[index + 1];
    const targetB = data[index + 2];
    const targetA = data[index + 3];
    
    console.log(`Target color: rgba(${targetR}, ${targetG}, ${targetB}, ${targetA})`);
    
    // Skip if pixel is already transparent
    if (targetA === 0) {
      console.log('Target pixel is already transparent, skipping');
      return;
    }
    
    // Flood fill algorithm to remove contiguous pixels
    const visited = new Set<string>();
    const stack = [[startX, startY]];
    let removedPixels = 0;
    
    const thresholdScaled = threshold * 2.5; // Scale threshold to make it more sensitive (was too high)
    console.log(`Threshold scaled: ${thresholdScaled}`);
    
    const isColorSimilar = (r: number, g: number, b: number) => {
      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      const similar = distance <= thresholdScaled;
      return similar;
    };
    
    while (stack.length > 0) {
      const [x, y] = stack.pop()!;
      const key = `${x},${y}`;
      
      if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
      visited.add(key);
      
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];
      
      // Skip if pixel is already transparent
      if (a === 0) continue;
      
      if (!isColorSimilar(r, g, b)) continue;
      
      // Make pixel transparent
      data[pixelIndex + 3] = 0;
      removedPixels++;
      
      // Add neighbors to stack
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    console.log(`Removed ${removedPixels} pixels`);
    
    if (removedPixels > 0) {
      ctx.putImageData(imageData, 0, 0);
      console.log('Applied image data to canvas');
    } else {
      console.log('No pixels were removed');
    }
  };

  // Enhanced version that tracks which pixels were removed
  const removeContiguousColorIndependentWithTracking = (ctx: CanvasRenderingContext2D, startX: number, startY: number, threshold: number): Set<number> => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;
    const removedPixels = new Set<number>();
    
    
    
    // Get target color
    const targetIndex = (startY * width + startX) * 4;
    const targetR = data[targetIndex];
    const targetG = data[targetIndex + 1];
    const targetB = data[targetIndex + 2];
    const targetA = data[targetIndex + 3];
    
    if (targetA === 0) return removedPixels; // Already transparent
    
    console.log(`Target color: rgba(${targetR}, ${targetG}, ${targetB}, ${targetA})`);
    
    const thresholdScaled = threshold * 2.5; // Scale threshold to make it more sensitive (was too high)
    console.log(`Threshold scaled: ${thresholdScaled}`);
    
    const visited = new Set<string>();
    const stack: [number, number][] = [[startX, startY]];
    let pixelCount = 0;
    
    while (stack.length > 0 && pixelCount < 500000) {
      const [x, y] = stack.pop()!;
      pixelCount++;
      
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      
      const key = `${x},${y}`;
      if (visited.has(key)) continue;
      visited.add(key);
      
      const pixelIndex = (y * width + x) * 4;
      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];
      const a = data[pixelIndex + 3];
      
      if (a === 0) continue; // Already transparent
      
      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      if (distance > thresholdScaled) continue;
      
      // Mark pixel as transparent and track it
      data[pixelIndex + 3] = 0;
      removedPixels.add(pixelIndex / 4); // Store pixel index (not byte index)
      
      // Add neighbors to stack
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    
    console.log(`Removed ${removedPixels.size} pixels`);
    
    if (removedPixels.size > 0) {
      ctx.putImageData(imageData, 0, 0);
      console.log('Applied image data to canvas');
    }
    
    return removedPixels;
  };

  // Selective edge cleanup that only processes pixels around newly removed areas
  const processEdgeCleanupSelective = (imageData: ImageData, settings: EdgeCleanupSettings, removedPixels: Set<number>): ImageData => {
    const { width, height } = imageData;
    const data = new Uint8ClampedArray(imageData.data);
    const result = new ImageData(data, width, height);
    
    if (!settings.enabled || settings.trimRadius <= 0 || removedPixels.size === 0) {
      return result;
    }
    
    // Find edge pixels - pixels that are adjacent to removed pixels
    const edgePixels = new Set<number>();
    const radius = settings.trimRadius;
    
    for (const removedPixelIndex of removedPixels) {
      const x = removedPixelIndex % width;
      const y = Math.floor(removedPixelIndex / width);
      
      // Check surrounding pixels within trim radius
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIndex = ny * width + nx;
            const dataIndex = neighborIndex * 4;
            
            // If this pixel is not transparent and not already removed, it's an edge pixel
            if (result.data[dataIndex + 3] > 0 && !removedPixels.has(neighborIndex)) {
              edgePixels.add(neighborIndex);
            }
          }
        }
      }
    }
    
    // Apply edge trimming to edge pixels
    for (const edgePixelIndex of edgePixels) {
      const x = edgePixelIndex % width;
      const y = Math.floor(edgePixelIndex / width);
      const dataIndex = edgePixelIndex * 4;
      
      // Check if this pixel should be trimmed based on proximity to removed areas
      let shouldTrim = false;
      
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;
          
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const neighborIndex = ny * width + nx;
            
            // If a neighboring pixel was removed, consider trimming this edge pixel
            if (removedPixels.has(neighborIndex)) {
              const distance = Math.sqrt(dx * dx + dy * dy);
              if (distance <= radius) {
                shouldTrim = true;
                break;
              }
            }
          }
        }
        if (shouldTrim) break;
      }
      
      if (shouldTrim) {
        result.data[dataIndex + 3] = 0; // Make transparent
      }
    }
    
    console.log(`Edge cleanup processed ${edgePixels.size} edge pixels around ${removedPixels.size} removed pixels`);
    return result;
  };

  const removePickedColor = (ctx: CanvasRenderingContext2D, targetR: number, targetG: number, targetB: number, threshold: number) => {
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const width = imageData.width;
    const height = imageData.height;

    // Convert threshold to proper scale - scale it to make it more sensitive (was too high)
    const thresholdScaled = threshold * 2.5;

    // Remove all similar colors globally (non-contiguous for eyedropper)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
      
      if (distance <= thresholdScaled) {
        data[i + 3] = 0; // Make transparent
      }
    }
    
    ctx.putImageData(imageData, 0, 0);
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      eraserTool.startErasing(e.nativeEvent);
    } else if (tool === 'pan') {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool, eraserTool]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (tool === 'eraser') {
      eraserTool.continueErasing(e.nativeEvent);
    } else if (isDragging && tool === 'pan') {
      const dx = e.clientX - lastMousePos.x;
      const dy = e.clientY - lastMousePos.y;
      setPan(prev => ({ x: prev.x + dx, y: prev.y + dy }));
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool, eraserTool, isDragging, lastMousePos]);

  const handleMouseUp = useCallback((e?: React.MouseEvent) => {
    if (tool === 'eraser') {
      eraserTool.stopErasing(e?.nativeEvent);
    } else {
      setIsDragging(false);
    }
  }, [tool, eraserTool]);

  const handleZoom = useCallback((direction: 'in' | 'out', centerX?: number, centerY?: number) => {
    if (!containerRef.current || !canvasRef.current) return;
    
    const container = containerRef.current;
    const canvas = canvasRef.current;
    
    setZoom(prev => {
      const factor = direction === 'in' ? 1.2 : 0.8;
      const newZoom = Math.max(0.1, Math.min(5, prev * factor));
      
      // If no center coordinates provided (from button clicks), use container center
      const containerRect = container.getBoundingClientRect();
      const actualCenterX = centerX ?? containerRect.left + containerRect.width / 2;
      const actualCenterY = centerY ?? containerRect.top + containerRect.height / 2;
      
      // Calculate mouse/center position relative to canvas
      const centerCanvasX = (actualCenterX - containerRect.left - centerOffset.x - pan.x) / prev;
      const centerCanvasY = (actualCenterY - containerRect.top - centerOffset.y - pan.y) / prev;
      
      // Calculate new pan to keep the center point centered
      const newPanX = pan.x - (centerCanvasX * (newZoom - prev));
      const newPanY = pan.y - (centerCanvasY * (newZoom - prev));
      
      setPan({ x: newPanX, y: newPanY });
      
      return newZoom;
    });
  }, [centerOffset, pan]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    // Check for modifier keys
    if (e.shiftKey) {
      // Shift + scroll = pan up/down
      const deltaY = e.deltaY * 0.5; // Adjust sensitivity
      setPan(prev => ({ x: prev.x, y: prev.y - deltaY }));
    } else if (e.altKey) {
      // Alt + scroll = pan left/right
      const deltaX = e.deltaY * 0.5; // Adjust sensitivity
      setPan(prev => ({ x: prev.x - deltaX, y: prev.y }));
    } else {
      // Normal scroll = zoom
      const direction = e.deltaY < 0 ? 'in' : 'out';
      handleZoom(direction, e.clientX, e.clientY);
    }
  }, [handleZoom]);

  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('Local undo - restoring previous state');
    const previousState = undoStack[undoStack.length - 1];
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    setUndoStack(prev => prev.slice(0, -1));
    setRedoStack(prev => [...prev, currentState]);
    
    // Restore the previous canvas state
    ctx.putImageData(previousState, 0, 0);
    
    // Update the image with the restored state
    const restoredImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updatedImage = { ...image, processedData: restoredImageData };
    
    // Update manual image data and references to preserve the undo state
    hasManualEditsRef.current = true;
    manualImageDataRef.current = restoredImageData;
    setManualImageData(restoredImageData);
    
    console.log('Local undo completed, undoStack length:', undoStack.length - 1);
    // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
  }, [undoStack, image, onImageUpdate]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !canvasRef.current || !image) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    console.log('Local redo - restoring next state');
    const nextState = redoStack[redoStack.length - 1];
    const currentState = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    setRedoStack(prev => prev.slice(0, -1));
    setUndoStack(prev => [...prev, currentState]);
    
    // Restore the next canvas state
    ctx.putImageData(nextState, 0, 0);
    
    // Update the image with the restored state
    const restoredImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const updatedImage = { ...image, processedData: restoredImageData };
    
    // Update manual image data and references to preserve the redo state
    hasManualEditsRef.current = true;
    manualImageDataRef.current = restoredImageData;
    setManualImageData(restoredImageData);
    
    console.log('Local redo completed, redoStack length:', redoStack.length - 1);
    // onImageUpdate(updatedImage); // DISABLED: No automatic state updates
  }, [redoStack, image, onImageUpdate]);


  const handleReset = useCallback(() => {
    const origData = getOriginalImageData();
    if (!origData || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear manual edits and restore original image without any processing
    hasManualEditsRef.current = false;
    setManualImageData(null);
    setUndoStack([]);
    setRedoStack([]);
    
    // Just restore the original image data without automatic processing
    ctx.putImageData(origData, 0, 0);
    
    if (image) {
      const updatedImage = { ...image, processedData: origData };
      // onImageUpdate(updatedImage); // DISABLED: No automatic state updates - reset is visual only
    }
  }, [getOriginalImageData, image, onImageUpdate]);

  const handleDownload = useCallback(() => {
    if (!image || !canvasRef.current || isDownloading) return;
    
    // Immediate feedback - start local progress
    setIsDownloading(true);
    setDownloadProgress(0);
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setIsDownloading(false);
      setDownloadProgress(0);
      return;
    }
    
    // Simulate progress steps for visual feedback
    setTimeout(() => setDownloadProgress(25), 100);
    setTimeout(() => setDownloadProgress(50), 200);
    setTimeout(() => setDownloadProgress(75), 300);
    
    // Get current canvas data to pass to the download handler
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create a temporary image object with current canvas data
    const imageWithCurrentData = {
      ...image,
      processedData: currentImageData,
      status: 'completed' as const
    };
    
    // Complete the download
    setTimeout(() => {
      setDownloadProgress(100);
      onDownloadImage(imageWithCurrentData);
      
      // Reset states after download
      setTimeout(() => {
        setIsDownloading(false);
        setDownloadProgress(0);
        // Also trigger the queue progress for consistency if it's visible
        if (setSingleImageProgress) {
          setSingleImageProgress(null);
        }
      }, 1000);
    }, 400);
  }, [image, onDownloadImage, setSingleImageProgress, isDownloading]);

  return (
    <div className="flex-1 flex flex-col bg-canvas-bg">
      {/* Toolbar */}
      <div className="h-12 bg-gradient-header border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-1">
          {/* Navigation */}
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
            title="Previous image"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <span className="text-sm text-muted-foreground px-2">
            {currentImageIndex} / {totalImages}
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextImage}
            disabled={!canGoNext}
            title="Next image"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
          
          <div className="w-px h-6 bg-border mx-2" />
          
          {/* Undo/Redo */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="flex items-center gap-1"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRedo}
            disabled={redoStack.length === 0}
            className="flex items-center gap-1"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo className="w-4 h-4" />
            Redo
          </Button>
          
          <div className="w-px h-6 bg-border mx-1" />
          
          {/* Tools */}
          <Button
            variant={tool === 'pan' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('pan')}
            className={tool === 'pan' 
              ? "bg-accent-blue text-white" 
              : "border-accent-blue text-accent-blue hover:bg-accent-blue/10"}
          >
            <Move className="w-4 h-4 mr-1" />
            Pan
          </Button>
          
          <Button
            variant={tool === 'color-stack' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('color-stack')}
            className={tool === 'color-stack' 
              ? "bg-accent-purple text-white" 
              : "border-accent-purple text-accent-purple hover:bg-accent-purple/10"}
          >
            <Pipette className="w-4 h-4 mr-1" />
            Color Stack
          </Button>
          
          
          <Button
            variant={tool === 'magic-wand' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('magic-wand')}
            className={tool === 'magic-wand' 
              ? "bg-accent-cyan text-white" 
              : "border-accent-cyan text-accent-cyan hover:bg-accent-cyan/10"}
            title="Magic Wand - Remove connected pixels"
          >
            <Wand className="w-4 h-4 mr-1" />
            Magic Wand
          </Button>
          
          <Button
            variant={tool === 'eraser' ? 'default' : 'outline'}
            size="sm"
            onClick={() => onToolChange('eraser')}
            className={tool === 'eraser' 
              ? "bg-accent-red text-white" 
              : "border-accent-red text-accent-red hover:bg-accent-red/10"}
            title="Eraser - Remove pixels with brush"
          >
            <Eraser className="w-4 h-4 mr-1" />
            Eraser
          </Button>
        </div>
        
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('out')}
            disabled={zoom <= 0.1}
          >
            <ZoomOut className="w-4 h-4" />
          </Button>
          
          <span 
            className="text-sm text-muted-foreground min-w-12 text-center cursor-pointer hover:text-primary transition-colors"
            onDoubleClick={handleFitToScreen}
            title="Double-click to fit to screen"
          >
            {Math.round(zoom * 100)}%
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleZoom('in')}
            disabled={zoom >= 5}
          >
            <ZoomIn className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleFitToScreen}
          >
            <Maximize className="w-4 h-4" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            disabled={!hasManualEditsRef.current && !manualImageData}
            title="Reset image"
          >
            <RefreshCw className="w-4 h-4" />
          </Button>
          
          {image && (
            <Button
              variant="default"
              size="sm"
              onClick={handleDownload}
              disabled={!image || isDownloading}
              title={isDownloading ? "Preparing download..." : "Download PNG"}
              className="flex items-center gap-2"
            >
              {isDownloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              {isDownloading ? "Preparing..." : "Download"}
            </Button>
          )}
        </div>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden select-none"
        style={{ 
          backgroundColor: effectSettings.background.enabled ? effectSettings.background.color : 'hsl(var(--canvas-bg))'
        }}
        onWheel={handleWheel}
        onDoubleClick={handleFitToScreen}
      >
        {image ? (
          <>
            {/* Background backdrop layer */}
            {effectSettings.background.enabled && (
              <div
                className="absolute"
                style={{
                  transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
                  transformOrigin: '0 0',
                  width: originalImageData?.width || canvasRef.current?.width || 0,
                  height: originalImageData?.height || canvasRef.current?.height || 0,
                  backgroundColor: effectSettings.background.color,
                }}
              />
            )}
            
            {/* Main image canvas */}
            <canvas
              ref={canvasRef}
              className={cn(
                "absolute cursor-crosshair",
                tool === 'pan' && (isDragging ? 'cursor-grabbing' : 'cursor-grab'),
                tool === 'color-stack' && 'cursor-crosshair',
                tool === 'magic-wand' && 'cursor-crosshair',
                tool === 'eraser' && 'cursor-none'
              )}
              style={{
                transform: `translate(${centerOffset.x + pan.x}px, ${centerOffset.y + pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                imageRendering: zoom > 2 ? 'pixelated' : 'auto',
                cursor: tool === 'eraser' ? eraserTool.getBrushCursor() : undefined
              }}
              onClick={handleCanvasClick}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              onTouchStart={(e) => tool === 'eraser' && eraserTool.startErasing(e.nativeEvent)}
              onTouchMove={(e) => tool === 'eraser' && eraserTool.continueErasing(e.nativeEvent)}
              onTouchEnd={(e) => tool === 'eraser' && eraserTool.stopErasing(e.nativeEvent)}
            />
          </>
        ) : (
          <Card className="absolute inset-4 flex items-center justify-center border-dashed border-2 border-border/50">
            <div className="text-center max-w-lg mx-auto px-6">
              <div className="text-4xl mb-4">🖼️</div>
              <h3 className="text-lg font-medium text-foreground mb-4">No Image Selected</h3>
              <MainCanvasTips />
            </div>
          </Card>
        )}
        
        {/* Download Progress Overlay - Always visible regardless of queue state */}
        {isDownloading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-card border border-border rounded-lg p-6 shadow-xl min-w-80">
              <div className="flex items-center gap-3 mb-4">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <span className="text-lg font-medium">Downloading Image...</span>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>Progress</span>
                  <span>{downloadProgress}%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MainCanvas;