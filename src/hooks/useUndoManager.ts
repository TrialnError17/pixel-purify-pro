import { useState, useCallback } from 'react';

export interface UndoAction {
  id: string;
  type: 'image_queue' | 'settings' | 'canvas_edit' | 'batch_operation';
  description: string;
  timestamp: number;
  undo: () => void;
  redo?: () => void;
}

export const useUndoManager = () => {
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [redoStack, setRedoStack] = useState<UndoAction[]>([]);

  const addUndoAction = useCallback((action: Omit<UndoAction, 'id' | 'timestamp'>) => {
    const undoAction: UndoAction = {
      ...action,
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    setUndoStack(prev => [...prev, undoAction]);
    setRedoStack([]); // Clear redo stack when new action is added
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return false;

    const lastAction = undoStack[undoStack.length - 1];
    
    try {
      lastAction.undo();
      
      setUndoStack(prev => prev.slice(0, -1));
      
      // Add to redo stack if redo function exists
      if (lastAction.redo) {
        setRedoStack(prev => [...prev, lastAction]);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return false;

    const lastRedoAction = redoStack[redoStack.length - 1];
    
    if (!lastRedoAction.redo) return false;

    try {
      lastRedoAction.redo();
      
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, lastRedoAction]);
      
      return true;
    } catch (error) {
      console.error('Failed to redo action:', error);
      return false;
    }
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getLastAction = useCallback(() => {
    return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  }, [undoStack]);

  return {
    undoStack,
    redoStack,
    addUndoAction,
    undo,
    redo,
    clearHistory,
    getLastAction,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0
  };
};