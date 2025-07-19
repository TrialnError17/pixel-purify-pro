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

export const RightSidebar: React.FC = () => {
  return (
    <div className="w-80 lg:w-96 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          📚 Learning Center
        </h2>
      </div>
      
      <LearningCenterContent />
    </div>
  );
};