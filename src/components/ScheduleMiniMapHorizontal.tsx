import React, { useEffect, useRef, useState } from 'react';
import type { Appointment, Break, ScheduleItem } from '../types';
import { parseISO, format } from 'date-fns';

interface ScheduleMiniMapHorizontalProps {
  appointments: Appointment[];
  breaks: Break[];
  startHour?: number;
  endHour?: number;
  scheduleContainerId: string;
}

/**
 * Horizontal mini-map component for mobile view
 * Shows a compact overview of the day's schedule in horizontal layout
 */
export const ScheduleMiniMapHorizontal: React.FC<ScheduleMiniMapHorizontalProps> = ({
  appointments,
  breaks,
  startHour = 7,
  endHour = 23,
  scheduleContainerId,
}) => {
  const miniMapRef = useRef<HTMLDivElement>(null);
  const [viewportLeft, setViewportLeft] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(100);
  const [currentTimePosition, setCurrentTimePosition] = useState<number | null>(null);

  const totalHours = endHour - startHour;
  const miniMapWidth = 100; // Percentage width
  const pixelsPerHourPercent = miniMapWidth / totalHours;

  /**
   * Calculate position for a schedule item in the mini-map
   */
  const getItemPosition = (item: ScheduleItem): { left: number; width: number } => {
    const itemTime = parseISO(item.start_time);
    const itemHour = itemTime.getHours();
    const itemMinute = itemTime.getMinutes();
    const hoursFromStart = itemHour - startHour + itemMinute / 60;
    const left = hoursFromStart * pixelsPerHourPercent;
    const width = (item.duration_minutes / 60) * pixelsPerHourPercent;
    return { left, width: Math.max(width, 0.5) }; // Minimum 0.5% width for visibility
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

    const viewportLeftPercent = (scrollTop / scrollHeight) * 100;
    const viewportWidthPercent = (clientHeight / scrollHeight) * 100;

    setViewportLeft(viewportLeftPercent);
    setViewportWidth(viewportWidthPercent);
  };

  /**
   * Handle click on mini-map to scroll to that time
   */
  const handleMiniMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    
    const scheduleContainer = document.getElementById(scheduleContainerId);
    if (!scheduleContainer) return;

    const targetScrollTop = clickPercent * scheduleContainer.scrollHeight;
    scheduleContainer.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    });
  };

  /**
   * Update current time position
   */
  const updateCurrentTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    // Only show if current time is within schedule hours
    if (currentHour >= startHour && currentHour < endHour) {
      const hoursFromStart = currentHour - startHour + currentMinute / 60;
      const position = (hoursFromStart / totalHours) * 100;
      setCurrentTimePosition(position);
    } else {
      setCurrentTimePosition(null);
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scheduleContainerId]);

  /**
   * Update current time position periodically
   */
  useEffect(() => {
    updateCurrentTime();
    const interval = setInterval(updateCurrentTime, 60000); // Update every minute
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startHour, endHour, totalHours]);

  /**
   * Render hour markers
   */
  const renderHourMarkers = () => {
    const markers = [];
    // Show markers at key hours
    const displayHours = [7, 9, 11, 13, 15, 17, 19, 21, 23];
    
    for (const hour of displayHours) {
      const position = ((hour - startHour) / totalHours) * 100;
      markers.push(
        <div
          key={hour}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${position}%` }}
        >
          <div className="w-px h-full bg-gray-300" />
          <div className="absolute -bottom-5 text-xs text-gray-600 font-medium">
            {hour}
          </div>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4">
      {/* <h3 className="text-sm font-semibold text-gray-700 mb-3">Огляд дня</h3>
       */}
      {/* Mini-map container */}
      <div
        ref={miniMapRef}
        className="relative bg-gray-50 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors"
        style={{ height: '50px', width: '100%' }}
        onClick={handleMiniMapClick}
      >
        {/* Hour markers */}
        {renderHourMarkers()}

        {/* Time range container */}
        <div className="absolute top-0 left-0 right-0 bottom-0">
          {/* Appointments */}
          {appointments.map((appointment) => {
            const { left, width } = getItemPosition(appointment);
            return (
              <div
                key={appointment.id}
                className="absolute top-0 bottom-0 h-full"
                style={{ 
                  left: `${left}%`, 
                  width: `${width}%`,
                }}
                title={`${appointment.client_name} - ${format(parseISO(appointment.start_time), 'HH:mm')}`}
              >
                <div className="h-full bg-primary-500 rounded-sm" />
              </div>
            );
          })}

          {/* Breaks */}
          {breaks.map((breakItem) => {
            const { left, width } = getItemPosition(breakItem);
            return (
              <div
                key={breakItem.id}
                className="absolute top-0 bottom-0 h-full"
                style={{ 
                  left: `${left}%`, 
                  width: `${width}%`,
                }}
                title={`Перерва - ${format(parseISO(breakItem.start_time), 'HH:mm')}`}
              >
                <div className="h-full bg-amber-400 border border-amber-500 rounded-sm" />
              </div>
            );
          })}

          {/* Current time indicator */}
          {currentTimePosition !== null && (
            <div
              className="absolute top-0 bottom-0 pointer-events-none z-20"
              style={{ left: `${currentTimePosition}%` }}
            >
              <div className="h-full w-0.5" style={{ backgroundColor: '#1e293b' }} />
              <div className="absolute left-0 top-0 transform -translate-x-1/2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#1e293b' }} />
              </div>
            </div>
          )}

          {/* Viewport indicator */}
          <div
            className="absolute top-0 bottom-0 bg-green-600/60 border-2 border-green-600 rounded pointer-events-none"
            style={{
              left: `${viewportLeft}%`,
              width: `${viewportWidth}%`,
            }}
          />
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-5 pt-2 text-xs text-gray-600">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-primary-500 rounded flex-shrink-0" />
          <span>Записи</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-amber-400 border border-amber-500 rounded flex-shrink-0" />
          <span>Перерви</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-0.5 flex-shrink-0" style={{ backgroundColor: '#1e293b' }} />
          <span>Поточний час</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 bg-green-600/60 border-2 border-green-600 rounded flex-shrink-0" />
          <span>Видимість екрану</span>
        </div>
      </div>
    </div>
  );
};
