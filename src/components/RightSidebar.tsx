import React from 'react';
import { ColorRemovalSettings, EffectSettings, EdgeCleanupSettings } from '@/pages/Index';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

export interface RightSidebarProps {
  currentTool: 'pan' | 'color-stack' | 'magic-wand';
  colorSettings: ColorRemovalSettings;
  speckleSettings: SpeckleSettings;
  effectSettings: EffectSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ 
  currentTool, 
  colorSettings, 
  speckleSettings, 
  effectSettings, 
  edgeCleanupSettings 
}) => {
  // Determine which tool to show based on priority (most recently enabled)
  const getActiveToolForDisplay = () => {
    // Priority order: most specific to least specific
    if (effectSettings.inkStamp.enabled) return 'ink-stamp';
    if (effectSettings.imageEffects.enabled) return 'image-effects';
    if (speckleSettings.enabled) return 'speckle-tools';
    if (edgeCleanupSettings.enabled) return 'edge-cleanup';
    if (effectSettings.background.enabled) return 'background';
    if (colorSettings.enabled) return 'color-removal';
    if (currentTool === 'magic-wand') return 'magic-wand';
    if (currentTool === 'color-stack') return 'color-stack';
    return currentTool; // defaults to 'pan' or whatever current tool is
  };

  const activeDisplayTool = getActiveToolForDisplay();

  const getDisplayTitle = () => {
    switch (activeDisplayTool) {
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
    <div className="w-80 lg:w-96 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          📚 Learning Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {getDisplayTitle()}
        </p>
      </div>
      
      <ToolSpecificContent 
        activeDisplayTool={activeDisplayTool}
        colorSettings={colorSettings}
        speckleSettings={speckleSettings}
        effectSettings={effectSettings}
        edgeCleanupSettings={edgeCleanupSettings}
      />
    </div>
  );
};

// Tool-specific content that adapts based on active tools
const ToolSpecificContent: React.FC<{ 
  activeDisplayTool: string;
  colorSettings: ColorRemovalSettings;
  speckleSettings: SpeckleSettings;
  effectSettings: EffectSettings;
  edgeCleanupSettings: EdgeCleanupSettings;
}> = ({ activeDisplayTool }) => {
  
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

  // Get current tool instructions or fall back to random general tips
  const getCurrentContent = () => {
    if (allToolInstructions[activeDisplayTool]) {
      return allToolInstructions[activeDisplayTool];
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
  }, [activeDisplayTool]);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Tool-specific or general instructions */}
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

      {/* Bonus tip to fill remaining space */}
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
    </div>
  );
};