
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// File validation constants
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes
export const MAX_DIMENSION = 4000; // 4000px
export const MIN_DIMENSION = 10; // minimum 10px
export const SUPPORTED_FORMATS = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];

// File validation utilities
export function validateFileSize(file: File): boolean {
  return file.size <= MAX_FILE_SIZE;
}

export function validateFileType(file: File): boolean {
  return SUPPORTED_FORMATS.includes(file.type.toLowerCase());
}

export function validateImageDimensions(file: File): Promise<{ valid: boolean, width?: number, height?: number, error?: string }> {
  return new Promise((resolve) => {
    const img = new Image();
    
    img.onload = () => {
      const width = img.naturalWidth;
      const height = img.naturalHeight;
      
      if (width < MIN_DIMENSION || height < MIN_DIMENSION) {
        resolve({ 
          valid: false, 
          width, 
          height, 
          error: `Image too small: ${width}x${height}. Minimum: ${MIN_DIMENSION}x${MIN_DIMENSION}` 
        });
      } else if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
        resolve({ 
          valid: false, 
          width, 
          height, 
          error: `Image too large: ${width}x${height}. Maximum: ${MAX_DIMENSION}x${MAX_DIMENSION}` 
        });
      } else {
        resolve({ valid: true, width, height });
      }
    };
    
    img.onerror = () => {
      resolve({ 
        valid: false, 
        error: 'Failed to load image. File may be corrupted.' 
      });
    };
    
    img.src = URL.createObjectURL(file);
  });
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
