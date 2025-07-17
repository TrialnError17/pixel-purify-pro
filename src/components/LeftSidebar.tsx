import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SliderWithInput } from '@/components/ui/slider-with-input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ColorRemovalSettings, PickedColor } from '@/pages/Index';
import { Palette, Settings, X, Trash2 } from 'lucide-react';

interface LeftSidebarProps {
  settings: ColorRemovalSettings;
  onSettingsChange: (settings: ColorRemovalSettings) => void;
  manualMode: boolean;
  onManualModeChange: (enabled: boolean) => void;
}

export const LeftSidebar: React.FC<LeftSidebarProps> = ({
  settings,
  onSettingsChange,
  manualMode,
  onManualModeChange
}) => {
  const updateSettings = (updates: Partial<ColorRemovalSettings>) => {
    onSettingsChange({ ...settings, ...updates });
  };

  return (
    <div className="w-96 bg-gradient-panel border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-r from-accent-green to-accent-cyan rounded-md flex items-center justify-center">
            <Settings className="w-4 h-4 text-white" />
          </div>
          <h2 className="text-lg font-semibold bg-gradient-to-r from-accent-green to-accent-cyan bg-clip-text text-transparent">
            Color Removal
          </h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <Card className="bg-gradient-to-br from-accent-purple/10 to-accent-pink/10 border-accent-purple/30 shadow-colorful">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.enabled}
                onCheckedChange={(enabled) => updateSettings({ enabled })}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-purple data-[state=checked]:to-accent-pink"
              />
              <span className="bg-gradient-to-r from-accent-purple to-accent-pink bg-clip-text text-transparent font-semibold">
                🎯 Enable Color Removal
              </span>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Manual Mode Toggle */}
        <Card className="bg-gradient-to-br from-accent-orange/10 to-accent-red/10 border-accent-orange/30 shadow-colorful">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={manualMode}
                onCheckedChange={onManualModeChange}
                className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-orange data-[state=checked]:to-accent-red"
              />
              <span className="bg-gradient-to-r from-accent-orange to-accent-red bg-clip-text text-transparent font-semibold">
                ✋ Manual Mode
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-xs text-muted-foreground p-2 bg-accent-orange/5 rounded border border-accent-orange/20">
              💡 Disables automatic processing. Your manual edits won't be overwritten by settings changes.
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

            <Card className="bg-gradient-to-br from-accent-green/10 to-accent-lime/10 border-accent-green/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Switch
                    checked={settings.contiguous}
                    onCheckedChange={(contiguous) => updateSettings({ contiguous })}
                    className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-accent-green data-[state=checked]:to-accent-lime"
                  />
                  <span className="bg-gradient-to-r from-accent-green to-accent-lime bg-clip-text text-transparent font-semibold">
                    🔗 Contiguous Only
                  </span>
                </CardTitle>
              </CardHeader>
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

          </>
        )}
      </div>
    </div>
  );
};