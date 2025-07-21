import { useCallback, useRef, useMemo } from 'react';
import { debounce } from '../utils/performance';
import type { PixelProcessingTask, PixelProcessingResult } from '../workers/pixelProcessor.worker';

export interface ProcessingSettings {
  colorRemoval: any;
  effects: any;
  minRegionSize: any;
  speckleSettings: any;
  edgeCleanupSettings: any;
}

// Fast checksum for ImageData to detect changes
function quickImageDataChecksum(imageData: ImageData): string {
  const data = imageData.data;
  const step = Math.max(1, Math.floor(data.length / 1000)); // Sample ~1000 pixels
  let checksum = 0;
  
  for (let i = 0; i < data.length; i += step) {
    checksum = (checksum + data[i] + data[i + 1] + data[i + 2] + data[i + 3]) | 0;
  }
  
  return `${imageData.width}x${imageData.height}:${checksum}`;
}

export const usePixelProcessor = () => {
  const workerRef = useRef<Worker | null>(null);
  const lastChecksumRef = useRef<string>('');
  const lastSettingsRef = useRef<string>('');
  
  // Initialize worker
  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/pixelProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
    }
    return workerRef.current;
  }, []);

  // Process image data with worker
  const processWithWorker = useCallback((
    task: PixelProcessingTask
  ): Promise<ImageData> => {
    return new Promise((resolve, reject) => {
      const worker = getWorker();
      
      const handleMessage = (e: MessageEvent<PixelProcessingResult>) => {
        worker.removeEventListener('message', handleMessage);
        
        if (e.data.success && e.data.imageData) {
          resolve(e.data.imageData);
        } else {
          reject(new Error(e.data.error || 'Processing failed'));
        }
      };
      
      worker.addEventListener('message', handleMessage);
      worker.postMessage(task, [task.imageData.data.buffer]);
    });
  }, [getWorker]);

  // Debounced processing function
  const debouncedProcess = useMemo(
    () => debounce(async (
      imageData: ImageData,
      settings: ProcessingSettings,
      onComplete: (result: ImageData) => void,
      onError: (error: Error) => void
    ) => {
      try {
        // Quick change detection
        const currentChecksum = quickImageDataChecksum(imageData);
        const settingsChecksum = JSON.stringify(settings);
        
        if (currentChecksum === lastChecksumRef.current && 
            settingsChecksum === lastSettingsRef.current) {
          console.log('Skipping processing - no changes detected');
          return;
        }
        
        lastChecksumRef.current = currentChecksum;
        lastSettingsRef.current = settingsChecksum;

        let processedData = imageData;
        
        // Step 1: Color removal
        if (settings.colorRemoval.enabled) {
          processedData = await processWithWorker({
            type: 'COLOR_REMOVAL',
            imageData: processedData,
            settings: settings.colorRemoval
          });
        }
        
        // Step 2: Min region size
        if (settings.minRegionSize.enabled) {
          processedData = await processWithWorker({
            type: 'MIN_REGION',
            imageData: processedData,
            settings: settings.minRegionSize
          });
        }
        
        // Step 3: Effects
        if (settings.effects) {
          processedData = await processWithWorker({
            type: 'EFFECTS',
            imageData: processedData,
            settings: settings.effects
          });
        }
        
        onComplete(processedData);
        
      } catch (error) {
        onError(error instanceof Error ? error : new Error('Processing failed'));
      }
    }, 50), // 50ms debounce
    [processWithWorker]
  );

  // Main processing function
  const processImageData = useCallback((
    imageData: ImageData,
    settings: ProcessingSettings,
    onComplete: (result: ImageData) => void,
    onError: (error: Error) => void
  ) => {
    debouncedProcess(imageData, settings, onComplete, onError);
  }, [debouncedProcess]);

  // Cleanup
  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return {
    processImageData,
    cleanup
  };
};