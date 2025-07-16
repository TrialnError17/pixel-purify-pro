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

        {settings.enabled && (
          <>
            <Card className="bg-gradient-to-br from-accent-blue/10 to-accent-cyan/10 border-accent-blue/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-blue to-accent-cyan bg-clip-text text-transparent">
                  🎮 Mode Selection
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <RadioGroup
                  value={settings.mode}
                  onValueChange={(mode: 'auto' | 'manual') => updateSettings({ mode })}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent-blue/5 transition-colors">
                    <RadioGroupItem value="auto" id="auto" className="border-accent-blue text-accent-blue" />
                    <Label htmlFor="auto" className="text-sm font-medium cursor-pointer">🤖 Auto (top-left color)</Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent-cyan/5 transition-colors">
                    <RadioGroupItem value="manual" id="manual" className="border-accent-cyan text-accent-cyan" />
                    <Label htmlFor="manual" className="text-sm font-medium cursor-pointer">🎨 Manual (pick color)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

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

            <Card className="bg-gradient-to-br from-accent-red/10 to-accent-pink/10 border-accent-red/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-red to-accent-pink bg-clip-text text-transparent font-semibold">
                  🎚️ Threshold Sensitivity
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="p-3 bg-gradient-to-r from-accent-red/5 to-accent-pink/5 rounded-lg border border-accent-red/20">
                  <Slider
                    value={[settings.threshold]}
                    onValueChange={([threshold]) => updateSettings({ threshold })}
                    min={1}
                    max={100}
                    step={1}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-red [&_[role=slider]]:to-accent-pink [&_[role=slider]]:border-accent-red"
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
                  <Slider
                    value={[settings.minRegionSize]}
                    onValueChange={([minRegionSize]) => updateSettings({ minRegionSize })}
                    min={1}
                    max={4000}
                    step={10}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-indigo [&_[role=slider]]:to-accent-purple [&_[role=slider]]:border-accent-indigo"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-accent-indigo font-medium">🔬 1px</span>
                  <span className="font-bold text-accent-indigo bg-accent-indigo/10 px-2 py-1 rounded">{settings.minRegionSize}px</span>
                  <span className="text-accent-purple font-medium">🏔️ 4000px</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-accent-cyan/10 to-accent-blue/10 border-accent-cyan/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium bg-gradient-to-r from-accent-cyan to-accent-blue bg-clip-text text-transparent font-semibold">
                  ✨ Feather Radius
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                <div className="p-3 bg-gradient-to-r from-accent-cyan/5 to-accent-blue/5 rounded-lg border border-accent-cyan/20">
                  <Slider
                    value={[settings.featherRadius]}
                    onValueChange={([featherRadius]) => updateSettings({ featherRadius })}
                    min={0}
                    max={10}
                    step={0.5}
                    className="w-full [&_[role=slider]]:bg-gradient-to-r [&_[role=slider]]:from-accent-cyan [&_[role=slider]]:to-accent-blue [&_[role=slider]]:border-accent-cyan"
                  />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-accent-cyan font-medium">⚡ 0px</span>
                  <span className="font-bold text-accent-cyan bg-accent-cyan/10 px-2 py-1 rounded">{settings.featherRadius}px</span>
                  <span className="text-accent-blue font-medium">🌟 10px</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
};