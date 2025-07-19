import { useState, useEffect, RefObject } from 'react';

export const useZoom = (
  currentImage: HTMLImageElement | null,
  containerRef: RefObject<HTMLDivElement>
) => {
  const [zoom, setZoom] = useState(1);
  const [centerOffset, setCenterOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (currentImage && containerRef.current) {
      const container = containerRef.current;
      const containerRect = container.getBoundingClientRect();
      
      // Calculate center offset to center the image
      const centerX = (containerRect.width - currentImage.width) / 2;
      const centerY = (containerRect.height - currentImage.height) / 2;
      
      setCenterOffset({ x: centerX, y: centerY });
    }
  }, [currentImage, containerRef]);

  return {
    zoom,
    setZoom,
    centerOffset
  };
};