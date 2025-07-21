import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorRemovalSettings } from '@/pages/Index';
import { Palette, Settings } from 'lucide-react';

interface LeftSidebarProps {
  settings: ColorRemovalSettings;
  onSettingsChange: (settings: ColorRemovalSettings) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSettings = (updates: Partial<ColorRemovalSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  return (
    <div className="w-80 bg-gradient-panel border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Color Removal</h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
              />
              Enable Color Removal
            </CardTitle>
          </CardHeader>
        </Card>

        {settings.enabled && (
          <>
            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Mode</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup
                  value={settings.mode}
                  onValueChange={(mode: 'auto' | 'manual') => updateSettings({ mode })}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto" className="text-sm">Auto (top-left color)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="manual" id="manual" />
                    <Label htmlFor="manual" className="text-sm">Manual (pick color)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            {settings.mode === 'manual' && (
              <Card className="bg-card/50 border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4" />
                    Target Color
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={settings.targetColor}
                      onChange={(e) => updateSettings({ targetColor: e.target.value })}
                      className="w-12 h-8 rounded border border-border cursor-pointer"
                    />
                    <span className="text-sm text-muted-foreground font-mono">
                      {settings.targetColor.toUpperCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Threshold</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Slider
                  value={[settings.threshold]}
                  onValueChange={([threshold]) => updateSettings({ threshold })}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Precise (1)</span>
                  <span className="font-medium">{settings.threshold}</span>
                  <span>Loose (100)</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Switch
                    checked={settings.contiguous}
                    onCheckedChange={(contiguous) => updateSettings({ contiguous })}
                  />
                  Contiguous Only
                </CardTitle>
              </CardHeader>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Min Region Size</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Slider
                  value={[settings.minRegionSize]}
                  onValueChange={([minRegionSize]) => updateSettings({ minRegionSize })}
                  min={1}
                  max={4000}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>1px</span>
                  <span className="font-medium">{settings.minRegionSize}px</span>
                  <span>4000px</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/50 border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium">Feather Radius</CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <Slider
                  value={[settings.featherRadius]}
                  onValueChange={([featherRadius]) => updateSettings({ featherRadius })}
                  min={0}
                  max={10}
                  step={0.5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0px</span>
                  <span className="font-medium">{settings.featherRadius}px</span>
                  <span>10px</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};