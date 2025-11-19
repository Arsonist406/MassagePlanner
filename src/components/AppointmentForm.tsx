import React, { useState } from 'react';
import type { AppointmentFormData } from '../types';
import { format } from 'date-fns';

interface AppointmentFormSubmitData {
  appointment: AppointmentFormData;
  addBreak: boolean;
  breakDuration: number; // -1 means "until next appointment"
}

interface AppointmentFormProps {
  onSubmit: (data: AppointmentFormSubmitData) => void;
  onCancel?: () => void;
  initialData?: Partial<AppointmentFormData>;
  currentDate: Date;
}

/**
 * Form component for creating/editing appointments
 * Automatically calculates end time based on start time and duration
 */
export const AppointmentForm: React.FC<AppointmentFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
  currentDate,
}) => {
  // Initialize with time from initialData or default to current hour
  const getInitialTime = () => {
    if (initialData?.start_time) {
      const date = new Date(initialData.start_time);
      return {
        hour: format(date, 'HH'),
        minute: format(date, 'mm'),
      };
    }
    const now = new Date();
    return {
      hour: format(now, 'HH'),
      minute: '00',
    };
  };

  const initialTime = getInitialTime();

  const [formData, setFormData] = useState<AppointmentFormData>({
    client_name: initialData?.client_name || '',
    start_time: initialData?.start_time || '',
    duration_minutes: initialData?.duration_minutes || 45,
    notes: initialData?.notes || '',
  });

  const [hourInput, setHourInput] = useState(initialTime.hour);
  const [minuteInput, setMinuteInput] = useState(initialTime.minute);
  const [addBreak, setAddBreak] = useState(false);
  const [breakDuration, setBreakDuration] = useState(10);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name.trim()) {
      alert('Будь ласка, введіть ім\'я клієнта');
      return;
    }
    
    if (!hourInput || !minuteInput) {
      alert('Будь ласка, оберіть час');
      return;
    }

    // Use currentDate with selected time
    try {
      const dateTime = new Date(currentDate);
      dateTime.setHours(parseInt(hourInput), parseInt(minuteInput), 0, 0);
      
      const updatedFormData = {
        ...formData,
        start_time: dateTime.toISOString(),
      };
      
      onSubmit({
        appointment: updatedFormData,
        addBreak,
        breakDuration,
      });
    } catch (error) {
      alert('Невірний формат часу');
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'duration_minutes' ? parseInt(value, 10) : value,
    }));
  };

  const handleHourChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setHourInput(e.target.value);
  };

  const handleMinuteChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setMinuteInput(e.target.value);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4"
    >
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
        {initialData ? 'Змінити запис' : 'Новий запис'}
      </h2>

      {/* Client Name */}
      <div>
        <label
          htmlFor="client_name"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Ім'я клієнта
        </label>
        <input
          type="text"
          id="client_name"
          name="client_name"
          value={formData.client_name}
          onChange={handleChange}
          placeholder="Введіть ім'я клієнта"
          maxLength={40}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          required
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {formData.client_name.length}/40
        </div>
      </div>

      {/* Notes */}
      <div>
        <label
          htmlFor="notes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Примітки (необов'язково)
        </label>
        <textarea
          id="notes"
          name="notes"
          value={formData.notes || ''}
          onChange={handleChange}
          placeholder="Додаткова інформація про запис"
          rows={3}
          maxLength={300}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(formData.notes || '').length}/300
        </div>
      </div>

      {/* Time */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Час початку
        </label>
        <div className="flex gap-2">
          <select
            id="hour_input"
            name="hour_input"
            value={hourInput}
            onChange={handleHourChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            {Array.from({ length: 17 }, (_, i) => {
              const hour = (i + 7).toString().padStart(2, '0');
              return (
                <option key={hour} value={hour}>
                  {hour}
                </option>
              );
            })}
          </select>
          <span className="flex items-center text-gray-500">:</span>
          <select
            id="minute_input"
            name="minute_input"
            value={minuteInput}
            onChange={handleMinuteChange}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            required
          >
            {Array.from({ length: 12 }, (_, i) => {
              const minute = (i * 5).toString().padStart(2, '0');
              return (
                <option key={minute} value={minute}>
                  {minute}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Massage Type */}
      <div>
        <label
          htmlFor="duration_minutes"
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          Тип масажу
        </label>
        <select
          id="duration_minutes"
          name="duration_minutes"
          value={formData.duration_minutes}
          onChange={handleChange}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        >
          <option value={45}>Короткий, 30~45 хв</option>
          <option value={75}>Довгий, 60~75 хв</option>
        </select>
      </div>

      {/* Break After Massage */}
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={addBreak}
            onChange={(e) => setAddBreak(e.target.checked)}
            className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-2 focus:ring-primary-500"
          />
          <span className="text-sm font-medium text-gray-700">
            Додати перерву після масажу
          </span>
        </label>
        
        {addBreak && (
          <select
            value={breakDuration}
            onChange={(e) => setBreakDuration(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={5}>5 хвилин</option>
            <option value={10}>10 хвилин</option>
            <option value={15}>15 хвилин</option>
            <option value={20}>20 хвилин</option>
            <option value={-1}>До наступного масажу</option>
          </select>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors font-medium"
        >
          {initialData ? 'Змінити' : 'Створити'} Запис
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Скасувати
          </button>
        )}
      </div>
    </form>
  );
};
