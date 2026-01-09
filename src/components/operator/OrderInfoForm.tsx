import React from 'react';
import { OrderInfo } from './types';
import { Zap } from 'lucide-react';

interface OrderInfoFormProps {
  orderInfo: OrderInfo;
  setOrderInfo: (info: OrderInfo) => void;
  onQuickFill?: () => void;
}

export const OrderInfoForm: React.FC<OrderInfoFormProps> = ({ orderInfo, setOrderInfo, onQuickFill }) => {
  const handleChange = (field: keyof OrderInfo, value: string) => {
    // Валидация
    if (field === 'clientName' && value.length > 20) return;
    if (field === 'city' && value.length > 40) return;
    if (field === 'clientPhone') {
        const raw = value.replace(/[^\d+()-\s]/g, '');
        if (raw.length > 20) return; 
        value = raw;
    }

    setOrderInfo({ ...orderInfo, [field]: value });
  };

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <h2 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Основная информация по заявке</h2>
        </div>
        
        {onQuickFill && (
            <button 
                onClick={onQuickFill}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
                title="Автозаполнение тестовыми данными"
            >
                <Zap size={12} className="fill-indigo-500" />
                Быстрый тест
            </button>
        )}
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
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Имя</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="Иван"
                value={orderInfo.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
              />
           </div>
        </div>

        <div className="md:col-span-4 grid grid-cols-2 gap-2">
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Почта клиента</label>
                <input 
                    className={`w-full bg-slate-50 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 outline-none transition-all placeholder:text-slate-400 font-medium ${
                        orderInfo.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderInfo.clientEmail) 
                        ? 'border-red-300 focus:border-red-500 text-red-600' 
                        : 'border-slate-200 focus:border-indigo-500'
                    }`}
                    placeholder="example@mail.com"
                    value={orderInfo.clientEmail}
                    onChange={(e) => handleChange('clientEmail', e.target.value)}
                />
            </div>
            <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Адрес</label>
                <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Москва, МО"
                    value={orderInfo.city}
                    onChange={(e) => handleChange('city', e.target.value)}
                />
            </div>
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