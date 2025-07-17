import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '@/components/ui/slider-with-input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorRemovalSettings, PickedColor, EffectSettings, ContiguousToolSettings } from '@/pages/Index';
import { Palette, Settings, X, Trash2, Zap, Eye, EyeOff, Paintbrush, Stamp, Wand, ImagePlus, FolderPlus } from 'lucide-react';
import { SpeckleSettings } from '@/hooks/useSpeckleTools';

interface LeftSidebarProps {
  settings: ColorRemovalSettings;
  onSettingsChange: (settings: ColorRemovalSettings) => void;
  speckleSettings: SpeckleSettings;
  onSpeckleSettingsChange: (settings: SpeckleSettings) => void;
  speckCount?: number;
  effectSettings: EffectSettings;
  onEffectSettingsChange: (settings: EffectSettings) => void;
  contiguousSettings: ContiguousToolSettings;
  onContiguousSettingsChange: (settings: ContiguousToolSettings) => void;
  onAddImages: () => void;
  onAddFolder: () => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  settings,
  onSettingsChange,
  speckleSettings,
  onSpeckleSettingsChange,
  speckCount,
  effectSettings,
  onEffectSettingsChange,
  contiguousSettings,
  onContiguousSettingsChange,
  onAddImages,
  onAddFolder
}) => {
  const updateSettings = (updates: Partial<ColorRemovalSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  const updateSpeckleSettings = (updates: Partial<SpeckleSettings>) => {
    onSpeckleSettingsChange({ ...speckleSettings, ...updates });
  };

  const updateEffectSettings = (updates: Partial<EffectSettings>) => {
    onEffectSettingsChange({ ...effectSettings, ...updates });
  };

  const updateBackground = (updates: Partial<EffectSettings['background']>) => {
    updateEffectSettings({
      background: { ...effectSettings.background, ...updates }
    });
  };

  const updateInkStamp = (updates: Partial<EffectSettings['inkStamp']>) => {
    updateEffectSettings({
      inkStamp: { ...effectSettings.inkStamp, ...updates }
    });
  };

  const updateContiguousSettings = (updates: Partial<ContiguousToolSettings>) => {
    onContiguousSettingsChange({ ...contiguousSettings, ...updates });
  };

  return (
    <div className="w-96 bg-gradient-panel border-r border-border flex flex-col h-full">
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-gradient-to-r from-accent-green to-accent-cyan rounded-md flex items-center justify-center">
              <Settings className="w-4 h-4 text-foreground" />
            </div>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
              Tools
            </h2>
          </div>
          
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddImages}
              className="flex items-center gap-1"
            >
              <ImagePlus className="w-3 h-3" />
              Images
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onAddFolder}
              className="flex items-center gap-1"
            >
              <FolderPlus className="w-3 h-3" />
              Folder
            </Button>
          </div>
        </div>
      </div>
      
      <div className="flex-1 p-3 space-y-4 overflow-y-auto min-h-0">
        {/* Background Enable Toggle */}
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border-accent-purple/30 shadow-colorful">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={effectSettings.background.enabled}
                onCheckedChange={(enabled) => updateBackground({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-blue"
              />
              <span className="bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent font-semibold">
                🎨 Enable Background
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {effectSettings.background.enabled && (
          <>
            {/* Background Color Picker */}
        <Card className="bg-gradient-to-br from-accent-yellow/10 to-accent-orange/10 border-accent-orange/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Palette className="w-4 h-4 text-accent-orange" />
                  <span className="bg-gradient-to-r from-accent-yellow to-accent-orange bg-clip-text text-transparent font-semibold">
                    Background Color
                  </span>
                </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-2 space-y-3">
            <div className="flex items-center gap-3 p-2 bg-gradient-to-r from-accent-yellow/5 to-accent-orange/5 rounded-lg border border-accent-orange/20">
              <input
                type="color"
                    value={effectSettings.background.color}
                    onChange={(e) => updateBackground({ color: e.target.value })}
                    className="w-12 h-8 rounded-lg border-2 border-accent-orange cursor-pointer shadow-lg"
                  />
                  <span className="text-sm text-accent-orange font-mono font-bold bg-accent-orange/10 px-2 py-1 rounded">
                    {effectSettings.background.color.toUpperCase()}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Save with Background Toggle */}
        <Card className="bg-gradient-to-br from-accent-green/10 to-accent-lime/10 border-accent-green/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Switch
                    checked={effectSettings.background.saveWithBackground}
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

        {/* Magic Wand Tool Settings */}
        <Card className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border-accent-cyan/30 shadow-colorful">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Wand className="w-4 h-4 text-accent-cyan" />
              <span className="bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent font-semibold">
                🎯 Magic Wand Tool
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-2 space-y-2">
            <div className="p-2 bg-gradient-to-r from-accent-cyan/5 to-accent-blue/5 rounded-lg border border-accent-cyan/20">
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
          </CardContent>
        </Card>

        {/* Color Removal Section */}
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border-accent-purple/30 shadow-colorful">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-pink"
              />
              <span className="bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent font-semibold">
                🎯 Color Removal
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-2">
            <div className="flex items-center justify-between p-2 bg-gradient-to-r from-accent-green/5 to-accent-lime/5 rounded-lg border border-accent-green/20">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-accent-green">🔗 Contiguous Only</span>
              </div>
              <Switch
                checked={settings.contiguous}
                onCheckedChange={(contiguous) => updateSettings({ contiguous })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-green data-[state=checked]:to-accent-lime"
              />
            </div>
          </CardContent>
        </Card>

        {settings.enabled && (
          <>
            <div className="py-1">
              <Label className="text-xs font-medium text-muted-foreground mb-1 block">Mode Selection</Label>
              <RadioGroup
                value={settings.mode}
                onValueChange={(mode: 'auto' | 'manual') => updateSettings({ mode })}
                className="space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="auto" id="auto" />
                  <Label htmlFor="auto" className="text-xs cursor-pointer">Auto (top-left color)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manual" id="manual" />
                  <Label htmlFor="manual" className="text-xs cursor-pointer">Manual (pick color)</Label>
                </div>
              </RadioGroup>
            </div>

            {settings.mode === 'manual' && (
              <Card className="bg-gradient-to-br from-accent-yellow/10 to-accent-orange/10 border-accent-orange/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Palette className="w-4 h-4 text-accent-orange" />
                    <span className="bg-gradient-to-r from-accent-yellow to-accent-orange bg-clip-text text-transparent font-semibold">
                      Target Color
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-accent-yellow/5 to-accent-orange/5 rounded-lg border border-accent-orange/20">
                    <input
                      type="color"
                      value={settings.targetColor}
                      onChange={(e) => updateSettings({ targetColor: e.target.value })}
                      className="w-12 h-8 rounded-lg border-2 border-accent-orange cursor-pointer shadow-lg"
                    />
                    <span className="text-sm text-accent-orange font-mono font-bold bg-accent-orange/10 px-2 py-1 rounded">
                      {settings.targetColor.toUpperCase()}
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Picked Colors List */}
            {settings.mode === 'manual' && settings.pickedColors.length > 0 && (
              <Card className="bg-gradient-to-br from-accent-lime/10 to-accent-green/10 border-accent-lime/30">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center justify-between">
                    <span className="bg-gradient-to-r from-accent-lime to-accent-green bg-clip-text text-transparent font-semibold flex items-center gap-2">
                      🎨 Picked Colors ({settings.pickedColors.length})
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateSettings({ pickedColors: [] })}
                      className="h-6 w-6 p-0 text-accent-red hover:text-accent-red hover:bg-accent-red/10"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-3">
                  {settings.pickedColors.map((pickedColor, index) => (
                    <div key={pickedColor.id} className="p-3 bg-gradient-to-r from-accent-lime/5 to-accent-green/5 rounded-lg border border-accent-lime/20">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-6 h-6 rounded border-2 border-accent-lime shadow-lg"
                            style={{ backgroundColor: pickedColor.color }}
                          />
                          <span className="text-xs font-mono font-bold text-accent-green bg-accent-green/10 px-2 py-1 rounded">
                            {pickedColor.color.toUpperCase()}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newPickedColors = settings.pickedColors.filter(c => c.id !== pickedColor.id);
                            updateSettings({ pickedColors: newPickedColors });
                          }}
                          className="h-6 w-6 p-0 text-accent-red hover:text-accent-red hover:bg-accent-red/10"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <div>
                        <Label className="text-xs text-accent-green mb-1 block">Threshold: {pickedColor.threshold}</Label>
                        <SliderWithInput
                          value={[pickedColor.threshold]}
                          onValueChange={([threshold]) => {
                            const newPickedColors = settings.pickedColors.map(c => 
                              c.id === pickedColor.id ? { ...c, threshold } : c
                            );
                            updateSettings({ pickedColors: newPickedColors });
                          }}
                          min={1}
                          max={100}
                          step={1}
                          sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-lime [&_[role=slider]]:to-accent-green [&_[role=slider]]:border-accent-lime"
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Card className="bg-gradient-to-br from-accent-red/10 to-accent-pink/10 border-accent-red/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent font-semibold">
                  🎚️ Threshold Sensitivity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <SliderWithInput
                    value={[settings.threshold]}
                    onValueChange={([threshold]) => updateSettings({ threshold })}
                    min={1}
                    max={100}
                    step={1}
                    sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-red [&_[role=slider]]:to-accent-pink [&_[role=slider]]:border-accent-red"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-accent-red font-medium">🎯 Precise (1)</span>
                  <span className="font-bold text-accent-red bg-accent-red/10 px-2 py-1 rounded">{settings.threshold}</span>
                  <span className="text-accent-pink font-medium">🌊 Loose (100)</span>
                </div>
              </CardContent>
            </Card>


            <Card className="bg-gradient-to-br from-accent-indigo/10 to-accent-purple/10 border-accent-indigo/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-indigo to-accent-purple bg-clip-text text-transparent font-semibold">
                  📏 Min Region Size
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="p-3 bg-gradient-to-r from-accent-indigo/5 to-accent-purple/5 rounded-lg border border-accent-indigo/20">
                  <SliderWithInput
                    value={[settings.minRegionSize]}
                    onValueChange={([minRegionSize]) => updateSettings({ minRegionSize })}
                    min={1}
                    max={4000}
                    step={10}
                    sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-indigo [&_[role=slider]]:to-accent-purple [&_[role=slider]]:border-accent-indigo"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-accent-indigo font-medium">🔬 1px</span>
                  <span className="font-bold text-accent-indigo bg-accent-indigo/10 px-2 py-1 rounded">{settings.minRegionSize}px</span>
                  <span className="text-accent-purple font-medium">🏔️ 4000px</span>
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

          </>
        )}

        {/* Ink Stamp Effect */}
        <Card className="bg-gradient-to-br from-accent-red/10 to-accent-pink/10 border-accent-red/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={effectSettings.inkStamp.enabled}
                onCheckedChange={(enabled) => updateInkStamp({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-red data-[state=checked]:to-accent-pink"
              />
              <Stamp className="w-4 h-4 text-accent-red" />
              <span className="bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent font-semibold">
                Ink Stamp Effect
              </span>
            </CardTitle>
          </CardHeader>
          
          {effectSettings.inkStamp.enabled && (
            <CardContent className="pt-0 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent">
                  🎨 Stamp Color
                </Label>
                <div className="flex items-center gap-3 p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <input
                    type="color"
                    value={effectSettings.inkStamp.color}
                    onChange={(e) => updateInkStamp({ color: e.target.value })}
                    className="w-12 h-8 rounded-lg border-2 border-accent-red cursor-pointer shadow-lg"
                  />
                  <span className="text-sm text-accent-red font-mono font-bold bg-accent-red/10 px-2 py-1 rounded">
                    {effectSettings.inkStamp.color.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent">
                  ⚡ Intensity
                </Label>
                <div className="p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <SliderWithInput
                    value={[effectSettings.inkStamp.threshold]}
                    onValueChange={([threshold]) => updateInkStamp({ threshold })}
                    min={1}
                    max={100}
                    step={1}
                    sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-red [&_[role=slider]]:to-accent-pink [&_[role=slider]]:border-accent-red"
                  />
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-accent-red font-medium">🌱 Light (1)</span>
                  <span className="font-bold text-accent-red bg-accent-red/10 px-2 py-1 rounded">{effectSettings.inkStamp.threshold}</span>
                  <span className="text-accent-pink font-medium">🔥 Heavy (100)</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
};