import { useState, useEffect, useCallback } from 'react';
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
  calculateEndTime,
} from '../services/appointmentService';
import { parseISO, formatISO } from 'date-fns';

/**
 * Custom hook for managing appointments and breaks
 * Handles local state + Supabase synchronization
 */
export const useAppointments = () => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [breaks, setBreaks] = useState<Break[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  };
};
