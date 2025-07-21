
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

    console.log('Adding undo action:', undoAction.description);
    setUndoStack(prev => {
      const newStack = [...prev, undoAction];
      console.log('Undo stack size:', newStack.length);
      return newStack;
    });
    setRedoStack([]); // Clear redo stack when new action is added
  }, []);

  const undo = useCallback(() => {
    if (undoStack.length === 0) {
      console.log('Cannot undo: stack is empty');
      return false;
    }

    const lastAction = undoStack[undoStack.length - 1];
    console.log('Undoing action:', lastAction.description);
    
    try {
      lastAction.undo();
      
      setUndoStack(prev => prev.slice(0, -1));
      
      // Add to redo stack if redo function exists
      if (lastAction.redo) {
        setRedoStack(prev => [...prev, lastAction]);
      }
      
      console.log('Undo successful');
      return true;
    } catch (error) {
      console.error('Failed to undo action:', error);
      return false;
    }
  }, [undoStack]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) {
      console.log('Cannot redo: stack is empty');
      return false;
    }

    const lastRedoAction = redoStack[redoStack.length - 1];
    
    if (!lastRedoAction.redo) {
      console.log('Cannot redo: no redo function');
      return false;
    }

    console.log('Redoing action:', lastRedoAction.description);

    try {
      lastRedoAction.redo();
      
      setRedoStack(prev => prev.slice(0, -1));
      setUndoStack(prev => [...prev, lastRedoAction]);
      
      console.log('Redo successful');
      return true;
    } catch (error) {
      console.error('Failed to redo action:', error);
      return false;
    }
  }, [redoStack]);

  const clearHistory = useCallback(() => {
    console.log('Clearing undo/redo history');
    setUndoStack([]);
    setRedoStack([]);
  }, []);

  const getLastAction = useCallback(() => {
    return undoStack.length > 0 ? undoStack[undoStack.length - 1] : null;
  }, [undoStack]);

  const canUndo = undoStack.length > 0;
  const canRedo = redoStack.length > 0;

  return {
    undoStack,
    redoStack,
    addUndoAction,
    undo,
    redo,
    clearHistory,
    getLastAction,
    canUndo,
    canRedo
  };
};
