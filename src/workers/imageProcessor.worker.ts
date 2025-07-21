// Image processing worker for heavy pixel operations
export interface WorkerMessage {
  type: string;
  payload: any;
  id: string;
}

export interface WorkerResponse {
  type: string;
  payload: any;
  id: string;
  success: boolean;
  error?: string;
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
  
  // Delta E CIE76 formula for perceptual color difference
  return Math.sqrt(dl * dl + da * da + db * db);
};

// Contiguous color removal using flood fill
const removeContiguousColor = (
  imageData: ImageData, 
  startX: number, 
  startY: number, 
  threshold: number
): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  
  // Get target color
  const targetIndex = (startY * width + startX) * 4;
  const targetR = data[targetIndex];
  const targetG = data[targetIndex + 1];
  const targetB = data[targetIndex + 2];
  
  const visited = new Set<string>();
  const stack = [[startX, startY]];
  let pixelsRemoved = 0;
  
  const scaledThreshold = (threshold / 100) * 250; // Scale threshold
  
  while (stack.length > 0) {
    const [x, y] = stack.pop()!;
    const key = `${x},${y}`;
    
    if (visited.has(key) || x < 0 || y < 0 || x >= width || y >= height) {
      continue;
    }
    
    visited.add(key);
    
    const pixelIndex = (y * width + x) * 4;
    const r = data[pixelIndex];
    const g = data[pixelIndex + 1];
    const b = data[pixelIndex + 2];
    const a = data[pixelIndex + 3];
    
    // Skip if already transparent
    if (a === 0) continue;
    
    const distance = calculateColorDistance(r, g, b, targetR, targetG, targetB);
    
    if (distance <= scaledThreshold) {
      // Make pixel transparent
      data[pixelIndex + 3] = 0;
      pixelsRemoved++;
      
      // Add neighbors to stack
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
  }
  
  return new ImageData(data, width, height);
};

// Eraser tool
const applyEraser = (
  imageData: ImageData,
  x: number,
  y: number,
  size: number
): ImageData => {
  const data = new Uint8ClampedArray(imageData.data);
  const width = imageData.width;
  const height = imageData.height;
  const radius = size / 2;
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance <= radius) {
        const pixelX = Math.round(x + dx);
        const pixelY = Math.round(y + dy);
        
        if (pixelX >= 0 && pixelX < width && pixelY >= 0 && pixelY < height) {
          const pixelIndex = (pixelY * width + pixelX) * 4;
          
          // Apply soft edge
          const alpha = Math.max(0, 1 - (distance / radius));
          const currentAlpha = data[pixelIndex + 3];
          data[pixelIndex + 3] = Math.round(currentAlpha * (1 - alpha));
        }
      }
    }
  }
  
  return new ImageData(data, width, height);
};

// Message handler
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, payload, id } = event.data;
  
  try {
    let result: any;
    
    switch (type) {
      case 'REMOVE_CONTIGUOUS_COLOR':
        result = removeContiguousColor(
          payload.imageData,
          payload.x,
          payload.y,
          payload.threshold
        );
        break;
        
      case 'APPLY_ERASER':
        result = applyEraser(
          payload.imageData,
          payload.x,
          payload.y,
          payload.size
        );
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    const response: WorkerResponse = {
      type,
      payload: result,
      id,
      success: true
    };
    
    self.postMessage(response);
    
  } catch (error) {
    const response: WorkerResponse = {
      type,
      payload: null,
      id,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
    
    self.postMessage(response);
  }
};