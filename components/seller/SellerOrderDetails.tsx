import React, { useState } from 'react';
import { Send, CheckCircle, FileText, Copy, ShieldCheck, XCircle } from 'lucide-react';
import { SellerItemCard } from './SellerItemCard';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';

interface SellerOrderDetailsProps {
  order: Order;
  editingItems: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
  myOffer: any;
  statusInfo: any;
}

export const SellerOrderDetails: React.FC<SellerOrderDetailsProps> = ({ 
  order, editingItems, setEditingItems, onSubmit, isSubmitting, myOffer, statusInfo 
}) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const fullModel = order.car?.AdminModel || order.car?.model || 'N/A';
  const brandPart = fullModel.split(' ')[0] || '-';
  const modelPart = fullModel.split(' ').slice(1).join(' ') || '-';
  const displayYear = order.car?.AdminYear || order.car?.year;

  // Валидация
  const isValid = editingItems.every(item => {
      if (item.offeredQuantity === 0) return true;
      return (item.sellerPrice > 0) && (item.weight > 0) && (item.deliveryWeeks > 0);
  });

  const isAllDeclined = editingItems.every(item => item.offeredQuantity === 0);
  const isDisabled = order.isProcessed === true || !!myOffer;

  const handleUpdateItem = (idx: number, field: string, value: any) => {
      const newItems = [...editingItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setEditingItems(newItems);
  };

  const copyToClipboard = (text: string) => {
      navigator.clipboard.writeText(text);
      setShowCopiedToast(true);
      setTimeout(() => setShowCopiedToast(false), 2000);
  };

  return (
    <div className="p-4 bg-white border-t border-slate-100 animate-in fade-in duration-200 relative">
        {showCopiedToast && <div className="absolute top-4 right-4 z-50"><Toast message="VIN скопирован" duration={1500} onClose={() => setShowCopiedToast(false)}/></div>}
        
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-[10px] shadow-sm">
            <div className="flex items-center gap-2 mb-3">
                <FileText size={12} className="text-slate-400"/> 
                <span className="font-black uppercase text-slate-500">Характеристики автомобиля</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="group relative cursor-pointer" onClick={() => copyToClipboard(order.vin)}>
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">VIN</span>
                <span className="font-mono font-black text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-flex items-center gap-2 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-all">
                    {order.vin} <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                </span>
                </div>
                <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Марка</span>
                <span className="font-black text-slate-700 uppercase">{brandPart}</span>
                </div>
                <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Модель</span>
                <span className="font-black text-slate-700 uppercase">{modelPart}</span>
                </div>
                <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Кузов</span>
                <span className="font-black text-slate-700 uppercase">{order.car?.bodyType || '-'}</span>
                </div>
                <div>
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Год</span>
                <span className="font-black text-slate-700 uppercase">{displayYear || '-'}</span>
                </div>
            </div>
        </div>

        <div className="space-y-3">
            {editingItems.map((item, idx) => (
                <SellerItemCard 
                    key={idx} 
                    item={item} 
                    index={idx} 
                    onUpdate={handleUpdateItem}
                    isDisabled={isDisabled}
                    orderId={order.id}
                />
            ))}
            
            {!myOffer && !order.isProcessed && (
                <div className="flex justify-end pt-3 border-t border-slate-100">
                    <button 
                        disabled={!isValid || isSubmitting} 
                        onClick={() => onSubmit(order.id, editingItems)} 
                        className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2 ${isValid && !isSubmitting ? (isAllDeclined ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800') : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
                    >
                        {isValid ? (isAllDeclined ? 'Отказаться' : 'Отправить предложение') : 'Заполните цены'} 
                        {isAllDeclined ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                    </button>
                </div>
            )}

            {order.isProcessed && (
                <div className="flex items-center gap-2 justify-center py-3 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center">
                    <ShieldCheck size={14} className="text-slate-400"/>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">
                            {statusInfo.label === 'ЧАСТИЧНО' ? 'ЗАКАЗ ОБРАБОТАН. ЕСТЬ ПОЗИЦИИ, КОТОРЫЕ УТВЕРЖДЕНЫ К ПОКУПКЕ.' :
                            statusInfo.label === 'ВЫИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВЫ ВЫИГРАЛИ ПО ВСЕМ ПОЗИЦИЯМ.' :
                            statusInfo.label === 'ПРОИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВАШЕ ПРЕДЛОЖЕНИЕ НЕ ПОДХОДИТ.' :
                            'ЗАКАЗ ОБРАБОТАН АДМИНОМ. РЕДАКТИРОВАНИЕ ЗАКРЫТО.'}
                    </span>
                </div>
            )}
        </div>
    </div>
  );
};