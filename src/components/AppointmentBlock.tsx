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
  onUpdateStartTime: (id: string, minutesShift: number) => void;
  canShiftTime: (id: string, minutesShift: number) => boolean;
  onBulkShiftAfter: (id: string, minutesShift: number) => void;
  onBulkShiftBefore: (id: string, minutesShift: number) => void;
  canBulkShiftAfter: (id: string, minutesShift: number) => boolean;
  canBulkShiftBefore: (id: string, minutesShift: number) => boolean;
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
  onUpdateStartTime,
  canShiftTime,
  onBulkShiftAfter,
  onBulkShiftBefore,
  canBulkShiftAfter,
  canBulkShiftBefore,
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
        const menuWidth = 280;
        const menuHeight = 300;
        
        // Use button's position directly from viewport
        let top = rect.bottom + 4;
        let left = rect.right - menuWidth;
        
        // Check if menu would overflow bottom of viewport
        if (top + menuHeight > window.innerHeight) {
          // Position above button instead
          top = rect.top - menuHeight - 4;
        }
        
        // Check if menu would overflow top of viewport when positioned above
        if (top < 0) {
          // If it doesn't fit above either, position it at the button level
          top = rect.top;
        }
        
        // Ensure menu doesn't overflow left edge
        if (left < 8) {
          left = 8;
        }
        
        // Ensure menu doesn't overflow right edge
        if (left + menuWidth > window.innerWidth - 8) {
          left = window.innerWidth - menuWidth - 8;
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

  return (
    <div
      className="appointment-block absolute left-0 right-0 bg-primary-500 text-white rounded-md shadow-lg border-2 border-primary-700 select-none mx-1 md:cursor-move"
      style={{
        height: `${heightPixels}px`,
        minHeight: '40px',
        overflow: 'visible',
      }}
      onMouseDown={handleMouseDown}
    >
      <div className="p-2 h-full relative flex items-center">

        {/* Dropdown menu */}
        {isMenuOpen && createPortal(
          <div 
            ref={menuRef}
            className="fixed bg-white rounded-xl shadow-2xl border border-gray-200 text-gray-800 z-[9999] overflow-hidden"
            style={{
              top: `${menuPosition.top}px`,
              left: `${menuPosition.left}px`,
              width: '320px',
            }}
          >
              <div className="grid grid-cols-2 divide-x divide-gray-200">
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100">Перемістити з сувом</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkShiftBefore(appointment.id, -10);
                    }}
                    disabled={!canBulkShiftBefore(appointment.id, -10)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 10 хв раніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkShiftBefore(appointment.id, -5);
                    }}
                    disabled={!canBulkShiftBefore(appointment.id, -5)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 5 хв раніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkShiftAfter(appointment.id, 5);
                    }}
                    disabled={!canBulkShiftAfter(appointment.id, 5)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 5 хв пізніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onBulkShiftAfter(appointment.id, 10);
                    }}
                    disabled={!canBulkShiftAfter(appointment.id, 10)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 10 хв пізніше
                  </button>
                </div>
                <div>
                  <div className="px-3 py-1 text-xs font-semibold text-gray-500 border-b border-gray-100">Сам</div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStartTime(appointment.id, -10);
                    }}
                    disabled={!canShiftTime(appointment.id, -10)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 10 хв раніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStartTime(appointment.id, -5);
                    }}
                    disabled={!canShiftTime(appointment.id, -5)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 5 хв раніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStartTime(appointment.id, 5);
                    }}
                    disabled={!canShiftTime(appointment.id, 5)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 5 хв пізніше
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateStartTime(appointment.id, 10);
                    }}
                    disabled={!canShiftTime(appointment.id, 10)}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 transition-colors disabled:text-gray-400 disabled:cursor-not-allowed disabled:hover:bg-white"
                  >
                    На 10 хв пізніше
                  </button>
                </div>
              </div>
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
              <div className="font-medium text-xl sm:text-2xl">
                {appointment.client_name}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-lg sm:text-xl">
                  {format(parseISO(appointment.start_time), 'HH:mm', { locale: uk })} -{' '}
                  {format(parseISO(appointment.end_time), 'HH:mm', { locale: uk })}
                </div>
                <div className="text-lg sm:text-xl opacity-75 whitespace-nowrap">
                  ({appointment.duration_minutes} хв)
                </div>
              </div>
            </div>
            {appointment.notes && (
              <div className="text-lg opacity-90 line-clamp-8">
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
                const menuWidth = 280;
                const menuHeight = 300;
                
                let top = rect.bottom + 4;
                let left = rect.right - menuWidth;
                
                // Check if menu would overflow bottom of viewport
                if (top + menuHeight > window.innerHeight) {
                  // Position above button instead
                  top = rect.top - menuHeight - 4;
                }
                
                // Check if menu would overflow top of viewport
                if (top < 0) {
                  top = rect.top;
                }
                
                // Ensure menu doesn't overflow left edge
                if (left < 8) {
                  left = 8;
                }
                
                // Ensure menu doesn't overflow right edge
                if (left + menuWidth > window.innerWidth - 8) {
                  left = window.innerWidth - menuWidth - 8;
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
