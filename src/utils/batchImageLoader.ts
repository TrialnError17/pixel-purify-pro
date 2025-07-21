
export interface BatchImageResult {
  id: string;
  file: File;
  name: string;
  status: 'pending' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export const loadImagesBatch = async (
  files: File[],
  onProgress?: (results: BatchImageResult[]) => void
): Promise<BatchImageResult[]> => {
  const results: BatchImageResult[] = files.map(file => ({
    id: crypto.randomUUID(),
    file,
    name: file.name,
    status: 'pending' as const,
    progress: 0,
  }));

  // Initial progress update
  onProgress?.(results);

  // Load all images in parallel
  const loadPromises = results.map(async (result, index) => {
    try {
      // Simulate loading for progress feedback
      result.progress = 50;
      onProgress?.(results);
      
      // Validate file type
      if (!result.file.type.startsWith('image/')) {
        throw new Error('Invalid file type');
      }
      
      // Complete loading
      result.status = 'completed';
      result.progress = 100;
      
      return result;
    } catch (error) {
      result.status = 'error';
      result.error = error instanceof Error ? error.message : 'Unknown error';
      result.progress = 0;
      return result;
    }
  });

  // Wait for all images to load
  await Promise.all(loadPromises);
  
  // Final progress update
  onProgress?.(results);
  
  return results;
};
