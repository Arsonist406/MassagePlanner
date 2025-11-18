/**
 * Core appointment type representing a massage session
 */
export interface Appointment {
  id: string;
  client_name: string;
  start_time: string; // ISO 8601 format
  duration_minutes: number;
  end_time: string; // ISO 8601 format (calculated)
  notes?: string; // Optional notes
  created_at?: string;
  updated_at?: string;
}

/**
 * Break block type for gaps between appointments
 */
export interface Break {
  id: string;
  start_time: string; // ISO 8601 format
  duration_minutes: number;
  end_time: string; // ISO 8601 format
  created_at?: string;
  updated_at?: string;
}

/**
 * Union type for schedule items
 */
export type ScheduleItem = Appointment | Break;

/**
 * Form data for creating/editing appointments
 */
export interface AppointmentFormData {
  client_name: string;
  start_time: string;
  duration_minutes: number;
  notes?: string;
}

/**
 * Time slot configuration for the schedule
 */
export interface TimeSlot {
  hour: number;
  minute: number;
  label: string;
}

/**
 * Drag and drop state
 */
export interface DragState {
  itemId: string | null;
  itemType: 'appointment' | 'break' | null;
  startY: number;
  startTime: string;
  isDragging: boolean;
}

/**
 * Resize state for duration changes
 */
export interface ResizeState {
  itemId: string | null;
  itemType: 'appointment' | 'break' | null;
  startY: number;
  startDuration: number;
  isResizing: boolean;
}

/**
 * Supabase database types
 */
export interface Database {
  public: {
    Tables: {
      appointments: {
        Row: {
          id: string;
          client_name: string;
          start_time: string;
          duration_minutes: number;
          end_time: string;
          notes?: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          client_name: string;
          start_time: string;
          duration_minutes: number;
          end_time: string;
          notes?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          client_name?: string;
          start_time?: string;
          duration_minutes?: number;
          end_time?: string;
          notes?: string;
          updated_at?: string;
        };
      };
      breaks: {
        Row: {
          id: string;
          start_time: string;
          duration_minutes: number;
          end_time: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          start_time: string;
          duration_minutes: number;
          end_time: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          start_time?: string;
          duration_minutes?: number;
          end_time?: string;
          updated_at?: string;
        };
      };
    };
  };
}
