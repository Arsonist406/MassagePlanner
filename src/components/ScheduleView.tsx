import React, { useState, useEffect } from 'react';
import type { Appointment, Break, ScheduleItem } from '../types';
import { AppointmentBlock } from './AppointmentBlock';
import { BreakBlock } from './BreakBlock';
import { ScheduleMiniMap } from './ScheduleMiniMap';
import { parseISO, format, setHours, setMinutes, addDays, subDays, startOfDay, isSameDay, isToday, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, addMonths, subMonths } from 'date-fns';
import { uk } from 'date-fns/locale';

interface ScheduleViewProps {
  appointments: Appointment[];
  breaks: Break[];
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  onUpdateAppointment: (id: string, updates: Partial<Appointment>) => void;
  onUpdateBreak: (id: string, updates: Partial<Break>) => void;
  onDeleteAppointment: (id: string) => void;
  onDeleteBreak: (id: string) => void;
  onEditAppointment: (appointment: Appointment) => void;
  pauseAutoGeneration: () => void;
  resumeAutoGeneration: () => void;
  startHour?: number;
  endHour?: number;
  pixelsPerHour?: number;
}

/**
 * Main schedule view component with drag-and-drop timeline
 * Displays appointments and breaks on a vertical timeline
 */
export const ScheduleView: React.FC<ScheduleViewProps> = ({
  appointments,
  breaks,
  selectedDate,
  onDateChange,
  onUpdateAppointment,
  onUpdateBreak,
  onDeleteAppointment,
  onDeleteBreak,
  onEditAppointment,
  pauseAutoGeneration,
  resumeAutoGeneration,
  startHour = 8,
  endHour = 19,
  pixelsPerHour = 500,
}) => {
  const [dragItem, setDragItem] = useState<{
    id: string;
    type: 'appointment' | 'break';
    startY: number;
    startTime: string;
    hasMoved: boolean;
  } | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  const totalHours = endHour - startHour;
  const scheduleHeight = totalHours * pixelsPerHour;

  /**
   * Update current time position
   */
  const updateCurrentTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only show if current time is within schedule hours and it's today
    if (isToday(selectedDate) && currentHour >= startHour && currentHour < endHour) {
      const hoursFromStart = currentHour - startHour + currentMinute / 60;
      const position = hoursFromStart * pixelsPerHour;
      setCurrentTimePosition(position);
    } else {
      setCurrentTimePosition(null);
    }
  };

  /**
   * Auto-scroll to current time on mount
   */
  useEffect(() => {
    const scheduleEl = document.getElementById('schedule-container');
    if (scheduleEl) {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      // Only scroll if current time is within schedule hours
      if (currentHour >= startHour && currentHour < endHour) {
        const hoursFromStart = currentHour - startHour + currentMinute / 60;
        const scrollPosition = hoursFromStart * pixelsPerHour;
        
        // Scroll to position with some offset to center the current time
        const offset = scheduleEl.clientHeight / 2;
        scheduleEl.scrollTop = Math.max(0, scrollPosition - offset);
      } else if (currentHour < startHour) {
        // If before schedule start, scroll to top
        scheduleEl.scrollTop = 0;
      } else {
        // If after schedule end, scroll to bottom
        scheduleEl.scrollTop = scheduleEl.scrollHeight;
      }
    }
  }, []); // Run only on mount

  /**
   * Update current time position periodically
   */
  useEffect(() => {
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedDate, startHour, endHour, pixelsPerHour]);

  /**
   * Calculate position for a schedule item
   */
  const getItemPosition = (item: ScheduleItem): number => {
    const itemTime = parseISO(item.start_time);
    const itemHour = itemTime.getHours();
    const itemMinute = itemTime.getMinutes();
    const hoursFromStart = itemHour - startHour + itemMinute / 60;
    return hoursFromStart * pixelsPerHour;
  };

  /**
   * Check if appointment overlaps with other appointments (not breaks)
   */
  const appointmentOverlapsAppointment = (
    appointmentId: string,
    newStartTime: Date,
    durationMinutes: number
  ): boolean => {
    const newEndTime = new Date(newStartTime.getTime() + durationMinutes * 60000);
    
    // Check all appointments
    for (const apt of appointments) {
      if (apt.id === appointmentId) continue;
      const aptStart = parseISO(apt.start_time);
      const aptEnd = parseISO(apt.end_time);
      
      // Check if time ranges overlap
      if (newStartTime < aptEnd && newEndTime > aptStart) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Check if a break overlaps with any appointments or breaks
   */
  const breakOverlapsAny = (
    breakId: string,
    newStartTime: Date,
    durationMinutes: number
  ): boolean => {
    const newEndTime = new Date(newStartTime.getTime() + durationMinutes * 60000);
    
    // Check all appointments
    for (const apt of appointments) {
      const aptStart = parseISO(apt.start_time);
      const aptEnd = parseISO(apt.end_time);
      
      if (newStartTime < aptEnd && newEndTime > aptStart) {
        return true;
      }
    }
    
    // Check all breaks
    for (const brk of breaks) {
      if (brk.id === breakId) continue;
      const brkStart = parseISO(brk.start_time);
      const brkEnd = parseISO(brk.end_time);
      
      if (newStartTime < brkEnd && newEndTime > brkStart) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Check if a time shift is valid
   */
  const canShiftTime = (
    id: string,
    minutesShift: number
  ): boolean => {
    // Find the item
    const appointment = appointments.find(a => a.id === id);
    const breakItem = breaks.find(b => b.id === id);
    const item = appointment || breakItem;
    
    if (!item) return false;
    
    const currentStartTime = parseISO(item.start_time);
    const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
    const newEndTime = new Date(newStartTime.getTime() + item.duration_minutes * 60000);
    
    // Check if new start time is before 8:00
    const minTime = new Date(newStartTime);
    minTime.setHours(8, 0, 0, 0);
    if (newStartTime < minTime) return false;
    
    // Check if new end time exceeds 19:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(19, 0, 0, 0);
    if (newEndTime > maxTime) return false;
    
    // Check for overlaps based on item type
    if (appointment) {
      // Appointments can't overlap with other appointments (breaks will be handled automatically)
      if (appointmentOverlapsAppointment(id, newStartTime, item.duration_minutes)) return false;
    } else {
      // Breaks can't overlap with anything
      if (breakOverlapsAny(id, newStartTime, item.duration_minutes)) return false;
    }
    
    return true;
  };

  /**
   * Convert Y position to time with constraints (7:00 - 24:00)
   */
  const yToTime = (y: number, containerTop: number, scrollTop: number): Date => {
    const relativeY = y - containerTop + scrollTop;
    const hours = relativeY / pixelsPerHour;
    const totalMinutes = Math.round((hours * 60) / 5) * 5; // Snap to 5 minutes

    const date = new Date();
    date.setHours(startHour, 0, 0, 0);
    date.setMinutes(date.getMinutes() + totalMinutes);
    
    // Constrain to 8:00 - 19:00
    const minTime = new Date();
    minTime.setHours(8, 0, 0, 0);
    const maxTime = new Date();
    maxTime.setHours(19, 0, 0, 0);
    
    if (date < minTime) return minTime;
    if (date > maxTime) return maxTime;
    
    return date;
  };

  /**
   * Handle drag start
   */
  const handleDragStart = (
    id: string,
    type: 'appointment' | 'break',
    startTime: string,
    clientY: number
  ) => {
    pauseAutoGeneration();
    setDragItem({ id, type, startY: clientY, startTime, hasMoved: false });
  };

  /**
   * Handle appointment start time update with constraints and overlap check
   */
  const handleUpdateAppointmentStartTime = async (id: string, minutesShift: number) => {
    console.log('[Move] handleUpdateAppointmentStartTime called', { id, minutesShift });
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) {
      console.log('[Move] Appointment not found');
      return;
    }

    const currentStartTime = parseISO(appointment.start_time);
    const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
    const newEndTime = new Date(newStartTime.getTime() + appointment.duration_minutes * 60000);
    
    console.log('[Move] Current time:', appointment.start_time);
    console.log('[Move] New time:', newStartTime.toISOString());

    // Check if new start time is before 8:00
    const minTime = new Date(newStartTime);
    minTime.setHours(8, 0, 0, 0);
    if (newStartTime < minTime) {
      alert('Неможливо перемістити: запис виходить за межі робочого часу (8:00)');
      return;
    }

    // Check if new end time exceeds 19:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(19, 0, 0, 0);
    if (newEndTime > maxTime) {
      alert('Неможливо перемістити: запис виходить за межі робочого часу (до 19:00)');
      return;
    }

    // Check for overlaps with other appointments only
    if (appointmentOverlapsAppointment(id, newStartTime, appointment.duration_minutes)) {
      alert('Неможливо перемістити: запис перетинається з іншим записом');
      return;
    }

    // Pause auto-generation before making changes
    console.log('[Move] Pausing auto-generation');
    pauseAutoGeneration();
    
    try {
      // Update the appointment - auto-generation will handle breaks
      console.log('[Move] Updating appointment in database');
      await onUpdateAppointment(id, { start_time: newStartTime.toISOString() });
      console.log('[Move] Appointment updated successfully');
    } catch (err) {
      console.error('[Move] Error updating appointment:', err);
    } finally {
      // Resume auto-generation - this will recalculate all breaks based on new appointment positions
      console.log('[Move] Resuming auto-generation');
      resumeAutoGeneration();
    }
  };

  /**
   * Get all items touching after a given appointment (including the appointment itself)
   * Items are "touching" if they're connected via breaks or directly adjacent
   */
  const getTouchingItemsAfter = (appointmentId: string): ScheduleItem[] => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return [];

    const allItems = [...appointments, ...breaks].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );

    const touchingItems: ScheduleItem[] = [appointment];
    let currentEndTime = parseISO(appointment.end_time);

    // Find all items that touch after this appointment
    while (true) {
      const nextItem = allItems.find(item => {
        const itemStart = parseISO(item.start_time);
        // Item touches if it starts exactly when current ends or is connected via a break
        return itemStart.getTime() === currentEndTime.getTime() && !touchingItems.includes(item);
      });

      if (!nextItem) break;

      touchingItems.push(nextItem);
      currentEndTime = parseISO(nextItem.end_time);
    }

    return touchingItems;
  };

  /**
   * Get all items touching before a given appointment (including the appointment itself)
   * Items are "touching" if they're connected via breaks or directly adjacent
   */
  const getTouchingItemsBefore = (appointmentId: string): ScheduleItem[] => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return [];

    const allItems = [...appointments, ...breaks].sort((a, b) =>
      b.start_time.localeCompare(a.start_time) // Reverse order for backward search
    );

    const touchingItems: ScheduleItem[] = [appointment];
    let currentStartTime = parseISO(appointment.start_time);

    // Find all items that touch before this appointment
    while (true) {
      const prevItem = allItems.find(item => {
        const itemEnd = parseISO(item.end_time);
        // Item touches if it ends exactly when current starts or is connected via a break
        return itemEnd.getTime() === currentStartTime.getTime() && !touchingItems.includes(item);
      });

      if (!prevItem) break;

      touchingItems.push(prevItem);
      currentStartTime = parseISO(prevItem.start_time);
    }

    return touchingItems;
  };

  /**
   * Handle break start time update with constraints and overlap check
   */
  const handleUpdateBreakStartTime = (id: string, minutesShift: number) => {
    const breakItem = breaks.find(b => b.id === id);
    if (!breakItem) return;

    const currentStartTime = parseISO(breakItem.start_time);
    const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
    const newEndTime = new Date(newStartTime.getTime() + breakItem.duration_minutes * 60000);

    // Check if new start time is before 8:00
    const minTime = new Date(newStartTime);
    minTime.setHours(8, 0, 0, 0);
    if (newStartTime < minTime) {
      alert('Неможливо перемістити: перерва виходить за межі робочого часу (8:00)');
      return;
    }

    // Check if new end time exceeds 19:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(19, 0, 0, 0);
    if (newEndTime > maxTime) {
      alert('Неможливо перемістити: перерва виходить за межі робочого часу (до 19:00)');
      return;
    }

    // Check for overlaps
    if (breakOverlapsAny(id, newStartTime, breakItem.duration_minutes)) {
      alert('Неможливо перемістити: перерва перетинається з іншим записом або перервою');
      return;
    }

    onUpdateBreak(id, { start_time: newStartTime.toISOString() });
  };

  /**
   * Check if bulk shift after is valid (includes current appointment and touching items after)
   */
  const canBulkShiftAfter = (appointmentId: string, minutesShift: number): boolean => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return false;

    // Get all touching items after this appointment
    const touchingItems = getTouchingItemsAfter(appointmentId);

    // Check if any item would go out of bounds
    for (const item of touchingItems) {
      const currentStartTime = parseISO(item.start_time);
      const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
      const duration = item.duration_minutes;
      const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

      // Check if new start time is before 7:00
      const minTime = new Date(newStartTime);
      minTime.setHours(7, 0, 0, 0);
      if (newStartTime < minTime) return false;

      // Check if new end time exceeds midnight (24:00)
      const maxTime = new Date(newStartTime);
      maxTime.setHours(24, 0, 0, 0);
      if (newEndTime > maxTime) return false;
    }

    return true;
  };

  /**
   * Check if bulk shift before is valid (includes current appointment and touching items before)
   */
  const canBulkShiftBefore = (appointmentId: string, minutesShift: number): boolean => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return false;

    // Get all touching items before this appointment
    const touchingItems = getTouchingItemsBefore(appointmentId);

    // Check if any item would go out of bounds
    for (const item of touchingItems) {
      const currentStartTime = parseISO(item.start_time);
      const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
      const duration = item.duration_minutes;
      const newEndTime = new Date(newStartTime.getTime() + duration * 60000);

      // Check if new start time is before 7:00
      const minTime = new Date(newStartTime);
      minTime.setHours(7, 0, 0, 0);
      if (newStartTime < minTime) return false;

      // Check if new end time exceeds midnight (24:00)
      const maxTime = new Date(newStartTime);
      maxTime.setHours(24, 0, 0, 0);
      if (newEndTime > maxTime) return false;
    }

    return true;
  };

  /**
   * Handle bulk shift of current appointment and touching items after it
   */
  const handleBulkShiftAfter = async (appointmentId: string, minutesShift: number) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    if (!canBulkShiftAfter(appointmentId, minutesShift)) {
      alert('Неможливо перемістити: деякі записи війдуть за межі робочого часу (8:00 - 19:00)');
      return;
    }

    pauseAutoGeneration();

    try {
      // Get all touching items after this appointment (including current)
      const touchingItems = getTouchingItemsAfter(appointmentId);

      // Update all items (both appointments and breaks) in reverse order
      for (const item of [...touchingItems].reverse()) {
        const currentStartTime = parseISO(item.start_time);
        const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
        
        if ('client_name' in item) {
          // It's an appointment
          await onUpdateAppointment(item.id, { start_time: newStartTime.toISOString() });
        } else {
          // It's a break - move it along with appointments
          await onUpdateBreak(item.id, { start_time: newStartTime.toISOString() });
        }
      }
      
      // No need for auto-generation since we moved everything together
    } catch (err) {
      console.error('Error in bulk shift after:', err);
    } finally {
      resumeAutoGeneration();
    }
  };

  /**
   * Handle bulk shift of current appointment and touching items before it
   */
  const handleBulkShiftBefore = async (appointmentId: string, minutesShift: number) => {
    const appointment = appointments.find(a => a.id === appointmentId);
    if (!appointment) return;

    if (!canBulkShiftBefore(appointmentId, minutesShift)) {
      alert('Неможливо перемістити: деякі записи вийдуть за межі робочого часу (8:00 - 19:00)');
      return;
    }

    pauseAutoGeneration();

    try {
      // Get all touching items before this appointment (including current)
      const touchingItems = getTouchingItemsBefore(appointmentId);

      // Update all items (both appointments and breaks) in reverse order
      for (const item of [...touchingItems].reverse()) {
        const currentStartTime = parseISO(item.start_time);
        const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
        
        if ('client_name' in item) {
          // It's an appointment
          await onUpdateAppointment(item.id, { start_time: newStartTime.toISOString() });
        } else {
          // It's a break - move it along with appointments
          await onUpdateBreak(item.id, { start_time: newStartTime.toISOString() });
        }
      }
      
      // No need for auto-generation since we moved everything together
    } catch (err) {
      console.error('Error in bulk shift before:', err);
    } finally {
      resumeAutoGeneration();
    }
  };

  /**
   * Handle mouse/touch move
   */
  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (dragItem) {
        const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0]?.clientY;
        
        // Mark as moved if mouse/touch has moved more than 5 pixels from start
        if (clientY && Math.abs(clientY - dragItem.startY) > 5) {
          setDragItem(prev => prev ? { ...prev, hasMoved: true } : null);
        }
        
        // Prevent scrolling while dragging on touch devices
        if (e instanceof TouchEvent && dragItem.hasMoved) {
          e.preventDefault();
        }
      }
    };

    const handleEnd = async (e: MouseEvent | TouchEvent) => {
      const clientY =
        e instanceof MouseEvent ? e.clientY : e.changedTouches[0]?.clientY;

      if (dragItem && clientY) {
        // Only move if actually dragged, not just clicked
        if (dragItem.hasMoved) {
          const scheduleEl = document.getElementById('schedule-container');
          if (scheduleEl) {
            const rect = scheduleEl.getBoundingClientRect();
            const newTime = yToTime(clientY, rect.top, scheduleEl.scrollTop);
            
            // Get current item to check its duration
            const currentItem = dragItem.type === 'appointment'
              ? appointments.find(a => a.id === dragItem.id)
              : breaks.find(b => b.id === dragItem.id);
            
            if (currentItem) {
              const newTimeISO = newTime.toISOString();
              
              if (dragItem.type === 'appointment') {
                // Check for overlaps with other appointments only
                if (appointmentOverlapsAppointment(dragItem.id, newTime, currentItem.duration_minutes)) {
                  alert('Неможливо перемістити: запис перетинається з іншим записом');
                  setDragItem(null);
                  return;
                }
                
                // Pause auto-generation before making changes
                pauseAutoGeneration();
                
                try {
                  // Update the appointment - auto-generation will handle breaks
                  await onUpdateAppointment(dragItem.id, { start_time: newTimeISO });
                } catch (err) {
                  console.error('Error updating appointment:', err);
                } finally {
                  // Resume auto-generation - this will recalculate all breaks
                  resumeAutoGeneration();
                }
              } else {
                // Check for overlaps with anything for breaks
                if (breakOverlapsAny(dragItem.id, newTime, currentItem.duration_minutes)) {
                  alert('Неможливо перемістити: перерва перетинається з іншим записом або перервою');
                  setDragItem(null);
                  return;
                }
                
                await onUpdateBreak(dragItem.id, { start_time: newTimeISO });
              }
            }
          }
        }
        setDragItem(null);
      }
    };

    if (dragItem) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('mouseup', handleEnd);
      window.addEventListener('touchend', handleEnd);

      return () => {
        window.removeEventListener('mousemove', handleMove);
        window.removeEventListener('touchmove', handleMove);
        window.removeEventListener('mouseup', handleEnd);
        window.removeEventListener('touchend', handleEnd);
      };
    }
  }, [dragItem, pixelsPerHour, onUpdateAppointment, onUpdateBreak]);

  /**
   * Check if a time (in minutes from start) falls within any block
   */
  const isTimeInBlock = (minutesFromStart: number): boolean => {
    const allBlocks = [...appointments, ...breaks];
    
    for (const block of allBlocks) {
      const blockStart = parseISO(block.start_time);
      const blockEnd = parseISO(block.end_time);
      
      const blockStartMinutes = (blockStart.getHours() - startHour) * 60 + blockStart.getMinutes();
      const blockEndMinutes = (blockEnd.getHours() - startHour) * 60 + blockEnd.getMinutes();
      
      // Check if time is strictly inside the block (not at boundaries)
      if (minutesFromStart > blockStartMinutes && minutesFromStart < blockEndMinutes) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Get all block boundary times (start and end times of appointments and breaks)
   */
  const getBlockBoundaryTimes = (): Set<number> => {
    const boundaries = new Set<number>();
    const allBlocks = [...appointments, ...breaks];
    
    for (const block of allBlocks) {
      const blockStart = parseISO(block.start_time);
      const blockEnd = parseISO(block.end_time);
      
      const blockStartMinutes = (blockStart.getHours() - startHour) * 60 + blockStart.getMinutes();
      const blockEndMinutes = (blockEnd.getHours() - startHour) * 60 + blockEnd.getMinutes();
      
      boundaries.add(blockStartMinutes);
      boundaries.add(blockEndMinutes);
    }
    
    return boundaries;
  };

  /**
   * Render time labels (hourly markers, block boundaries, and 5-minute intervals in gaps)
   */
  const renderTimeLabels = () => {
    const labels = [];
    const blockBoundaries = getBlockBoundaryTimes();
    
    // Generate all hourly markers (always show)
    for (let hour = startHour; hour <= endHour; hour++) {
      const minutesFromStart = (hour - startHour) * 60;
      const time = setMinutes(setHours(new Date(), hour), 0);
      labels.push(
        <div
          key={`hour-${hour}`}
          className="absolute left-0 pl-2 text-base sm:text-lg text-gray-700 font-semibold"
          style={{ top: `${minutesFromStart * (pixelsPerHour / 60) - 8}px` }}
        >
          {format(time, 'HH:mm', { locale: uk })}
        </div>
      );
    }
    
    // Generate block boundary markers
    blockBoundaries.forEach(minutesFromStart => {
      // Skip if it's already an hourly marker
      if (minutesFromStart % 60 === 0) return;
      
      const totalHours = Math.floor(minutesFromStart / 60);
      const remainingMinutes = minutesFromStart % 60;
      const time = setMinutes(setHours(new Date(), startHour + totalHours), remainingMinutes);
      
      labels.push(
        <div
          key={`boundary-${minutesFromStart}`}
          className="absolute left-0 pl-2 text-sm text-gray-600 font-medium"
          style={{ top: `${minutesFromStart * (pixelsPerHour / 60) - 6}px` }}
        >
          {format(time, 'HH:mm', { locale: uk })}
        </div>
      );
    });
    
    // Generate 5-minute interval markers only in gaps (where there are no blocks)
    for (let hour = startHour; hour < endHour; hour++) {
      for (let i = 1; i < 12; i++) {
        const minutes = i * 5;
        const minutesFromStart = (hour - startHour) * 60 + minutes;
        
        // Skip if it's an hourly marker
        if (minutes === 0) continue;
        
        // Skip if it's a block boundary
        if (blockBoundaries.has(minutesFromStart)) continue;
        
        // Skip if this time is inside a block
        if (isTimeInBlock(minutesFromStart)) continue;
        
        const intervalTime = setMinutes(setHours(new Date(), hour), minutes);
        // Make 15-minute marks slightly more prominent
        const isQuarterHour = minutes % 15 === 0;
        
        labels.push(
          <div
            key={`interval-${hour}-${minutes}`}
            className={`absolute left-0 pl-2 ${isQuarterHour ? 'text-sm text-gray-500 font-medium' : 'text-xs text-gray-400'}`}
            style={{ top: `${minutesFromStart * (pixelsPerHour / 60) - 6}px` }}
          >
            {format(intervalTime, 'HH:mm', { locale: uk })}
          </div>
        );
      }
    }
    
    return labels;
  };

  /**
   * Get all times where labels should be shown (hourly, boundaries, and 5-min in gaps)
   */
  const getVisibleLabelTimes = (): Set<number> => {
    const visibleTimes = new Set<number>();
    const blockBoundaries = getBlockBoundaryTimes();
    
    // Add all hourly markers
    for (let hour = startHour; hour <= endHour; hour++) {
      visibleTimes.add((hour - startHour) * 60);
    }
    
    // Add all block boundaries
    blockBoundaries.forEach(time => visibleTimes.add(time));
    
    // Add 5-minute intervals in gaps (where there are no blocks)
    for (let hour = startHour; hour < endHour; hour++) {
      for (let i = 1; i < 12; i++) {
        const minutes = i * 5;
        const minutesFromStart = (hour - startHour) * 60 + minutes;
        
        // Skip if it's an hourly marker (already added)
        if (minutes === 0) continue;
        
        // Skip if it's a block boundary (already added)
        if (blockBoundaries.has(minutesFromStart)) continue;
        
        // Skip if this time is inside a block
        if (isTimeInBlock(minutesFromStart)) continue;
        
        visibleTimes.add(minutesFromStart);
      }
    }
    
    return visibleTimes;
  };

  /**
   * Render hour grid lines with 15-minute and 5-minute subdivisions
   * Only show lines where time labels are visible
   */
  const renderGridLines = () => {
    const lines = [];
    const visibleTimes = getVisibleLabelTimes();
    
    for (let hour = startHour; hour <= endHour; hour++) {
      const minutesFromStart = (hour - startHour) * 60;
      
      // Hour line (thicker, darker) - only if time label is visible
      if (visibleTimes.has(minutesFromStart)) {
        lines.push(
          <div
            key={`hour-${hour}`}
            className="absolute right-0 border-t-2 border-gray-400"
            style={{ 
              top: `${(hour - startHour) * pixelsPerHour}px`,
              left: '0px'
            }}
          />
        );
      }
      
      // Don't add subdivisions after the last hour
      if (hour < endHour) {
        // 15-minute subdivisions (visible, medium thickness)
        for (let quarter = 1; quarter < 4; quarter++) {
          const minutes = quarter * 15;
          const subdivisionMinutes = (hour - startHour) * 60 + minutes;
          
          if (visibleTimes.has(subdivisionMinutes)) {
            lines.push(
              <div
                key={`15min-${hour}-${minutes}`}
                className="absolute right-0 border-t"
                style={{ 
                  top: `${(hour - startHour) * pixelsPerHour + (minutes / 60) * pixelsPerHour}px`,
                  left: '0px',
                  borderColor: '#9ca3af',
                  borderWidth: '1.5px'
                }}
              />
            );
          }
        }
        
        // 5-minute subdivisions (subtle but visible)
        for (let i = 1; i < 12; i++) {
          // Skip the 15-minute marks (already rendered above)
          if (i % 3 === 0) continue;
          
          const minutes = i * 5;
          const subdivisionMinutes = (hour - startHour) * 60 + minutes;
          
          if (visibleTimes.has(subdivisionMinutes)) {
            lines.push(
              <div
                key={`5min-${hour}-${minutes}`}
                className="absolute right-0 border-t"
                style={{ 
                  top: `${(hour - startHour) * pixelsPerHour + (minutes / 60) * pixelsPerHour}px`,
                  left: '0px',
                  borderColor: '#d1d5db'
                }}
              />
            );
          }
        }
      }
    }
    return lines;
  };

  /**
   * Get formatted date header with Ukrainian text
   */
  const getDateHeader = (): string => {
    const dayOfWeek = format(selectedDate, 'EEEE', { locale: uk });
    const dateFormatted = format(selectedDate, 'dd/MM/yyyy');
    
    // Calculate relative date
    const today = startOfDay(new Date());
    const yesterday = subDays(today, 1);
    const dayBeforeYesterday = subDays(today, 2);
    const tomorrow = addDays(today, 1);
    const afterTomorrow = addDays(today, 2);
    
    let relativeDate = '';
    if (isSameDay(selectedDate, today)) {
      relativeDate = 'сьогодні';
    } else if (isSameDay(selectedDate, yesterday)) {
      relativeDate = 'вчора';
    } else if (isSameDay(selectedDate, dayBeforeYesterday)) {
      relativeDate = 'позавчора';
    } else if (isSameDay(selectedDate, tomorrow)) {
      relativeDate = 'завтра';
    } else if (isSameDay(selectedDate, afterTomorrow)) {
      relativeDate = 'післязавтра';
    }
    
    // Capitalize first letter of day of week
    const capitalizedDayOfWeek = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1);
    
    return `${dateFormatted}, ${capitalizedDayOfWeek}${relativeDate ? ` (${relativeDate})` : ''}`;
  };

  /**
   * Handle date navigation
   */
  const goToPreviousDay = () => {
    onDateChange(subDays(selectedDate, 1));
  };

  const goToNextDay = () => {
    onDateChange(addDays(selectedDate, 1));
  };

  const goToToday = () => {
    onDateChange(startOfDay(new Date()));
  };

  const [calendarMonth, setCalendarMonth] = useState(selectedDate);

  const handleCalendarDateSelect = (date: Date) => {
    onDateChange(startOfDay(date));
    setShowCalendar(false);
  };

  const getCalendarDays = () => {
    const monthStart = startOfMonth(calendarMonth);
    const monthEnd = endOfMonth(calendarMonth);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start from Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  };

  // Listen for calendar open event from header
  useEffect(() => {
    const handleOpenCalendar = () => {
      setShowCalendar(true);
      setCalendarMonth(selectedDate);
    };
    window.addEventListener('openCalendar', handleOpenCalendar);
    return () => window.removeEventListener('openCalendar', handleOpenCalendar);
  }, [selectedDate]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (showCalendar && !target.closest('.calendar-container')) {
        setShowCalendar(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showCalendar]);

  return (
    <div className="flex gap-6">
      {/* Mini-map */}
      <div className="hidden lg:block w-56 flex-shrink-0">
        <ScheduleMiniMap
          appointments={appointments}
          breaks={breaks}
          startHour={startHour}
          endHour={endHour}
          scheduleContainerId="schedule-container"
        />
      </div>

      {/* Main schedule */}
      <div className="flex-1 bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-3 py-3 sm:px-4 sm:py-3 bg-gray-100 border-b border-gray-200">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {getDateHeader()}
            </h2>
            <div className="flex items-center gap-2 relative">
              {/* Today button */}
              {!isToday(selectedDate) && (
                <button
                  onClick={goToToday}
                  className="px-3 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                >
                  Сьогодні
                </button>
              )}
              
              {/* Navigation buttons */}
              <button
                onClick={goToPreviousDay}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Попередній день"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* Calendar dropdown */}
              {showCalendar && (
                <div className="fixed bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 calendar-container" style={{ width: '280px', top: '70px', left: '50%', transform: 'translateX(-50%)' }}>
                  {/* Calendar header */}
                  <div className="flex items-center justify-between mb-3">
                    <button
                      onClick={() => setCalendarMonth(subMonths(calendarMonth, 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="font-semibold text-gray-800">
                      {format(calendarMonth, 'LLLL yyyy', { locale: uk })}
                    </div>
                    <button
                      onClick={() => setCalendarMonth(addMonths(calendarMonth, 1))}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>

                  {/* Day names */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Нд'].map((day) => (
                      <div key={day} className="text-center text-xs font-medium text-gray-600 py-1">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar days */}
                  <div className="grid grid-cols-7 gap-1">
                    {getCalendarDays().map((day, index) => {
                      const isCurrentMonth = isSameMonth(day, calendarMonth);
                      const isSelected = isSameDay(day, selectedDate);
                      const isTodayDate = isToday(day);

                      return (
                        <button
                          key={index}
                          onClick={() => handleCalendarDateSelect(day)}
                          className={`
                            p-2 text-sm rounded transition-colors
                            ${!isCurrentMonth ? 'text-gray-300' : 'text-gray-700'}
                            ${isSelected ? 'bg-primary-600 text-white font-semibold hover:bg-primary-700' : 'hover:bg-gray-100'}
                            ${isTodayDate && !isSelected ? 'border border-primary-400' : ''}
                          `}
                        >
                          {format(day, 'd')}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
              
              <button
                onClick={goToNextDay}
                className="p-2 hover:bg-gray-200 rounded transition-colors"
                title="Наступний день"
              >
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        <div
          id="schedule-container"
          className="relative overflow-y-auto"
          style={{
            height: 'calc(100vh - 240px)',
            minHeight: '400px',
            maxHeight: '600px',
          }}
        >
        {/* Time labels */}
        <div className="absolute left-0 top-0 w-12 sm:w-16 z-10 bg-white">
          {renderTimeLabels()}
        </div>

        {/* Schedule timeline */}
        <div
          className="relative ml-12 sm:ml-16"
          style={{ height: `${scheduleHeight}px` }}
        >
          {/* Grid lines */}
          {renderGridLines()}

          {/* Appointments */}
          {appointments.map((appointment) => (
            <div
              key={appointment.id}
              className="absolute w-full"
              style={{ top: `${getItemPosition(appointment)}px` }}
            >
              <AppointmentBlock
                appointment={appointment}
                onEdit={onEditAppointment}
                onDelete={onDeleteAppointment}
                onDragStart={(id, startTime, clientY) =>
                  handleDragStart(id, 'appointment', startTime, clientY)
                }
                onUpdateStartTime={handleUpdateAppointmentStartTime}
                canShiftTime={canShiftTime}
                onBulkShiftAfter={handleBulkShiftAfter}
                onBulkShiftBefore={handleBulkShiftBefore}
                canBulkShiftAfter={canBulkShiftAfter}
                canBulkShiftBefore={canBulkShiftBefore}
                pixelsPerHour={pixelsPerHour}
                scrollContainerId="schedule-container"
              />
            </div>
          ))}

          {/* Breaks */}
          {breaks.map((breakItem) => (
            <div
              key={breakItem.id}
              className="absolute w-full"
              style={{ top: `${getItemPosition(breakItem)}px` }}
            >
              <BreakBlock
                breakItem={breakItem}
                onDelete={onDeleteBreak}
                onDragStart={(id, startTime, clientY) =>
                  handleDragStart(id, 'break', startTime, clientY)
                }
                onUpdateStartTime={handleUpdateBreakStartTime}
                canShiftTime={canShiftTime}
                pixelsPerHour={pixelsPerHour}
                scrollContainerId="schedule-container"
              />
            </div>
          ))}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute w-full pointer-events-none z-30"
              style={{ top: `${currentTimePosition}px` }}
            >
              <div className="w-full h-0.5" style={{ backgroundColor: '#1e293b' }} />
              <div className="absolute left-0 top-0 transform -translate-y-1/2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#1e293b' }} />
              </div>
            </div>
          )}
        </div>
      </div>

        <div className="px-3 py-2 sm:px-4 sm:py-2 bg-gray-100 border-t border-gray-200">
          <p className="text-sm sm:text-base text-gray-600 text-center">

          </p>
        </div>
      </div>
    </div>
  );
};
