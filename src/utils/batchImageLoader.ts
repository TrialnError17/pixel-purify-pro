
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

  // Load all images in parallel with actual validation
  const loadPromises = results.map(async (result) => {
    try {
      // Validate file type immediately
      if (!result.file.type.startsWith('image/')) {
        throw new Error('Invalid file type');
      }
      
      // Validate that file can be loaded as image
      await new Promise<void>((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          result.status = 'completed';
          result.progress = 100;
          resolve();
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(result.file);
      });
      
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
