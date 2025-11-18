import { useState, useCallback, useEffect, useRef } from 'react';
import type { DragState } from '../types';
import { addMinutes, formatISO } from 'date-fns';

/**
 * Custom hook for handling drag-and-drop functionality
 * Supports both mouse and touch events for mobile compatibility
 */
export const useDragDrop = (
  onDrop: (itemId: string, newStartTime: string) => void,
  scheduleStartHour: number = 8,
  pixelsPerHour: number = 80
) => {
  const [dragState, setDragState] = useState<DragState>({
    itemId: null,
    itemType: null,
    startY: 0,
    startTime: '',
    isDragging: false,
  });

  const scheduleRef = useRef<HTMLDivElement>(null);

  /**
   * Convert Y position to time
   */
  const yToTime = useCallback(
    (y: number): string => {
      const rect = scheduleRef.current?.getBoundingClientRect();
      if (!rect) return '';

      const relativeY = y - rect.top + (scheduleRef.current?.scrollTop || 0);
      const hours = relativeY / pixelsPerHour;
      const totalMinutes = Math.round((hours * 60) / 15) * 15; // Snap to 15-minute intervals

      const date = new Date();
      date.setHours(scheduleStartHour, 0, 0, 0);
      const newTime = addMinutes(date, totalMinutes);

      return formatISO(newTime);
    },
    [scheduleStartHour, pixelsPerHour]
  );

  /**
   * Start dragging
   */
  const handleDragStart = useCallback(
    (
      itemId: string,
      itemType: 'appointment' | 'break',
      startTime: string,
      clientY: number
    ) => {
      setDragState({
        itemId,
        itemType,
        startY: clientY,
        startTime,
        isDragging: true,
      });
    },
    []
  );

  /**
   * Handle drag move
   */
  const handleDragMove = useCallback(
    (_clientY: number) => {
      if (!dragState.isDragging || !dragState.itemId) return;

      // Update is handled by parent component through visual feedback
    },
    [dragState]
  );

  /**
   * End dragging and commit changes
   */
  const handleDragEnd = useCallback(
    (clientY: number) => {
      if (!dragState.isDragging || !dragState.itemId) return;

      const newTime = yToTime(clientY);
      if (newTime) {
        onDrop(dragState.itemId, newTime);
      }

      setDragState({
        itemId: null,
        itemType: null,
        startY: 0,
        startTime: '',
        isDragging: false,
      });
    },
    [dragState, yToTime, onDrop]
  );

  /**
   * Cancel dragging
   */
  const handleDragCancel = useCallback(() => {
    setDragState({
      itemId: null,
      itemType: null,
      startY: 0,
      startTime: '',
      isDragging: false,
    });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      handleDragCancel();
    };
  }, [handleDragCancel]);

  return {
    dragState,
    scheduleRef,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    handleDragCancel,
  };
};
