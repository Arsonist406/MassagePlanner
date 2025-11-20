import React, { useState } from 'react';
import type { AppointmentFormData } from '../types';

interface AppointmentEditFormProps {
  onSubmit: (appointment: AppointmentFormData) => void;
  onCancel?: () => void;
  initialData: Partial<AppointmentFormData>;
}

/**
 * Form component for editing appointments
 * Only allows editing client name and notes (not time or massage type)
 */
export const AppointmentEditForm: React.FC<AppointmentEditFormProps> = ({
  onSubmit,
  onCancel,
  initialData,
}) => {
  const [formData, setFormData] = useState<AppointmentFormData>({
    client_name: initialData?.client_name || '',
    start_time: initialData?.start_time || '',
    duration_minutes: initialData?.duration_minutes || 45,
    notes: initialData?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.client_name.trim()) {
      alert('Будь ласка, введіть ім\'я клієнта');
      return;
    }

    onSubmit(formData);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-lg shadow-md p-4 sm:p-6 space-y-4"
    >
      <h2 className="text-xl sm:text-2xl font-semibold text-gray-800">
        Змінити запис
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
          maxLength={200}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
        />
        <div className="text-xs text-gray-500 mt-1 text-right">
          {(formData.notes || '').length}/200
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-md hover:bg-primary-700 transition-colors font-medium"
        >
          Змінити Запис
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
