import { useState, useMemo } from 'react';
import { useAppointments } from './hooks/useAppointments';
import { AppointmentForm } from './components/AppointmentForm';
import { AppointmentEditForm } from './components/AppointmentEditForm';
import { ScheduleView } from './components/ScheduleView';
import { ScheduleMiniMapHorizontal } from './components/ScheduleMiniMapHorizontal';
import { startOfDay, isSameDay, parseISO } from 'date-fns';
import type { Appointment } from './types';

/**
 * Main App component for the Massage Planner
 * Manages the overall state and coordinates between components
 */
function App() {
  const {
    appointments,
    breaks,
    isLoading,
    error,
    createAppointment,
    updateAppointment,
    deleteAppointment,
    updateBreak,
    deleteBreak,
    pauseAutoGeneration,
    resumeAutoGeneration,
  } = useAppointments();

  // Selected date state (defaults to today)
  const [selectedDate, setSelectedDate] = useState<Date>(startOfDay(new Date()));

  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  // Filter appointments and breaks by selected date
  const filteredAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.start_time);
      return isSameDay(aptDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  const filteredBreaks = useMemo(() => {
    return breaks.filter(brk => {
      const brkDate = parseISO(brk.start_time);
      return isSameDay(brkDate, selectedDate);
    });
  }, [breaks, selectedDate]);

  /**
   * Handle form submission for creating/editing appointments
   */
  const handleFormSubmit = async (appointment: any) => {
    try {
      if (editingAppointment) {
        await updateAppointment(editingAppointment.id, {
          client_name: appointment.client_name,
          start_time: appointment.start_time,
          duration_minutes: appointment.duration_minutes,
          notes: appointment.notes,
          end_time: '', // Will be recalculated
        });
        
        setEditingAppointment(null);
      } else {
        // Create the appointment
        await createAppointment({
          client_name: appointment.client_name,
          start_time: appointment.start_time,
          duration_minutes: appointment.duration_minutes,
          notes: appointment.notes,
          end_time: '', // Will be calculated
        });
      }
      setShowForm(false);
    } catch (err) {
      console.error('Failed to save appointment:', err);
      alert('Failed to save appointment. Please try again.');
    }
  };

  /**
   * Handle editing an appointment
   */
  const handleEditAppointment = (appointment: Appointment) => {
    setEditingAppointment(appointment);
    setShowForm(true);
  };

  /**
   * Cancel form
   */
  const handleCancelForm = () => {
    setShowForm(false);
    setEditingAppointment(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Завантаження розкладу...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Fixed on Mobile */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white shadow">
        <div className="flex flex-row items-center justify-between gap-3 px-4 py-3">
          <h1 className="text-xl font-bold text-gray-900">
            Планер масажів
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const event = new CustomEvent('openCalendar');
                window.dispatchEvent(event);
              }}
              className="px-5 py-2.5 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center font-medium text-base"
              title="Відкрити календар"
              style={{ minWidth: '50px' }}
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-2.5 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium text-base whitespace-nowrap"
            >
              {showForm ? 'Сховати' : '+ Запис'}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-32 pt-20 lg:pt-6 lg:pb-6">
        {/* Header - Desktop Only */}
        <div className="hidden lg:flex flex-row items-center justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Планер масажів
          </h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                const event = new CustomEvent('openCalendar');
                window.dispatchEvent(event);
              }}
              className="px-5 py-3 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors flex items-center justify-center font-medium text-base sm:text-lg"
              title="Відкрити календар"
              style={{ minWidth: '60px' }}
            >
              <svg className="w-6 h-6 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </button>
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium text-base sm:text-lg whitespace-nowrap"
            >
              {showForm ? 'Сховати форму' : '+ Новий запис'}
            </button>
          </div>
        </div>
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form Section */}
          {showForm && (
            <div className="lg:col-span-1">
              {editingAppointment ? (
                <AppointmentEditForm
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancelForm}
                  initialData={{
                    client_name: editingAppointment.client_name,
                    start_time: editingAppointment.start_time,
                    duration_minutes: editingAppointment.duration_minutes,
                    notes: editingAppointment.notes,
                  }}
                />
              ) : (
                <AppointmentForm
                  onSubmit={handleFormSubmit}
                  onCancel={handleCancelForm}
                  currentDate={selectedDate}
                />
              )}
            </div>
          )}

          {/* Schedule Section */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <ScheduleView
              appointments={filteredAppointments}
              breaks={filteredBreaks}
              selectedDate={selectedDate}
              onDateChange={setSelectedDate}
              onUpdateAppointment={updateAppointment}
              onUpdateBreak={updateBreak}
              onDeleteAppointment={deleteAppointment}
              onDeleteBreak={deleteBreak}
              onEditAppointment={handleEditAppointment}
              pauseAutoGeneration={pauseAutoGeneration}
              resumeAutoGeneration={resumeAutoGeneration}
            />
          </div>
        </div>
      </main>

      {/* Horizontal Minimap - Mobile Footer */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40">
        <ScheduleMiniMapHorizontal
          appointments={filteredAppointments}
          breaks={filteredBreaks}
          startHour={7}
          endHour={23}
          scheduleContainerId="schedule-container"
        />
      </div>
    </div>
  );
}

export default App;
