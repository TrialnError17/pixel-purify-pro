// Image optimization utilities for fast loading and display

const MAX_DISPLAY_SIZE = 1200; // Maximum dimension for display
const QUALITY_RATIO = 0.8; // JPEG quality for optimized images

// Create optimized version of image for fast display
export const createOptimizedImage = async (file: File): Promise<{ 
  optimizedFile: File; 
  originalDimensions: { width: number; height: number };
  wasOptimized: boolean;
}> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { naturalWidth: width, naturalHeight: height } = img;
      
      // Check if optimization is needed
      const needsOptimization = width > MAX_DISPLAY_SIZE || height > MAX_DISPLAY_SIZE;
      
      if (!needsOptimization) {
        resolve({ 
          optimizedFile: file, 
          originalDimensions: { width, height },
          wasOptimized: false 
        });
        return;
      }

      // Calculate new dimensions maintaining aspect ratio
      let newWidth = width;
      let newHeight = height;
      
      if (width > height) {
        newWidth = MAX_DISPLAY_SIZE;
        newHeight = Math.round((height * MAX_DISPLAY_SIZE) / width);
      } else {
        newHeight = MAX_DISPLAY_SIZE;
        newWidth = Math.round((width * MAX_DISPLAY_SIZE) / height);
      }

      // Create canvas for resizing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = newWidth;
      canvas.height = newHeight;
      
      // Use better image smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      
      // Draw resized image
      ctx.drawImage(img, 0, 0, newWidth, newHeight);
      
      // Convert to optimized blob
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Failed to create optimized image'));
            return;
          }
          
          // Create new file with optimized data
          const optimizedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: file.lastModified,
          });
          
          resolve({ 
            optimizedFile, 
            originalDimensions: { width, height },
            wasOptimized: true 
          });
        },
        'image/jpeg',
        QUALITY_RATIO
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

// Create thumbnail for queue display
export const createThumbnail = async (file: File, size: number = 100): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = size;
      canvas.height = size;
      
      // Calculate crop area (center crop)
      const { naturalWidth: width, naturalHeight: height } = img;
      const aspectRatio = width / height;
      
      let sourceX = 0, sourceY = 0, sourceWidth = width, sourceHeight = height;
      
      if (aspectRatio > 1) {
        // Landscape: crop width
        sourceWidth = height;
        sourceX = (width - height) / 2;
      } else {
        // Portrait: crop height
        sourceHeight = width;
        sourceY = (height - width) / 2;
      }
      
      ctx.drawImage(
        img,
        sourceX, sourceY, sourceWidth, sourceHeight,
        0, 0, size, size
      );
      
      resolve(canvas.toDataURL('image/jpeg', 0.7));
    };
    
    img.onerror = () => reject(new Error('Failed to create thumbnail'));
    img.src = URL.createObjectURL(file);
  });
};

// Preload image data for processing
export const preloadImageData = async (file: File): Promise<ImageData> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      ctx.drawImage(img, 0, 0);
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(imageData);
      } catch (error) {
        reject(error);
      }
    };
    
    img.onerror = () => reject(new Error('Failed to preload image data'));
    img.src = URL.createObjectURL(file);
  });
};