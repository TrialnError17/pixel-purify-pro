import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '@/components/ui/slider-with-input';
import { GraphicEQBand } from '@/components/ui/graphic-eq-band';
import { HueSlider } from '@/components/ui/hue-slider';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { ColorRemovalSettings, PickedColor, EffectSettings, ContiguousToolSettings, EdgeCleanupSettings } from '@/pages/Index';
import { Palette, Settings, X, Trash2, Zap, Eye, EyeOff, Paintbrush, Stamp, Wand, ImagePlus, FolderPlus, Scissors } from 'lucide-react';
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
  edgeCleanupSettings: EdgeCleanupSettings;
  onEdgeCleanupSettingsChange: (settings: EdgeCleanupSettings) => void;
  currentTool: 'pan' | 'color-stack' | 'magic-wand';
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
  edgeCleanupSettings,
  onEdgeCleanupSettingsChange,
  currentTool,
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

  const updateImageEffects = (updates: Partial<EffectSettings['imageEffects']>) => {
    console.log('Updating image effects:', updates);
    updateEffectSettings({
      imageEffects: { ...effectSettings.imageEffects, ...updates }
    });
  };

  // Helper function to convert RGB to hue
  const rgbToHue = (r: number, g: number, b: number): number => {
    r /= 255;
    g /= 255;
    b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const diff = max - min;
    
    if (diff === 0) return 0;
    
    let hue = 0;
    if (max === r) {
      hue = ((g - b) / diff) % 6;
    } else if (max === g) {
      hue = (b - r) / diff + 2;
    } else {
      hue = (r - g) / diff + 4;
    }
    
    hue = Math.round(hue * 60);
    if (hue < 0) hue += 360;
    
    return hue;
  };

  const updateContiguousSettings = (updates: Partial<ContiguousToolSettings>) => {
    onContiguousSettingsChange({ ...contiguousSettings, ...updates });
  };

  const updateEdgeCleanupSettings = (updates: Partial<EdgeCleanupSettings>) => {
    onEdgeCleanupSettingsChange({ ...edgeCleanupSettings, ...updates });
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
          <CardHeader className="pt-2 pb-2">
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
          <CardHeader className="pt-2 pb-2">
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
                
                {/* Save with Background Toggle - Compact */}
                <div className="flex items-center justify-between p-2 bg-gradient-to-r from-accent-green/5 to-accent-lime/5 rounded-lg border border-accent-green/20">
                  <span className="text-sm font-medium text-accent-green">💾 Save with BG</span>
                  <Switch
                    checked={effectSettings.background.saveWithBackground}
                    onCheckedChange={(saveWithBackground) => updateBackground({ saveWithBackground })}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-green data-[state=checked]:to-accent-lime"
                  />
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {/* Magic Wand Tool Settings - only shown when magic wand tool is selected */}
        {currentTool === 'magic-wand' && (
          <Card className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border-accent-cyan/30 shadow-colorful">
            <CardHeader className="pt-2 pb-2">
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
            </CardContent>
          </Card>
        )}

        {/* Color Removal Section */}
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border-accent-purple/30 shadow-colorful">
          <CardHeader className="pt-2 pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-pink"
              />
              <span className="bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent font-semibold">
                🎯 Color Removal
              </span>
              {settings.enabled && (
                <div className="flex items-center gap-1 ml-auto">
                  <Checkbox
                    id="contiguous-checkbox"
                    checked={settings.contiguous}
                    onCheckedChange={(checked) => updateSettings({ contiguous: !!checked })}
                    className="w-3 h-3"
                  />
                  <label htmlFor="contiguous-checkbox" className="text-sm text-muted-foreground cursor-pointer">
                    Contiguous
                  </label>
                </div>
              )}
            </CardTitle>
          </CardHeader>
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
                <CardHeader className="pt-2 pb-3">
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
                <CardHeader className="pt-2 pb-3">
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
              <CardHeader className="pt-2 pb-3">
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
              </CardContent>
            </Card>

            {/* Min Region Size Widget - only shown when color removal is enabled */}
            <Card className="bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border-accent-blue/30 shadow-colorful">
              <CardHeader className="pt-2 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Switch
                    checked={settings.minRegionSize.enabled && !settings.contiguous}
                    onCheckedChange={(enabled) => updateSettings({ 
                      minRegionSize: { ...settings.minRegionSize, enabled: enabled && !settings.contiguous }
                    })}
                    disabled={settings.contiguous}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-blue data-[state=checked]:to-accent-cyan"
                  />
                  <span className="bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent font-semibold">
                    📏 Min Region Size
                  </span>
                  {settings.contiguous && (
                    <span className="text-xs text-muted-foreground ml-auto">(Auto-disabled: Contiguous ON)</span>
                  )}
                </CardTitle>
              </CardHeader>
              {settings.minRegionSize.enabled && !settings.contiguous && (
                <CardContent className="pt-0">
                  <div className="p-3 bg-gradient-to-r from-accent-blue/5 to-accent-cyan/5 rounded-lg border border-accent-blue/20">
                    <SliderWithInput
                      value={[settings.minRegionSize.value]}
                      onValueChange={([value]) => updateSettings({ 
                        minRegionSize: { ...settings.minRegionSize, value }
                      })}
                      min={1}
                      max={4000}
                      step={10}
                      buttonStep={10}
                      sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-blue [&_[role=slider]]:to-accent-cyan [&_[role=slider]]:border-accent-blue"
                    />
                  </div>
                </CardContent>
              )}
            </Card>
          </>
        )}

        {/* Edge Cleanup Section */}
            <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-indigo/10 border-accent-purple/30 shadow-colorful">
              <CardHeader className="pt-2 pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Scissors className="w-4 h-4 text-accent-purple" />
                  <span className="bg-gradient-to-r from-accent-purple to-accent-indigo bg-clip-text text-transparent font-semibold">
                    Edge Cleanup
                  </span>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pt-0 space-y-4">
                {/* Alpha Feathering */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={edgeCleanupSettings.enabled}
                      onCheckedChange={(enabled) => updateEdgeCleanupSettings({ enabled })}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-indigo"
                    />
                    <Label className="text-sm font-medium cursor-pointer">
                      Alpha Feathering
                    </Label>
                  </div>
                  {edgeCleanupSettings.enabled && (
                    <div className="space-y-2 ml-6">
                      <Label className="text-xs font-medium bg-gradient-to-r from-accent-purple to-accent-indigo bg-clip-text text-transparent">
                        Feather Radius: {edgeCleanupSettings.trimRadius}px
                      </Label>
                      <div className="p-3 bg-gradient-to-r from-accent-purple/5 to-accent-indigo/5 rounded-lg border border-accent-purple/20">
                        <SliderWithInput
                          value={[edgeCleanupSettings.trimRadius]}
                          onValueChange={([trimRadius]) => updateEdgeCleanupSettings({ trimRadius })}
                          min={1}
                          max={10}
                          step={1}
                          buttonStep={1}
                          sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-purple [&_[role=slider]]:to-accent-indigo [&_[role=slider]]:border-accent-purple"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Legacy Edge Smoothing */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={edgeCleanupSettings.legacyEnabled}
                      onCheckedChange={(legacyEnabled) => updateEdgeCleanupSettings({ legacyEnabled })}
                      className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-indigo"
                    />
                    <Label className="text-sm font-medium cursor-pointer">
                      Edge Trimming
                    </Label>
                  </div>
                  {edgeCleanupSettings.legacyEnabled && (
                    <div className="space-y-2 ml-6">
                      <Label className="text-xs font-medium bg-gradient-to-r from-accent-purple to-accent-indigo bg-clip-text text-transparent">
                        Trim Radius: {edgeCleanupSettings.legacyRadius}px
                      </Label>
                      <div className="p-3 bg-gradient-to-r from-accent-purple/5 to-accent-indigo/5 rounded-lg border border-accent-purple/20">
                        <SliderWithInput
                          value={[edgeCleanupSettings.legacyRadius]}
                          onValueChange={([legacyRadius]) => updateEdgeCleanupSettings({ legacyRadius })}
                          min={1}
                          max={5}
                          step={1}
                          buttonStep={1}
                          sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-purple [&_[role=slider]]:to-accent-indigo [&_[role=slider]]:border-accent-purple"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-accent-blue/10 to-accent-indigo/10 border-accent-blue/30 shadow-colorful">
              <CardHeader className="pt-2 pb-3">
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
                        max={2000}
                        step={1}
                        sliderClassName="[&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-blue [&_[role=slider]]:to-accent-indigo [&_[role=slider]]:border-accent-blue"
                      />
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

        {/* Ink Stamp Effect */}
        <Card className="bg-gradient-to-br from-accent-red/10 to-accent-pink/10 border-accent-red/30">
          <CardHeader className="pt-2 pb-3">
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
              </div>
            </CardContent>
          )}
        </Card>

        {/* Image Effects */}
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-blue/10 border-accent-purple/30">
          <CardHeader className="pt-2 pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={effectSettings.imageEffects.enabled}
                onCheckedChange={(enabled) => updateImageEffects({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-blue"
              />
              <Palette className="w-4 h-4 text-accent-purple" />
              <span className="bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent font-semibold">
                Image Effects
              </span>
            </CardTitle>
          </CardHeader>
          
          {effectSettings.imageEffects.enabled && (
            <CardContent className="pt-0 space-y-4">
              {/* Graphic EQ Style Controls */}
              <div className="p-4 bg-gradient-to-br from-accent-purple/5 to-accent-blue/5 rounded-lg border border-accent-purple/30 shadow-lg">
                <div className="flex items-start justify-center gap-8">
                  {/* Brightness EQ Band */}
                  <GraphicEQBand
                    label="☀️ BRIGHT"
                    value={effectSettings.imageEffects.brightness}
                    onValueChange={(brightness) => updateImageEffects({ brightness })}
                    min={-100}
                    max={100}
                    step={1}
                  />

                  {/* Contrast EQ Band */}
                  <GraphicEQBand
                    label="🎛️ CONTRAST"
                    value={effectSettings.imageEffects.contrast}
                    onValueChange={(contrast) => updateImageEffects({ contrast })}
                    min={-100}
                    max={100}
                    step={1}
                  />

                  {/* Vibrance EQ Band */}
                  <GraphicEQBand
                    label="🌈 VIBRANCE"
                    value={-effectSettings.imageEffects.vibrance}
                    onValueChange={(vibrance) => updateImageEffects({ vibrance: -vibrance })}
                    min={-100}
                    max={100}
                    step={1}
                  />
                </div>
              </div>

              {/* Hue */}
              <div>
                <Label className="text-sm font-medium mb-2 block bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
                  🎨 Hue Shift
                </Label>
                <div className="p-3 bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 rounded-lg border border-accent-purple/20">
                  <div className="relative">
                    <HueSlider
                      value={[effectSettings.imageEffects.hue]}
                      onValueChange={([hue]) => updateImageEffects({ hue })}
                      defaultValue={0}
                    />
                  </div>
                </div>
              </div>

              {/* Colorize */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Checkbox
                    checked={effectSettings.imageEffects.colorize.enabled}
                    onCheckedChange={(enabled) => updateImageEffects({ 
                      colorize: { ...effectSettings.imageEffects.colorize, enabled: !!enabled }
                    })}
                    className="data-[state=checked]:bg-accent-purple"
                  />
                  <Label className="text-sm font-medium bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
                    🎨 Colorize
                  </Label>
                </div>
                
                {effectSettings.imageEffects.colorize.enabled && (
                  <div className="p-3 bg-gradient-to-r from-accent-purple/5 to-accent-blue/5 rounded-lg border border-accent-purple/20 space-y-3">
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Hue</Label>
                      <div className="flex items-center gap-3">
                        <input
                          type="color"
                          value={`hsl(${effectSettings.imageEffects.colorize.hue}, 100%, 50%)`}
                          onChange={(e) => {
                            const tempDiv = document.createElement('div');
                            tempDiv.style.color = e.target.value;
                            document.body.appendChild(tempDiv);
                            const computedColor = window.getComputedStyle(tempDiv).color;
                            document.body.removeChild(tempDiv);
                            
                            const rgb = computedColor.match(/\d+/g);
                            if (rgb) {
                              const [r, g, b] = rgb.map(Number);
                              const hue = rgbToHue(r, g, b);
                              updateImageEffects({ 
                                colorize: { ...effectSettings.imageEffects.colorize, hue }
                              });
                            }
                          }}
                          className="w-8 h-6 rounded border border-accent-purple cursor-pointer"
                        />
                         <HueSlider
                           value={[effectSettings.imageEffects.colorize.hue]}
                           onValueChange={([hue]) => updateImageEffects({ 
                             colorize: { ...effectSettings.imageEffects.colorize, hue }
                           })}
                           defaultValue={0}
                           className="flex-1"
                         />
                      </div>
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Lightness</Label>
                      <SliderWithInput
                        value={[effectSettings.imageEffects.colorize.lightness]}
                        onValueChange={([lightness]) => updateImageEffects({ 
                          colorize: { ...effectSettings.imageEffects.colorize, lightness }
                        })}
                        min={0}
                        max={100}
                        step={1}
                        sliderClassName="[&>span:first-child]:bg-gradient-effect [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-purple [&_[role=slider]]:to-accent-blue [&_[role=slider]]:border-accent-purple"
                      />
                    </div>
                    
                    <div>
                      <Label className="text-xs text-muted-foreground mb-1 block">Saturation</Label>
                      <SliderWithInput
                        value={[effectSettings.imageEffects.colorize.saturation]}
                        onValueChange={([saturation]) => updateImageEffects({ 
                          colorize: { ...effectSettings.imageEffects.colorize, saturation }
                        })}
                        min={0}
                        max={100}
                        step={1}
                        sliderClassName="[&>span:first-child]:bg-gradient-effect [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-purple [&_[role=slider]]:to-accent-blue [&_[role=slider]]:border-accent-purple"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Black and White */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={effectSettings.imageEffects.blackAndWhite}
                  onCheckedChange={(enabled) => updateImageEffects({ blackAndWhite: !!enabled })}
                  className="data-[state=checked]:bg-accent-purple"
                />
                <Label className="text-sm font-medium bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
                  ⚫ Black & White
                </Label>
              </div>

              {/* Invert */}
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={effectSettings.imageEffects.invert}
                  onCheckedChange={(enabled) => updateImageEffects({ invert: !!enabled })}
                  className="data-[state=checked]:bg-accent-purple"
                />
                <Label className="text-sm font-medium bg-gradient-to-r from-accent-purple to-accent-blue bg-clip-text text-transparent">
                  🔄 Invert Colors
                </Label>
              </div>
            </CardContent>
          )}
        </Card>

      </div>
    </div>
  );
};