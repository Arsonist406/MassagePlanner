import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { Appointment } from '../types';
import { format, parseISO } from 'date-fns';
import { uk } from 'date-fns/locale';

interface AppointmentBlockProps {
  appointment: Appointment;
  onEdit: (appointment: Appointment) => void;
  onDelete: (id: string) => void;
  onDragStart: (id: string, startTime: string, clientY: number) => void;
  onUpdateDuration: (id: string, newDuration: number) => void;
  canAdjustDuration: (id: string, currentDuration: number, adjustment: number) => boolean;
  pixelsPerHour?: number;
  scrollContainerId?: string;
}

/**
 * Individual appointment block in the schedule
 * Displays appointment details and handles drag/resize interactions
 */
export const AppointmentBlock: React.FC<AppointmentBlockProps> = ({
  appointment,
  onEdit,
  onDelete,
  onDragStart,
  onUpdateDuration,
  canAdjustDuration,
  pixelsPerHour = 80,
  scrollContainerId,
}) => {
  const heightPixels = (appointment.duration_minutes / 60) * pixelsPerHour;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Close menu when clicking outside and update position on scroll
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    const updateMenuPosition = () => {
      if (buttonRef.current) {
        const rect = buttonRef.current.getBoundingClientRect();
        const container = scrollContainerId ? document.getElementById(scrollContainerId) : null;
        const containerRect = container?.getBoundingClientRect();
        const menuWidth = 160;
        const menuHeight = 300;
        
        let top = rect.bottom + 4;
        let left = rect.right - menuWidth;
        
        // Constrain to container bounds if container exists
        if (containerRect) {
          const maxBottom = containerRect.bottom;
          
          // If menu would overflow bottom of container, position above button
          if (top + menuHeight > maxBottom) {
            top = rect.top - menuHeight - 4;
          }
          
          // Don't clamp to container top - let menu follow button even above container
        } else {
          // Fallback to viewport bounds
          if (top + menuHeight > window.innerHeight) {
            top = rect.top - menuHeight - 4;
          }
        }
        
        if (left < 8) {
          left = 8;
        }
        setMenuPosition({ top, left });
      }
    };

    if (isMenuOpen) {
      const container = scrollContainerId ? document.getElementById(scrollContainerId) : null;
      
      document.addEventListener('mousedown', handleClickOutside);
      if (container) {
        container.addEventListener('scroll', updateMenuPosition);
      }
      window.addEventListener('resize', updateMenuPosition);
      
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        if (container) {
          container.removeEventListener('scroll', updateMenuPosition);
        }
        window.removeEventListener('resize', updateMenuPosition);
      };
    }
  }, [isMenuOpen, scrollContainerId]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;
    onDragStart(appointment.id, appointment.start_time, e.clientY);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const target = e.target as HTMLElement;
    if (target.tagName === 'BUTTON' || target.closest('button')) return;
    const touch = e.touches[0];
    onDragStart(appointment.id, appointment.start_time, touch.clientY);
  };

  return (
    <div
      className="appointment-block absolute left-0 right-0 bg-primary-500 text-white rounded-md shadow-md cursor-move select-none mx-1"
      style={{
        height: `${heightPixels}px`,
        minHeight: '40px',
        overflow: 'visible',
      }}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      <div className="p-2 h-full relative flex items-center">

        {/* Dropdown menu */}
        {isMenuOpen && createPortal(
          <div 
            ref={menuRef}
            className="fixed bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-gray-800 z-[9999] w-40"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
            }}
          >
              <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100">Тривалість</div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newDuration = Math.max(5, appointment.duration_minutes - 10);
                  onUpdateDuration(appointment.id, newDuration);
                }}
                disabled={!canAdjustDuration(appointment.id, appointment.duration_minutes, -10)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                -10 хвилин
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const newDuration = Math.max(5, appointment.duration_minutes - 5);
                  onUpdateDuration(appointment.id, newDuration);
                }}
                disabled={!canAdjustDuration(appointment.id, appointment.duration_minutes, -5)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                -5 хвилин
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateDuration(appointment.id, appointment.duration_minutes + 5);
                }}
                disabled={!canAdjustDuration(appointment.id, appointment.duration_minutes, 5)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                +5 хвилин
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onUpdateDuration(appointment.id, appointment.duration_minutes + 10);
                }}
                disabled={!canAdjustDuration(appointment.id, appointment.duration_minutes, 10)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
              >
                +10 хвилин
              </button>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(appointment);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors"
              >
                Редагувати
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(appointment.id);
                  setIsMenuOpen(false);
                }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
              >
                Видалити
              </button>
            </div>,
            document.body
          )}

        {/* Content */}
        <div className="flex items-center gap-2 w-full justify-between">
          <div className="flex flex-col gap-1 flex-1">
            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
              <div className="font-medium text-lg sm:text-xl">
                {appointment.client_name}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-base sm:text-lg">
                  {format(parseISO(appointment.start_time), 'HH:mm', { locale: uk })} -{' '}
                  {format(parseISO(appointment.end_time), 'HH:mm', { locale: uk })}
                </div>
                <div className="text-base sm:text-lg opacity-75 whitespace-nowrap">
                  ({appointment.duration_minutes} хв)
                </div>
              </div>
            </div>
            {appointment.notes && (
              <div className="text-base opacity-90 line-clamp-8">
                {appointment.notes}
              </div>
            )}
          </div>
          
          {/* Settings button */}
          <button
            ref={buttonRef}
            onClick={(e) => {
              e.stopPropagation();
              if (!isMenuOpen && buttonRef.current) {
                const rect = buttonRef.current.getBoundingClientRect();
                const menuWidth = 160;
                const menuHeight = 300;
                let top = rect.bottom + 4;
                let left = rect.right - menuWidth;
                if (top + menuHeight > window.innerHeight) {
                  top = rect.top - menuHeight - 4;
                }
                if (left < 8) {
                  left = 8;
                }
                setMenuPosition({ top, left });
              }
              setIsMenuOpen(!isMenuOpen);
            }}
            className="bg-white/20 hover:bg-white/30 p-2.5 rounded flex-shrink-0"
            title="Налаштування"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 16 16">
              <circle cx="2" cy="8" r="1.5"/>
              <circle cx="8" cy="8" r="1.5"/>
              <circle cx="14" cy="8" r="1.5"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
