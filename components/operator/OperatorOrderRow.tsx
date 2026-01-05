import React from 'react';
import { Order } from '../../types';
import { ChevronDown, ChevronUp, Check } from 'lucide-react';

interface OperatorOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  onStatusChange?: (orderId: string, status: string) => void;
}

export const OperatorOrderRow: React.FC<OperatorOrderRowProps> = ({ order, isExpanded, onToggle, onStatusChange }) => {
  const [datePart, timePart] = order.createdAt.split(', ');

  const handleProcessed = () => {
      if (onStatusChange) {
          // Двигаем на статус "КП отправлено"
          onStatusChange(order.id, 'КП отправлено');
      }
  };

  // Извлекаем тему из первого комментария
  const comment = order.items?.[0]?.comment || '';
  const subjectMatch = comment.match(/\[Тема: (.*?)\]/);
  const subject = subjectMatch ? subjectMatch[1] : '-';

  return (
    <div className={`border-b border-slate-50 transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
      <div 
        onClick={onToggle}
        className={`p-3 grid grid-cols-[70px_1fr_1fr_90px_100px_140px_20px] gap-4 items-center cursor-pointer border-l-4 ${isExpanded ? 'border-indigo-500 bg-white shadow-sm' : 'border-transparent'}`}
      >
        <div className="text-[11px] font-black text-indigo-600">#{order.id}</div>
        
        <div className="flex flex-col min-w-0">
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
        <div className="p-4 bg-white border-t border-slate-100 animate-in slide-in-from-top-1 duration-200">
            <div className="max-w-5xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                    Состав заявки
                </h4>
                
                <div className="bg-slate-50 border border-slate-100 rounded-xl overflow-hidden shadow-inner">
                    {/* Items Table Header */}
                    <div className="grid grid-cols-[30px_3fr_1.5fr_1.5fr_60px_60px_80px] gap-2 px-4 py-2 bg-slate-100/50 border-b border-slate-200 text-[9px] font-black text-slate-400 uppercase tracking-wider items-center">
                        <div className="text-center">#</div>
                        <div>Наименование</div>
                        <div>Бренд</div>
                        <div>Артикул</div>
                        <div className="text-center">Ед.</div>
                        <div className="text-center">Кол-во</div>
                        <div className="text-center text-[8px]">Фото (файл)</div>
                    </div>

                    <div className="divide-y divide-slate-100">
                        {order.items && order.items.length > 0 ? (
                            order.items.map((item, idx) => (
                                <div key={idx} className="grid grid-cols-[30px_3fr_1.5fr_1.5fr_60px_60px_80px] gap-2 px-4 py-2.5 items-center text-[11px] group hover:bg-white transition-colors">
                                    <div className="text-center font-mono text-slate-300 text-[10px]">{idx + 1}</div>
                                    <div className="font-bold text-slate-700">{item.name}</div>
                                    <div className="font-black text-slate-500 text-[10px]">{item.brand || '-'}</div>
                                    <div className="font-mono text-slate-400 text-[10px]">{item.article || '-'}</div>
                                    <div className="text-center font-bold text-slate-400">{item.uom || 'шт'}</div>
                                    <div className="text-center">
                                        <span className="bg-slate-200/50 text-slate-600 px-2 py-0.5 rounded-md font-black text-[10px]">
                                            {item.quantity}
                                        </span>
                                    </div>
                                    <div className="flex justify-center">
                                        {item.photoUrl ? (
                                            <a 
                                                href={item.photoUrl} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg transition-all shadow-sm"
                                                title="Посмотреть файл"
                                            >
                                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.51a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                                            </a>
                                        ) : (
                                            <span className="text-slate-200">—</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="text-center text-[10px] font-bold text-slate-300 py-8 uppercase italic">Позиции не найдены</div>
                        )}
                    </div>
                </div>

                <div className="mt-6 flex justify-between items-center">
                    <div>
                        {order.statusAdmin === 'КП готово' && (
                            <div className="text-[10px] font-bold text-slate-400 uppercase italic">
                                * Заказ обработан менеджером. Проверьте данные перед отправкой.
                            </div>
                        )}
                    </div>
                    {order.statusAdmin === 'КП готово' && (
                        <button 
                            onClick={handleProcessed}
                            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black uppercase text-[10px] tracking-wider shadow-lg hover:shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Check size={14} /> Отправлено клиенту
                        </button>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};