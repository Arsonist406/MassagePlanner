import React, { useEffect, useRef, useState } from 'react';
import type { Appointment, Break, ScheduleItem } from '../types';
import { parseISO, format } from 'date-fns';

interface ScheduleMiniMapProps {
  appointments: Appointment[];
  breaks: Break[];
  startHour?: number;
  endHour?: number;
  scheduleContainerId: string;
}

/**
 * Mini-map component that shows a compact overview of the day's schedule
 * Displays appointments and breaks with a viewport indicator
 */
export const ScheduleMiniMap: React.FC<ScheduleMiniMapProps> = ({
  appointments,
  breaks,
  startHour = 7,
  endHour = 23,
  scheduleContainerId,
}) => {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [viewportTop, setViewportTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(100);

  const totalHours = endHour - startHour;
  const miniMapHeight = 480; // Total height of mini-map
  const pixelsPerHour = miniMapHeight / totalHours;

  /**
   * Calculate position for a schedule item in the mini-map
   */
  const getItemPosition = (item: ScheduleItem): { top: number; height: number } => {
    const itemTime = parseISO(item.start_time);
    const itemHour = itemTime.getHours();
    const itemMinute = itemTime.getMinutes();
    const hoursFromStart = itemHour - startHour + itemMinute / 60;
    const top = hoursFromStart * pixelsPerHour;
    const height = (item.duration_minutes / 60) * pixelsPerHour;
    return { top, height: Math.max(height, 3) }; // Minimum 3px height for visibility
  };

  /**
   * Update viewport indicator position based on scroll
   */
  const updateViewport = () => {
    const scheduleContainer = document.getElementById(scheduleContainerId);
    if (!scheduleContainer) return;

    const scrollTop = scheduleContainer.scrollTop;
    const clientHeight = scheduleContainer.clientHeight;
    const scrollHeight = scheduleContainer.scrollHeight;

    const viewportTopPercent = (scrollTop / scrollHeight) * miniMapHeight;
    const viewportHeightPercent = (clientHeight / scrollHeight) * miniMapHeight;

    setViewportTop(viewportTopPercent);
    setViewportHeight(viewportHeightPercent);
  };

  /**
   * Handle click on mini-map to scroll to that time
   */
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!miniMapRef.current) return;

    const rect = miniMapRef.current.getBoundingClientRect();
    const clickY = e.clientY - rect.top;
    const clickPercent = clickY / miniMapHeight;
    
    const scheduleContainer = document.getElementById(scheduleContainerId);
    if (!scheduleContainer) return;

    const targetScrollTop = clickPercent * scheduleContainer.scrollHeight;
    scheduleContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  };

  /**
   * Listen to scroll events
   */
  useEffect(() => {
    const scheduleContainer = document.getElementById(scheduleContainerId);
    if (!scheduleContainer) return;

    updateViewport();
    scheduleContainer.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      scheduleContainer.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [scheduleContainerId]);

  /**
   * Render hour labels
   */
  const renderHourLabels = () => {
    const labels = [];
    const displayHours = [7, 9, 11, 13, 15, 17, 19, 21, 23];
    
    for (const hour of displayHours) {
      labels.push(
        <div
          key={hour}
          className="text-xs text-gray-600 font-medium"
          style={{ marginBottom: `${pixelsPerHour * 2 - 18}px` }}
        >
          {hour}:00
        </div>
      );
    }
    return labels;
  };

  /**
   * Render grid lines
   */
  const renderGridLines = () => {
    const lines = [];
    for (let hour = startHour; hour <= endHour; hour++) {
      lines.push(
        <div
          key={hour}
          className="absolute left-0 right-0 border-t border-gray-200"
          style={{ top: `${(hour - startHour) * pixelsPerHour}px` }}
        />
      );
    }
    return lines;
  };

  return (
    <div className="flex flex-col bg-white rounded-lg shadow-md p-4 sticky top-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Огляд дня</h3>
      
      <div className="flex gap-3">
        {/* Hour labels */}
        <div className="flex flex-col text-right pt-0.5">
          {renderHourLabels()}
        </div>

        {/* Mini-map container */}
        <div
          ref={miniMapRef}
          className="relative flex-1 bg-gray-50 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
          style={{ height: `${miniMapHeight}px`, minWidth: '100px' }}
          onClick={handleMiniMapClick}
        >
          {/* Grid lines */}
          {renderGridLines()}

          {/* Appointments */}
          {appointments.map((appointment) => {
            const { top, height } = getItemPosition(appointment);
            return (
              <div
                key={appointment.id}
                className="absolute left-0 right-0 mx-0.5"
                style={{ top: `${top}px` }}
                title={`${appointment.client_name} - ${format(parseISO(appointment.start_time), 'HH:mm')}`}
              >
                <div
                  className="bg-primary-500 rounded-sm"
                  style={{ height: `${height}px` }}
                />
              </div>
            );
          })}

          {/* Breaks */}
          {breaks.map((breakItem) => {
            const { top, height } = getItemPosition(breakItem);
            return (
              <div
                key={breakItem.id}
                className="absolute left-0 right-0 mx-0.5"
                style={{ top: `${top}px` }}
                title={`Перерва - ${format(parseISO(breakItem.start_time), 'HH:mm')}`}
              >
                <div
                  className="bg-amber-400 border border-amber-500 rounded-sm"
                  style={{ height: `${height}px` }}
                />
              </div>
            );
          })}

          {/* Viewport indicator */}
          <div
            className="absolute left-0 right-0 bg-blue-500/20 border-2 border-blue-500 rounded pointer-events-none"
            style={{
              top: `${viewportTop}px`,
              height: `${viewportHeight}px`,
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 text-base text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-primary-500 rounded flex-shrink-0" />
          <span>Записи</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 bg-amber-400 border border-amber-500 rounded flex-shrink-0" />
          <span>Перерви</span>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
        <div className="flex justify-between text-base">
          <span className="text-gray-600">Записів:</span>
          <span className="font-semibold text-primary-600">{appointments.length}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-gray-600">Перерв:</span>
          <span className="font-semibold text-amber-600">{breaks.length}</span>
        </div>
        <div className="flex justify-between text-base">
          <span className="text-gray-600">Всього хв:</span>
          <span className="font-semibold text-green-600">
            {appointments.reduce((sum, a) => sum + a.duration_minutes, 0)}
          </span>
        </div>
      </div>
    </div>
  );
};
