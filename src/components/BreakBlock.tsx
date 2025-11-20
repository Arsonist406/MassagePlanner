import React from 'react';
import type { Break } from '../types';
import { format, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

interface BreakBlockProps {
  breakItem: Break;
  onDelete: (id: string) => void;
  onDragStart: (id: string, startTime: string, clientY: number) => void;
  onUpdateStartTime: (id: string, minutesShift: number) => void;
  canShiftTime: (id: string, minutesShift: number) => boolean;
  pixelsPerHour?: number;
  scrollContainerId?: string;
}

/**
 * Individual break block in the schedule
 * Displays break details and handles drag/resize interactions
 */
export const BreakBlock: React.FC<BreakBlockProps> = ({
  breakItem,
  onDragStart,
  pixelsPerHour = 80,
}) => {
  const heightPixels = (breakItem.duration_minutes / 60) * pixelsPerHour;

  const handleMouseDown = (e: React.MouseEvent) => {
    onDragStart(breakItem.id, breakItem.start_time, e.clientY);
  };

  return (
    <div
      className="appointment-block absolute left-0 right-0 bg-amber-100 border-2 border-amber-300 text-amber-800 rounded-md select-none mx-1 md:cursor-move"
      style={{
        height: `${heightPixels}px`,
        minHeight: '40px',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-2 h-full relative flex items-center">
        {/* Content */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
          <div className="font-medium text-xl sm:text-2xl">
            Перерва
          </div>
          <div className="flex items-center gap-2">
            <div className="text-lg sm:text-xl">
              {format(parseISO(breakItem.start_time), 'HH:mm', { locale: uk })} -{' '}
              {format(parseISO(breakItem.end_time), 'HH:mm', { locale: uk })}
            </div>
            <div className="text-lg sm:text-xl opacity-75 whitespace-nowrap">
              ({breakItem.duration_minutes} хв)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
