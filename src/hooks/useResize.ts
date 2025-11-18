import { useState, useCallback } from 'react';
import type { ResizeState } from '../types';

/**
 * Custom hook for handling resize functionality
 * Supports both mouse and touch events for mobile compatibility
 */
export const useResize = (
  onResize: (itemId: string, newDuration: number) => void,
  pixelsPerHour: number = 80
) => {
  const [resizeState, setResizeState] = useState<ResizeState>({
    itemId: null,
    itemType: null,
    startY: 0,
    startDuration: 0,
    isResizing: false,
  });

  /**
   * Start resizing
   */
  const handleResizeStart = useCallback(
    (
      itemId: string,
      itemType: 'appointment' | 'break',
      currentDuration: number,
      clientY: number
    ) => {
      setResizeState({
        itemId,
        itemType,
        startY: clientY,
        startDuration: currentDuration,
        isResizing: true,
      });
    },
    []
  );

  /**
   * Handle resize move
   */
  const handleResizeMove = useCallback(
    (clientY: number) => {
      if (!resizeState.isResizing || !resizeState.itemId) return;

      const deltaY = clientY - resizeState.startY;
      const deltaMinutes = Math.round((deltaY / pixelsPerHour) * 60);
      const newDuration = Math.max(
        5, // Minimum 5 minutes
        Math.round((resizeState.startDuration + deltaMinutes) / 5) * 5 // Snap to 5-minute intervals
      );

      // Visual feedback is handled by parent component
      return newDuration;
    },
    [resizeState, pixelsPerHour]
  );

  /**
   * End resizing and commit changes
   */
  const handleResizeEnd = useCallback(
    (clientY: number) => {
      if (!resizeState.isResizing || !resizeState.itemId) return;

      const deltaY = clientY - resizeState.startY;
      const deltaMinutes = Math.round((deltaY / pixelsPerHour) * 60);
      const newDuration = Math.max(
        5,
        Math.round((resizeState.startDuration + deltaMinutes) / 5) * 5
      );

      onResize(resizeState.itemId, newDuration);

      setResizeState({
        itemId: null,
        itemType: null,
        startY: 0,
        startDuration: 0,
        isResizing: false,
      });
    },
    [resizeState, pixelsPerHour, onResize]
  );

  /**
   * Cancel resizing
   */
  const handleResizeCancel = useCallback(() => {
    setResizeState({
      itemId: null,
      itemType: null,
      startY: 0,
      startDuration: 0,
      isResizing: false,
    });
  }, []);

  return {
    resizeState,
    handleResizeStart,
    handleResizeMove,
    handleResizeEnd,
    handleResizeCancel,
  };
};
