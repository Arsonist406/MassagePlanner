import { useState, useEffect, useCallback, useRef } from 'react';
import type { Appointment, Break, ScheduleItem } from '../types';
import {
  fetchAppointments,
  fetchBreaks,
  createAppointment as createAppointmentService,
  updateAppointment as updateAppointmentService,
  deleteAppointment as deleteAppointmentService,
  createBreak as createBreakService,
  updateBreak as updateBreakService,
  deleteBreak as deleteBreakService,
} from '../services/appointmentService';

/**
 * Custom hook for managing appointments and breaks
 * Handles local state + Supabase synchronization
 */
export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pauseCounterRef = useRef(0);
  const autoGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Load all appointments and breaks from Supabase
   */
  const loadSchedule = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [appointmentsData, breaksData] = await Promise.all([
        fetchAppointments(),
        fetchBreaks(),
      ]);
      setAppointments(appointmentsData);
      setBreaks(breaksData);
    } catch (err) {
      setError('Failed to load schedule');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load schedule on mount
  useEffect(() => {
    loadSchedule();
  }, [loadSchedule]);

  /**
   * Create a new appointment
   */
  const createAppointment = useCallback(
    async (
      appointmentData: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
    ) => {
      try {
        const newAppointment = await createAppointmentService(appointmentData);
        setAppointments((prev) => [...prev, newAppointment].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        ));
        return newAppointment;
      } catch (err) {
        setError('Failed to create appointment');
        throw err;
      }
    },
    []
  );

  /**
   * Update an existing appointment
   */
  const updateAppointment = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
    ) => {
      try {
        const updatedAppointment = await updateAppointmentService(id, updates);
        setAppointments((prev) =>
          prev.map((apt) => (apt.id === id ? updatedAppointment : apt))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
        );
        return updatedAppointment;
      } catch (err) {
        setError('Failed to update appointment');
        throw err;
      }
    },
    []
  );

  /**
   * Delete an appointment
   */
  const deleteAppointment = useCallback(async (id: string) => {
    try {
      await deleteAppointmentService(id);
      setAppointments((prev) => prev.filter((apt) => apt.id !== id));
    } catch (err) {
      setError('Failed to delete appointment');
      throw err;
    }
  }, []);

  /**
   * Create a new break
   */
  const createBreak = useCallback(
    async (breakData: Omit<Break, 'id' | 'created_at' | 'updated_at'>) => {
      try {
        const newBreak = await createBreakService(breakData);
        setBreaks((prev) => [...prev, newBreak].sort((a, b) =>
          a.start_time.localeCompare(b.start_time)
        ));
        return newBreak;
      } catch (err) {
        setError('Failed to create break');
        throw err;
      }
    },
    []
  );

  /**
   * Update an existing break
   */
  const updateBreak = useCallback(
    async (
      id: string,
      updates: Partial<Omit<Break, 'id' | 'created_at' | 'updated_at'>>
    ) => {
      try {
        const updatedBreak = await updateBreakService(id, updates);
        setBreaks((prev) =>
          prev.map((brk) => (brk.id === id ? updatedBreak : brk))
            .sort((a, b) => a.start_time.localeCompare(b.start_time))
        );
        return updatedBreak;
      } catch (err) {
        setError('Failed to update break');
        throw err;
      }
    },
    []
  );

  /**
   * Delete a break
   */
  const deleteBreak = useCallback(async (id: string) => {
    try {
      await deleteBreakService(id);
      setBreaks((prev) => prev.filter((brk) => brk.id !== id));
    } catch (err) {
      setError('Failed to delete break');
      throw err;
    }
  }, []);

  /**
   * Get all schedule items (appointments + breaks) sorted by time
   */
  const getAllScheduleItems = useCallback((): ScheduleItem[] => {
    return [...appointments, ...breaks].sort((a, b) =>
      a.start_time.localeCompare(b.start_time)
    );
  }, [appointments, breaks]);

  /**
   * Auto-generate breaks for gaps <= 30 minutes between appointments
   * Stretches existing breaks or creates new ones, removes breaks if gap > 30 minutes
   * Called after appointments are created or updated
   */
  const autoGenerateBreaks = useCallback(async () => {
    // Don't run if paused
    if (pauseCounterRef.current > 0) {
      return;
    }
    
    try {
      // Sort appointments by start time
      const sortedAppointments = [...appointments].sort((a, b) =>
        a.start_time.localeCompare(b.start_time)
      );

      const breaksToCreate: Omit<Break, 'id' | 'created_at' | 'updated_at'>[] = [];
      const breaksToUpdate: { id: string; updates: Partial<Break> }[] = [];
      const breaksToDelete: string[] = [];

      // Track which breaks are legitimate (between appointments with gap <= 25)
      const legitimateBreakRanges = new Set<string>();

      // Check gaps between consecutive appointments
      for (let i = 0; i < sortedAppointments.length - 1; i++) {
        const currentApt = sortedAppointments[i];
        const nextApt = sortedAppointments[i + 1];

        const currentEnd = new Date(currentApt.end_time);
        const nextStart = new Date(nextApt.start_time);

        // Calculate gap in minutes
        const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);

        if (gapMinutes > 0 && gapMinutes <= 30) {
          // Mark this range as legitimate
          legitimateBreakRanges.add(`${currentEnd.getTime()}-${nextStart.getTime()}`);

          // Check if a break already exists in this range
          const existingBreak = breaks.find(brk => {
            const brkStart = new Date(brk.start_time);
            const brkEnd = new Date(brk.end_time);
            // Break exists if it overlaps with or touches the gap
            return (brkStart >= currentEnd && brkStart < nextStart) || 
                   (brkEnd > currentEnd && brkEnd <= nextStart) ||
                   (brkStart <= currentEnd && brkEnd >= nextStart);
          });

          if (existingBreak) {
            // Update existing break to match the full gap
            const targetDuration = Math.floor(gapMinutes);
            const targetStart = currentEnd.toISOString();
            
            // Always update if start time or duration doesn't match the full gap
            if (existingBreak.start_time !== targetStart || 
                existingBreak.duration_minutes !== targetDuration) {
              breaksToUpdate.push({
                id: existingBreak.id,
                updates: {
                  start_time: targetStart,
                  duration_minutes: targetDuration,
                }
              });
            }
          } else {
            // Create new break for the entire gap
            const breakEndTime = new Date(currentEnd.getTime() + gapMinutes * 60000);
            
            breaksToCreate.push({
              start_time: currentEnd.toISOString(),
              duration_minutes: Math.floor(gapMinutes),
              end_time: breakEndTime.toISOString(),
            });
          }
        }
      }

      // Find breaks that should be deleted (gap > 25 minutes or not between consecutive appointments)
      for (const brk of breaks) {
        const brkStart = new Date(brk.start_time);
        const brkEnd = new Date(brk.end_time);
        
        // Check if this break is in a legitimate range
        let isLegitimate = false;
        for (let i = 0; i < sortedAppointments.length - 1; i++) {
          const currentEnd = new Date(sortedAppointments[i].end_time);
          const nextStart = new Date(sortedAppointments[i + 1].start_time);
          const gapMinutes = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
          
          // Break is legitimate if it's between consecutive appointments with gap <= 30
          if (gapMinutes > 0 && gapMinutes <= 30 && 
              brkStart >= currentEnd && brkEnd <= nextStart) {
            isLegitimate = true;
            break;
          }
        }
        
        if (!isLegitimate) {
          breaksToDelete.push(brk.id);
        }
      }

      // Execute all operations
      for (const breakData of breaksToCreate) {
        await createBreakService(breakData);
      }

      for (const { id, updates } of breaksToUpdate) {
        await updateBreakService(id, updates);
      }

      for (const breakId of breaksToDelete) {
        await deleteBreakService(breakId);
      }

      // Refresh breaks if any changes were made
      if (breaksToCreate.length > 0 || breaksToUpdate.length > 0 || breaksToDelete.length > 0) {
        const updatedBreaks = await fetchBreaks();
        setBreaks(updatedBreaks);
      }
    } catch (err) {
      console.error('Failed to auto-generate breaks:', err);
    }
  }, [appointments, breaks]);

  // Auto-generate breaks when appointments change
  useEffect(() => {
    if (!isLoading && pauseCounterRef.current === 0 && appointments.length > 1) {
      // Clear any existing timeout
      if (autoGenerationTimeoutRef.current) {
        clearTimeout(autoGenerationTimeoutRef.current);
      }
      
      // Use a small delay to prevent infinite loops and allow state to settle
      autoGenerationTimeoutRef.current = setTimeout(() => {
        autoGenerateBreaks();
        autoGenerationTimeoutRef.current = null;
      }, 500);
      
      return () => {
        if (autoGenerationTimeoutRef.current) {
          clearTimeout(autoGenerationTimeoutRef.current);
          autoGenerationTimeoutRef.current = null;
        }
      };
    }
  }, [appointments.map(a => `${a.id}:${a.start_time}:${a.end_time}`).join('|'), isLoading, autoGenerateBreaks]);

  return {
    appointments,
    breaks,
    isLoading,
    error,
    loadSchedule,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    createBreak,
    updateBreak,
    deleteBreak,
    getAllScheduleItems,
    autoGenerateBreaks,
    pauseAutoGeneration: () => {
      pauseCounterRef.current += 1;
    },
    resumeAutoGeneration: () => {
      pauseCounterRef.current = Math.max(0, pauseCounterRef.current - 1);
      // Trigger auto-generation if counter is back to 0
      if (pauseCounterRef.current === 0 && appointments.length > 1) {
        if (autoGenerationTimeoutRef.current) {
          clearTimeout(autoGenerationTimeoutRef.current);
        }
        autoGenerationTimeoutRef.current = setTimeout(() => {
          autoGenerateBreaks();
          autoGenerationTimeoutRef.current = null;
        }, 500);
      }
    },
  };
};
