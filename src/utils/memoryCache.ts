// Memory cache for heavy objects to avoid storing them in React state
// This prevents UI freezing and memory issues when handling large ImageData

export interface ImageDataCache {
  originalData?: ImageData;
  processedData?: ImageData;
  thumbnailBlob?: Blob;
}

class MemoryCache {
  private cache = new Map<string, ImageDataCache>();
  private maxSize = 50; // Maximum number of cached items

  set(id: string, data: Partial<ImageDataCache>) {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const existing = this.cache.get(id) || {};
    this.cache.set(id, { ...existing, ...data });
  }

  get(id: string): ImageDataCache | undefined {
    return this.cache.get(id);
  }

  has(id: string): boolean {
    return this.cache.has(id);
  }

  delete(id: string): boolean {
    return this.cache.delete(id);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get memory usage estimate in MB
  getMemoryUsage(): number {
    let totalBytes = 0;
    for (const cache of this.cache.values()) {
      if (cache.originalData) {
        totalBytes += cache.originalData.data.length;
      }
      if (cache.processedData) {
        totalBytes += cache.processedData.data.length;
      }
    }
    return totalBytes / (1024 * 1024); // Convert to MB
  }

  // Clean up old entries to free memory
  cleanup(keepIds?: string[]): void {
    if (keepIds) {
      // Keep only specified IDs
      for (const [id] of this.cache) {
        if (!keepIds.includes(id)) {
          this.cache.delete(id);
        }
      }
    } else {
      // Remove entries older than current capacity
      const entries = Array.from(this.cache.entries());
      if (entries.length > this.maxSize / 2) {
        const toDelete = entries.slice(0, entries.length - this.maxSize / 2);
        toDelete.forEach(([id]) => this.cache.delete(id));
      }
    }
  }
}

// Singleton instance
export const memoryCache = new MemoryCache();

// Helper functions for common operations
export const setImageData = (id: string, originalData?: ImageData, processedData?: ImageData) => {
  memoryCache.set(id, { originalData, processedData });
};

export const getImageData = (id: string) => {
  return memoryCache.get(id);
};

export const clearImageData = (id: string) => {
  memoryCache.delete(id);
};

export const getMemoryStats = () => {
  return {
    usage: memoryCache.getMemoryUsage(),
    entries: Array.from(memoryCache['cache'].keys()).length
  };
};
