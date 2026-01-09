import React, { useState, useMemo } from 'react';
import { Send, CheckCircle, FileText, Copy, ShieldCheck, XCircle, MessageCircle } from 'lucide-react';
import { BuyerItemCard } from './BuyerItemCard';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { DebugCopyModal } from '../shared/DebugCopyModal';

interface BuyerOrderDetailsProps {
  order: Order;
  editingItems: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
  myOffer: any;
  statusInfo: any;
  onOpenChat: (orderId: string) => void;
}

export const BuyerOrderDetails: React.FC<BuyerOrderDetailsProps> = ({ 
  order, editingItems, setEditingItems, onSubmit, isSubmitting, myOffer, statusInfo, onOpenChat 
}) => {
  const [copyModal, setCopyModal] = useState<{isOpen: boolean, title: string, content: string}>({
      isOpen: false, title: '', content: ''
  });

  const BuyerAuth = useMemo(() => {
      try { return JSON.parse(localStorage.getItem('Buyer_auth') || 'null'); } catch { return null; }
  }, []);

  // Валидация
  const isValid = editingItems.every(item => {
      if (item.offeredQuantity === 0) return true;
      return (item.BuyerPrice > 0) && (item.weight > 0) && (item.deliveryWeeks >= 4);
  });

  const isAllDeclined = editingItems.every(item => item.offeredQuantity === 0);
  const isDisabled = order.isProcessed === true || !!myOffer;

  const handleUpdateItem = (idx: number, field: string, value: any) => {
      const newItems = [...editingItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setEditingItems(newItems);
  };

  const formatPrice = (val?: number) => {
    if (!val) return '0';
    return new Intl.NumberFormat('ru-RU').format(val);
  };

  const formatItemText = (item: any, idx?: number) => {
      const parts = [
          item.AdminName || item.name,
          item.brand,
          item.article,
          `${item.quantity} ${item.uom || 'шт.'}`
      ].filter(Boolean);
      
      const text = parts.join(' ');
      return idx !== undefined ? `${idx + 1}. ${text}\n` : text;
  };

  const handleCopyItem = (item: any) => {
      const content = `Order #${order.id}\n` + formatItemText(item);
      setCopyModal({ isOpen: true, title: 'Копирование позиции', content });
  };

  const handleCopyAll = () => {
      let fullText = `Order #${order.id}\n\n`;
      editingItems.forEach((item, idx) => {
          fullText += formatItemText(item, idx);
      });
      setCopyModal({ isOpen: true, title: 'Копирование всего заказа', content: fullText.trim() });
  };

  const getBestStats = (itemName: string) => {
      let minPrice = Infinity;
      let minWeeks = Infinity;

      // Если оферов нет или только мой
      if (!order.offers || order.offers.length === 0) return null;
      
      const otherOffers = order.offers.filter(o => !myOffer || o.id !== myOffer.id);
      if (otherOffers.length === 0) return null;

      otherOffers.forEach(offer => {
          const item = offer.items?.find((i: any) => i.name === itemName);
          if (item) {
              // Ищем минимальную цену (упрощенно: числовое сравнение, предполагаем одну валюту или игнорируем разницу)
              if (item.sellerPrice && item.sellerPrice < minPrice) minPrice = item.sellerPrice;
              // Ищем минимальный срок
              if (item.deliveryWeeks && item.deliveryWeeks < minWeeks) minWeeks = item.deliveryWeeks;
          }
      });

      return {
          bestPrice: minPrice === Infinity ? null : minPrice,
          bestWeeks: minWeeks === Infinity ? null : minWeeks
      };
  };

  return (
    <div className="p-4 bg-white border-t border-slate-100 animate-in fade-in duration-200 relative">
        <DebugCopyModal 
            isOpen={copyModal.isOpen}
            title={copyModal.title}
            content={copyModal.content}
            onClose={() => setCopyModal({...copyModal, isOpen: false})}
            onConfirm={() => setCopyModal({...copyModal, isOpen: false})}
        />

        <div className="space-y-3">
            {editingItems.map((item, idx) => (
                <BuyerItemCard 
                    key={idx} 
                    item={item} 
                    index={idx} 
                    onUpdate={handleUpdateItem}
                    isDisabled={isDisabled}
                    orderId={order.id}
                    bestStats={!myOffer ? getBestStats(item.name) : null} // Показываем статистику только если мы еще не отправили офер
                    onCopy={handleCopyItem}
                />
            ))}
            
            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <div className="flex gap-2">
                    <button 
                        onClick={() => onOpenChat(order.id)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all text-[10px] font-black uppercase border border-indigo-100 shadow-sm"
                    >
                        <MessageCircle size={16} /> Чат с менеджером
                    </button>
                    {!order.isProcessed && (
                        <button 
                            onClick={handleCopyAll}
                            className="flex items-center gap-2 px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all text-[10px] font-black uppercase border border-slate-200 shadow-sm"
                        >
                            <Copy size={16} /> Копировать всё
                        </button>
                    )}
                </div>

                {!myOffer && !order.isProcessed && (
                    <button 
                        disabled={!isValid || isSubmitting} 
                        onClick={() => onSubmit(order.id, editingItems)} 
                        className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2 ${isValid && !isSubmitting ? (isAllDeclined ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800') : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
                    >
                        {isValid ? (isAllDeclined ? 'Отказаться' : 'Отправить предложение') : 'Заполните цены'} 
                        {isAllDeclined ? <XCircle size={14}/> : <CheckCircle size={14}/>}
                    </button>
                )}
            </div>

            {order.isProcessed && (
                <div className="flex items-center gap-2 justify-center py-3 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center">
                    <ShieldCheck size={14} className="text-slate-400"/>
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">
                            {statusInfo.label === 'ЧАСТИЧНО' ? 'ЗАКАЗ ОБРАБОТАН. ЕСТЬ ПОЗИЦИИ, КОТОРЫЕ УТВЕРЖДЕНЫ К ПОКУПКЕ.' :
                            statusInfo.label === 'ВЫИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВЫ ВЫИГРАЛИ ПО ВСЕМ ПОЗИЦИЯМ.' :
                            statusInfo.label === 'ПРОИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВАШЕ ПРЕДЛОЖЕНИЕ НЕ ПОДХОДИТ.' :
                            'ЗАКАЗ ОБРАБОТАН МЕНЕДЖЕРОМ. РЕДАКТИРОВАНИЕ ЗАКРЫТО.'}
                    </span>
                </div>
            )}
        </div>
    </div>
  );
};