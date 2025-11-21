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
  const [forceRefresh, setForceRefresh] = useState(0);
  const pauseCounterRef = useRef(0);
  const autoGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const appointmentsRef = useRef<Appointment[]>([]);
  const breaksRef = useRef<Break[]>([]);

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

  // Update refs when state changes
  useEffect(() => {
    appointmentsRef.current = appointments;
  }, [appointments]);

  useEffect(() => {
    breaksRef.current = breaks;
  }, [breaks]);

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
        // Clear any previous errors on success
        setError(null);
        return updatedBreak;
      } catch (err) {
        console.error('Failed to update break:', err);
        setError('Failed to update break');
        // Clear error after 3 seconds
        setTimeout(() => setError(null), 3000);
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
      // Clear any previous errors on success
      setError(null);
    } catch (err) {
      console.error('Failed to delete break:', err);
      setError('Failed to delete break');
      // Clear error after 3 seconds
      setTimeout(() => setError(null), 3000);
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
      console.log('[AutoGen] Skipped - paused');
      return;
    }
    
    console.log('[AutoGen] Running...');
    
    try {
      // Fetch the absolute latest data from the database to avoid stale data issues
      const [latestAppointments, latestBreaks] = await Promise.all([
        fetchAppointments(),
        fetchBreaks(),
      ]);
      
      console.log('[AutoGen] Latest appointments from DB:', latestAppointments.length);
      console.log('[AutoGen] Latest breaks from DB:', latestBreaks.length);
      
      // Sort appointments by start time
      const sortedAppointments = [...latestAppointments].sort((a, b) =>
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

          // Check if any breaks exist in or overlap with this gap
          const existingBreaks = latestBreaks.filter(brk => {
            const brkStart = new Date(brk.start_time);
            const brkEnd = new Date(brk.end_time);
            // Break overlaps this gap if:
            // - It starts within the gap, OR
            // - It ends within the gap, OR
            // - It completely spans the gap
            return (brkStart >= currentEnd && brkStart < nextStart) ||
                   (brkEnd > currentEnd && brkEnd <= nextStart) ||
                   (brkStart < currentEnd && brkEnd > nextStart);
          });
          
          // Take the first overlapping break
          const existingBreak = existingBreaks[0];

          if (existingBreak) {
            // Update existing break to match the full gap
            const targetDuration = Math.floor(gapMinutes);
            const targetStart = currentEnd.toISOString();
            
            console.log(`[AutoGen] Found existing break ${existingBreak.id} in gap between appointments ${i} and ${i+1}`);
            console.log(`  Current: ${existingBreak.start_time} (${existingBreak.duration_minutes}min)`);
            console.log(`  Target: ${targetStart} (${targetDuration}min)`);
            
            // Always update if start time or duration doesn't match the full gap
            if (existingBreak.start_time !== targetStart || 
                existingBreak.duration_minutes !== targetDuration) {
              console.log(`  → Will update break ${existingBreak.id}`);
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

      // Find breaks that should be deleted (gap > 30 minutes or not between consecutive appointments)
      // Don't delete breaks that are already marked for update
      const breaksBeingUpdated = new Set(breaksToUpdate.map(u => u.id));
      
      for (const brk of latestBreaks) {
        // Skip breaks that are being updated
        if (breaksBeingUpdated.has(brk.id)) {
          continue;
        }
        
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

      // Execute all operations using the service functions directly
      // and then update state in a single batch for better performance
      
      console.log('[AutoGen] Operations to perform:');
      console.log('  - Create:', breaksToCreate.length);
      console.log('  - Update:', breaksToUpdate.length);
      console.log('  - Delete:', breaksToDelete.length);
      
      if (breaksToUpdate.length > 0) {
        console.log('[AutoGen] Break updates:', breaksToUpdate);
      }
      
      // Execute operations with individual error handling
      for (const breakData of breaksToCreate) {
        try {
          await createBreakService(breakData);
        } catch (err) {
          console.error('[AutoGen] Failed to create break:', err);
        }
      }

      for (const { id, updates } of breaksToUpdate) {
        try {
          await updateBreakService(id, updates);
        } catch (err) {
          console.error(`[AutoGen] Failed to update break ${id}:`, err);
          // Break might have been deleted already, continue with others
        }
      }

      for (const breakId of breaksToDelete) {
        try {
          await deleteBreakService(breakId);
        } catch (err) {
          console.error(`[AutoGen] Failed to delete break ${breakId}:`, err);
          // Break might have been deleted already, continue with others
        }
      }

      // Fetch and update breaks state (even if some operations failed)
      if (breaksToCreate.length > 0 || breaksToUpdate.length > 0 || breaksToDelete.length > 0) {
        const updatedBreaks = await fetchBreaks();
        console.log('[AutoGen] Fetched updated breaks:', updatedBreaks.length);
        setBreaks(updatedBreaks);
        console.log('[AutoGen] State updated successfully');
      } else {
        console.log('[AutoGen] No changes needed');
      }
    } catch (err) {
      console.error('Failed to auto-generate breaks:', err);
    }
  }, []); // Empty dependencies - we use refs to access latest state

  // Auto-generate breaks when appointments change or when forced
  useEffect(() => {
    if (!isLoading && pauseCounterRef.current === 0 && appointments.length > 1) {
      // Clear any existing timeout to prevent multiple concurrent runs
      if (autoGenerationTimeoutRef.current) {
        clearTimeout(autoGenerationTimeoutRef.current);
      }
      
      // Use a delay to debounce rapid changes
      autoGenerationTimeoutRef.current = setTimeout(() => {
        console.log('[AutoGen] Timeout triggered, running auto-generation');
        autoGenerateBreaks();
        autoGenerationTimeoutRef.current = null;
      }, 100);
      
      return () => {
        if (autoGenerationTimeoutRef.current) {
          clearTimeout(autoGenerationTimeoutRef.current);
          autoGenerationTimeoutRef.current = null;
        }
      };
    }
  }, [appointments.map(a => `${a.id}:${a.start_time}:${a.end_time}`).join('|'), isLoading, autoGenerateBreaks, forceRefresh]);

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
      console.log('[AutoGen] Resume called, counter now:', pauseCounterRef.current);
      // Trigger auto-generation by updating forceRefresh state
      if (pauseCounterRef.current === 0) {
        console.log('[AutoGen] Triggering forceRefresh');
        setForceRefresh(prev => prev + 1);
      }
    },
  };
};
