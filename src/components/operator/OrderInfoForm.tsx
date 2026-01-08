import React from 'react';
import { OrderInfo } from './types';

interface OrderInfoFormProps {
  orderInfo: OrderInfo;
  setOrderInfo: (info: OrderInfo) => void;
}

export const OrderInfoForm: React.FC<OrderInfoFormProps> = ({ orderInfo, setOrderInfo }) => {
  const handleChange = (field: keyof OrderInfo, value: string) => {
    // Валидация
    if (field === 'clientName' && value.length > 20) return;
    if (field === 'city' && value.length > 40) return;
    if (field === 'clientPhone') {
        // Простая маска (разрешаем только цифры и символы формата)
        const raw = value.replace(/[^\d+()-\s]/g, '');
        if (raw.length > 18) return; 
        // Тут можно добавить сложную логику маски, но пока ограничимся длиной и символами
        value = raw;
    }

    setOrderInfo({ ...orderInfo, [field]: value });
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800">Основная информация по заявке</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        
        {/* Тема письма (во всю ширину) */}
        <div className="md:col-span-12">
           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Тема письма</label>
           <input 
             className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
             placeholder="Re: Запрос на запчасти..."
             value={orderInfo.emailSubject}
             onChange={(e) => handleChange('emailSubject', e.target.value)}
           />
        </div>

        {/* Row 1: Client & Contact */}
        <div className="md:col-span-4 grid grid-cols-2 gap-2">
           <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Телефон</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="+7 (999)..."
                value={orderInfo.clientPhone}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
              />
           </div>
           <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Имя (макс 20)</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                value={orderInfo.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
              />
           </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Адрес доставки (макс 40)</label>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            placeholder="Москва, МО"
            value={orderInfo.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>

        <div className="md:col-span-4">
           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Срок до</label>
           <input 
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
            value={orderInfo.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
          />
        </div>
      </div>
    </section>
  );
};