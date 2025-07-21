import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
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

  const updateInkStamp = (updates: Partial<EffectSettings['inkStamp']>) => {
    updateSettings({
      inkStamp: { ...settings.inkStamp, ...updates }
    });
  };

  return (
    <div className="w-80 bg-gradient-panel border-l border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Paintbrush className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Effects</h2>
        </div>
      </div>
      
      <div className="flex-1 p-4 space-y-6 overflow-y-auto">
        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Palette className="w-4 h-4" />
              Background Color
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={settings.backgroundColor}
                onChange={(e) => updateSettings({ backgroundColor: e.target.value })}
                className="w-12 h-8 rounded border border-border cursor-pointer"
              />
              <span className="text-sm text-muted-foreground font-mono">
                {settings.backgroundColor.toUpperCase()}
              </span>
            </div>
            
            <div className="flex items-center space-x-2">
              <Switch
                id="save-background"
                checked={settings.saveBackground}
                onCheckedChange={(saveBackground) => updateSettings({ saveBackground })}
              />
              <Label htmlFor="save-background" className="text-sm">
                Save with background
              </Label>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Switch
                checked={settings.inkStamp.enabled}
                onCheckedChange={(enabled) => updateInkStamp({ enabled })}
              />
              <Stamp className="w-4 h-4" />
              Ink Stamp Effect
            </CardTitle>
          </CardHeader>
          
          {settings.inkStamp.enabled && (
            <CardContent className="pt-0 space-y-4">
              <div>
                <Label className="text-sm font-medium mb-2 block">Stamp Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={settings.inkStamp.color}
                    onChange={(e) => updateInkStamp({ color: e.target.value })}
                    className="w-12 h-8 rounded border border-border cursor-pointer"
                  />
                  <span className="text-sm text-muted-foreground font-mono">
                    {settings.inkStamp.color.toUpperCase()}
                  </span>
                </div>
              </div>
              
              <div>
                <Label className="text-sm font-medium mb-2 block">Intensity</Label>
                <Slider
                  value={[settings.inkStamp.threshold]}
                  onValueChange={([threshold]) => updateInkStamp({ threshold })}
                  min={1}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Light (1)</span>
                  <span className="font-medium">{settings.inkStamp.threshold}</span>
                  <span>Heavy (100)</span>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        <Card className="bg-card/50 border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 space-y-2">
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={() => updateSettings({ backgroundColor: '#ffffff' })}
            >
              White Background
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={() => updateSettings({ backgroundColor: '#000000' })}
            >
              Black Background
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start"
              onClick={() => updateSettings({ backgroundColor: '#00ff00' })}
            >
              Green Screen
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};