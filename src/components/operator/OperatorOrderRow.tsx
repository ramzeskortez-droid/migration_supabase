import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Order } from '../../types';
import { ChevronDown, ChevronUp, Check, Copy } from 'lucide-react';
import { DebugCopyModal } from '../shared/DebugCopyModal';
import { Toast } from '../shared/Toast';
import { OperatorClientInfo } from './OperatorClientInfo(ИнформацияОКлиенте)';
import { OperatorOrderItems } from './OperatorOrderItems(СписокТоваров)';

interface OperatorOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
}

export const OperatorOrderRow: React.FC<OperatorOrderRowProps> = ({ order, isExpanded, onToggle, onStatusChange }) => {
  const [datePart] = order.createdAt.split(', ');
  const [toast, setToast] = useState<{message: string} | null>(null);
  
  // Состояние для копирования
  const [copyModal, setCopyModal] = useState<{isOpen: boolean, title: string, content: string}>({
      isOpen: false, title: '', content: ''
  });

  const formatPrice = (val?: number) => {
    if (!val) return '0';
    return new Intl.NumberFormat('ru-RU').format(val);
  };

  const getWinnersForItem = (item: any) => {
      const winners: any[] = [];
      if (order.offers && (order.statusAdmin === 'КП готово' || order.statusAdmin === 'КП отправлено')) {
          order.offers.forEach((off: any) => {
              if (!off.items) return;
              const matching = off.items.find((i: any) => 
                  (i.order_item_id && String(i.order_item_id) === String(item.id)) || 
                  (i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase())
              );
              if (matching && (matching.is_winner || matching.rank === 'ЛИДЕР' || matching.rank === 'LEADER')) {
                  winners.push(matching);
              }
          });
      }
      return winners;
  };

  const formatItemText = (item: any, idx: number, singleLine = false) => {
      const winners = getWinnersForItem(item);
      const base = `${item.AdminName || item.name} | ${item.brand || '-'} | ${item.article || '-'} | ${item.quantity} ${item.uom || 'шт'}`;
      
      if (singleLine) {
          let result = `Order #${order.id}\n`;
          if (winners.length > 0) {
              winners.forEach(w => {
                  result += `${base} | - | ${formatPrice(w.adminPrice || w.sellerPrice)} ₽ с учётом доставки, ${w.deliveryWeeks || '-'} нед.\n`;
              });
          } else {
              result += `${base} | - | -\n`;
          }
          return result.trim();
      } else {
          let text = `${idx + 1}. ${base}\n`;
          winners.forEach((w, wIdx) => {
              text += `Вариант №${wIdx + 1}: ${formatPrice(w.adminPrice || w.sellerPrice)} ₽ с учётом доставки, ${w.deliveryWeeks || '-'} нед.\n`;
          });
          return text;
      }
  };

  const handleCopyItem = (e: React.MouseEvent, item: any, idx: number) => {
      e.stopPropagation();
      const content = formatItemText(item, idx, true);
      setCopyModal({ isOpen: true, title: 'Копирование позиции', content });
  };

  const handleCopyAll = () => {
      let fullText = `Order #${order.id}\n\n`;
      order.items?.forEach((item, idx) => {
          fullText += formatItemText(item, idx, false) + '\n';
      });
      setCopyModal({ isOpen: true, title: 'Копирование всего заказа', content: fullText.trim() });
  };

  const handleProcessed = () => {
      if (onStatusChange) {
          onStatusChange(order.id, 'КП отправлено');
      }
  };

  const comment = order.items?.[0]?.comment || '';
  const subjectMatch = comment.match(/\[Тема: (.*?)\]/);
  const subject = subjectMatch ? subjectMatch[1] : '-';

  return (
    <div className={`border-b border-slate-50 transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
      {toast && createPortal(
          <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
              <Toast message={toast.message} onClose={() => setToast(null)} duration={1000}/>
          </div>,
          document.body
      )}

      {/* Debug Modal */}
      <DebugCopyModal 
        isOpen={copyModal.isOpen}
        title={copyModal.title}
        content={copyModal.content}
        onClose={() => setCopyModal({...copyModal, isOpen: false})}
        onConfirm={() => setCopyModal({...copyModal, isOpen: false})}
      />

      <div 
        onClick={onToggle}
        className={`p-3 grid grid-cols-[70px_1fr_1fr_1fr_90px_100px_140px_20px] gap-4 items-center cursor-pointer border-l-4 ${isExpanded ? 'border-indigo-500 bg-white shadow-sm' : 'border-transparent'}`}
      >
        <div className="text-[11px] font-black font-mono text-indigo-600">#{order.id}</div>
        
        <div className="flex min-w-0 flex-col">
            <div className="text-[11px] font-bold text-slate-700 truncate">{order.clientName || 'Не указано'}</div>
            <div className="text-[9px] text-slate-400 font-medium">{order.clientPhone}</div>
        </div>

        <div className="text-[10px] font-medium text-slate-500 truncate lowercase">{order.clientEmail || '-'}</div>

        <div className="text-[10px] font-medium text-slate-600 truncate" title={subject}>{subject}</div>

        <div className="text-[10px] font-black text-red-500 bg-red-50 px-2 py-1 rounded text-center truncate">
            {order.deadline || '-'}
        </div>

        <div className="flex flex-col items-start">
            <span className="text-[10px] font-bold text-slate-500">{datePart}</span>
        </div>

        <div>
            <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter
                ${order.statusAdmin === 'Выполнен' ? 'bg-green-100 text-green-700' : 
                  order.statusAdmin === 'Аннулирован' || order.statusAdmin === 'Отказ' ? 'bg-red-100 text-red-700' :
                  order.statusAdmin === 'КП готово' ? 'bg-blue-100 text-blue-700' :
                  'bg-slate-100 text-slate-500'
                }
            `}>
                {order.statusAdmin}
            </span>
        </div>

        <div className="text-slate-300">
            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </div>
      </div>

      {isExpanded && (
        <div className="p-6 bg-slate-50 border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
            {/* 1. Информация о клиенте */}
            <OperatorClientInfo order={order} subject={subject} />

            {/* 2. Состав заявки */}
            <OperatorOrderItems order={order} onCopyItem={handleCopyItem} />

            <div className="mt-6 flex justify-end gap-3">
                {(order.statusAdmin === 'КП готово' || order.statusAdmin === 'КП отправлено') && (
                    <button 
                        onClick={handleCopyAll}
                        className="px-6 py-3 border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-50 rounded-xl font-black uppercase text-[10px] tracking-wider transition-all flex items-center gap-2"
                    >
                        <Copy size={14} /> Копировать всё
                    </button>
                )}
                {order.statusAdmin === 'КП готово' && (
                    <button 
                        onClick={handleProcessed}
                        className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-xl transition-all flex items-center gap-2 active:scale-95"
                    >
                        <Check size={14} /> Отправлено клиенту
                    </button>
                )}
            </div>
        </div>
      )}
    </div>
  );
};