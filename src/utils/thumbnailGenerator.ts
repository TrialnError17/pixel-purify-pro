// Utility for generating lightweight thumbnails for image queue display
// This prevents memory issues from storing full-size images in the UI

const THUMBNAIL_SIZE = 64; // 64x64px thumbnails

export const generateThumbnail = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    
    img.onload = () => {
      try {
        // Create canvas for thumbnail
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject(new Error('Cannot get canvas context'));
          return;
        }
        
        // Calculate thumbnail dimensions maintaining aspect ratio
        const { width, height } = calculateThumbnailSize(
          img.naturalWidth, 
          img.naturalHeight, 
          THUMBNAIL_SIZE
        );
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw resized image
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to data URL
        const thumbnailUrl = canvas.toDataURL('image/jpeg', 0.8);
        
        // Clean up
        URL.revokeObjectURL(img.src);
        
        resolve(thumbnailUrl);
      } catch (error) {
        URL.revokeObjectURL(img.src);
        reject(error);
      }
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image for thumbnail'));
    };
    
    img.src = URL.createObjectURL(file);
  });
};

const calculateThumbnailSize = (
  originalWidth: number, 
  originalHeight: number, 
  maxSize: number
): { width: number; height: number } => {
  if (originalWidth <= maxSize && originalHeight <= maxSize) {
    return { width: originalWidth, height: originalHeight };
  }
  
  const aspectRatio = originalWidth / originalHeight;
  
  if (originalWidth > originalHeight) {
    return {
      width: maxSize,
      height: Math.round(maxSize / aspectRatio)
    };
  } else {
    return {
      width: Math.round(maxSize * aspectRatio),
      height: maxSize
    };
  }
};