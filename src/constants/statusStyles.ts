// Централизованная конфигурация стилей статусов
export const STATUS_CONFIG: Record<string, { color: string, bg: string, border: string }> = {
  'В обработке': { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  'КП готово': { color: 'text-amber-700', bg: 'bg-amber-100', border: 'border-amber-200' },
  'КП отправлено': { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200' },
  'Подтверждение от поставщика': { color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  'Ожидает оплаты': { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
  'Обработано вручную': { color: 'text-purple-700', bg: 'bg-purple-100', border: 'border-purple-200' },
  'Идут торги': { color: 'text-blue-700', bg: 'bg-blue-100', border: 'border-blue-200' },
  'В пути': { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  'Выполнен': { color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200' },
  'Аннулирован': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  'Отказ': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' }
};

// Список шагов для прогресс-бара
export const STATUS_STEPS = ['В обработке', 'КП отправлено', 'Подтверждение от поставщика', 'Ожидает оплаты', 'В пути', 'Выполнен'];
