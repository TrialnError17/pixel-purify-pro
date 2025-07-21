import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSemiTransparencyDetector, SemiTransparencySettings } from '@/hooks/useSemiTransparencyDetector';
import { Eye, EyeOff, Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface SemiTransparencyDetectorProps {
  canvas: HTMLCanvasElement | null;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onFeatureInteraction?: (feature: string) => void;
}

export const SemiTransparencyDetector: React.FC<SemiTransparencyDetectorProps> = ({
  canvas,
  enabled,
  onEnabledChange,
  onFeatureInteraction
}) => {
  const { result, isScanning, scanImageData, createOverlay, attachOverlay, removeOverlay, cleanup } = useSemiTransparencyDetector();
  const { toast } = useToast();

  const [settings, setSettings] = useState<SemiTransparencySettings>({
    enabled: false,
    showOverlay: false,
    highlightColor: '#ff0000',
    blinkEffect: false
  });

  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = useCallback(async () => {
    if (!canvas) return;
    
    onFeatureInteraction?.('semi-transparency-scan');
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const scanResult = await scanImageData(imageData);
    setHasScanned(true);
    
    // Show toast notification with results
    if (scanResult.hasSemiTransparent) {
      toast({
        title: "⚠️ Semi-transparent pixels detected",
        description: `Found ${scanResult.count.toLocaleString()} semi-transparent pixel${scanResult.count !== 1 ? 's' : ''}. Use overlay controls below to visualize them.`,
        duration: 5000,
      });
    } else {
      toast({
        title: "✅ No semi-transparent pixels found",
        description: "Your image is clean - no ghost pixels detected.",
        duration: 3000,
      });
    }
  }, [canvas, scanImageData, onFeatureInteraction, toast]);

  // Update overlay when settings change
  const updateOverlay = useCallback(() => {
    if (!canvas || !result.hasSemiTransparent) return;

    if (settings.showOverlay) {
      const overlay = createOverlay(canvas, result, settings);
      attachOverlay(canvas, overlay);
    } else {
      removeOverlay();
    }
  }, [canvas, result, settings, createOverlay, attachOverlay, removeOverlay]);

  // Auto-scan when enabled
  useEffect(() => {
    if (enabled && canvas && !hasScanned) {
      handleScan();
    }
  }, [enabled, canvas, hasScanned, handleScan]);

  // Update overlay when relevant settings change
  useEffect(() => {
    if (enabled && hasScanned) {
      updateOverlay();
    }
  }, [enabled, hasScanned, settings.showOverlay, settings.highlightColor, settings.blinkEffect, updateOverlay]);

  // Cleanup on unmount or when disabled
  useEffect(() => {
    if (!enabled) {
      cleanup();
      setHasScanned(false);
    }
    return cleanup;
  }, [enabled, cleanup]);

  const updateSettings = (updates: Partial<SemiTransparencySettings>) => {
    setSettings(prev => ({ ...prev, ...updates }));
  };

  return (
    <Card className="bg-gradient-to-br from-accent-orange/10 to-accent-red/10 border-accent-orange/30 shadow-colorful">
      <CardHeader className="pt-2 pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Switch
            checked={enabled}
            onCheckedChange={onEnabledChange}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-orange data-[state=checked]:to-accent-red"
          />
          <span className="bg-gradient-to-r from-accent-orange to-accent-red bg-clip-text text-transparent font-semibold flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-accent-orange" />
            Semi-Transparency Detector
          </span>
        </CardTitle>
      </CardHeader>

      {enabled && (
        <CardContent className="pt-0 space-y-4">
          {/* Scan Button */}
          <div className="flex items-center gap-2">
            <Button
              onClick={handleScan}
              disabled={!canvas || isScanning}
              size="sm"
              className="flex-1 bg-gradient-to-r from-accent-orange to-accent-red hover:from-accent-orange/80 hover:to-accent-red/80"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scan Image
                </>
              )}
            </Button>
          </div>

          {/* Overlay Controls - Only show if pixels were detected */}
          {hasScanned && !isScanning && result.hasSemiTransparent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-gradient-to-r from-accent-orange/5 to-accent-red/5 rounded border border-accent-orange/20">
                <Label className="text-sm font-medium text-accent-orange flex items-center gap-2">
                  {settings.showOverlay ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Show Overlay
                </Label>
                <Switch
                  checked={settings.showOverlay}
                  onCheckedChange={(showOverlay) => {
                    updateSettings({ showOverlay });
                    onFeatureInteraction?.('semi-transparency-overlay');
                  }}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-orange data-[state=checked]:to-accent-red"
                />
              </div>

              {settings.showOverlay && (
                <>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-accent-orange">
                      Highlight Color
                    </Label>
                    <input
                      type="color"
                      value={settings.highlightColor}
                      onChange={(e) => {
                        updateSettings({ highlightColor: e.target.value });
                        onFeatureInteraction?.('semi-transparency-color');
                      }}
                      className="w-full h-8 rounded border border-accent-orange/30 cursor-pointer"
                    />
                  </div>

                  <div className="flex items-center justify-between p-2 bg-gradient-to-r from-accent-orange/5 to-accent-red/5 rounded border border-accent-orange/20">
                    <Label className="text-sm font-medium text-accent-orange">
                      Blink Effect
                    </Label>
                    <Switch
                      checked={settings.blinkEffect}
                      onCheckedChange={(blinkEffect) => {
                        updateSettings({ blinkEffect });
                        onFeatureInteraction?.('semi-transparency-blink');
                      }}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-orange data-[state=checked]:to-accent-red"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Help Text */}
          <div className="text-xs text-muted-foreground p-2 bg-accent-orange/5 rounded border border-accent-orange/20">
            🔍 Detects pixels with opacity between 1-254 (semi-transparent "ghost pixels") and highlights their exact locations.
          </div>
        </CardContent>
      )}
    </Card>
  );
};