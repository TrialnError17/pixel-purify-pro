import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '@/components/ui/slider-with-input';
import { Label } from '@/components/ui/label';
import { EffectSettings, ContiguousToolSettings } from '@/pages/Index';
import { Palette, Stamp, Paintbrush, Wand, Zap, Eye, EyeOff } from 'lucide-react';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

interface RightSidebarProps {
  settings: EffectSettings;
  onSettingsChange: (settings: EffectSettings) => void;
  contiguousSettings: ContiguousToolSettings;
  onContiguousSettingsChange: (settings: ContiguousToolSettings) => void;
  speckleSettings: SpeckleSettings;
  onSpeckleSettingsChange: (settings: SpeckleSettings) => void;
  speckCount?: number;
}

export const RightSidebar: React.FC<RightSidebarProps> = ({
  settings,
  onSettingsChange,
  contiguousSettings,
  onContiguousSettingsChange,
  speckleSettings,
  onSpeckleSettingsChange,
  speckCount
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

  const updateContiguousSettings = (updates: Partial<ContiguousToolSettings>) => {
    onContiguousSettingsChange({ ...contiguousSettings, ...updates });
  };

  const updateSpeckleSettings = (updates: Partial<SpeckleSettings>) => {
    onSpeckleSettingsChange({ ...speckleSettings, ...updates });
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

        {/* Magic Wand Tool Settings */}
        <Card className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border-accent-cyan/30 shadow-colorful">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wand className="w-4 h-4 text-accent-cyan" />
              <span className="bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent font-semibold">
                🎯 Magic Wand Tool
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-3">
            <div className="p-3 bg-gradient-to-r from-accent-cyan/5 to-accent-blue/5 rounded-lg border border-accent-cyan/20">
              <Label className="text-xs text-accent-cyan mb-2 block">Threshold: {contiguousSettings.threshold}</Label>
              <SliderWithInput
                value={[contiguousSettings.threshold]}
                onValueChange={([threshold]) => updateContiguousSettings({ threshold })}
                min={1}
                max={100}
                step={1}
                sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-cyan [&_[role=slider]]:to-accent-blue [&_[role=slider]]:border-accent-cyan"
              />
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-accent-cyan font-medium">🎯 Precise (1)</span>
              <span className="font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-1 rounded">{contiguousSettings.threshold}</span>
              <span className="text-accent-blue font-medium">🌊 Loose (100)</span>
            </div>
            <div className="text-xs text-muted-foreground p-2 bg-accent-cyan/5 rounded border border-accent-cyan/20">
              💡 This threshold is independent from color removal. Click with the magic wand tool to remove connected pixels.
            </div>
          </CardContent>
        </Card>

        {/* Speckle Tools Section */}
        <Card className="bg-gradient-to-br from-accent-blue/10 to-accent-indigo/10 border-accent-blue/30 shadow-colorful">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={speckleSettings.enabled}
                onCheckedChange={(enabled) => updateSpeckleSettings({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-blue data-[state=checked]:to-accent-indigo"
              />
              <span className="bg-gradient-to-r from-accent-blue to-accent-indigo bg-clip-text text-transparent font-semibold flex items-center gap-1">
                <Zap className="w-4 h-4 text-accent-blue" />
                ✨ Speckle Tools
              </span>
            </CardTitle>
          </CardHeader>
          {speckleSettings.enabled && (
            <CardContent className="pt-0 space-y-4">
              <div className="text-xs text-muted-foreground p-2 bg-accent-blue/5 rounded border border-accent-blue/20">
                🔍 Detects and manages isolated pixel clusters (specks) in your image
              </div>

              {/* Highlight Specks Toggle */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent-blue/5 to-accent-indigo/5 rounded-lg border border-accent-blue/20">
                <div className="flex items-center gap-2">
                  <Eye className="w-4 h-4 text-accent-blue" />
                  <span className="text-sm font-medium text-accent-blue">Highlight Specks</span>
                </div>
                <Switch
                  checked={speckleSettings.highlightSpecks}
                  onCheckedChange={(highlightSpecks) => updateSpeckleSettings({ 
                    highlightSpecks, 
                    removeSpecks: highlightSpecks ? false : speckleSettings.removeSpecks 
                  })}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-blue data-[state=checked]:to-accent-indigo"
                />
              </div>

              {/* Remove Specks Toggle */}
              <div className="flex items-center justify-between p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                <div className="flex items-center gap-2">
                  <EyeOff className="w-4 h-4 text-accent-red" />
                  <span className="text-sm font-medium text-accent-red">Remove Specks</span>
                </div>
                <Switch
                  checked={speckleSettings.removeSpecks}
                  onCheckedChange={(removeSpecks) => updateSpeckleSettings({ 
                    removeSpecks, 
                    highlightSpecks: removeSpecks ? false : speckleSettings.highlightSpecks 
                  })}
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-red data-[state=checked]:to-accent-pink"
                />
              </div>

              {/* Min Speck Size Slider */}
              <div className="space-y-3">
                <Label className="text-sm font-medium bg-gradient-to-r from-accent-blue to-accent-indigo bg-clip-text text-transparent">
                  📏 Min Speck Size
                </Label>
                <div className="p-3 bg-gradient-to-r from-accent-blue/5 to-accent-indigo/5 rounded-lg border border-accent-blue/20">
                  <SliderWithInput
                    value={[speckleSettings.minSpeckSize]}
                    onValueChange={([minSpeckSize]) => updateSpeckleSettings({ minSpeckSize })}
                    min={1}
                    max={500}
                    step={1}
                    sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-blue [&_[role=slider]]:to-accent-indigo [&_[role=slider]]:border-accent-blue"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-accent-blue font-medium">🔬 1px</span>
                  <span className="font-bold text-accent-blue bg-accent-blue/10 px-2 py-1 rounded">{speckleSettings.minSpeckSize}px</span>
                  <span className="text-accent-indigo font-medium">🏔️ 500px</span>
                </div>
              </div>

              {/* Speck Count Display */}
              {(speckleSettings.highlightSpecks || speckleSettings.removeSpecks) && speckCount !== undefined && (
                <div className="p-3 bg-gradient-to-r from-accent-green/5 to-accent-lime/5 rounded-lg border border-accent-green/20">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-accent-green" />
                    <span className="text-sm font-medium text-accent-green">
                      Found {speckCount} speck{speckCount !== 1 ? 's' : ''} ≤ {speckleSettings.minSpeckSize}px
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
};