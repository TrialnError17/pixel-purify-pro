import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import Konva from 'konva';

export type Tool = 
  | 'pan' 
  | 'magic-wand' 
  | 'eraser' 
  | 'eyedropper';

export interface CanvasState {
  // Canvas references
  stageRef: React.RefObject<Konva.Stage> | null;
  layerRef: React.RefObject<Konva.Layer> | null;
  
  // Current state
  tool: Tool;
  isProcessing: boolean;
  
  // Image state
  currentImage: HTMLImageElement | null;
  originalImageData: ImageData | null;
  currentImageData: ImageData | null;
  hasManualEdits: boolean;
  
  // Transform state
  scale: number;
  position: { x: number; y: number };
  
  // Tool settings
  magicWandThreshold: number;
  eraserSize: number;
  
  // UI state
  showGrid: boolean;
  showRulers: boolean;
  
  // Cursor state
  cursorPosition: { x: number; y: number } | null;
  cursorPreview: boolean;
}

export interface CanvasActions {
  // Canvas setup
  setStageRef: (ref: React.RefObject<Konva.Stage>) => void;
  setLayerRef: (ref: React.RefObject<Konva.Layer>) => void;
  
  // Tool management
  setTool: (tool: Tool) => void;
  setProcessing: (processing: boolean) => void;
  
  // Image management
  setCurrentImage: (image: HTMLImageElement | null) => void;
  setOriginalImageData: (imageData: ImageData | null) => void;
  setCurrentImageData: (imageData: ImageData | null) => void;
  setHasManualEdits: (hasEdits: boolean) => void;
  
  // Transform management
  setScale: (scale: number) => void;
  setPosition: (position: { x: number; y: number }) => void;
  resetTransform: () => void;
  fitToView: () => void;
  
  // Tool settings
  setMagicWandThreshold: (threshold: number) => void;
  setEraserSize: (size: number) => void;
  
  // UI state
  setShowGrid: (show: boolean) => void;
  setShowRulers: (show: boolean) => void;
  
  // Cursor management
  setCursorPosition: (position: { x: number; y: number } | null) => void;
  setCursorPreview: (preview: boolean) => void;
  
  // Reset
  reset: () => void;
}

export type CanvasStore = CanvasState & CanvasActions;

const initialState: CanvasState = {
  stageRef: null,
  layerRef: null,
  tool: 'pan',
  isProcessing: false,
  currentImage: null,
  originalImageData: null,
  currentImageData: null,
  hasManualEdits: false,
  scale: 1,
  position: { x: 0, y: 0 },
  magicWandThreshold: 30,
  eraserSize: 20,
  showGrid: false,
  showRulers: false,
  cursorPosition: null,
  cursorPreview: true,
};

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,
    
    // Canvas setup
    setStageRef: (ref) => set({ stageRef: ref }),
    setLayerRef: (ref) => set({ layerRef: ref }),
    
    // Tool management
    setTool: (tool) => set({ tool }),
    setProcessing: (processing) => set({ isProcessing: processing }),
    
    // Image management
    setCurrentImage: (image) => set({ currentImage: image }),
    setOriginalImageData: (imageData) => set({ originalImageData: imageData }),
    setCurrentImageData: (imageData) => set({ currentImageData: imageData }),
    setHasManualEdits: (hasEdits) => set({ hasManualEdits: hasEdits }),
    
    // Transform management
    setScale: (scale) => set({ scale: Math.max(0.1, Math.min(10, scale)) }),
    setPosition: (position) => set({ position }),
    resetTransform: () => set({ scale: 1, position: { x: 0, y: 0 } }),
    fitToView: () => {
      const { stageRef, currentImage } = get();
      if (!stageRef?.current || !currentImage) return;
      
      const stage = stageRef.current;
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      const padding = 50;
      const availableWidth = stageWidth - padding * 2;
      const availableHeight = stageHeight - padding * 2;
      
      const scaleX = availableWidth / currentImage.width;
      const scaleY = availableHeight / currentImage.height;
      const optimalScale = Math.min(scaleX, scaleY);
      
      const centerX = (stageWidth - currentImage.width * optimalScale) / 2;
      const centerY = (stageHeight - currentImage.height * optimalScale) / 2;
      
      set({ 
        scale: optimalScale,
        position: { x: centerX, y: centerY }
      });
    },
    
    // Tool settings
    setMagicWandThreshold: (threshold) => set({ magicWandThreshold: threshold }),
    setEraserSize: (size) => set({ eraserSize: size }),
    
    // UI state
    setShowGrid: (show) => set({ showGrid: show }),
    setShowRulers: (show) => set({ showRulers: show }),
    
    // Cursor management
    setCursorPosition: (position) => set({ cursorPosition: position }),
    setCursorPreview: (preview) => set({ cursorPreview: preview }),
    
    // Reset
    reset: () => set(initialState),
  }))
);