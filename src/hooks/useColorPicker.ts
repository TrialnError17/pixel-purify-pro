import { useCallback, RefObject } from 'react';

export const useColorPicker = (
  canvasRef: RefObject<HTMLCanvasElement>,
  currentImage: HTMLImageElement | null
) => {
  const handleColorSelection = useCallback((e: React.MouseEvent) => {
    if (!canvasRef.current || !currentImage) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(x, y, 1, 1);
    const data = imageData.data;
    
    const color = `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
    console.log('Picked color:', color);
    
    // You can emit this color to a parent component or store it
  }, [canvasRef, currentImage]);

  return {
    handleColorSelection
  };
};