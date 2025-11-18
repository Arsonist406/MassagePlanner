import { supabase } from './supabaseClient';
import type { Appointment, Break } from '../types';
import { addMinutes, parseISO, formatISO } from 'date-fns';

/**
 * Calculate end time based on start time and duration
 */
export const calculateEndTime = (
  startTime: string,
  durationMinutes: number
): string => {
  const start = parseISO(startTime);
  const end = addMinutes(start, durationMinutes);
  return formatISO(end);
};

/**
 * Fetch all appointments from Supabase
 */
export const fetchAppointments = async (): Promise<Appointment[]> => {
  const { data, error } = await supabase
    .from('appointments')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    throw error;
  }

  return data || [];
};

/**
 * Fetch all breaks from Supabase
 */
export const fetchBreaks = async (): Promise<Break[]> => {
  const { data, error } = await supabase
    .from('breaks')
    .select('*')
    .order('start_time', { ascending: true });

  if (error) {
    console.error('Error fetching breaks:', error);
    throw error;
  }

  return data || [];
};

/**
 * Create a new appointment in Supabase
 */
export const createAppointment = async (
  appointment: Omit<Appointment, 'id' | 'created_at' | 'updated_at'>
): Promise<Appointment> => {
  const endTime = calculateEndTime(
    appointment.start_time,
    appointment.duration_minutes
  );

  const { data, error } = (await supabase
    .from('appointments')
    // @ts-ignore - Supabase generic type issue
    .insert({
      ...appointment,
      end_time: endTime,
    })
    .select()
    .single()) as { data: Appointment | null; error: any };

  if (error || !data) {
    console.error('Error creating appointment:', error);
    throw error || new Error('No data returned');
  }

  return data;
};

/**
 * Update an existing appointment in Supabase
 */
export const updateAppointment = async (
  id: string,
  updates: Partial<Omit<Appointment, 'id' | 'created_at' | 'updated_at'>>
): Promise<Appointment> => {
  // Recalculate end_time if start_time or duration changed
  let endTime: string | undefined;
  if (updates.start_time || updates.duration_minutes) {
    const { data: currentData } = await supabase
      .from('appointments')
      .select('start_time, duration_minutes')
      .eq('id', id)
      .single();

    if (currentData) {
      const startTime = updates.start_time || (currentData as any).start_time;
      const duration = updates.duration_minutes || (currentData as any).duration_minutes;
      endTime = calculateEndTime(startTime, duration);
    }
  }

  const { data, error } = (await supabase
    .from('appointments')
    // @ts-ignore - Supabase generic type issue
    .update({
      ...updates,
      ...(endTime && { end_time: endTime }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()) as { data: Appointment | null; error: any };

  if (error || !data) {
    console.error('Error updating appointment:', error);
    throw error || new Error('No data returned');
  }

  return data;
};

/**
 * Delete an appointment from Supabase
 */
export const deleteAppointment = async (id: string): Promise<void> => {
  const { error } = await supabase.from('appointments').delete().eq('id', id);

  if (error) {
    console.error('Error deleting appointment:', error);
    throw error;
  }
};

/**
 * Create a new break in Supabase
 */
export const createBreak = async (
  breakItem: Omit<Break, 'id' | 'created_at' | 'updated_at'>
): Promise<Break> => {
  const endTime = calculateEndTime(
    breakItem.start_time,
    breakItem.duration_minutes
  );

  const { data, error } = (await supabase
    .from('breaks')
    // @ts-ignore - Supabase generic type issue
    .insert({
      ...breakItem,
      end_time: endTime,
    })
    .select()
    .single()) as { data: Break | null; error: any };

  if (error || !data) {
    console.error('Error creating break:', error);
    throw error || new Error('No data returned');
  }

  return data;
};

/**
 * Update an existing break in Supabase
 */
export const updateBreak = async (
  id: string,
  updates: Partial<Omit<Break, 'id' | 'created_at' | 'updated_at'>>
): Promise<Break> => {
  // Recalculate end_time if start_time or duration changed
  let endTime: string | undefined;
  if (updates.start_time || updates.duration_minutes) {
    const { data: currentData } = await supabase
      .from('breaks')
      .select('start_time, duration_minutes')
      .eq('id', id)
      .single();

    if (currentData) {
      const startTime = updates.start_time || (currentData as any).start_time;
      const duration = updates.duration_minutes || (currentData as any).duration_minutes;
      endTime = calculateEndTime(startTime, duration);
    }
  }

  const { data, error } = (await supabase
    .from('breaks')
    // @ts-ignore - Supabase generic type issue
    .update({
      ...updates,
      ...(endTime && { end_time: endTime }),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()) as { data: Break | null; error: any };

  if (error || !data) {
    console.error('Error updating break:', error);
    throw error || new Error('No data returned');
  }

  return data;
};

/**
 * Delete a break from Supabase
 */
export const deleteBreak = async (id: string): Promise<void> => {
  const { error } = await supabase.from('breaks').delete().eq('id', id);

  if (error) {
    console.error('Error deleting break:', error);
    throw error;
  }
};
