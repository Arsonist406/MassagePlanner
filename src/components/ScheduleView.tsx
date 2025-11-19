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
  startHour = 7,
  endHour = 23,
  pixelsPerHour = 560,
}) => {
  const [dragItem, setDragItem] = useState<{
    id: string;
    type: 'appointment' | 'break';
    startY: number;
    startTime: string;
    hasMoved: boolean;
  } | null>(null);

  const [showCalendar, setShowCalendar] = useState(false);

  const totalHours = endHour - startHour;
  const scheduleHeight = totalHours * pixelsPerHour;

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
   * Check if a time range overlaps with any existing items
   */
  const hasOverlap = (
    itemId: string,
    newStartTime: Date,
    durationMinutes: number
  ): boolean => {
    const newEndTime = new Date(newStartTime.getTime() + durationMinutes * 60000);
    
    // Check all appointments
    for (const apt of appointments) {
      if (apt.id === itemId) continue;
      const aptStart = parseISO(apt.start_time);
      const aptEnd = parseISO(apt.end_time);
      
      // Check if time ranges overlap
      if (newStartTime < aptEnd && newEndTime > aptStart) {
        return true;
      }
    }
    
    // Check all breaks
    for (const brk of breaks) {
      if (brk.id === itemId) continue;
      const brkStart = parseISO(brk.start_time);
      const brkEnd = parseISO(brk.end_time);
      
      // Check if time ranges overlap
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
    
    // Check if new start time is before 7:00
    const minTime = new Date(newStartTime);
    minTime.setHours(7, 0, 0, 0);
    if (newStartTime < minTime) return false;
    
    // Check if new end time exceeds 23:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(23, 0, 0, 0);
    if (newEndTime > maxTime) return false;
    
    // Check for overlaps
    if (hasOverlap(id, newStartTime, item.duration_minutes)) return false;
    
    return true;
  };

  /**
   * Convert Y position to time with constraints (7:00 - 23:00)
   */
  const yToTime = (y: number, containerTop: number, scrollTop: number): Date => {
    const relativeY = y - containerTop + scrollTop;
    const hours = relativeY / pixelsPerHour;
    const totalMinutes = Math.round((hours * 60) / 5) * 5; // Snap to 5 minutes

    const date = new Date();
    date.setHours(startHour, 0, 0, 0);
    date.setMinutes(date.getMinutes() + totalMinutes);
    
    // Constrain to 7:00 - 23:00
    const minTime = new Date();
    minTime.setHours(7, 0, 0, 0);
    const maxTime = new Date();
    maxTime.setHours(23, 0, 0, 0);
    
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
    setDragItem({ id, type, startY: clientY, startTime, hasMoved: false });
  };

  /**
   * Handle appointment start time update with constraints and overlap check
   */
  const handleUpdateAppointmentStartTime = (id: string, minutesShift: number) => {
    const appointment = appointments.find(a => a.id === id);
    if (!appointment) return;

    const currentStartTime = parseISO(appointment.start_time);
    const newStartTime = new Date(currentStartTime.getTime() + minutesShift * 60000);
    const newEndTime = new Date(newStartTime.getTime() + appointment.duration_minutes * 60000);

    // Check if new start time is before 7:00
    const minTime = new Date(newStartTime);
    minTime.setHours(7, 0, 0, 0);
    if (newStartTime < minTime) {
      alert('Неможливо перемістити: запис виходить за межі робочого часу (7:00)');
      return;
    }

    // Check if new end time exceeds 23:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(23, 0, 0, 0);
    if (newEndTime > maxTime) {
      alert('Неможливо перемістити: запис виходить за межі робочого часу (23:00)');
      return;
    }

    // Check for overlaps
    if (hasOverlap(id, newStartTime, appointment.duration_minutes)) {
      alert('Неможливо перемістити: запис перетинається з іншим записом або перервою');
      return;
    }

    onUpdateAppointment(id, { start_time: newStartTime.toISOString() });
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

    // Check if new start time is before 7:00
    const minTime = new Date(newStartTime);
    minTime.setHours(7, 0, 0, 0);
    if (newStartTime < minTime) {
      alert('Неможливо перемістити: перерва виходить за межі робочого часу (7:00)');
      return;
    }

    // Check if new end time exceeds 23:00
    const maxTime = new Date(newStartTime);
    maxTime.setHours(23, 0, 0, 0);
    if (newEndTime > maxTime) {
      alert('Неможливо перемістити: перерва виходить за межі робочого часу (23:00)');
      return;
    }

    // Check for overlaps
    if (hasOverlap(id, newStartTime, breakItem.duration_minutes)) {
      alert('Неможливо перемістити: перерва перетинається з іншим записом або перервою');
      return;
    }

    onUpdateBreak(id, { start_time: newStartTime.toISOString() });
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

    const handleEnd = (e: MouseEvent | TouchEvent) => {
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
              // Check for overlaps
              if (hasOverlap(dragItem.id, newTime, currentItem.duration_minutes)) {
                alert('Неможливо перемістити: новий час перетинається з іншим записом або перервою');
                setDragItem(null);
                return;
              }
              
              const newTimeISO = newTime.toISOString();
              if (dragItem.type === 'appointment') {
                onUpdateAppointment(dragItem.id, { start_time: newTimeISO });
              } else {
                onUpdateBreak(dragItem.id, { start_time: newTimeISO });
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
   * Render time labels (hourly and 5-minute intervals)
   */
  const renderTimeLabels = () => {
    const labels = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      // Hour labels (larger, bold)
      const time = setMinutes(setHours(new Date(), hour), 0);
      labels.push(
        <div
          key={`hour-${hour}`}
          className="absolute left-0 pl-2 text-base sm:text-lg text-gray-700 font-semibold"
          style={{ top: `${(hour - startHour) * pixelsPerHour - 8}px` }}
        >
          {format(time, 'HH:mm', { locale: uk })}
        </div>
      );
      
      // 5-minute interval labels (smaller, lighter)
      if (hour < endHour) {
        for (let i = 1; i < 12; i++) {
          const minutes = i * 5;
          const intervalTime = setMinutes(setHours(new Date(), hour), minutes);
          // Make 15-minute marks slightly more prominent
          const isQuarterHour = minutes % 15 === 0;
          labels.push(
            <div
              key={`interval-${hour}-${minutes}`}
              className={`absolute left-0 pl-2 ${isQuarterHour ? 'text-sm text-gray-500 font-medium' : 'text-xs text-gray-400'}`}
              style={{ top: `${(hour - startHour) * pixelsPerHour + (minutes / 60) * pixelsPerHour - 6}px` }}
            >
              {format(intervalTime, 'HH:mm', { locale: uk })}
            </div>
          );
        }
      }
    }
    return labels;
  };

  /**
   * Render hour grid lines with 15-minute and 5-minute subdivisions
   */
  const renderGridLines = () => {
    const lines = [];
    
    for (let hour = startHour; hour <= endHour; hour++) {
      // Hour line (thicker, darker)
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
      
      // Don't add subdivisions after the last hour
      if (hour < endHour) {
        // 15-minute subdivisions (visible, medium thickness)
        for (let quarter = 1; quarter < 4; quarter++) {
          const minutes = quarter * 15;
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
        
        // 5-minute subdivisions (subtle but visible)
        for (let i = 1; i < 12; i++) {
          // Skip the 15-minute marks (already rendered above)
          if (i % 3 === 0) continue;
          
          const minutes = i * 5;
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

  const toggleCalendar = () => {
    setShowCalendar(!showCalendar);
    setCalendarMonth(selectedDate);
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800">
              {getDateHeader()}
            </h2>
            <div className="flex items-center gap-2 relative">
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
              
              {/* Date picker */}
              <button
                onClick={toggleCalendar}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                title="Відкрити календар"
              >
                <span>{format(selectedDate, 'dd/MM/yyyy')}</span>
                <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Calendar dropdown */}
              {showCalendar && (
                <div className="absolute top-full left-0 mt-2 bg-white border border-gray-300 rounded-lg shadow-lg p-4 z-50 calendar-container" style={{ width: '280px' }}>
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
              
              {/* Today button */}
              {!isToday(selectedDate) && (
                <button
                  onClick={goToToday}
                  className="ml-2 px-3 py-2 bg-primary-600 text-white text-sm rounded-md hover:bg-primary-700 transition-colors"
                >
                  Сьогодні
                </button>
              )}
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
