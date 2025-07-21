
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

  // Process images in small batches to prevent UI freezing
  const BATCH_SIZE = 3; // Process 3 images at a time
  const BATCH_DELAY = 10; // 10ms delay between batches
  
  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    
    // Process current batch in parallel
    const batchPromises = batch.map(async (result) => {
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
            // Important: free memory immediately after validation
            URL.revokeObjectURL(img.src);
            resolve();
          };
          img.onerror = () => {
            URL.revokeObjectURL(img.src);
            reject(new Error('Failed to load image'));
          };
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

    // Wait for current batch to complete
    await Promise.all(batchPromises);
    
    // Update progress after each batch
    onProgress?.(results);
    
    // Small delay to prevent UI blocking (except for last batch)
    if (i + BATCH_SIZE < results.length) {
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
    }
  }
  
  return results;
};
