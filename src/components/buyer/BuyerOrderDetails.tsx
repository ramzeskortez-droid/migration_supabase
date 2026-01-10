import React, { useState, useMemo, useEffect } from 'react';
import { Send, CheckCircle, FileText, Copy, ShieldCheck, XCircle, MessageCircle } from 'lucide-react';
import { BuyerItemCard } from './BuyerItemCard';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { DebugCopyModal } from '../shared/DebugCopyModal';
import { SupabaseService } from '../../services/supabaseService';

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
  
  const [requiredFields, setRequiredFields] = useState<any>({}); 
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);

  useEffect(() => {
      SupabaseService.getSystemSettings('buyer_required_fields').then(res => {
          if (res) setRequiredFields(res);
      });
  }, []);

  const BuyerAuth = useMemo(() => {
      try { return JSON.parse(localStorage.getItem('Buyer_auth') || 'null'); } catch { return null; }
  }, []);

  // Валидация
  const isValid = editingItems.every(item => {
      if (item.offeredQuantity === 0) return true;
      
      const basicValid = (item.BuyerPrice > 0) && (item.weight > 0) && (item.deliveryWeeks >= 4);
      
      if (requiredFields.supplier_sku) {
          return basicValid && (item.supplierSku && item.supplierSku.trim().length > 0);
      }
      
      return basicValid;
  });

  const handlePreSubmit = async () => {
      // Проверка обязательных полей
      if (requiredFields.supplier_sku) {
          const missingSku = editingItems.some(item => {
              const isMissing = item.offeredQuantity > 0 && (!item.supplierSku || item.supplierSku.trim() === '');
              return isMissing;
          });
          
          if (missingSku) {
              setToast({ message: 'Заполните поле "Поставщик" для всех позиций!', type: 'error' });
              return;
          }
      }
      await onSubmit(order.id, editingItems);
  };

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
        {toast && (
            <div className="fixed top-4 right-4 z-50">
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            </div>
        )}

        <DebugCopyModal 
            isOpen={copyModal.isOpen}
            title={copyModal.title}
            content={copyModal.content}
            onClose={() => setCopyModal({...copyModal, isOpen: false})}
            onConfirm={() => setCopyModal({...copyModal, isOpen: false})}
        />

        {order.order_files && order.order_files.length > 0 && (
            <div className="mb-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Файлы по заявке</span>
                <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-indigo-600">
                    {order.order_files.map((file, fidx) => (
                        <React.Fragment key={fidx}>
                            <a 
                                href={file.url} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="hover:underline flex items-center gap-1"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <FileText size={12} className="text-slate-400" />
                                {file.name}
                            </a>
                            {fidx < order.order_files.length - 1 && <span className="text-slate-300">,</span>}
                        </React.Fragment>
                    ))}
                </div>
            </div>
        )}

        <div className="space-y-3">
            {editingItems.map((item, idx) => (
                <BuyerItemCard 
                    key={idx} 
                    item={item} 
                    index={idx} 
                    onUpdate={handleUpdateItem}
                    isDisabled={isDisabled}
                    orderId={order.id}
                    bestStats={!myOffer ? getBestStats(item.name) : null} 
                    onCopy={handleCopyItem}
                    isRequired={requiredFields.supplier_sku}
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
                        onClick={handlePreSubmit} 
                        className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2 ${isValid && !isSubmitting ? (isAllDeclined ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800') : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}
                    >
                        {isValid ? (isAllDeclined ? 'Отказаться' : 'Отправить предложение') : 'Заполните все поля'} 
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