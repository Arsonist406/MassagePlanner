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
  const [isDragging, setIsDragging] = useState(false);

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
   * Scroll to position with the viewport centered at clickPercent
   */
  const scrollToPercent = (clickPercent: number, smooth: boolean = true) => {
    const scheduleContainer = document.getElementById(scheduleContainerId);
    if (!scheduleContainer) return;

    // Calculate the target scroll position so the viewport is centered at the click position
    const viewportHeightPercent = (scheduleContainer.clientHeight / scheduleContainer.scrollHeight);
    const targetScrollPercent = clickPercent - (viewportHeightPercent / 2);
    const clampedScrollPercent = Math.max(0, Math.min(1 - viewportHeightPercent, targetScrollPercent));
    
    const targetScrollTop = clampedScrollPercent * scheduleContainer.scrollHeight;
    scheduleContainer.scrollTo({
      top: targetScrollTop,
      behavior: smooth ? 'smooth' : 'auto'
    });
  };

  /**
   * Handle mouse down on mini-map to start dragging
   */
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = clickX / rect.width;
    scrollToPercent(clickPercent, false);
  };

  /**
   * Handle mouse move for dragging
   */
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickPercent = Math.max(0, Math.min(1, clickX / rect.width));
    scrollToPercent(clickPercent, false);
  };

  /**
   * Handle mouse up to stop dragging
   */
  const handleMouseUp = () => {
    setIsDragging(false);
  };

  /**
   * Handle touch start for mobile
   */
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchPercent = touchX / rect.width;
    scrollToPercent(touchPercent, false);
  };

  /**
   * Handle touch move for mobile dragging
   */
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const touch = e.touches[0];
    const touchX = touch.clientX - rect.left;
    const touchPercent = Math.max(0, Math.min(1, touchX / rect.width));
    scrollToPercent(touchPercent, false);
  };

  /**
   * Handle touch end to stop dragging
   */
  const handleTouchEnd = () => {
    setIsDragging(false);
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
   * Add global mouse/touch up listeners when dragging
   */
  useEffect(() => {
    if (isDragging) {
      const handleGlobalMouseUp = () => setIsDragging(false);
      const handleGlobalTouchEnd = () => setIsDragging(false);
      
      window.addEventListener('mouseup', handleGlobalMouseUp);
      window.addEventListener('touchend', handleGlobalTouchEnd);
      
      return () => {
        window.removeEventListener('mouseup', handleGlobalMouseUp);
        window.removeEventListener('touchend', handleGlobalTouchEnd);
      };
    }
  }, [isDragging]);

  /**
   * Render hour markers
   */
  const renderHourMarkers = () => {
    const markers = [];
    // Show markers for every hour
    for (let hour = startHour; hour <= endHour; hour++) {
      const position = ((hour - startHour) / totalHours) * 100;
      markers.push(
        <div
          key={hour}
          className="absolute top-0 bottom-0 flex flex-col items-center"
          style={{ left: `${position}%` }}
        >
          <div className="w-px h-full bg-gray-400" />
          <div className="absolute -bottom-5 text-xs text-gray-600 font-medium">
            {hour}
          </div>
        </div>
      );
    }
    return markers;
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 pb-8">
      {/* <h3 className="text-sm font-semibold text-gray-700 mb-3">Огляд дня</h3>
       */}
      {/* Mini-map container */}
      <div
        ref={miniMapRef}
        className="relative bg-gray-50 rounded border border-gray-300 cursor-pointer hover:border-gray-400 transition-colors select-none"
        style={{ height: '50px', width: '100%' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
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
                <div className="h-full bg-primary-500 border border-primary-700 rounded-sm" />
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
                <div className="h-full bg-amber-400 border border-amber-600 rounded-sm" />
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
    </div>
  );
};
