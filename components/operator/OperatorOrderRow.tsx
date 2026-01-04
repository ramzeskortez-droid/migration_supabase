import React from 'react';
import { Order } from '../../types';
import { ChevronDown, ChevronUp, User } from 'lucide-react';

interface OperatorOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
}

export const OperatorOrderRow: React.FC<OperatorOrderRowProps> = ({ order, isExpanded, onToggle }) => {
  const [datePart, timePart] = order.createdAt.split(', ');

  return (
    <div className={`border-b border-slate-50 transition-all ${isExpanded ? 'bg-slate-50/50' : 'hover:bg-slate-50/30'}`}>
      <div 
        onClick={onToggle}
        className={`p-3 grid grid-cols-[70px_1.5fr_100px_100px_140px_20px] gap-4 items-center cursor-pointer border-l-4 ${isExpanded ? 'border-indigo-500 bg-white shadow-sm' : 'border-transparent'}`}
      >
        <div className="text-[11px] font-black text-indigo-600">#{order.id}</div>
        
        <div className="flex flex-col min-w-0">
            <div className="text-[11px] font-bold text-slate-700 truncate">{order.clientName || 'Не указано'}</div>
            <div className="text-[9px] text-slate-400 font-medium">{order.clientPhone}</div>
        </div>

        <div className="text-[10px] font-bold text-slate-500">{datePart}</div>
        <div className="text-[10px] font-medium text-slate-400">{timePart}</div>

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
            <div className="max-w-3xl">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                    <div className="w-1 h-3 bg-indigo-500 rounded-full"></div>
                    Состав заявки
                </h4>
                <div className="space-y-1">
                    {order.items && order.items.length > 0 ? (
                        order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg text-[11px] group hover:bg-slate-100 transition-colors">
                                <span className="font-bold text-slate-700">{item.name}</span>
                                <div className="flex items-center gap-4 text-slate-500 font-black">
                                    <span>{item.quantity} ШТ</span>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div className="text-center text-[10px] font-bold text-slate-300 py-4 uppercase italic">Загрузка позиций...</div>
                    )}
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
