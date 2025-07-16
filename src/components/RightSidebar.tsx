import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '@/components/ui/slider-with-input';
import { Label } from '@/components/ui/label';
import { EffectSettings } from '@/pages/Index';
import { Palette, Stamp, Paintbrush } from 'lucide-react';

interface RightSidebarProps {
  settings: EffectSettings;
  onSettingsChange: (settings: EffectSettings) => void;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  settings,
  onSettingsChange
}) => {
  const updateSettings = (updates: Partial<EffectSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const updateBackground = (updates: Partial<EffectSettings['background']>) => {
    updateSettings({
      background: { ...settings.background, ...updates }
    });
  };

  const updateInkStamp = (updates: Partial<EffectSettings['inkStamp']>) => {
    updateSettings({
      inkStamp: { ...settings.inkStamp, ...updates }
    });
  };

  return (
    <div className="w-96 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-accent-pink to-accent-orange rounded-md flex items-center justify-center">
            <Paintbrush className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-accent-pink to-accent-orange bg-clip-text text-transparent">
            Effects
          </h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        {/* Background Enable Toggle */}
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border-accent-purple/30 shadow-colorful">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.background.enabled}
                onCheckedChange={(enabled) => updateBackground({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-blue"
              />
              <span className="bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent font-semibold">
                🎨 Enable Background
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {settings.background.enabled && (
          <>
            {/* Background Color Picker */}
            <Card className="bg-gradient-to-br from-accent-yellow/10 to-accent-orange/10 border-accent-orange/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4 text-accent-orange" />
                  <span className="bg-gradient-to-r from-accent-yellow to-accent-orange bg-clip-text text-transparent font-semibold">
                    Background Color
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-4">
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-accent-yellow/5 to-accent-orange/5 rounded-lg border border-accent-orange/20">
                  <input
                    type="color"
                    value={settings.background.color}
                    onChange={(e) => updateBackground({ color: e.target.value })}
                    className="w-12 h-8 rounded-lg border-2 border-accent-orange cursor-pointer shadow-lg"
                  />
                  <span className="text-sm text-accent-orange font-mono font-bold bg-accent-orange/10 px-2 py-1 rounded">
                    {settings.background.color.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Save with Background Toggle */}
            <Card className="bg-gradient-to-br from-accent-green/10 to-accent-lime/10 border-accent-green/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Switch
                    checked={settings.background.saveWithBackground}
                    onCheckedChange={(saveWithBackground) => updateBackground({ saveWithBackground })}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-green data-[state=checked]:to-accent-lime"
                  />
                  <span className="bg-gradient-to-r from-accent-green to-accent-lime bg-clip-text text-transparent font-semibold">
                    💾 Save with Background
                  </span>
                </CardTitle>
              </CardHeader>
            </Card>
          </>
        )}

        {/* Ink Stamp Effect */}
        <Card className="bg-gradient-to-br from-accent-red/10 to-accent-pink/10 border-accent-red/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.inkStamp.enabled}
                onCheckedChange={(enabled) => updateInkStamp({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-red data-[state=checked]:to-accent-pink"
              />
              <Stamp className="w-4 h-4 text-accent-red" />
              <span className="bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent font-semibold">
                Ink Stamp Effect
              </span>
            </CardTitle>
          </CardHeader>
          
          {settings.inkStamp.enabled && (
            <CardContent className="pt-0 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent">
                  🎨 Stamp Color
                </Label>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <input
                    type="color"
                    value={settings.inkStamp.color}
                    onChange={(e) => updateInkStamp({ color: e.target.value })}
                    className="w-12 h-8 rounded-lg border-2 border-accent-red cursor-pointer shadow-lg"
                  />
                  <span className="text-sm text-accent-red font-mono font-bold bg-accent-red/10 px-2 py-1 rounded">
                    {settings.inkStamp.color.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent">
                  ⚡ Intensity
                </Label>
                <div className="p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <SliderWithInput
                    value={[settings.inkStamp.threshold]}
                    onValueChange={([threshold]) => updateInkStamp({ threshold })}
                    min={1}
                    max={100}
                    step={1}
                    sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-red [&_[role=slider]]:to-accent-pink [&_[role=slider]]:border-accent-red"
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-accent-red font-medium">🌱 Light (1)</span>
                  <span className="font-bold text-accent-red bg-accent-red/10 px-2 py-1 rounded">{settings.inkStamp.threshold}</span>
                  <span className="text-accent-pink font-medium">🔥 Heavy (100)</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Download Options */}
        <Card className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border-accent-cyan/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent font-semibold">
              📥 Download Options
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="trim-transparent" className="text-sm font-medium">
                Trim Transparent Pixels
              </Label>
              <Switch
                id="trim-transparent"
                checked={settings.download.trimTransparentPixels}
                onCheckedChange={(checked) => 
                  updateSettings({ 
                    download: { ...settings.download, trimTransparentPixels: checked } 
                  })
                }
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Remove empty transparent space around the image before downloading
            </p>
          </CardContent>
        </Card>

      </div>
    </div>
  );
};