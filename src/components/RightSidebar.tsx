import React from 'react';

export const RightSidebar: React.FC = () => {
  return (
    <div className="w-80 lg:w-96 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="text-lg font-semibold text-foreground">
          📚 Learning Center
        </h2>
      </div>
      
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {/* Advanced Techniques */}
        <div className="bg-gradient-to-br from-accent-orange/10 to-accent-red/10 border border-accent-orange/30 rounded-lg p-4">
          <div className="font-medium text-accent-orange mb-3 flex items-center gap-2">
            🎯 <span>Advanced Techniques</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>• <strong>Multiple Colors:</strong> Stack different colors for complex removal</div>
            <div>• <strong>Threshold Fine-tuning:</strong> Lower values = precise, higher = broad removal</div>
            <div>• <strong>Edge Cleanup:</strong> Always apply after color removal for cleaner results</div>
            <div>• <strong>Speckle Order:</strong> Remove large areas first, then clean small specks</div>
          </div>
        </div>

        {/* Workflow Tips */}
        <div className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border border-accent-cyan/30 rounded-lg p-4">
          <div className="font-medium text-accent-cyan mb-3 flex items-center gap-2">
            🔄 <span>Workflow Tips</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>• <strong>Save Progress:</strong> Download intermediate results before major changes</div>
            <div>• <strong>Zoom Strategy:</strong> Use high zoom for precise work, low zoom for overview</div>
            <div>• <strong>Tool Switching:</strong> Combine Magic Wand with Color Stack for best results</div>
            <div>• <strong>Undo Wisely:</strong> Use undo before applying new effects</div>
          </div>
        </div>

        {/* Quality Guidelines */}
        <div className="bg-gradient-to-br from-accent-lime/10 to-accent-green/10 border border-accent-lime/30 rounded-lg p-4">
          <div className="font-medium text-accent-lime mb-3 flex items-center gap-2">
            ⭐ <span>Quality Guidelines</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>• <strong>Image Resolution:</strong> Higher resolution = better precision</div>
            <div>• <strong>Color Contrast:</strong> High contrast images process more accurately</div>
            <div>• <strong>File Format:</strong> PNG preserves transparency, JPEG for smaller files</div>
            <div>• <strong>Lighting:</strong> Even lighting reduces color variation issues</div>
          </div>
        </div>

        {/* Troubleshooting */}
        <div className="bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border border-accent-purple/30 rounded-lg p-4">
          <div className="font-medium text-accent-purple mb-3 flex items-center gap-2">
            🔧 <span>Troubleshooting</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>• <strong>Color Won't Remove:</strong> Try different color space (LAB vs RGB)</div>
            <div>• <strong>Too Much Removed:</strong> Lower threshold or switch to manual selection</div>
            <div>• <strong>Jagged Edges:</strong> Enable edge cleanup or try different threshold</div>
            <div>• <strong>Performance Issues:</strong> Process smaller areas or reduce image size</div>
          </div>
        </div>

        {/* Best Practices */}
        <div className="bg-gradient-to-br from-accent-indigo/10 to-accent-blue/10 border border-accent-indigo/30 rounded-lg p-4">
          <div className="font-medium text-accent-indigo mb-3 flex items-center gap-2">
            🏆 <span>Best Practices</span>
          </div>
          <div className="text-xs text-muted-foreground space-y-2">
            <div>• <strong>Start Conservative:</strong> Begin with low thresholds and increase gradually</div>
            <div>• <strong>Preview First:</strong> Always preview changes before applying permanently</div>
            <div>• <strong>Batch Processing:</strong> Process similar images with same settings</div>
            <div>• <strong>Keep Originals:</strong> Always maintain backup of original images</div>
          </div>
        </div>
      </div>
    </div>
  );
};