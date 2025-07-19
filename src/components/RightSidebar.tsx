import React from 'react';

// Random learning content sets for the sidebar
const LearningCenterContent: React.FC = () => {
  const contentSets = [
    // Set 1: Advanced Techniques & Workflow Tips
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
            "Threshold Fine-tuning: Lower values = precise, higher = broad removal",
            "Edge Cleanup: Always apply after color removal for cleaner results",
            "Speckle Order: Remove large areas first, then clean small specks"
          ]
        },
        {
          icon: "🔄",
          title: "Workflow Tips",
          gradient: "from-accent-cyan/10 to-accent-blue/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Save Progress: Download intermediate results before major changes",
            "Zoom Strategy: Use high zoom for precise work, low zoom for overview",
            "Tool Switching: Combine Magic Wand with Color Stack for best results",
            "Undo Wisely: Use undo before applying new effects"
          ]
        },
        {
          icon: "⭐",
          title: "Quality Guidelines",
          gradient: "from-accent-lime/10 to-accent-green/10",
          border: "border-accent-lime/30",
          textColor: "text-accent-lime",
          tips: [
            "Image Resolution: Higher resolution = better precision",
            "Color Contrast: High contrast images process more accurately",
            "File Format: PNG preserves transparency, JPEG for smaller files",
            "Lighting: Even lighting reduces color variation issues"
          ]
        }
      ]
    },
    // Set 2: Pro Techniques & Troubleshooting
    {
      sections: [
        {
          icon: "🚀",
          title: "Pro Techniques",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "LAB Color Space: More accurate than RGB for color matching",
            "Threshold Scaling: Start at 30, adjust based on image complexity",
            "Contiguous Mode: Perfect for solid backgrounds with clear edges",
            "Manual Mode: Pick specific colors for precise control"
          ]
        },
        {
          icon: "🔧",
          title: "Troubleshooting",
          gradient: "from-accent-red/10 to-accent-rose/10",
          border: "border-accent-red/30",
          textColor: "text-accent-red",
          tips: [
            "Color Won't Remove: Try different color space (LAB vs RGB)",
            "Too Much Removed: Lower threshold or switch to manual selection",
            "Jagged Edges: Enable edge cleanup or try different threshold",
            "Performance Issues: Process smaller areas or reduce image size"
          ]
        },
        {
          icon: "🎨",
          title: "Creative Effects",
          gradient: "from-accent-indigo/10 to-accent-blue/10",
          border: "border-accent-indigo/30",
          textColor: "text-accent-indigo",
          tips: [
            "Ink Stamp: Create artistic silhouettes from photos",
            "Background Colors: Add solid colors behind transparent areas",
            "Image Effects: Adjust brightness, contrast, and hue",
            "Speckle Removal: Clean noise while preserving detail"
          ]
        }
      ]
    },
    // Set 3: Mastery & Performance
    {
      sections: [
        {
          icon: "🏆",
          title: "Mastery Tips",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "Start Conservative: Begin with low thresholds and increase gradually",
            "Preview First: Always preview changes before applying permanently",
            "Batch Processing: Process similar images with same settings",
            "Keep Originals: Always maintain backup of original images"
          ]
        },
        {
          icon: "⚡",
          title: "Performance Optimization",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Image Size: Resize large images for faster processing",
            "Memory Usage: Process one image at a time for complex edits",
            "Browser Performance: Close other tabs for better processing speed",
            "File Types: JPEG loads faster, PNG preserves quality better"
          ]
        },
        {
          icon: "🎛️",
          title: "Tool Combinations",
          gradient: "from-accent-teal/10 to-accent-cyan/10",
          border: "border-accent-teal/30",
          textColor: "text-accent-teal",
          tips: [
            "Magic Wand + Edge Cleanup: Perfect for detailed selections",
            "Color Stack + Speckle Removal: Clean complex backgrounds",
            "Manual Mode + High Threshold: Remove similar color variations",
            "Auto Mode + Background Color: Quick solid color replacement"
          ]
        }
      ]
    },
    // Set 4: Precision & Automation
    {
      sections: [
        {
          icon: "🎯",
          title: "Precision Control",
          gradient: "from-accent-violet/10 to-accent-purple/10",
          border: "border-accent-violet/30",
          textColor: "text-accent-violet",
          tips: [
            "Pixel-Perfect Edges: Use edge cleanup with radius 1-2",
            "Color Sampling: Click colors directly on image for accuracy",
            "Threshold Testing: Try values 10-50 for most images",
            "Zoom Navigation: 200-400% zoom for detailed work"
          ]
        },
        {
          icon: "🤖",
          title: "Smart Automation",
          gradient: "from-accent-emerald/10 to-accent-green/10",
          border: "border-accent-emerald/30",
          textColor: "text-accent-emerald",
          tips: [
            "Auto Mode: Detects top-left corner color automatically",
            "Contiguous Detection: Finds connected areas intelligently",
            "Adaptive Thresholds: Algorithm adjusts for image characteristics",
            "Batch Queue: Process multiple images with same settings"
          ]
        },
        {
          icon: "💡",
          title: "Expert Insights",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          tips: [
            "Color Theory: Complementary colors are harder to separate",
            "Edge Artifacts: Anti-aliasing creates color variations",
            "Lighting Impact: Shadows add color complexity",
            "File Compression: JPEG artifacts affect color accuracy"
          ]
        }
      ]
    },
    // Set 5: Advanced Workflows & Industry Tips
    {
      sections: [
        {
          icon: "🏢",
          title: "Professional Workflows",
          gradient: "from-accent-blue/10 to-accent-indigo/10",
          border: "border-accent-blue/30",
          textColor: "text-accent-blue",
          tips: [
            "Product Photography: Use manual mode for consistent results",
            "Portrait Backgrounds: Combine multiple threshold values",
            "Logo Extraction: Higher resolution improves edge quality",
            "Batch Projects: Save settings for repeated use"
          ]
        },
        {
          icon: "🔬",
          title: "Technical Deep Dive",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "LAB vs RGB: LAB matches human color perception better",
            "Delta E Values: Industry standard for color difference",
            "8-bit vs 16-bit: Higher bit depth improves gradient handling",
            "Color Profiles: sRGB works best for web images"
          ]
        },
        {
          icon: "🎓",
          title: "Learning Path",
          gradient: "from-accent-cyan/10 to-accent-teal/10",
          border: "border-accent-cyan/30",
          textColor: "text-accent-cyan",
          tips: [
            "Week 1: Master auto mode and basic thresholds",
            "Week 2: Learn manual color picking techniques",
            "Week 3: Combine tools for complex backgrounds",
            "Week 4: Optimize workflows for your specific needs"
          ]
        }
      ]
    }
  ];

  // Select random content set on component mount
  const selectedContent = React.useMemo(() => {
    return contentSets[Math.floor(Math.random() * contentSets.length)];
  }, []);

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto animate-fade-in">
      {selectedContent.sections.map((section, index) => (
        <div key={index} className={`bg-gradient-to-br ${section.gradient} border ${section.border} rounded-lg p-4`}>
          <div className={`font-medium ${section.textColor} mb-3 flex items-center gap-2`}>
            {section.icon} <span>{section.title}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            {section.tips.map((tip, tipIndex) => {
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
  );
};

// Tool-specific content that adapts based on selected tool
const ToolSpecificContent: React.FC<{ currentTool: 'pan' | 'color-stack' | 'magic-wand' }> = ({ currentTool }) => {
  
  // Comprehensive tool-specific instructions
  const toolInstructions = {
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
            "Precision mode: Hold Shift while scrolling for fine control"
          ]
        },
        {
          icon: "🔍",
          title: "Navigation Mastery",
          gradient: "from-accent-green/10 to-accent-lime/10",
          border: "border-accent-green/30",
          textColor: "text-accent-green",
          tips: [
            "Zoom levels: 25% to 800% for detailed work",
            "Center view: Double-click to center on point",
            "Quick reset: Press 'R' to reset zoom and position",
            "Smooth panning: Use momentum scrolling for fluid movement"
          ]
        },
        {
          icon: "⌨️",
          title: "Keyboard Shortcuts",
          gradient: "from-accent-purple/10 to-accent-pink/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "Spacebar + drag: Temporary pan mode from any tool",
            "Ctrl + mouse wheel: Zoom with precision",
            "Shift + scroll: Pan vertically",
            "Alt + scroll: Pan horizontally"
          ]
        },
        {
          icon: "🎯",
          title: "Pro Navigation Tips",
          gradient: "from-accent-orange/10 to-accent-red/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Edge detection: Pan tool highlights clickable areas",
            "Performance: Lower zoom for smoother panning on large images",
            "Multi-monitor: Pan tool works across multiple screens",
            "Touch devices: Pinch-to-zoom and two-finger pan supported"
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
            "Per-color thresholds: Each picked color has its own setting"
          ]
        },
        {
          icon: "🔬",
          title: "Color Science",
          gradient: "from-accent-purple/10 to-accent-indigo/10",
          border: "border-accent-purple/30",
          textColor: "text-accent-purple",
          tips: [
            "LAB color space: More accurate than RGB for color matching",
            "Delta E calculation: Industry standard for color difference",
            "Perceptual matching: Algorithm mimics human color perception",
            "Anti-aliasing awareness: Edge pixels may contain mixed colors"
          ]
        },
        {
          icon: "🏗️",
          title: "Advanced Stacking",
          gradient: "from-accent-lime/10 to-accent-green/10",
          border: "border-accent-lime/30",
          textColor: "text-accent-lime",
          tips: [
            "Layered approach: Remove dominant colors first",
            "Color relationships: Consider color harmony in selections",
            "Gradient handling: Use multiple samples across gradients",
            "Shadow detection: Lower thresholds for shadow colors"
          ]
        },
        {
          icon: "🔧",
          title: "Troubleshooting",
          gradient: "from-accent-yellow/10 to-accent-orange/10",
          border: "border-accent-yellow/30",
          textColor: "text-accent-yellow",
          tips: [
            "Too much removed: Lower thresholds or remove problematic colors",
            "Color won't remove: Try manual mode or different threshold",
            "Patchy results: Add more color samples from problem areas",
            "Performance issues: Process smaller image sections first"
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
            "Work progressively: Increase threshold if initial selection is too small",
            "Multiple clicks: Select different areas with separate clicks",
            "Edge awareness: Click away from subject edges for cleaner results"
          ]
        },
        {
          icon: "🧠",
          title: "Algorithm Insights",
          gradient: "from-accent-rose/10 to-accent-pink/10",
          border: "border-accent-rose/30",
          textColor: "text-accent-rose",
          tips: [
            "Flood fill algorithm: Spreads from click point to similar colors",
            "Color distance calculation: Uses LAB color space for accuracy",
            "Boundary detection: Stops at significant color changes",
            "Memory efficient: Processes large images without slowdown"
          ]
        },
        {
          icon: "🎪",
          title: "Creative Applications",
          gradient: "from-accent-orange/10 to-accent-yellow/10",
          border: "border-accent-orange/30",
          textColor: "text-accent-orange",
          tips: [
            "Sky replacement: Perfect for selecting uniform skies",
            "Product photography: Isolate items from plain backgrounds",
            "Portrait backgrounds: Remove studio backgrounds cleanly",
            "Logo extraction: Select solid color backgrounds around logos"
          ]
        },
        {
          icon: "⚡",
          title: "Performance Tips",
          gradient: "from-accent-violet/10 to-accent-purple/10",
          border: "border-accent-violet/30",
          textColor: "text-accent-violet",
          tips: [
            "Image size matters: Larger images provide more precise selection",
            "Click positioning: Center clicks work better than edge clicks",
            "Threshold testing: Try different values for optimal results",
            "Combine with other tools: Use with Color Stack for complex selections"
          ]
        }
      ]
    }
  };

  // Get tool-specific instructions
  const toolContent = toolInstructions[currentTool];
  
  // Random general tips to fill remaining space
  const generalTips = [
    {
      icon: "💡",
      title: "General Tips",
      gradient: "from-accent-blue/10 to-accent-cyan/10",
      border: "border-accent-blue/30",
      textColor: "text-accent-blue",
      tips: [
        "Save frequently: Download progress at key stages",
        "Undo/Redo: Use Ctrl+Z and Ctrl+Y liberally",
        "Preview before download: Check results in different zoom levels",
        "Backup originals: Keep copies of source images"
      ]
    },
    {
      icon: "🚀",
      title: "Workflow Efficiency", 
      gradient: "from-accent-green/10 to-accent-lime/10",
      border: "border-accent-green/30",
      textColor: "text-accent-green",
      tips: [
        "Batch similar images: Use same settings for similar photos",
        "Tool switching: Combine tools for complex backgrounds",
        "Queue management: Process multiple images simultaneously",
        "Settings presets: Remember successful configurations"
      ]
    }
  ];

  // Randomly select additional tips
  const selectedGeneralTip = React.useMemo(() => {
    return generalTips[Math.floor(Math.random() * generalTips.length)];
  }, [currentTool]); // Re-randomize when tool changes

  return (
    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
      {/* Tool-specific instructions (always shown first) */}
      <div className="space-y-4 animate-fade-in">
        {toolContent.sections.map((section, index) => (
          <div key={`tool-${index}`} className={`bg-gradient-to-br ${section.gradient} border ${section.border} rounded-lg p-4`}>
            <div className={`font-medium ${section.textColor} mb-3 flex items-center gap-2`}>
              {section.icon} <span>{section.title}</span>
            </div>
            <div className="text-xs text-muted-foreground space-y-2">
              {section.tips.map((tip, tipIndex) => {
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

      {/* Additional random tip to fill space */}
      <div className="animate-fade-in">
        <div className={`bg-gradient-to-br ${selectedGeneralTip.gradient} border ${selectedGeneralTip.border} rounded-lg p-4`}>
          <div className={`font-medium ${selectedGeneralTip.textColor} mb-3 flex items-center gap-2`}>
            {selectedGeneralTip.icon} <span>{selectedGeneralTip.title}</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            {selectedGeneralTip.tips.map((tip, tipIndex) => {
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

export interface RightSidebarProps {
  currentTool: 'pan' | 'color-stack' | 'magic-wand';
}

export const RightSidebar: React.FC<RightSidebarProps> = ({ currentTool }) => {
  return (
    <div className="w-80 lg:w-96 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          📚 Learning Center
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {currentTool === 'pan' && '🗺️ Pan Tool Guide'}
          {currentTool === 'color-stack' && '🎨 Color Stack Guide'} 
          {currentTool === 'magic-wand' && '✨ Magic Wand Guide'}
        </p>
      </div>
      
      <ToolSpecificContent currentTool={currentTool} />
    </div>
  );
};