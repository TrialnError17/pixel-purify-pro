
export interface MagicWandOptions {
  threshold: number;
  onProgress?: (progress: number) => void;
  onCancel?: () => boolean;
}

interface Point {
  x: number;
  y: number;
}

interface Span {
  y: number;
  x1: number;
  x2: number;
}

class VisitedMap {
  private visited: Uint8Array;
  private width: number;
  private height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.visited = new Uint8Array(width * height);
  }

  isVisited(x: number, y: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) return true;
    return this.visited[y * this.width + x] === 1;
  }

  setVisited(x: number, y: number): void {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.visited[y * this.width + x] = 1;
    }
  }
}

function getPixelIndex(x: number, y: number, width: number): number {
  return (y * width + x) * 4;
}

function getColorDistance(
  r1: number, g1: number, b1: number, a1: number,
  r2: number, g2: number, b2: number, a2: number
): number {
  const dr = r1 - r2;
  const dg = g1 - g2;
  const db = b1 - b2;
  const da = a1 - a2;
  return Math.sqrt(dr * dr + dg * dg + db * db + da * da);
}

function isColorSimilar(
  data: Uint8ClampedArray,
  index1: number,
  index2: number,
  threshold: number
): boolean {
  const r1 = data[index1];
  const g1 = data[index1 + 1];
  const b1 = data[index1 + 2];
  const a1 = data[index1 + 3];

  const r2 = data[index2];
  const g2 = data[index2 + 1];
  const b2 = data[index2 + 2];
  const a2 = data[index2 + 3];

  const distance = getColorDistance(r1, g1, b1, a1, r2, g2, b2, a2);
  return distance <= threshold * 255;
}

export async function optimizedMagicWandSelect(
  imageData: ImageData,
  startX: number,
  startY: number,
  options: MagicWandOptions
): Promise<Set<string>> {
  const { threshold, onProgress, onCancel } = options;
  const { data, width, height } = imageData;
  
  console.log('Starting optimized magic wand selection...');
  
  const selectedPixels = new Set<string>();
  const visitedMap = new VisitedMap(width, height);
  const spanStack: Span[] = [];
  
  // Get the starting pixel color
  const startIndex = getPixelIndex(startX, startY, width);
  if (startIndex < 0 || startIndex >= data.length) {
    console.warn('Starting point is outside image bounds');
    return selectedPixels;
  }

  const targetR = data[startIndex];
  const targetG = data[startIndex + 1];
  const targetB = data[startIndex + 2];
  const targetA = data[startIndex + 3];

  console.log(`Target color: R=${targetR}, G=${targetG}, B=${targetB}, A=${targetA}`);

  // Find the initial span
  const initialSpan = findHorizontalSpan(data, width, height, startX, startY, targetR, targetG, targetB, targetA, threshold, visitedMap);
  if (initialSpan) {
    spanStack.push(initialSpan);
    markSpanAsSelected(initialSpan, selectedPixels, visitedMap);
  }

  let processedSpans = 0;
  const totalEstimatedSpans = Math.min(width * height / 10, 50000); // Rough estimate

  while (spanStack.length > 0) {
    // Check for cancellation
    if (onCancel && onCancel()) {
      console.log('Magic wand operation cancelled');
      break;
    }

    const span = spanStack.pop()!;
    
    // Check lines above and below the current span
    const linesToCheck = [span.y - 1, span.y + 1];
    
    for (const y of linesToCheck) {
      if (y < 0 || y >= height) continue;
      
      // Find all spans on this line that connect to the current span
      const connectedSpans = findConnectedSpans(
        data, width, height, span.x1, span.x2, y,
        targetR, targetG, targetB, targetA, threshold, visitedMap
      );
      
      for (const connectedSpan of connectedSpans) {
        spanStack.push(connectedSpan);
        markSpanAsSelected(connectedSpan, selectedPixels, visitedMap);
      }
    }

    processedSpans++;
    
    // Report progress periodically and yield control for large operations
    if (processedSpans % 100 === 0) {
      if (onProgress) {
        const progress = Math.min(processedSpans / totalEstimatedSpans, 0.95);
        onProgress(progress);
      }
      
      // Yield control to prevent blocking the UI
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }

  if (onProgress) {
    onProgress(1.0);
  }

  console.log(`Magic wand selection complete. Selected ${selectedPixels.size} pixels.`);
  return selectedPixels;
}

function findHorizontalSpan(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  startX: number,
  y: number,
  targetR: number,
  targetG: number,
  targetB: number,
  targetA: number,
  threshold: number,
  visitedMap: VisitedMap
): Span | null {
  if (y < 0 || y >= height || visitedMap.isVisited(startX, y)) {
    return null;
  }

  const startIndex = getPixelIndex(startX, y, width);
  if (!isColorSimilar(data, startIndex, getPixelIndex(startX, y, width), threshold)) {
    // Create a temporary array with target color for comparison
    const tempData = new Uint8ClampedArray([targetR, targetG, targetB, targetA]);
    const tempIndex = 0;
    const currentIndex = getPixelIndex(startX, y, width);
    
    if (!isColorSimilarDirect(data, currentIndex, tempData, tempIndex, threshold)) {
      return null;
    }
  }

  // Find the leftmost boundary
  let x1 = startX;
  while (x1 > 0) {
    const leftIndex = getPixelIndex(x1 - 1, y, width);
    if (visitedMap.isVisited(x1 - 1, y) || !isColorSimilarToTarget(data, leftIndex, targetR, targetG, targetB, targetA, threshold)) {
      break;
    }
    x1--;
  }

  // Find the rightmost boundary
  let x2 = startX;
  while (x2 < width - 1) {
    const rightIndex = getPixelIndex(x2 + 1, y, width);
    if (visitedMap.isVisited(x2 + 1, y) || !isColorSimilarToTarget(data, rightIndex, targetR, targetG, targetB, targetA, threshold)) {
      break;
    }
    x2++;
  }

  return { y, x1, x2 };
}

function isColorSimilarDirect(
  data1: Uint8ClampedArray,
  index1: number,
  data2: Uint8ClampedArray,
  index2: number,
  threshold: number
): boolean {
  const r1 = data1[index1];
  const g1 = data1[index1 + 1];
  const b1 = data1[index1 + 2];
  const a1 = data1[index1 + 3];

  const r2 = data2[index2];
  const g2 = data2[index2 + 1];
  const b2 = data2[index2 + 2];
  const a2 = data2[index2 + 3];

  const distance = getColorDistance(r1, g1, b1, a1, r2, g2, b2, a2);
  return distance <= threshold * 255;
}

function isColorSimilarToTarget(
  data: Uint8ClampedArray,
  index: number,
  targetR: number,
  targetG: number,
  targetB: number,
  targetA: number,
  threshold: number
): boolean {
  const r = data[index];
  const g = data[index + 1];
  const b = data[index + 2];
  const a = data[index + 3];

  const distance = getColorDistance(r, g, b, a, targetR, targetG, targetB, targetA);
  return distance <= threshold * 255;
}

function findConnectedSpans(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x1: number,
  x2: number,
  y: number,
  targetR: number,
  targetG: number,
  targetB: number,
  targetA: number,
  threshold: number,
  visitedMap: VisitedMap
): Span[] {
  const spans: Span[] = [];
  let currentX = x1;

  while (currentX <= x2) {
    // Skip visited pixels
    while (currentX <= x2 && visitedMap.isVisited(currentX, y)) {
      currentX++;
    }
    
    if (currentX > x2) break;

    // Check if this pixel matches
    const pixelIndex = getPixelIndex(currentX, y, width);
    if (!isColorSimilarToTarget(data, pixelIndex, targetR, targetG, targetB, targetA, threshold)) {
      currentX++;
      continue;
    }

    // Find the span starting from currentX
    const span = findHorizontalSpan(data, width, height, currentX, y, targetR, targetG, targetB, targetA, threshold, visitedMap);
    if (span) {
      spans.push(span);
      currentX = span.x2 + 1;
    } else {
      currentX++;
    }
  }

  return spans;
}

function markSpanAsSelected(span: Span, selectedPixels: Set<string>, visitedMap: VisitedMap): void {
  for (let x = span.x1; x <= span.x2; x++) {
    visitedMap.setVisited(x, span.y);
    selectedPixels.add(`${x},${span.y}`);
  }
}
