// Web Worker for heavy image processing operations
// This offloads pixel-intensive operations from the main thread

export interface WorkerMessage {
  type: 'processImage' | 'applyEffects' | 'downloadEffects';
  data: {
    imageData: ImageData;
    settings?: any;
    effectSettings?: any;
    backgroundColor?: string;
    inkStamp?: boolean;
  };
  id: string;
}

export interface WorkerResponse {
  type: 'success' | 'error';
  data: ImageData | null;
  error?: string;
  id: string;
}

// Color space conversion utilities
const rgbToLab = (r: number, g: number, b: number): [number, number, number] => {
  // Convert RGB to XYZ
  let x = r / 255;
  let y = g / 255;
  let z = b / 255;

  x = x > 0.04045 ? Math.pow((x + 0.055) / 1.055, 2.4) : x / 12.92;
  y = y > 0.04045 ? Math.pow((y + 0.055) / 1.055, 2.4) : y / 12.92;
  z = z > 0.04045 ? Math.pow((z + 0.055) / 1.055, 2.4) : z / 12.92;

  x *= 100;
  y *= 100;
  z *= 100;

  // Observer = 2°, Illuminant = D65
  x = x / 95.047;
  y = y / 100.000;
  z = z / 108.883;

  x = x > 0.008856 ? Math.pow(x, 1/3) : (7.787 * x) + (16/116);
  y = y > 0.008856 ? Math.pow(y, 1/3) : (7.787 * y) + (16/116);
  z = z > 0.008856 ? Math.pow(z, 1/3) : (7.787 * z) + (16/116);

  const L = (116 * y) - 16;
  const A = 500 * (x - y);
  const B = 200 * (y - z);

  return [L, A, B];
};

const calculateColorDistance = (
  r1: number, g1: number, b1: number, 
  r2: number, g2: number, b2: number
): number => {
  const [l1, a1, b1Lab] = rgbToLab(r1, g1, b1);
  const [l2, a2, b2Lab] = rgbToLab(r2, g2, b2);
  
  const dl = l1 - l2;
  const da = a1 - a2;
  const db = b1Lab - b2Lab;
  
  return Math.sqrt(dl * dl + da * da + db * db);
};

// Heavy processing functions moved from main thread
const applyDownloadEffects = (imageData: ImageData, settings: any): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  // Apply background color if specified
  if (settings.backgroundColor && settings.backgroundColor !== 'transparent') {
    const hex = settings.backgroundColor.replace('#', '');
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

  // Apply ink stamp effect if enabled
  if (settings.inkStamp) {
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3] > 0) {
        const gray = Math.round(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]);
        const threshold = 128;
        const isBlack = gray < threshold;
        
        data[i] = isBlack ? 0 : 255;
        data[i + 1] = isBlack ? 0 : 255;
        data[i + 2] = isBlack ? 0 : 255;
      }
    }
  }

  return new ImageData(data, width, height);
};

const applyImageEffects = (imageData: ImageData, settings: any): ImageData => {
  if (!settings.imageEffects.enabled) return imageData;
  
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue; // Skip transparent pixels
    
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Apply brightness
    if (settings.imageEffects.brightness !== 0) {
      const brightness = settings.imageEffects.brightness * 2.55;
      r = Math.max(0, Math.min(255, r + brightness));
      g = Math.max(0, Math.min(255, g + brightness));
      b = Math.max(0, Math.min(255, b + brightness));
    }

    // Apply contrast
    if (settings.imageEffects.contrast !== 0) {
      const contrast = (settings.imageEffects.contrast + 100) / 100;
      r = Math.max(0, Math.min(255, ((r - 128) * contrast) + 128));
      g = Math.max(0, Math.min(255, ((g - 128) * contrast) + 128));
      b = Math.max(0, Math.min(255, ((b - 128) * contrast) + 128));
    }

    data[i] = Math.round(r);
    data[i + 1] = Math.round(g);
    data[i + 2] = Math.round(b);
  }

  return new ImageData(data, width, height);
};

const processColorRemoval = (imageData: ImageData, settings: any): ImageData => {
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
      // Contiguous removal with flood fill
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
    let colorsToRemove = [];
    
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
};

// Main message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, data, id } = event.data;
  
  try {
    let result: ImageData;
    
    switch (type) {
      case 'processImage':
        result = processColorRemoval(data.imageData, data.settings);
        break;
      case 'applyEffects':
        result = applyImageEffects(data.imageData, data.effectSettings);
        break;
      case 'downloadEffects':
        result = applyDownloadEffects(data.imageData, data.settings);
        break;
      default:
        throw new Error(`Unknown worker task type: ${type}`);
    }
    
    self.postMessage({
      type: 'success',
      data: result,
      id
    } as WorkerResponse);
  } catch (error) {
    self.postMessage({
      type: 'error',
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      id
    } as WorkerResponse);
  }
};