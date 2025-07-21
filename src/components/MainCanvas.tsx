import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ImageItem, ColorRemovalSettings, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings } from '@/pages/Index';
import { SpeckleSettings, useSpeckleTools } from '@/hooks/useSpeckleTools';
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
  Loader2
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
  tool: 'pan' | 'color-stack' | 'magic-wand';
  onToolChange: (tool: 'pan' | 'color-stack' | 'magic-wand') => void;
  colorSettings: ColorRemovalSettings;
  contiguousSettings: ContiguousToolSettings;
  effectSettings: EffectSettings;
  speckleSettings: SpeckleSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
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
  const hasManualEditsRef = useRef(false);
  const isProcessingEdgeCleanupRef = useRef(false);
  const [manualImageData, setManualImageData] = useState<ImageData | null>(null);
  const [preEdgeCleanupImageData, setPreEdgeCleanupImageData] = useState<ImageData | null>(null);
  const [preSpeckleImageData, setPreSpeckleImageData] = useState<ImageData | null>(null);
  const [preImageEffectsImageData, setPreImageEffectsImageData] = useState<ImageData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previousTool, setPreviousTool] = useState<'pan' | 'color-stack' | 'magic-wand'>('pan');
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
            if (visited[y * width + x]) continue;
            
            const index = y * width + x;
            if (alphaData[index] === 0) {
              // Found a transparent pixel, flood fill to find region
              const regionPixels: number[] = [];
              const stack = [[x, y]];
              
              while (stack.length > 0) {
                const [cx, cy] = stack.pop()!;
                const cIndex = cy * width + cx;
                
                if (cx < 0 || cy < 0 || cx >= width || cy >= height || visited[cIndex] || alphaData[cIndex] > 0) continue;
                
                visited[cIndex] = true;
                regionPixels.push(cIndex);
                
                stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
              }
              
              // If region is too small, restore it
              if (regionPixels.length < settings.minRegionSize.value) {
                for (const pixelIndex of regionPixels) {
                  const dataIndex = pixelIndex * 4;
                  data[dataIndex + 3] = 255; // Make opaque
                }
              }
            } else {
              visited[y * width + x] = true;
            }
          }
        }
      }
    }

    // Apply ink stamp effect
    if (effects.inkStamp.enabled) {
      const hex = effects.inkStamp.color.replace('#', '');
      const stampR = parseInt(hex.substr(0, 2), 16);
      const stampG = parseInt(hex.substr(2, 2), 16);
      const stampB = parseInt(hex.substr(4, 2), 16);
      const threshold = effects.inkStamp.threshold === 1 ? 255 : (100 - effects.inkStamp.threshold) * 2.55; // Show all pixels when value is 1

      for (let i = 0; i < data.length; i += 4) {
        if (data[i + 3] > 0) { // Only process non-transparent pixels
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Convert to luminance (perceived brightness)
          const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
          
          if (luminance < threshold) {
            // Dark areas become stamp color
            data[i] = stampR;
            data[i + 1] = stampG;
            data[i + 2] = stampB;
            data[i + 3] = 255; // Fully opaque
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
          r = gray;
          g = gray;
          b = gray;
        }

        // Apply invert
        if (effects.imageEffects.invert) {
          r = 255 - r;
          g = 255 - g;
          b = 255 - b;
        }

        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;
      }
    }

    return new ImageData(data, width, height);
  }, [calculateColorDistance]);

  // Helper functions for color conversion
  const rgbToHsl = useCallback((r: number, g: number, b: number): [number, number, number] => {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    let h = 0;
    const l = (max + min) / 2;
    let s = 0;
    
    if (diff !== 0) {
      s = l > 0.5 ? diff / (2 - max - min) : diff / (max + min);
      
      switch (max) {
        case r:
          h = ((g - b) / diff + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / diff + 2) / 6;
          break;
        case b:
          h = ((r - g) / diff + 4) / 6;
          break;
      }
    }
    
    return [h * 360, s, l];
  }, []);

  const hslToRgb = useCallback((h: number, s: number, l: number): [number, number, number] => {
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
      return [l * 255, l * 255, l * 255];
    }
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    
    const r = hue2rgb(p, q, h + 1/3);
    const g = hue2rgb(p, q, h);
    const b = hue2rgb(p, q, h - 1/3);
    
    return [r * 255, g * 255, b * 255];
  }, []);

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

    return new ImageData(data, width, height);
  }, []);

  // Apply background to image data
  const applyBackground = useCallback((imageData: ImageData, backgroundColor: string): ImageData => {
    const data = new Uint8ClampedArray(imageData.data);
    const hex = backgroundColor.replace('#', '');
    const bgR = parseInt(hex.substr(0, 2), 16);
    const bgG = parseInt(hex.substr(2, 2), 16);
    const bgB = parseInt(hex.substr(4, 2), 16);

    for (let i = 0; i < data.length; i += 4) {
      const alpha = data[i + 3] / 255;
      
      if (alpha < 1) {
        // Blend with background
        data[i] = Math.round(data[i] * alpha + bgR * (1 - alpha));
        data[i + 1] = Math.round(data[i + 1] * alpha + bgG * (1 - alpha));
        data[i + 2] = Math.round(data[i + 2] * alpha + bgB * (1 - alpha));
        data[i + 3] = 255; // Make fully opaque
      }
    }

    return new ImageData(data, imageData.width, imageData.height);
  }, []);

  // Load original image and store image data
  useEffect(() => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if we can use existing processed data to avoid reloading
    if (image.processedData && !hasManualEditsRef.current) {
      const processedData = image.processedData;
      canvas.width = processedData.width;
      canvas.height = processedData.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(processedData, 0, 0);
      
      if (!originalImageData || !areImageDataEqual(originalImageData, processedData)) {
        setOriginalImageData(new ImageData(
          new Uint8ClampedArray(processedData.data),
          processedData.width,
          processedData.height
        ));
      }
      return;
    }

    // Load image from file
    const img = new Image();
    img.onload = () => {
      // Calculate optimal canvas size for large images
      const maxCanvasSize = 4096;
      let { width: displayWidth, height: displayHeight } = img;
      
      if (img.width > maxCanvasSize || img.height > maxCanvasSize) {
        const scale = Math.min(maxCanvasSize / img.width, maxCanvasSize / img.height);
        displayWidth = Math.floor(img.width * scale);
        displayHeight = Math.floor(img.height * scale);
      }

      canvas.width = displayWidth;
      canvas.height = displayHeight;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
      
      // Store original image data
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setOriginalImageData(new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ));
      
      // Store the original image data in the image object for future use
      if (image) {
        const updatedImage: ImageItem = {
          ...image,
          originalData: new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
          ),
          canvas
        };
        onImageUpdate(updatedImage);
      }
    };
    
    img.src = URL.createObjectURL(image.file);
    
    return () => {
      if (img.src) {
        URL.revokeObjectURL(img.src);
      }
    };
  }, [image?.id, image?.file, areImageDataEqual, onImageUpdate, originalImageData]);

  // Auto-processing effect that runs when settings change
  useEffect(() => {
    if (!originalImageData || !canvasRef.current || hasManualEditsRef.current || isProcessing) {
      return;
    }

    const hasColorSettings = colorSettings.enabled;
    const hasBackgroundEffect = effectSettings.background.enabled;
    const hasInkStamp = effectSettings.inkStamp.enabled;
    const hasImageEffects = effectSettings.imageEffects.enabled;
    const hasEdgeCleanup = edgeCleanupSettings.enabled;

    if (!hasColorSettings && !hasBackgroundEffect && !hasInkStamp && !hasImageEffects && !hasEdgeCleanup) {
      return;
    }

    // Auto-processing triggered
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Check if image already has processed data and use it if it matches current data
    if (image?.processedData && !areImageDataEqual(originalImageData, image.processedData)) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(image.processedData, 0, 0);

      // Apply edge cleanup if needed
      if (edgeCleanupSettings.enabled) {
        const edgeCleanedData = processEdgeCleanup(image.processedData, edgeCleanupSettings);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.putImageData(edgeCleanedData, 0, 0);
      }
    } else {
      // Fresh processing from original data
      let processedData = processImageData(originalImageData, colorSettings, effectSettings);
      
      // Apply speckle processing if enabled
      if (speckleSettings.enabled && (speckleSettings.removeSpecks || speckleSettings.highlightSpecks)) {
        const result = processSpecks(processedData, speckleSettings);
        processedData = result.processedData;
        if (onSpeckCountUpdate) {
          onSpeckCountUpdate(result.speckCount);
        }
      }
      
      // Apply edge cleanup
      if (edgeCleanupSettings.enabled) {
        processedData = processEdgeCleanup(processedData, edgeCleanupSettings);
      }
      
      // Apply background if enabled
      if (effectSettings.background.enabled) {
        const backgroundData = applyBackground(processedData, effectSettings.background.color);
        processedData = backgroundData;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.putImageData(processedData, 0, 0);
      
      // Update image with processed data
      if (image) {
        const updatedImage: ImageItem = {
          ...image,
          processedData: new ImageData(
            new Uint8ClampedArray(processedData.data),
            processedData.width,
            processedData.height
          )
        };
        onImageUpdate(updatedImage);
      }
    }
  }, [
    originalImageData,
    colorSettings,
    effectSettings,
    speckleSettings,
    edgeCleanupSettings,
    image,
    processImageData,
    processSpecks,
    processEdgeCleanup,
    areImageDataEqual,
    onImageUpdate,
    onSpeckCountUpdate,
    isProcessing
  ]);

  // Handle canvas click for color picking and magic wand
  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !originalImageData) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = Math.floor((e.clientX - rect.left) * scaleX);
    const y = Math.floor((e.clientY - rect.top) * scaleY);

    // Handle triple-click for auto-fit
    setClickCount(prev => prev + 1);
    
    if (clickTimeoutRef.current) {
      clearTimeout(clickTimeoutRef.current);
    }
    
    clickTimeoutRef.current = setTimeout(() => {
      if (clickCount >= 3) {
        handleAutoFit();
      }
      setClickCount(0);
    }, 400);

    if (tool === 'color-stack') {
      // Color picking mode
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const imageData = ctx.getImageData(x, y, 1, 1);
      const [r, g, b] = imageData.data;
      const color = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      onColorPicked(color);
    } else if (tool === 'magic-wand') {
      // Magic wand tool - contiguous selection
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Save current state for undo
      const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      setUndoStack(prev => [...prev, new ImageData(
        new Uint8ClampedArray(currentImageData.data),
        currentImageData.width,
        currentImageData.height
      )]);
      setRedoStack([]); // Clear redo stack

      // Get the color at click position
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = new Uint8ClampedArray(imageData.data);
      const width = imageData.width;
      const height = imageData.height;
      
      const pixelIndex = (y * width + x) * 4;
      const targetR = data[pixelIndex];
      const targetG = data[pixelIndex + 1];
      const targetB = data[pixelIndex + 2];
      
      // Use contiguous settings threshold
      const threshold = contiguousSettings.threshold * 2.5;
      
      // Flood fill algorithm
      const visited = new Set<string>();
      const stack = [[x, y]];
      
      const isColorSimilar = (r: number, g: number, b: number) => {
        const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
        return distance <= threshold;
      };
      
      while (stack.length > 0) {
        const [currentX, currentY] = stack.pop()!;
        const key = `${currentX},${currentY}`;
        
        if (visited.has(key) || currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue;
        visited.add(key);
        
        const currentPixelIndex = (currentY * width + currentX) * 4;
        const r = data[currentPixelIndex];
        const g = data[currentPixelIndex + 1];
        const b = data[currentPixelIndex + 2];
        
        if (!isColorSimilar(r, g, b)) continue;
        
        // Make pixel transparent
        data[currentPixelIndex + 3] = 0;
        
        // Add neighbors to stack
        stack.push([currentX + 1, currentY], [currentX - 1, currentY], [currentX, currentY + 1], [currentX, currentY - 1]);
      }
      
      // Update canvas
      const newImageData = new ImageData(data, width, height);
      ctx.putImageData(newImageData, 0, 0);
      
      // Mark as having manual edits
      hasManualEditsRef.current = true;
      setManualImageData(new ImageData(
        new Uint8ClampedArray(data),
        width,
        height
      ));

      // Add undo action if available
      if (addUndoAction) {
        addUndoAction({
          type: 'canvas_edit',
          description: 'Magic wand selection',
          undo: () => {
            if (canvasRef.current) {
              const ctx = canvasRef.current.getContext('2d');
              if (ctx && undoStack.length > 0) {
                const prevState = undoStack[undoStack.length - 1];
                ctx.putImageData(prevState, 0, 0);
                setUndoStack(prev => prev.slice(0, -1));
                setRedoStack(prev => [...prev, newImageData]);
              }
            }
          }
        });
      }
    }
  }, [tool, originalImageData, onColorPicked, contiguousSettings, calculateColorDistance, addUndoAction, clickCount, undoStack]);

  // Handle mouse events for panning
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (tool === 'pan' || isSpacePressed) {
      setIsDragging(true);
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [tool, isSpacePressed]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging && (tool === 'pan' || isSpacePressed)) {
      const deltaX = e.clientX - lastMousePos.x;
      const deltaY = e.clientY - lastMousePos.y;
      
      setPan(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
      
      setLastMousePos({ x: e.clientX, y: e.clientY });
    }
  }, [isDragging, tool, isSpacePressed, lastMousePos]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    
    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.1, Math.min(5, zoom * zoomFactor));
    
    // Get mouse position relative to canvas
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Calculate zoom center offset
    const zoomCenterX = (mouseX - rect.width / 2) * (newZoom - zoom);
    const zoomCenterY = (mouseY - rect.height / 2) * (newZoom - zoom);
    
    setZoom(newZoom);
    setPan(prev => ({
      x: prev.x - zoomCenterX,
      y: prev.y - zoomCenterY
    }));
  }, [zoom]);

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (!isSpacePressed) {
          setIsSpacePressed(true);
          setPreviousTool(tool);
          onToolChange('pan');
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
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
  }, [isSpacePressed, tool, previousTool, onToolChange]);

  // Auto-fit function
  const handleAutoFit = useCallback(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    const containerRect = container.getBoundingClientRect();
    const canvasAspect = canvas.width / canvas.height;
    const containerAspect = containerRect.width / containerRect.height;
    
    let newZoom;
    if (canvasAspect > containerAspect) {
      // Canvas is wider than container
      newZoom = (containerRect.width * 0.9) / canvas.width;
    } else {
      // Canvas is taller than container
      newZoom = (containerRect.height * 0.9) / canvas.height;
    }
    
    setZoom(Math.max(0.1, Math.min(5, newZoom)));
    setPan({ x: 0, y: 0 });
    setCenterOffset({ x: 0, y: 0 });
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.1, prev / 1.2));
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
    setCenterOffset({ x: 0, y: 0 });
  }, []);

  // Undo/Redo functions
  const handleUndo = useCallback(() => {
    if (undoStack.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current state to redo stack
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setRedoStack(prev => [...prev, new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    )]);

    // Restore previous state
    const prevState = undoStack[undoStack.length - 1];
    ctx.putImageData(prevState, 0, 0);
    setUndoStack(prev => prev.slice(0, -1));

    // Update manual image data
    setManualImageData(new ImageData(
      new Uint8ClampedArray(prevState.data),
      prevState.width,
      prevState.height
    ));
  }, [undoStack]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0 || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current state to undo stack
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev, new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    )]);

    // Restore next state
    const nextState = redoStack[redoStack.length - 1];
    ctx.putImageData(nextState, 0, 0);
    setRedoStack(prev => prev.slice(0, -1));

    // Update manual image data
    setManualImageData(new ImageData(
      new Uint8ClampedArray(nextState.data),
      nextState.width,
      nextState.height
    ));
  }, [redoStack]);

  // Reset manual edits
  const handleResetToOriginal = useCallback(() => {
    if (!originalImageData || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Save current state for undo
    const currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    setUndoStack(prev => [...prev, new ImageData(
      new Uint8ClampedArray(currentImageData.data),
      currentImageData.width,
      currentImageData.height
    )]);
    setRedoStack([]);

    // Reset to original
    ctx.putImageData(originalImageData, 0, 0);
    hasManualEditsRef.current = false;
    setManualImageData(null);

    // Add undo action if available
    if (addUndoAction) {
      addUndoAction({
        type: 'canvas_edit',
        description: 'Reset to original',
        undo: () => {
          if (canvasRef.current) {
            const ctx = canvasRef.current.getContext('2d');
            if (ctx) {
              ctx.putImageData(currentImageData, 0, 0);
              hasManualEditsRef.current = true;
              setManualImageData(new ImageData(
                new Uint8ClampedArray(currentImageData.data),
                currentImageData.width,
                currentImageData.height
              ));
            }
          }
        }
      });
    }
  }, [originalImageData, addUndoAction]);

  // Download handler
  const handleDownload = useCallback(async () => {
    if (!image || !canvasRef.current) return;

    setIsDownloading(true);
    setDownloadProgress(0);

    try {
      // Simulate download progress
      const progressInterval = setInterval(() => {
        setDownloadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      await onDownloadImage(image);

      clearInterval(progressInterval);
      setDownloadProgress(100);

      // Reset progress after a short delay
      setTimeout(() => {
        setDownloadProgress(0);
        setIsDownloading(false);
      }, 1000);
    } catch (error) {
      setIsDownloading(false);
      setDownloadProgress(0);
    }
  }, [image, onDownloadImage]);

  // Calculate canvas transform
  const canvasStyle = useMemo(() => {
    if (!canvasRef.current || !containerRef.current) return {};

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    return {
      transform: `translate(${pan.x + centerOffset.x}px, ${pan.y + centerOffset.y}px) scale(${zoom})`,
      transformOrigin: 'center center',
      maxWidth: 'none',
      maxHeight: 'none',
    };
  }, [zoom, pan, centerOffset]);

  // Get cursor style based on tool
  const getCursorStyle = useCallback(() => {
    if (isSpacePressed || tool === 'pan') {
      return isDragging ? 'grabbing' : 'grab';
    }
    if (tool === 'color-stack') {
      return 'crosshair';
    }
    if (tool === 'magic-wand') {
      return 'pointer';
    }
    return 'default';
  }, [tool, isSpacePressed, isDragging]);

  if (!image) {
    return (
      <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
        {/* Empty state header */}
        <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-accent-purple to-accent-blue flex items-center justify-center">
              <MousePointer className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Main Canvas</h2>
              <p className="text-sm text-muted-foreground">No image selected</p>
            </div>
          </div>
        </div>

        {/* Empty state content */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-r from-accent-purple to-accent-blue flex items-center justify-center">
                <MousePointer className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-foreground mb-2">Ready to Remove Backgrounds</h3>
              <p className="text-muted-foreground text-lg">
                Upload an image to get started with AI-powered background removal
              </p>
            </div>

            <MainCanvasTips />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-br from-background via-background to-muted/20">
      {/* Canvas header with tools and navigation */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-accent-purple to-accent-blue flex items-center justify-center">
            {tool === 'pan' && <Move className="w-4 h-4 text-white" />}
            {tool === 'color-stack' && <Pipette className="w-4 h-4 text-white" />}
            {tool === 'magic-wand' && <Wand className="w-4 h-4 text-white" />}
          </div>
          <div>
            <h2 className="font-semibold text-foreground">{image.name}</h2>
            <p className="text-sm text-muted-foreground">
              {currentImageIndex} of {totalImages}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Navigation */}
          <Button
            variant="outline"
            size="sm"
            onClick={onPreviousImage}
            disabled={!canGoPrevious}
            className="hidden sm:flex"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onNextImage}
            disabled={!canGoNext}
            className="hidden sm:flex"
          >
            <ChevronRight className="w-4 h-4" />
          </Button>

          {/* Tool selection */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant={tool === 'pan' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange('pan')}
              className={cn(
                "h-8 w-8 p-0",
                tool === 'pan' && "bg-gradient-to-r from-accent-purple to-accent-blue text-white"
              )}
            >
              <Move className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === 'color-stack' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange('color-stack')}
              className={cn(
                "h-8 w-8 p-0",
                tool === 'color-stack' && "bg-gradient-to-r from-accent-purple to-accent-blue text-white"
              )}
            >
              <Pipette className="w-4 h-4" />
            </Button>
            <Button
              variant={tool === 'magic-wand' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => onToolChange('magic-wand')}
              className={cn(
                "h-8 w-8 p-0",
                tool === 'magic-wand' && "bg-gradient-to-r from-accent-purple to-accent-blue text-white"
              )}
            >
              <Wand className="w-4 h-4" />
            </Button>
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomOut}
              className="h-8 w-8 p-0"
            >
              <ZoomOut className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetZoom}
              className="h-8 px-2 text-xs font-mono"
            >
              {Math.round(zoom * 100)}%
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleZoomIn}
              className="h-8 w-8 p-0"
            >
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleAutoFit}
              className="h-8 w-8 p-0"
            >
              <Maximize className="w-4 h-4" />
            </Button>
          </div>

          {/* Canvas controls */}
          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleUndo}
              disabled={undoStack.length === 0}
              className="h-8 w-8 p-0"
            >
              <Undo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRedo}
              disabled={redoStack.length === 0}
              className="h-8 w-8 p-0"
            >
              <Redo className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetToOriginal}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          {/* Download button */}
          <Button
            onClick={handleDownload}
            disabled={isDownloading}
            className="bg-gradient-to-r from-accent-purple to-accent-blue hover:from-accent-purple/80 hover:to-accent-blue/80 text-white"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {downloadProgress}%
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Download
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Canvas container */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-hidden relative bg-[radial-gradient(circle_at_center,_transparent_0%,_transparent_50%,_hsl(var(--muted))_100%)]"
        style={{ cursor: getCursorStyle() }}
      >
        {/* Checkerboard background for transparency */}
        <div 
          className="absolute inset-0 opacity-20"
          style={{
            backgroundImage: `
              linear-gradient(45deg, #000 25%, transparent 25%), 
              linear-gradient(-45deg, #000 25%, transparent 25%), 
              linear-gradient(45deg, transparent 75%, #000 75%), 
              linear-gradient(-45deg, transparent 75%, #000 75%)
            `,
            backgroundSize: '20px 20px',
            backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px'
          }}
        />

        {/* Canvas */}
        <div className="absolute inset-0 flex items-center justify-center">
          <canvas
            ref={canvasRef}
            onClick={handleCanvasClick}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
            style={canvasStyle}
            className="border border-border/20 shadow-2xl rounded-lg max-w-full max-h-full"
          />
        </div>

        {/* Tool indicator */}
        {(tool !== 'pan' || isSpacePressed) && (
          <div className="absolute top-4 left-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm">
            {isSpacePressed ? (
              <span className="flex items-center gap-2">
                <Move className="w-4 h-4" />
                Pan Mode (Space)
              </span>
            ) : tool === 'color-stack' ? (
              <span className="flex items-center gap-2">
                <Pipette className="w-4 h-4" />
                Click to pick color
              </span>
            ) : tool === 'magic-wand' ? (
              <span className="flex items-center gap-2">
                <Wand className="w-4 h-4" />
                Click to remove similar colors
              </span>
            ) : null}
          </div>
        )}

        {/* Zoom indicator */}
        {zoom !== 1 && (
          <div className="absolute bottom-4 right-4 bg-background/90 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-sm font-mono">
            {Math.round(zoom * 100)}%
          </div>
        )}
      </div>
    </div>
  );
};
