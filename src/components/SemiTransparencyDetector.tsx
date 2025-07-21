import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useSemiTransparencyDetector, SemiTransparencySettings } from '@/hooks/useSemiTransparencyDetector';
import { Eye, EyeOff, Search, Loader2, AlertTriangle, CheckCircle } from 'lucide-react';

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
  
  const [settings, setSettings] = useState<SemiTransparencySettings>({
    enabled: false,
    showOverlay: true,
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
    await scanImageData(imageData);
    setHasScanned(true);
  }, [canvas, scanImageData, onFeatureInteraction]);

  const updateOverlay = useCallback(() => {
    if (!canvas || !hasScanned) return;

    if (settings.showOverlay && result.hasSemiTransparent) {
      const overlay = createOverlay(canvas, result, settings);
      attachOverlay(canvas, overlay);
    } else {
      removeOverlay();
    }
  }, [canvas, hasScanned, settings, result, createOverlay, attachOverlay, removeOverlay]);

  // Update overlay when settings change
  useEffect(() => {
    if (enabled && hasScanned) {
      updateOverlay();
    }
  }, [enabled, hasScanned, settings.showOverlay, settings.highlightColor, settings.blinkEffect, updateOverlay]);

  // Auto-scan when enabled
  useEffect(() => {
    if (enabled && canvas && !hasScanned && !isScanning) {
      handleScan();
    }
  }, [enabled, canvas, hasScanned, isScanning, handleScan]);

  // Cleanup on disable
  useEffect(() => {
    if (!enabled) {
      cleanup();
      setHasScanned(false);
    }
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

          {/* Results Display */}
          {hasScanned && !isScanning && (
            <div className="space-y-3">
              <div className="p-3 bg-gradient-to-r from-accent-orange/5 to-accent-red/5 rounded-lg border border-accent-orange/20">
                <div className="flex items-center gap-2 mb-2">
                  {result.hasSemiTransparent ? (
                    <AlertTriangle className="w-4 h-4 text-accent-orange" />
                  ) : (
                    <CheckCircle className="w-4 h-4 text-accent-green" />
                  )}
                  <span className="text-sm font-medium">
                    {result.hasSemiTransparent 
                      ? "Semi-transparent pixels detected" 
                      : "No semi-transparent pixels found"
                    }
                  </span>
                </div>
                
                {result.hasSemiTransparent && (
                  <Badge variant="outline" className="border-accent-orange text-accent-orange">
                    {result.count.toLocaleString()} pixel{result.count !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>

              {/* Overlay Controls */}
              {result.hasSemiTransparent && (
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
                        <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-accent-orange/5 to-accent-red/5 rounded border border-accent-orange/20">
                          <input
                            type="color"
                            value={settings.highlightColor}
                            onChange={(e) => {
                              updateSettings({ highlightColor: e.target.value });
                              onFeatureInteraction?.('semi-transparency-color');
                            }}
                            className="w-8 h-6 rounded border cursor-pointer"
                          />
                          <span className="text-xs font-mono font-bold text-accent-orange bg-accent-orange/10 px-2 py-1 rounded">
                            {settings.highlightColor.toUpperCase()}
                          </span>
                        </div>
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