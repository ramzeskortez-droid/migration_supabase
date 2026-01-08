import React, { useState } from 'react';
import { Order } from '../../types';
import { ChevronDown, ChevronUp, Check, FileText, Camera, ChevronRight, Pencil, Copy } from 'lucide-react';
import { DebugCopyModal } from '../shared/DebugCopyModal';

interface OperatorOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
}

const PRODUCT_GRID = "grid-cols-[90px_1fr_100px_100px_80px_80px_80px]";
const OFFER_GRID = "grid-cols-[1.2fr_1fr_70px_80px_1.8fr_80px]";

export const OperatorOrderRow: React.FC<OperatorOrderRowProps> = ({ order, isExpanded, onToggle, onStatusChange }) => {
  const [datePart, timePart] = order.createdAt.split(', ');
  const [openItems, setOpenItems] = useState<Set<string>>(new Set());
  
  // Состояние для копирования
  const [copyModal, setCopyModal] = useState<{isOpen: boolean, title: string, content: string}>({
      isOpen: false, title: '', content: ''
  });

  const toggleItem = (itemName: string) => {
      setOpenItems(prev => {
          const next = new Set(prev);
          if (next.has(itemName)) next.delete(itemName);
          else next.add(itemName);
          return next;
      });
  };

  const formatPrice = (val?: number) => {
    if (!val) return '0';
    return new Intl.NumberFormat('ru-RU').format(val);
  };

  const getWinnersForItem = (item: any) => {
      const winners: any[] = [];
      // Оператор видит варианты ТОЛЬКО если менеджер утвердил КП (готово или уже отправлено)
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

  const formatItemText = (item: any, idx: number) => {
      const winners = getWinnersForItem(item);
      const priceText = item.adminPrice ? `${formatPrice(item.adminPrice)} ₽` : 'Цена не указана';
      
      let text = `${idx + 1}. Позиция: ${item.AdminName || item.name} | ${item.brand || '-'} | ${item.quantity} шт | ${priceText}\n`;
      
      winners.forEach((win, wIdx) => {
          const winPrice = formatPrice(win.adminPrice || win.sellerPrice);
          text += `Вариант ${wIdx + 1}: ${winPrice} ₽, ${win.deliveryWeeks || '-'} нед.\n`;
      });
      
      return text;
  };

  const handleCopyItem = (e: React.MouseEvent, item: any, idx: number) => {
      e.stopPropagation();
      const content = formatItemText(item, idx);
      setCopyModal({ isOpen: true, title: 'Копирование позиции', content });
  };

  const handleCopyAll = () => {
      let fullText = '';
      order.items?.forEach((item, idx) => {
          fullText += formatItemText(item, idx) + '\n';
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
        className={`p-3 grid grid-cols-[70px_1fr_1fr_90px_100px_140px_20px] gap-4 items-center cursor-pointer border-l-4 ${isExpanded ? 'border-indigo-500 bg-white shadow-sm' : 'border-transparent'}`}
      >
        <div className="text-[11px] font-black text-indigo-600">#{order.id}</div>
        
        <div className="flex min-w-0 flex-col">
            <div className="text-[11px] font-bold text-slate-700 truncate">{order.clientName || 'Не указано'}</div>
            <div className="text-[9px] text-slate-400 font-medium">{order.clientPhone}</div>
        </div>

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
            {/* 1. Информация о клиенте (1в1 как у менеджера) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <FileText size={14} className="text-slate-400"/>
                        <span className="text-[10px] font-black uppercase text-slate-500">Информация о клиенте</span>
                    </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-[10px]">
                    <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Имя</span>
                        <span className="font-black text-indigo-600 uppercase text-sm">{order.clientName}</span>
                    </div>
                    <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Телефон</span>
                        <span className="font-bold text-slate-700">{order.clientPhone || "-"}</span>
                    </div>
                    <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Адрес</span>
                        <span className="font-black text-slate-800 uppercase">{order.location || "-"}</span>
                    </div>
                    <div>
                        <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Тема письма</span>
                        <span className="font-bold text-slate-700 uppercase">{subject}</span>
                    </div>
                </div>
            </div>

            {/* 2. Состав заявки */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4">
                <div className="bg-gray-100 border-b border-gray-300 hidden md:block">
                    <div className={`grid ${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">№</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Наименование</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Бренд</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Артикул</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Кол-во</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Ед.</div>
                        <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Фото</div>
                    </div>
                </div>

                <div className="divide-y divide-gray-200">
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => {
                            const isItemExpanded = openItems.has(item.name);
                            const winners = getWinnersForItem(item);

                            return (
                                <div key={idx} className="border-b border-gray-100 last:border-b-0">
                                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 transition-colors group/row">
                                        <div className={`grid grid-cols-1 md:${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                                            <div className="flex items-center gap-2">
                                                {winners.length > 0 && (
                                                    <button onClick={(e) => { e.stopPropagation(); toggleItem(item.name); }} className="hover:bg-gray-200 rounded-lg p-1 transition-colors">
                                                        {isItemExpanded ? <ChevronDown size={14} className="text-gray-600"/> : <ChevronRight size={14} className="text-gray-600"/>}
                                                    </button>
                                                )}
                                                <div className="text-gray-600 font-mono font-bold text-xs">{idx + 1}</div>
                                                {(order.statusAdmin === 'КП готово' || order.statusAdmin === 'КП отправлено') && (
                                                    <button 
                                                        onClick={(e) => handleCopyItem(e, item, idx)}
                                                        className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm border border-indigo-100 group/copy ml-1"
                                                        title="Скопировать позицию"
                                                    >
                                                        <Copy size={12} className="group-hover/copy:scale-110 transition-transform" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="font-black text-gray-900 uppercase text-[12px] tracking-tight truncate">
                                                {item.AdminName || item.name}
                                            </div>
                                            <div className="text-gray-700 font-bold uppercase text-[10px] truncate">{item.brand || '-'}</div>
                                            <div className="text-gray-600 font-mono text-[10px] truncate">{item.article || '-'}</div>
                                            <div className="text-gray-700 text-center font-black text-xs">{item.quantity}</div>
                                            <div className="text-gray-600 text-center text-[10px] font-bold uppercase">{item.uom || 'шт'}</div>
                                            <div className="flex justify-center">
                                                {item.opPhotoUrl ? (
                                                    <a href={item.opPhotoUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:opacity-80 transition-opacity">
                                                        <img src={item.opPhotoUrl} alt="Заявка" className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm" />
                                                    </a>
                                                ) : ( <span className="text-gray-300 text-[10px]">-</span> )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Вложенные офферы */}
                                    {isItemExpanded && winners.length > 0 && (
                                        <div className="bg-white animate-in slide-in-from-top-1 duration-200 overflow-x-auto">
                                            <div className="bg-slate-800 text-white hidden md:block min-w-[1000px]">
                                                <div className={`grid ${OFFER_GRID} gap-4 px-6 py-2 text-[8px] font-black uppercase tracking-widest items-center`}>
                                                    <div>Варианты</div>
                                                    <div>Бренд</div>
                                                    <div className="text-center">Кол-во</div>
                                                    <div className="text-center">Фото</div>
                                                    <div className="text-left">Цена с учетом доставки</div>
                                                    <div className="text-center">Срок</div>
                                                </div>
                                            </div>

                                            <div className="min-w-[1000px] divide-y divide-gray-100">
                                                {winners.map((win, wIdx) => (
                                                    <div key={wIdx} className="relative transition-all duration-300 border-l-4 border-l-emerald-500 bg-emerald-50/30">
                                                        <div className={`grid grid-cols-1 md:${OFFER_GRID} gap-4 px-6 py-3 items-center`}>
                                                            <div className="flex items-center gap-2 font-black text-emerald-700 uppercase text-[10px]">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                Вариант {wIdx + 1}
                                                            </div>
                                                            <div className="text-gray-700 font-bold uppercase text-[10px] truncate">{win.brand || '-'}</div>
                                                            <div className="text-gray-700 text-center font-bold text-xs">{win.offeredQuantity || win.quantity}</div>
                                                            <div className="flex items-center justify-center">
                                                                {win.photoUrl ? (
                                                                    <a href={win.photoUrl} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
                                                                        <img src={win.photoUrl} alt="Фото" className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm" />
                                                                    </a>
                                                                ) : ( <Camera className="w-4 h-4 text-gray-200" /> )}
                                                            </div>
                                                            <div className="text-base font-black text-gray-900 leading-none text-left">
                                                                {formatPrice(win.adminPriceRub || win.sellerPrice)} ₽
                                                            </div>
                                                            <div className="text-orange-600 text-center font-black text-[11px] leading-none">{win.deliveryWeeks || '-'} нед.</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div className="text-center text-[10px] font-bold text-slate-300 py-8 uppercase italic">Позиции не найдены</div>
                    )}
                </div>
            </div>

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