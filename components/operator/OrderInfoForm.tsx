import React from 'react';
import { OrderInfo } from './types';

interface OrderInfoFormProps {
  orderInfo: OrderInfo;
  setOrderInfo: (info: OrderInfo) => void;
}

export const OrderInfoForm: React.FC<OrderInfoFormProps> = ({ orderInfo, setOrderInfo }) => {
  const handleChange = (field: keyof OrderInfo, value: string) => {
    setOrderInfo({ ...orderInfo, [field]: value });
  };

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800">Основная информация по заявке</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Row 1: Client & Contact */}
        <div className="md:col-span-4 grid grid-cols-2 gap-2">
           <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Телефон</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                placeholder="+7..."
                value={orderInfo.clientPhone}
                onChange={(e) => handleChange('clientPhone', e.target.value)}
              />
           </div>
           <div>
               <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Имя</label>
              <input 
                className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                value={orderInfo.clientName}
                onChange={(e) => handleChange('clientName', e.target.value)}
              />
           </div>
        </div>

        <div className="md:col-span-4">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Город / Регион</label>
          <input 
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
            placeholder="Москва, МО"
            value={orderInfo.city}
            onChange={(e) => handleChange('city', e.target.value)}
          />
        </div>

        <div className="md:col-span-4">
           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Дедлайн</label>
           <input 
            type="date"
            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
            value={orderInfo.deadline}
            onChange={(e) => handleChange('deadline', e.target.value)}
          />
        </div>

        {/* Row 2: Car Info */}
        <div className="md:col-span-12 border-t border-slate-100 pt-4 mt-2">
           <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Автомобиль</label>
           <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
               <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="VIN код"
                  value={orderInfo.vin}
                  onChange={(e) => handleChange('vin', e.target.value)}
               />
               <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Марка (Toyota)"
                  value={orderInfo.carBrand}
                  onChange={(e) => handleChange('carBrand', e.target.value)}
               />
               <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Модель (Camry)"
                  value={orderInfo.carModel}
                  onChange={(e) => handleChange('carModel', e.target.value)}
               />
               <input 
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                  placeholder="Год (2020)"
                  value={orderInfo.carYear}
                  onChange={(e) => handleChange('carYear', e.target.value)}
               />
           </div>
        </div>
      </div>
    </section>
  );
};