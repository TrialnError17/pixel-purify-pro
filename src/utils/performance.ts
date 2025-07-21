// Performance optimization utilities

// Debounce function for expensive operations
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) & { cancel: () => void } => {
  let timeout: NodeJS.Timeout;
  
  const debouncedFn = (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
  
  debouncedFn.cancel = () => {
    clearTimeout(timeout);
  };
  
  return debouncedFn;
};

// Throttle function for high-frequency operations
export const throttle = <T extends (...args: any[]) => any>(
  func: T,
  limit: number
): ((...args: Parameters<T>) => void) => {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Batch image data operations for better performance
export const batchProcessPixels = (
  data: Uint8ClampedArray,
  processor: (r: number, g: number, b: number, a: number, index: number) => [number, number, number, number] | null,
  batchSize: number = 1000
): void => {
  for (let start = 0; start < data.length; start += batchSize * 4) {
    const end = Math.min(start + batchSize * 4, data.length);
    
    for (let i = start; i < end; i += 4) {
      const result = processor(data[i], data[i + 1], data[i + 2], data[i + 3], i);
      if (result) {
        data[i] = result[0];
        data[i + 1] = result[1];
        data[i + 2] = result[2];
        data[i + 3] = result[3];
      }
    }
    
    // Allow other operations to run between batches
    if (start + batchSize * 4 < data.length) {
      setTimeout(() => {}, 0);
    }
  }
};

// Memory-efficient image data comparison
export const areImageDataEqual = (data1: ImageData, data2: ImageData): boolean => {
  if (data1.width !== data2.width || data1.height !== data2.height) {
    return false;
  }
  
  // Quick sample comparison first
  const sampleSize = Math.min(1000, data1.data.length / 4);
  const step = Math.floor(data1.data.length / sampleSize);
  
  for (let i = 0; i < data1.data.length; i += step) {
    if (data1.data[i] !== data2.data[i] ||
        data1.data[i + 1] !== data2.data[i + 1] ||
        data1.data[i + 2] !== data2.data[i + 2] ||
        data1.data[i + 3] !== data2.data[i + 3]) {
      return false;
    }
  }
  
  return true;
};