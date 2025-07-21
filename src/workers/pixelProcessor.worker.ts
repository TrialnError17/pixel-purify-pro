// Web Worker for pixel processing to keep UI responsive
export interface PixelProcessingTask {
  type: 'COLOR_REMOVAL' | 'EFFECTS' | 'EDGE_CLEANUP' | 'MIN_REGION';
  imageData: ImageData;
  settings: any;
}

export interface PixelProcessingResult {
  success: boolean;
  imageData?: ImageData;
  error?: string;
}

// Helper functions for color processing (copied from MainCanvas)
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // Convert RGB to XYZ
  let x = (r / 255) * 0.04045 < 0.04045 ? (r / 255) / 12.92 : Math.pow(((r / 255) + 0.055) / 1.055, 2.4);
  let y = (g / 255) * 0.04045 < 0.04045 ? (g / 255) / 12.92 : Math.pow(((g / 255) + 0.055) / 1.055, 2.4);
  let z = (b / 255) * 0.04045 < 0.04045 ? (b / 255) / 12.92 : Math.pow(((b / 255) + 0.055) / 1.055, 2.4);

  x = x * 95.047;
  y = y * 100.000;
  z = z * 108.883;

  // Convert XYZ to LAB
  x = x / 95.047;
  y = y / 100.000;
  z = z / 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

  return [(116 * y) - 16, 500 * (x - y), 200 * (y - z)];
}

function calculateColorDistance(r1: number, g1: number, b1: number, r2: number, g2: number, b2: number): number {
  const [l1Lab, a1Lab, b1Lab] = rgbToLab(r1, g1, b1);
  const [l2Lab, a2Lab, b2Lab] = rgbToLab(r2, g2, b2);
  
  const dl = l1Lab - l2Lab;
  const da = a1Lab - a2Lab;
  const db = b1Lab - b2Lab;
  
  return Math.sqrt(dl * dl + da * da + db * db);
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h * 6) % 2 - 1));
  const m = l - c / 2;
  
  let r: number, g: number, b: number;
  
  if (h < 1/6) [r, g, b] = [c, x, 0];
  else if (h < 2/6) [r, g, b] = [x, c, 0];
  else if (h < 3/6) [r, g, b] = [0, c, x];
  else if (h < 4/6) [r, g, b] = [0, x, c];
  else if (h < 5/6) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const diff = max - min;
  const sum = max + min;
  
  let h = 0;
  let s = 0;
  const l = sum / 2;
  
  if (diff !== 0) {
    s = l > 0.5 ? diff / (2 - sum) : diff / sum;
    
    switch (max) {
      case r: h = ((g - b) / diff) + (g < b ? 6 : 0); break;
      case g: h = (b - r) / diff + 2; break;
      case b: h = (r - g) / diff + 4; break;
    }
    h /= 6;
  }
  
  return [h * 360, s, l];
}

// Main processing functions
function processColorRemoval(imageData: ImageData, settings: any): ImageData {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  if (!settings.enabled) return new ImageData(data, width, height);

  if (settings.mode === 'auto') {
    const targetR = data[0];
    const targetG = data[1];
    const targetB = data[2];
    const threshold = settings.threshold * 2.5;

    if (settings.contiguous) {
      // Contiguous removal
      const visited = new Set<string>();
      const stack = [[0, 0]];
      
      const isColorSimilar = (r: number, g: number, b: number) => {
        const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
        return distance <= threshold;
      };
      
      while (stack.length > 0) {
        const [x, y] = stack.pop()!;
        const key = `${x},${y}`;
        
        if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) continue;
        visited.add(key);
        
        const pixelIndex = (y * width + x) * 4;
        const r = data[pixelIndex];
        const g = data[pixelIndex + 1];
        const b = data[pixelIndex + 2];
        
        if (!isColorSimilar(r, g, b)) continue;
        
        data[pixelIndex + 3] = 0;
        stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
      }
    } else {
      // Non-contiguous removal
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
        if (distance <= threshold) {
          data[i + 3] = 0;
        }
      }
    }
  } else {
    // Manual mode
    const colorsToRemove = [];
    
    const hex = settings.targetColor.replace('#', '');
    colorsToRemove.push({
      r: parseInt(hex.substr(0, 2), 16),
      g: parseInt(hex.substr(2, 2), 16),
      b: parseInt(hex.substr(4, 2), 16),
      threshold: settings.threshold
    });
    
    settings.pickedColors.forEach((pickedColor: any) => {
      const pickedHex = pickedColor.color.replace('#', '');
      colorsToRemove.push({
        r: parseInt(pickedHex.substr(0, 2), 16),
        g: parseInt(pickedHex.substr(2, 2), 16),
        b: parseInt(pickedHex.substr(4, 2), 16),
        threshold: pickedColor.threshold
      });
    });

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      for (const targetColor of colorsToRemove) {
        const distance = calculateColorDistance(r, g, b, targetColor.r, targetColor.g, targetColor.b);
        const threshold = targetColor.threshold * 2.5;
        
        if (distance <= threshold) {
          data[i + 3] = 0;
          break;
        }
      }
    }
  }

  return new ImageData(data, width, height);
}

function processMinRegion(imageData: ImageData, settings: any): ImageData {
  if (!settings.enabled || settings.value <= 0) return imageData;

  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  const alphaData = new Uint8ClampedArray(width * height);
  
  // Extract alpha channel
  for (let i = 0; i < data.length; i += 4) {
    alphaData[i / 4] = data[i + 3];
  }
  
  const visited = new Array(width * height).fill(false);
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = y * width + x;
      
      if (!visited[index] && alphaData[index] === 0) {
        const regionPixels: number[] = [];
        const stack = [index];
        
        while (stack.length > 0) {
          const currentIndex = stack.pop()!;
          if (visited[currentIndex]) continue;
          
          const currentX = currentIndex % width;
          const currentY = Math.floor(currentIndex / width);
          
          if (currentX < 0 || currentY < 0 || currentX >= width || currentY >= height) continue;
          if (alphaData[currentIndex] !== 0) continue;
          
          visited[currentIndex] = true;
          regionPixels.push(currentIndex);
          
          if (currentX > 0) stack.push(currentIndex - 1);
          if (currentX < width - 1) stack.push(currentIndex + 1);
          if (currentY > 0) stack.push(currentIndex - width);
          if (currentY < height - 1) stack.push(currentIndex + width);
        }
        
        if (regionPixels.length < settings.value) {
          for (const pixelIndex of regionPixels) {
            data[pixelIndex * 4 + 3] = 255;
          }
        }
      }
    }
  }

  return new ImageData(data, width, height);
}

function processEffects(imageData: ImageData, effects: any): ImageData {
  const data = new Uint8ClampedArray(imageData.data);

  // Apply background color
  if (effects.background && effects.background.enabled) {
    const hex = effects.background.color.replace('#', '');
    const bgR = parseInt(hex.substr(0, 2), 16);
    const bgG = parseInt(hex.substr(2, 2), 16);
    const bgB = parseInt(hex.substr(4, 2), 16);

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) {
        data[i] = bgR;
        data[i + 1] = bgG;
        data[i + 2] = bgB;
        data[i + 3] = 255;
      }
    }
  }

  // Apply ink stamp effect
  if (effects.inkStamp && effects.inkStamp.enabled) {
    const hex = effects.inkStamp.color.replace('#', '');
    const stampR = parseInt(hex.substr(0, 2), 16);
    const stampG = parseInt(hex.substr(2, 2), 16);
    const stampB = parseInt(hex.substr(4, 2), 16);
    const threshold = effects.inkStamp.threshold === 1 ? 255 : (100 - effects.inkStamp.threshold) * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const luminance = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        
        if (luminance < threshold) {
          data[i] = stampR;
          data[i + 1] = stampG;
          data[i + 2] = stampB;
          data[i + 3] = 255;
        } else {
          data[i + 3] = 0;
        }
      }
    }
  }

  // Apply image effects
  if (effects.imageEffects && effects.imageEffects.enabled) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] === 0) continue;
      
      let r = data[i];
      let g = data[i + 1];
      let b = data[i + 2];

      // Brightness
      if (effects.imageEffects.brightness !== 0) {
        const brightness = effects.imageEffects.brightness * 2.55;
        r = Math.max(0, Math.min(255, r + brightness));
        g = Math.max(0, Math.min(255, g + brightness));
        b = Math.max(0, Math.min(255, b + brightness));
      }

      // Contrast
      if (effects.imageEffects.contrast !== 0) {
        const contrast = (effects.imageEffects.contrast + 100) / 100;
        r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
        g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
        b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
      }

      // Vibrance
      if (effects.imageEffects.vibrance !== 0) {
        const max = Math.max(r, g, b);
        const avg = (r + g + b) / 3;
        const amt = ((Math.abs(max - avg) * 2 / 255) * (effects.imageEffects.vibrance / 100));
        
        if (r !== max) r += (max - r) * amt;
        if (g !== max) g += (max - g) * amt;
        if (b !== max) b += (max - b) * amt;
        
        r = Math.max(0, Math.min(255, r));
        g = Math.max(0, Math.min(255, g));
        b = Math.max(0, Math.min(255, b));
      }

      // Hue shift
      if (effects.imageEffects.hue !== 0) {
        const [h, s, l] = rgbToHsl(r, g, b);
        const newHue = (h + effects.imageEffects.hue) % 360;
        [r, g, b] = hslToRgb(newHue, s, l);
      }

      // Colorize
      if (effects.imageEffects.colorize && effects.imageEffects.colorize.enabled) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        const [colorR, colorG, colorB] = hslToRgb(
          effects.imageEffects.colorize.hue,
          effects.imageEffects.colorize.saturation / 100,
          effects.imageEffects.colorize.lightness / 100
        );
        
        const blend = 0.5;
        r = Math.max(0, Math.min(255, gray * (1 - blend) + colorR * blend));
        g = Math.max(0, Math.min(255, gray * (1 - blend) + colorG * blend));
        b = Math.max(0, Math.min(255, gray * (1 - blend) + colorB * blend));
      }

      // Black and white
      if (effects.imageEffects.blackAndWhite) {
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        r = g = b = gray;
      }

      // Invert
      if (effects.imageEffects.invert) {
        r = 255 - r;
        g = 255 - g;
        b = 255 - b;
      }

      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
    }
  }

  return new ImageData(data, imageData.width, imageData.height);
}

// Message handler
self.onmessage = function(e: MessageEvent<PixelProcessingTask>) {
  const { type, imageData, settings } = e.data;
  
  try {
    let result: ImageData;
    
    switch (type) {
      case 'COLOR_REMOVAL':
        result = processColorRemoval(imageData, settings);
        break;
      case 'MIN_REGION':
        result = processMinRegion(imageData, settings);
        break;
      case 'EFFECTS':
        result = processEffects(imageData, settings);
        break;
      default:
        throw new Error(`Unknown processing type: ${type}`);
    }
    
    // Use transferable objects for performance
    self.postMessage({ 
      success: true, 
      imageData: result 
    }, { transfer: [result.data.buffer] });
    
  } catch (error) {
    self.postMessage({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
