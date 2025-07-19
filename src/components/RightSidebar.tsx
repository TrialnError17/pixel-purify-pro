import React from 'react';
import { ColorRemovalSettings, EffectSettings, EdgeCleanupSettings } from '@/pages/Index';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

export interface RightSidebarProps {
  currentTool: 'pan' | 'color-stack' | 'magic-wand';
  colorSettings: ColorRemovalSettings;
  speckleSettings: SpeckleSettings;
  effectSettings: EffectSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
  lastInteractedFeature: string | null;
  onFeatureInteraction: (feature: string) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ 
  currentTool, 
  colorSettings, 
  speckleSettings, 
  effectSettings, 
  edgeCleanupSettings,
  lastInteractedFeature,
  onFeatureInteraction
}) => {
  // Determine which feature to show based on priority and last interaction
  const getActiveFeatureForDisplay = () => {
    // If user recently interacted with a specific feature, show that
    if (lastInteractedFeature) {
      return lastInteractedFeature;
    }
    
    // Otherwise use tool priority system
    if (effectSettings.inkStamp.enabled) return 'ink-stamp';
    if (effectSettings.imageEffects.enabled) return 'image-effects';
    if (speckleSettings.enabled) return 'speckle-tools';
    if (edgeCleanupSettings.enabled) return 'edge-cleanup';
    if (effectSettings.background.enabled) return 'background';
    if (colorSettings.enabled) return 'color-removal';
    if (currentTool === 'magic-wand') return 'magic-wand';
    if (currentTool === 'color-stack') return 'color-stack';
    return currentTool; // defaults to 'pan'
  };

  const activeDisplayFeature = getActiveFeatureForDisplay();

  const getDisplayTitle = () => {
    // Feature-specific titles (more granular)
    switch (activeDisplayFeature) {
      case 'color-threshold': return '🎚️ Threshold Control Guide';
      case 'magic-wand-threshold': return '✨ Magic Wand Threshold Guide';
      case 'speckle-size': return '🔧 Speckle Size Guide';
      case 'background-color': return '🎨 Background Color Guide';
      case 'ink-threshold': return '🖋️ Ink Stamp Threshold Guide';
      case 'edge-radius': return '✂️ Edge Cleanup Radius Guide';
      // Tool-level titles (fallback)
      case 'color-removal': return '🎨 Color Removal Guide';
      case 'background': return '🖼️ Background Guide';
      case 'speckle-tools': return '🔧 Speckle Tools Guide';
      case 'ink-stamp': return '🖋️ Ink Stamp Guide';
      case 'image-effects': return '✨ Image Effects Guide';
      case 'edge-cleanup': return '✂️ Edge Cleanup Guide';
      case 'magic-wand': return '✨ Magic Wand Guide';
      case 'color-stack': return '🎨 Color Stack Guide';
      case 'pan': return '🗺️ Pan Tool Guide';
      default: return '📚 Learning Center';
    }
  };

  return (
    <div className="w-80 lg:w-96 bg-gradient-panel border-l border-border flex flex-col h-full">
      <div className="p-4 border-b border-border flex-shrink-0">
        <h2 className="text-lg font-semibold text-foreground">
          📚 Learning Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {getDisplayTitle()}
        </p>
      </div>
      
      <ToolSpecificContent 
        activeDisplayFeature={activeDisplayFeature}
        onFeatureInteraction={onFeatureInteraction}
      />
    </div>
  );
};

// Tool-specific content that adapts based on active tools and specific features
const ToolSpecificContent: React.FC<{ 
  activeDisplayFeature: string;
  onFeatureInteraction: (feature: string) => void;
}> = ({ activeDisplayFeature }) => {
  
  // Feature-specific instructions (most granular level)
  const featureInstructions: Record<string, any> = {
    'color-threshold': {
      sections: [
        {
          icon: "🎚️",
          title: "Threshold Control Mastery",
          gradient: "from-accent-orange/10 to-accent-yellow/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Precision Range (1-20): For exact color matching and fine details",
            "Balanced Range (21-50): Good starting point for most images",
            "Broad Range (51-80): Includes color variations and gradients",
            "Maximum Range (81-100): Removes very different colors"
          ]
        },
        {
          icon: "🔬",
          title: "Color Science Deep Dive",
          gradient: "from-accent-purple/10 to-accent-indigo/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "LAB Color Space: Uses perceptually uniform color difference",
            "Delta E Calculation: Industry standard color difference metric",
            "Threshold Scaling: Non-linear scaling matches human perception",
            "Anti-aliasing Handling: Smoothly handles edge pixel variations"
          ]
        },
        {
          icon: "🎯",
          title: "Strategic Threshold Usage",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Start Conservative: Begin with low values, increase gradually",
            "Monitor Preview: Watch for over-selection in real-time",
            "Edge Awareness: Lower thresholds near important subject details",
            "Multiple Passes: Use different thresholds for different areas"
          ]
        }
      ]
    },
    'magic-wand-threshold': {
      sections: [
        {
          icon: "✨",
          title: "Magic Wand Threshold Precision",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Ultra-Precise (1-10): Select only exact matching colors",
            "Fine Selection (11-25): Include slight color variations",
            "Standard Selection (26-45): Good for most contiguous areas",
            "Broad Selection (46-80): Include significant color changes"
          ]
        },
        {
          icon: "🎯",
          title: "Contiguous Selection Strategy",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "8-Way Connectivity: Algorithm checks all surrounding pixels",
            "Flood Fill Behavior: Spreads from click point to similar colors",
            "Edge Detection: Automatically stops at significant color changes",
            "Performance Optimization: Efficient for large connected areas"
          ]
        },
        {
          icon: "🧠",
          title: "Advanced Wand Techniques",
          gradient: "from-accent-green/10 to-accent-emerald/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Click Positioning: Center clicks work better than edge clicks",
            "Progressive Selection: Start low, increase if selection too small",
            "Multiple Zones: Use separate clicks for disconnected areas",
            "Threshold Testing: Try different values for optimal coverage"
          ]
        }
      ]
    },
    'speckle-size': {
      sections: [
        {
          icon: "🔧",
          title: "Speckle Size Optimization",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Micro Specks (1-25): Remove dust, scanner artifacts, noise",
            "Small Specks (26-100): Clean isolated pixels and tiny spots",
            "Medium Specks (101-500): Remove unwanted small objects",
            "Large Specks (501+): Delete significant unwanted areas"
          ]
        },
        {
          icon: "🎯",
          title: "Connected Component Analysis",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "8-Way Connectivity: Counts diagonally connected pixels",
            "Pixel Counting: Measures actual pixels, not bounding box",
            "Shape Independence: Works regardless of speck shape",
            "Transparency Analysis: Only processes non-transparent areas"
          ]
        },
        {
          icon: "⚡",
          title: "Speckle Removal Strategy",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Progressive Approach: Start small, increase size gradually",
            "Preview First: Use highlight mode to see what will be removed",
            "Combine with Edge Cleanup: Apply speckle removal then edge cleanup",
            "Performance Impact: Larger thresholds process faster"
          ]
        }
      ]
    },
    'background-color': {
      sections: [
        {
          icon: "🎨",
          title: "Background Color Theory",
          gradient: "from-accent-blue/10 to-accent-cyan/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          tips: [
            "Color Harmony: Choose colors that complement your subject",
            "Contrast Considerations: Ensure subject visibility and pop",
            "Brand Consistency: Match corporate or project color schemes",
            "Mood Creation: Warm colors = energy, cool colors = calm"
          ]
        },
        {
          icon: "🖼️",
          title: "Professional Applications",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Product Photography: White (#FFFFFF) for clean, professional look",
            "Portrait Work: Subtle grays or skin-tone complements",
            "Logo Design: High contrast colors for maximum impact",
            "Web Graphics: Colors that match website design system"
          ]
        },
        {
          icon: "⚡",
          title: "Technical Implementation",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Non-destructive Process: Original transparency always preserved",
            "Real-time Preview: See changes instantly as you adjust",
            "Save Options: Toggle background on/off for download",
            "Color Space: Uses RGB color space for accurate rendering"
          ]
        }
      ]
    },
    'ink-threshold': {
      sections: [
        {
          icon: "🖋️",
          title: "Ink Stamp Threshold Control",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "High Detail (1-25): Preserves fine details and textures",
            "Balanced (26-50): Good compromise between detail and simplicity",
            "Simplified (51-75): Creates cleaner, more graphic results",
            "Minimal (76-100): Ultra-simplified silhouettes"
          ]
        },
        {
          icon: "🎨",
          title: "Artistic Effect Control",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          tips: [
            "Luminance Analysis: Algorithm analyzes pixel brightness values",
            "Threshold Boundary: Dark areas become ink, light areas transparent",
            "Color Independence: Works regardless of original image colors",
            "High Contrast Sources: Best results with well-lit subjects"
          ]
        },
        {
          icon: "⚡",
          title: "Technical Optimization",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "Edge Preservation: Edge cleanup automatically disabled",
            "Color Selection: Choose any ink color for artistic effect",
            "Processing Order: Applied after color removal, before effects",
            "Performance: Efficient single-pass luminance conversion"
          ]
        }
      ]
    },
    'edge-radius': {
      sections: [
        {
          icon: "✂️",
          title: "Edge Cleanup Radius Control",
          gradient: "from-accent-teal/10 to-accent-cyan/10",
          border: "border-accent-teal/30",
          textColor: "text-accent-teal",
          tips: [
            "Minimal (1-2px): Gentle cleanup, preserves fine details",
            "Standard (3-4px): Good balance for most images",
            "Aggressive (5px+): Strong cleanup, may remove small details",
            "Image Scale: Adjust radius based on image resolution"
          ]
        },
        {
          icon: "🎯",
          title: "Edge Quality Control",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Conservative Approach: Start with smaller radius values",
            "Subject Protection: Algorithm preserves important subject details",
            "Zoom Testing: Check results at 100% zoom for accuracy",
            "Iterative Process: Apply multiple times with small radius"
          ]
        },
        {
          icon: "🧪",
          title: "Algorithm Deep Dive",
          gradient: "from-accent-indigo/10 to-accent-blue/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Morphological Operations: Uses erosion and dilation techniques",
            "Alpha Channel Focus: Works exclusively on transparency data",
            "Gradient Analysis: Detects smooth vs sharp edge transitions",
            "Performance Optimization: Minimal computational overhead"
          ]
        }
      ]
    },
    
    // All Image Effects Controls
    'brightness': {
      sections: [
        {
          icon: "☀️",
          title: "Brightness Control Mastery",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "Positive Values (+1 to +100): Make image brighter",
            "Negative Values (-1 to -100): Make image darker",
            "Linear Adjustment: Affects all pixels equally",
            "Start Small: ±10-20 for subtle, natural adjustments"
          ]
        },
        {
          icon: "🔬",
          title: "Technical Details",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "RGB Channel Impact: Adds/subtracts value from R, G, B channels",
            "Clipping Protection: Values clamped to 0-255 range",
            "Shadow Recovery: Positive values reveal hidden shadow detail",
            "Highlight Protection: Negative values prevent blown highlights"
          ]
        }
      ]
    },
    
    'contrast': {
      sections: [
        {
          icon: "⚫",
          title: "Contrast Enhancement",
          gradient: "from-accent-gray/10 to-accent-slate/10",
          border: "border-accent-gray/30",
          textColor: "text-accent-gray",
          tips: [
            "Positive Values: Increase difference between light/dark",
            "Negative Values: Reduce contrast for softer look",
            "Midpoint Anchoring: 128 gray stays unchanged",
            "Dynamic Range: Expands or compresses tonal range"
          ]
        },
        {
          icon: "📈",
          title: "Professional Applications",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Portrait Enhancement: +10 to +25 for skin definition",
            "Landscape Drama: +30 to +50 for sky and cloud detail",
            "Vintage Look: -20 to -40 for soft, dreamy effects",
            "Product Photography: +15 to +30 for crisp, defined edges"
          ]
        }
      ]
    },
    
    'vibrance': {
      sections: [
        {
          icon: "✨",
          title: "Vibrance Intelligence",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Smart Saturation: Protects already-saturated colors",
            "Skin Tone Aware: Preserves natural skin colors",
            "Muted Color Focus: Enhances dull colors more than vivid ones",
            "Perceptual Algorithm: Based on human color perception"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Control",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Portrait Work: +20 to +40 enhances without oversaturation",
            "Landscape: +30 to +60 brings nature colors to life",
            "Architecture: +15 to +25 enhances building materials",
            "Negative Values: Create unique desaturated artistic effects"
          ]
        }
      ]
    },
    
    'hue-shift': {
      sections: [
        {
          icon: "🎨",
          title: "Color Wheel Mastery",
          gradient: "from-accent-rainbow-start/10 to-accent-rainbow-end/10",
          border: "border-accent-rainbow-start/30",
          textColor: "text-accent-rainbow-start",
          tips: [
            "Full Spectrum: -180° to +180° covers entire color wheel",
            "60° Intervals: Major color family shifts (red→yellow)",
            "180° Flip: Creates complementary color schemes",
            "Creative Grading: Transform mood with color shifts"
          ]
        },
        {
          icon: "🌈",
          title: "Artistic Applications",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Autumn Effect: +30° to +60° (greens become yellows/oranges)",
            "Cool Mood: +120° to +180° (warm tones become cool)",
            "Fantasy Colors: ±90° to ±150° for otherworldly looks",
            "Color Correction: Small adjustments (±15°) fix white balance"
          ]
        }
      ]
    },
    
    'colorize': {
      sections: [
        {
          icon: "🎭",
          title: "Colorize Effect Control",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Two-Step Process: Desaturate then apply color tint",
            "Hue Selection: Choose base color (0-360°)",
            "Lightness Control: Adjust overall brightness (0-100%)",
            "Saturation Control: Color intensity (0-100%)"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Techniques",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          tips: [
            "Sepia Effect: Warm hues (30-45°) with moderate saturation",
            "Blue Hour: Cool blues (210-240°) for dramatic mood",
            "Vintage Look: Warm yellows (45-60°) with low saturation",
            "Artistic Tinting: High saturation (80-100%) for bold effects"
          ]
        }
      ]
    },
    
    'colorize-hue': {
      sections: [
        {
          icon: "🌈",
          title: "Hue Selection Guide",
          gradient: "from-accent-rainbow-start/10 to-accent-rainbow-end/10",
          border: "border-accent-rainbow-start/30",
          textColor: "text-accent-rainbow-start",
          tips: [
            "Red (0°): Dramatic, passionate, warm energy",
            "Orange (30°): Cozy, autumn, vintage warmth",
            "Yellow (60°): Bright, cheerful, optimistic feel",
            "Green (120°): Natural, fresh, calming effect"
          ]
        },
        {
          icon: "🎨",
          title: "Cool Tone Options",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Cyan (180°): Fresh, modern, clean aesthetic",
            "Blue (240°): Professional, calm, trustworthy",
            "Purple (270°): Creative, mysterious, artistic",
            "Magenta (300°): Bold, creative, contemporary"
          ]
        }
      ]
    },
    
    'colorize-lightness': {
      sections: [
        {
          icon: "💡",
          title: "Lightness Control",
          gradient: "from-accent-yellow/10 to-accent-white/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "50% Default: Preserves original luminance values",
            "Lower Values (0-49%): Creates darker, moody effects",
            "Higher Values (51-100%): Brighter, ethereal appearance",
            "Extreme Values: 0% = black, 100% = white tinting"
          ]
        }
      ]
    },
    
    'colorize-saturation': {
      sections: [
        {
          icon: "🎨",
          title: "Saturation Control",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Low (0-30%): Subtle tinting, natural appearance",
            "Medium (31-60%): Noticeable color cast, artistic",
            "High (61-100%): Bold color transformation",
            "0% Saturation: Pure grayscale conversion"
          ]
        }
      ]
    },
    
    'black-and-white': {
      sections: [
        {
          icon: "⚫",
          title: "Grayscale Conversion",
          gradient: "from-accent-gray/10 to-accent-black/10",
          border: "border-accent-gray/30",
          textColor: "text-accent-gray",
          tips: [
            "Weighted Conversion: Uses perceptual luminance formula",
            "Professional Quality: Better than simple desaturation",
            "Timeless Appeal: Classic black and white photography",
            "Emphasis on Form: Removes color distractions"
          ]
        }
      ]
    }
  };

  // Comprehensive tool-specific instructions for ALL tools
  const allToolInstructions: Record<string, any> = {
    'color-removal': {
      sections: [
        {
          icon: "🎨",
          title: "Color Removal Fundamentals",
          gradient: "from-accent-red/10 to-accent-rose/10",
          border: "border-accent-red/30",
          textColor: "text-accent-red",
          tips: [
            "Auto Mode: Automatically detects top-left corner color",
            "Manual Mode: Pick specific colors by clicking on image",
            "Threshold Control: Lower = precise, higher = broad removal",
            "Contiguous Mode: Only removes connected areas of similar color"
          ]
        },
        {
          icon: "🎚️",
          title: "Threshold Mastery",
          gradient: "from-accent-orange/10 to-accent-yellow/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Start Low (1-20): For precise color matching",
            "Medium Range (21-50): Good for most images",
            "High Range (51-80): Broad color variations",
            "Maximum (81-100): Remove very different colors"
          ]
        },
        {
          icon: "🔬",
          title: "Color Science",
          gradient: "from-accent-purple/10 to-accent-indigo/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "LAB Color Space: More perceptually accurate than RGB",
            "Delta E Calculation: Industry standard for color difference",
            "Perceptual Matching: Algorithm mimics human vision",
            "Edge Anti-aliasing: Handles smooth color transitions"
          ]
        },
        {
          icon: "🎯",
          title: "Advanced Techniques",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Multiple Colors: Stack different target colors",
            "Progressive Removal: Start with dominant colors first",
            "Edge Awareness: Use lower thresholds near subject edges",
            "Preview First: Always check results before applying"
          ]
        }
      ]
    },
    'background': {
      sections: [
        {
          icon: "🖼️",
          title: "Background Fundamentals",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Color Selection: Pick any color from the color picker",
            "Live Preview: See background applied in real-time",
            "Save Options: Choose to save with or without background",
            "Transparency Preservation: Original transparency maintained"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Applications",
          gradient: "from-accent-blue/10 to-accent-cyan/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          tips: [
            "Product Photography: White or gradient backgrounds",
            "Portrait Enhancement: Solid colors to match branding",
            "Logo Preparation: Contrasting colors for visibility",
            "Preview Mode: Test different colors before download"
          ]
        },
        {
          icon: "⚡",
          title: "Workflow Integration",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Combine with Color Removal: Remove old, add new background",
            "Non-destructive: Original transparency always preserved",
            "Quick Switching: Toggle on/off to compare results",
            "Download Control: Save with transparent or solid background"
          ]
        }
      ]
    },
    'speckle-tools': {
      sections: [
        {
          icon: "🔧",
          title: "Speckle Detection",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Connected Components: Uses 8-way connectivity algorithm",
            "Size Threshold: Set minimum speck size to remove",
            "Highlight Mode: Visualize detected specks in red",
            "Remove Mode: Permanently delete small unwanted areas"
          ]
        },
        {
          icon: "🎯",
          title: "Optimization Strategies",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Start Small: Begin with very small speck sizes (10-50 pixels)",
            "Progressive Increase: Gradually increase threshold to catch more",
            "Preview First: Use highlight mode before permanent removal",
            "Combine with Edge Cleanup: Apply speckle removal then edge cleanup"
          ]
        },
        {
          icon: "🧠",
          title: "Algorithm Insights",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Flood Fill: Finds all connected pixels of same transparency",
            "Component Analysis: Groups pixels into distinct regions",
            "Size Calculation: Counts actual pixels, not bounding box area",
            "Performance: Optimized for large images with many small specks"
          ]
        },
        {
          icon: "🎪",
          title: "Use Cases",
          gradient: "from-accent-lime/10 to-accent-green/10",
          border: "border-accent-lime/30",
          textColor: "text-accent-lime",
          tips: [
            "Noise Reduction: Remove scanner dust and artifacts",
            "Clean Extractions: Perfect color removal results",
            "Logo Cleanup: Remove unwanted dots and specks",
            "Photo Restoration: Clean up damaged or aged photos"
          ]
        }
      ]
    },
    'ink-stamp': {
      sections: [
        {
          icon: "🖋️",
          title: "Ink Stamp Basics",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Artistic Effect: Converts photos to stamp-like silhouettes",
            "Threshold Control: Adjust which areas become ink vs transparent",
            "Color Selection: Choose any ink color from picker",
            "High Contrast: Works best with well-lit, clear subjects"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Techniques",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          tips: [
            "Portrait Silhouettes: Create artistic profile effects",
            "Logo Design: Convert photos to logo-style graphics",
            "Stamp Effects: Mimic traditional rubber stamp appearance",
            "High Contrast Art: Bold, graphic design elements"
          ]
        },
        {
          icon: "⚡",
          title: "Technical Control",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "Luminance Conversion: Analyzes brightness of each pixel",
            "Threshold Range: 1-100, lower = more detail preserved",
            "Edge Cleanup: Automatically disabled to preserve sharp edges",
            "Color Theory: Dark areas become ink, light areas transparent"
          ]
        }
      ]
    },
    'image-effects': {
      sections: [
        {
          icon: "✨",
          title: "Image Enhancement",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Brightness Control: -100 to +100 adjustment range",
            "Contrast Enhancement: Improve definition and clarity",
            "Vibrance Boost: Enhance muted colors without oversaturation",
            "Hue Shifting: Rotate colors around the color wheel"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Effects",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Colorize Mode: Apply single hue with adjustable intensity",
            "Black & White: Classic monochrome conversion",
            "Color Inversion: Artistic negative effects",
            "Hue Saturation: Fine-tune color intensity and warmth"
          ]
        },
        {
          icon: "🔧",
          title: "Professional Workflow",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Non-destructive: Effects apply after color removal",
            "Real-time Preview: See changes instantly",
            "Combine Effects: Layer multiple adjustments",
            "Processing Order: Applied after all other tools"
          ]
        }
      ]
    },
    'edge-cleanup': {
      sections: [
        {
          icon: "✂️",
          title: "Edge Processing",
          gradient: "from-accent-teal/10 to-accent-cyan/10",
          border: "border-accent-teal/30",
          textColor: "text-accent-teal",
          tips: [
            "Trim Radius: 1-5 pixels, controls how much edge to clean",
            "Alpha Feathering: Smooths harsh transparency edges",
            "Anti-aliasing: Reduces pixelated or jagged appearances",
            "Automatic Application: Processes after color removal"
          ]
        },
        {
          icon: "🎯",
          title: "Quality Control",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Conservative Settings: Start with radius 1-2 for most images",
            "Subject Preservation: Won't remove important details",
            "Edge Detection: Intelligently identifies true edges vs noise",
            "Zoom Testing: Check results at 100% zoom for accuracy"
          ]
        },
        {
          icon: "🧪",
          title: "Technical Details",
          gradient: "from-accent-indigo/10 to-accent-blue/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Morphological Operations: Erosion and dilation algorithms",
            "Alpha Channel Processing: Works on transparency data",
            "Gradient Analysis: Detects smooth vs sharp transitions",
            "Performance Impact: Minimal processing overhead"
          ]
        }
      ]
    },
    'magic-wand': {
      sections: [
        {
          icon: "✨",
          title: "Magic Wand Basics",
          gradient: "from-accent-indigo/10 to-accent-purple/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Click to select: Choose connected areas of similar color",
            "Contiguous selection: Only selects touching pixels",
            "Threshold control: Determines color similarity range",
            "8-way connectivity: Considers diagonal pixel connections"
          ]
        },
        {
          icon: "🎯",
          title: "Precision Techniques",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Low threshold (1-15): Precise selection of exact colors",
            "Medium threshold (16-40): Good balance for most images",
            "High threshold (41-80): Broad selection including variations",
            "Maximum threshold (81-100): Selects very different colors"
          ]
        },
        {
          icon: "🔍",
          title: "Selection Strategy",
          gradient: "from-accent-green/10 to-accent-emerald/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Start with backgrounds: Click solid color areas first",
            "Work progressively: Increase threshold if selection too small",
            "Multiple clicks: Select different areas separately",
            "Edge awareness: Click away from subject edges"
          ]
        }
      ]
    },
    'color-stack': {
      sections: [
        {
          icon: "🎨",
          title: "Color Stack Fundamentals",
          gradient: "from-accent-red/10 to-accent-rose/10",
          border: "border-accent-red/30",
          textColor: "text-accent-red",
          tips: [
            "Click to sample: Pick colors directly from your image",
            "Threshold control: Adjust how similar colors are included",
            "Stack building: Add multiple colors for complex backgrounds",
            "Live preview: See results instantly as you adjust settings"
          ]
        },
        {
          icon: "🎚️",
          title: "Threshold Optimization",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Start low (10-20): For precise color matching",
            "Increase gradually: Add similar color variations",
            "Monitor changes: Watch preview for over-selection",
            "Per-color thresholds: Each picked color has own setting"
          ]
        }
      ]
    },
    'pan': {
      sections: [
        {
          icon: "🗺️",
          title: "Pan Tool Basics",
          gradient: "from-accent-blue/10 to-accent-cyan/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          tips: [
            "Click and drag: Move around large images",
            "Mouse wheel: Zoom in and out smoothly",
            "Fit to screen: Triple-click for auto-fit",
            "Precision mode: Hold Shift while scrolling"
          ]
        }
      ]
    }
  };

  // Get current content based on active feature or tool
  const getCurrentContent = () => {
    // Check if we have feature-specific instructions first
    if (featureInstructions[activeDisplayFeature]) {
      return featureInstructions[activeDisplayFeature];
    }
    
    // Fall back to tool-specific instructions
    if (allToolInstructions[activeDisplayFeature]) {
      return allToolInstructions[activeDisplayFeature];
    }
    
    // Fall back to original random tips when no specific tool is active
    return getRandomGeneralContent();
  };

  // Original random general content sets
  const getRandomGeneralContent = () => {
    const generalContentSets = [
      {
        sections: [
          {
            icon: "🎯",
            title: "Advanced Techniques",
            gradient: "from-accent-orange/10 to-accent-red/10",
            border: "border-accent-orange/30",
            textColor: "text-accent-orange",
            tips: [
              "Multiple Colors: Stack different colors for complex removal",
              "Threshold Fine-tuning: Lower values = precise, higher = broad",
              "Edge Cleanup: Always apply after color removal",
              "Speckle Order: Remove large areas first, then small specks"
            ]
          },
          {
            icon: "🔄",
            title: "Workflow Tips",
            gradient: "from-accent-cyan/10 to-accent-blue/10",
            border: "border-accent-cyan/30",
            textColor: "text-accent-cyan",
            tips: [
              "Save Progress: Download intermediate results",
              "Zoom Strategy: High zoom for precision, low for overview",
              "Tool Switching: Combine tools for best results",
              "Undo Wisely: Use before applying new effects"
            ]
          }
        ]
      },
      {
        sections: [
          {
            icon: "🏆",
            title: "Best Practices",
            gradient: "from-accent-indigo/10 to-accent-blue/10",
            border: "border-accent-indigo/30",
            textColor: "text-accent-indigo",
            tips: [
              "Start Conservative: Low thresholds, increase gradually",
              "Preview First: Check changes before applying",
              "Batch Processing: Use same settings for similar images",
              "Keep Originals: Maintain backup copies"
            ]
          },
          {
            icon: "⚡",
            title: "Performance",
            gradient: "from-accent-green/10 to-accent-lime/10",
            border: "border-accent-green/30",
            textColor: "text-accent-green",
            tips: [
              "Image Size: Resize large images for speed",
              "Memory Usage: Process one image at a time",
              "Browser Performance: Close other tabs",
              "File Types: JPEG faster, PNG better quality"
            ]
          }
        ]
      }
    ];

    return generalContentSets[Math.floor(Math.random() * generalContentSets.length)];
  };

  const currentContent = getCurrentContent();

  // Additional random tips to fill space
  const bonusTips = [
    {
      icon: "💡",
      title: "Pro Tips",
      gradient: "from-accent-blue/10 to-accent-cyan/10",
      border: "border-accent-blue/30",
      textColor: "text-accent-blue",
      tips: [
        "Save frequently: Download at key stages",
        "Undo/Redo: Use Ctrl+Z and Ctrl+Y liberally",
        "Preview at different zoom levels",
        "Keep backups of original images"
      ]
    },
    {
      icon: "🚀",
      title: "Efficiency",
      gradient: "from-accent-green/10 to-accent-lime/10",
      border: "border-accent-green/30",
      textColor: "text-accent-green",
      tips: [
        "Batch similar images with same settings",
        "Combine tools for complex backgrounds",
        "Use queue for multiple images",
        "Remember successful configurations"
      ]
    }
  ];

  const selectedBonusTip = React.useMemo(() => {
    return bonusTips[Math.floor(Math.random() * bonusTips.length)];
  }, [activeDisplayFeature]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto min-h-0">
      {/* Feature-specific, tool-specific, or general instructions */}
      <div className="space-y-4 animate-fade-in">
        {currentContent.sections.map((section: any, index: number) => (
          <div key={`section-${index}`} className={`bg-gradient-to-br ${section.gradient} border ${section.border} rounded-lg p-4`}>
            <div className={`font-medium ${section.textColor} mb-3 flex items-center gap-2`}>
              {section.icon} <span>{section.title}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              {section.tips.map((tip: string, tipIndex: number) => {
                const [title, description] = tip.split(': ');
                return (
                  <div key={tipIndex}>
                    • <strong>{title}:</strong> {description}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bonus tip to fill remaining space (only show for feature-specific content to save space) */}
      {!featureInstructions[activeDisplayFeature] && (
        <div className="animate-fade-in">
          <div className={`bg-gradient-to-br ${selectedBonusTip.gradient} border ${selectedBonusTip.border} rounded-lg p-4`}>
            <div className={`font-medium ${selectedBonusTip.textColor} mb-3 flex items-center gap-2`}>
              {selectedBonusTip.icon} <span>{selectedBonusTip.title}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              {selectedBonusTip.tips.map((tip, tipIndex) => {
                const [title, description] = tip.split(': ');
                return (
                  <div key={tipIndex}>
                    • <strong>{title}:</strong> {description}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
