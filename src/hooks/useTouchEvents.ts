import { useCallback } from 'react';

export const useTouchEvents = (
  onTouchStart: (e: React.MouseEvent | MouseEvent | TouchEvent) => void,
  onTouchMove: (e: React.MouseEvent | MouseEvent | TouchEvent) => void,
  onTouchEnd: (e: React.MouseEvent | MouseEvent | TouchEvent) => void
) => {
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        buttons: 1
      });
      onTouchStart(mouseEvent);
    }
  }, [onTouchStart]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY,
        buttons: 1
      });
      onTouchMove(mouseEvent);
    }
  }, [onTouchMove]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const mouseEvent = new MouseEvent('mouseup', {
      clientX: 0,
      clientY: 0,
      buttons: 0
    });
    onTouchEnd(mouseEvent);
  }, [onTouchEnd]);

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd
  };
};