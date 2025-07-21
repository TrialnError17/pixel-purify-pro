import { useCallback, useRef } from 'react';
import { WorkerMessage, WorkerResponse } from '../workers/imageProcessor.worker';

export const useImageWorker = () => {
  const workerRef = useRef<Worker | null>(null);
  const pendingOperations = useRef<Map<string, {
    resolve: (result: any) => void;
    reject: (error: Error) => void;
  }>>(new Map());

  const initWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../workers/imageProcessor.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { id, success, payload, error } = event.data;
        const operation = pendingOperations.current.get(id);
        
        if (operation) {
          pendingOperations.current.delete(id);
          
          if (success) {
            operation.resolve(payload);
          } else {
            operation.reject(new Error(error || 'Worker operation failed'));
          }
        }
      };
      
      workerRef.current.onerror = (error) => {
        console.error('Worker error:', error);
        // Reject all pending operations
        pendingOperations.current.forEach(({ reject }) => {
          reject(new Error('Worker crashed'));
        });
        pendingOperations.current.clear();
      };
    }
  }, []);

  const postMessage = useCallback(<T>(type: string, payload: any): Promise<T> => {
    return new Promise((resolve, reject) => {
      initWorker();
      
      if (!workerRef.current) {
        reject(new Error('Failed to initialize worker'));
        return;
      }
      
      const id = crypto.randomUUID();
      pendingOperations.current.set(id, { resolve, reject });
      
      const message: WorkerMessage = { type, payload, id };
      workerRef.current.postMessage(message);
      
      // Timeout after 30 seconds
      setTimeout(() => {
        if (pendingOperations.current.has(id)) {
          pendingOperations.current.delete(id);
          reject(new Error('Worker operation timed out'));
        }
      }, 30000);
    });
  }, [initWorker]);

  const removeContiguousColor = useCallback(
    (imageData: ImageData, x: number, y: number, threshold: number): Promise<ImageData> => {
      return postMessage('REMOVE_CONTIGUOUS_COLOR', { imageData, x, y, threshold });
    },
    [postMessage]
  );

  const applyEraser = useCallback(
    (imageData: ImageData, x: number, y: number, size: number): Promise<ImageData> => {
      return postMessage('APPLY_ERASER', { imageData, x, y, size });
    },
    [postMessage]
  );

  const cleanup = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    pendingOperations.current.clear();
  }, []);

  return {
    removeContiguousColor,
    applyEraser,
    cleanup
  };
};