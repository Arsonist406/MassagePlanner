import { useState } from 'react';
import { useAppointments } from './hooks/useAppointments';
import { AppointmentForm } from './components/AppointmentForm';
import { ScheduleView } from './components/ScheduleView';
import { ScheduleMiniMapHorizontal } from './components/ScheduleMiniMapHorizontal';
import { calculateEndTime } from './services/appointmentService';
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
    createBreak,
    updateBreak,
    deleteBreak,
  } = useAppointments();

  const [showForm, setShowForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);

  /**
   * Handle form submission for creating/editing appointments
   */
  const handleFormSubmit = async (data: { appointment: any; addBreak: boolean; breakDuration: number }) => {
    try {
      if (editingAppointment) {
        const updatedAppointment = await updateAppointment(editingAppointment.id, {
          client_name: data.appointment.client_name,
          start_time: data.appointment.start_time,
          duration_minutes: data.appointment.duration_minutes,
          notes: data.appointment.notes,
          end_time: '', // Will be recalculated
        });
        
        // If user wants to add a break after the appointment
        if (data.addBreak) {
          const breakStartTime = calculateEndTime(data.appointment.start_time, data.appointment.duration_minutes);
          
          // Handle "until next appointment" option
          let breakDurationMinutes = data.breakDuration;
          
          if (data.breakDuration === -1) {
            // Find the next appointment after the updated one
            const nextAppointment = appointments
              .filter(apt => apt.id !== editingAppointment.id && apt.start_time > updatedAppointment.end_time)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
            
            if (nextAppointment) {
              // Calculate duration until next appointment
              const breakStart = new Date(breakStartTime);
              const nextStart = new Date(nextAppointment.start_time);
              breakDurationMinutes = Math.floor((nextStart.getTime() - breakStart.getTime()) / (1000 * 60));
            } else {
              // If no next appointment, default to 15 minutes
              breakDurationMinutes = 15;
            }
          }
          
          // Create the break
          await createBreak({
            start_time: breakStartTime,
            duration_minutes: breakDurationMinutes,
            end_time: '', // Will be calculated
          });
        }
        
        setEditingAppointment(null);
      } else {
        // Create the appointment
        const newAppointment = await createAppointment({
          client_name: data.appointment.client_name,
          start_time: data.appointment.start_time,
          duration_minutes: data.appointment.duration_minutes,
          notes: data.appointment.notes,
          end_time: '', // Will be calculated
        });
        
        // If user wants to add a break after the appointment
        if (data.addBreak) {
          const breakStartTime = calculateEndTime(data.appointment.start_time, data.appointment.duration_minutes);
          
          // Handle "until next appointment" option
          let breakDurationMinutes = data.breakDuration;
          
          if (data.breakDuration === -1) {
            // Find the next appointment after the newly created one
            const nextAppointment = appointments
              .filter(apt => apt.start_time > newAppointment.end_time)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))[0];
            
            if (nextAppointment) {
              // Calculate duration until next appointment
              const breakStart = new Date(breakStartTime);
              const nextStart = new Date(nextAppointment.start_time);
              breakDurationMinutes = Math.floor((nextStart.getTime() - breakStart.getTime()) / (1000 * 60));
            } else {
              // If no next appointment, default to 15 minutes
              breakDurationMinutes = 15;
            }
          }
          
          // Create the break
          await createBreak({
            start_time: breakStartTime,
            duration_minutes: breakDurationMinutes,
            end_time: '', // Will be calculated
          });
        }
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
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Планер масажів
          </h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-5 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors font-medium text-base sm:text-lg"
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
              <AppointmentForm
                onSubmit={handleFormSubmit}
                onCancel={handleCancelForm}
                currentDate={new Date()}
                initialData={
                  editingAppointment
                    ? {
                        client_name: editingAppointment.client_name,
                        start_time: editingAppointment.start_time,
                        duration_minutes: editingAppointment.duration_minutes,
                        notes: editingAppointment.notes,
                      }
                    : undefined
                }
              />
            </div>
          )}

          {/* Schedule Section */}
          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <ScheduleView
              appointments={appointments}
              breaks={breaks}
              onUpdateAppointment={updateAppointment}
              onUpdateBreak={updateBreak}
              onDeleteAppointment={deleteAppointment}
              onDeleteBreak={deleteBreak}
              onEditAppointment={handleEditAppointment}
            />

            {/* Horizontal Minimap and Stats - Mobile Only */}
            <div className="mt-4 space-y-4 lg:hidden">
              {/* Horizontal Minimap */}
              <ScheduleMiniMapHorizontal
                appointments={appointments}
                breaks={breaks}
                startHour={7}
                endHour={23}
                scheduleContainerId="schedule-container"
              />
              
              {/* Aggregated Statistics */}
              <div className="bg-white rounded-lg shadow p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Статистика</h3>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Записи:</span>
                    <span className="text-xl font-bold text-primary-600">{appointments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Перерви:</span>
                    <span className="text-xl font-bold text-amber-600">{breaks.length}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-gray-200">
                    <span className="text-sm text-gray-600">Загальна тривалість:</span>
                    <span className="text-xl font-bold text-green-600">
                      {appointments.reduce((sum, apt) => sum + apt.duration_minutes, 0)} хв
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;
