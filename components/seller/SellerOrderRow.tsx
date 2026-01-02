import React from 'react';
import { ChevronRight } from 'lucide-react';
import { Order } from '../../types';
import { SellerOrderDetails } from './SellerOrderDetails';

interface SellerOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  statusInfo: { label: string, color: string, icon: React.ReactNode };
  myOffer: any;
  // Props for Details
  editingItems?: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
}

export const SellerOrderRow: React.FC<SellerOrderRowProps> = ({ 
  order, isExpanded, onToggle, statusInfo, myOffer,
  editingItems, setEditingItems, onSubmit, isSubmitting 
}) => {
  
  const fullModel = order.car?.AdminModel || order.car?.model || 'N/A';
  const brandPart = fullModel.split(' ')[0] || '-';
  const modelPart = fullModel.split(' ').slice(1).join(' ') || '-';
  const displayYear = order.car?.AdminYear || order.car?.year;

  const containerStyle = isExpanded 
    ? "border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-3" 
    : "hover:bg-slate-50 border-l-transparent border-b-4 md:border-b border-slate-200 last:border-0";

  return (
    <div className={`transition-all duration-500 border-l-4 ${containerStyle}`}>
      <div onClick={onToggle} className="p-3 cursor-pointer select-none grid grid-cols-1 md:grid-cols-[70px_100px_2fr_1.5fr_60px_90px_140px_20px] gap-2 md:gap-4 items-center text-[10px] text-left">
          <div className="flex items-center justify-between md:justify-start">
             <div className="font-mono font-bold truncate flex items-center gap-2">
                <span className="md:hidden text-slate-400 w-12 shrink-0">ID:</span>
                {order.id}
             </div>
             <div className="md:hidden flex items-center gap-2">
                <div className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                </div>
                <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/>
             </div>
          </div>
          <div className="font-black uppercase truncate text-slate-800 flex items-center gap-2">
             <span className="md:hidden text-slate-400 w-12 shrink-0">Марка:</span>
             {brandPart}
          </div>
          <div className="font-black uppercase truncate text-slate-600 flex items-center gap-2">
             <span className="md:hidden text-slate-400 w-12 shrink-0">Модель:</span>
             {modelPart}
          </div>
          <div className="font-mono font-bold text-slate-500 flex items-center gap-2">
             <span className="md:hidden text-slate-400 w-12 shrink-0">VIN:</span>
             {order.vin}
          </div>
          <div className="font-bold text-slate-500 flex items-center gap-2">
             <span className="md:hidden text-slate-400 w-12 shrink-0">Год:</span>
             {displayYear}
          </div>
          <div className="font-bold text-slate-400 flex items-center gap-1">
             <span className="md:hidden text-slate-400 w-12 shrink-0">Дата:</span>
             {order.createdAt.split(/[\n,]/)[0]}
          </div>
          <div className="hidden md:flex justify-start">
            <div className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                {statusInfo.icon}
                {statusInfo.label}
            </div>
          </div>
          <div className="hidden md:flex justify-end items-center">
            <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/>
          </div>
      </div>

      {isExpanded && editingItems && (
        <SellerOrderDetails 
            order={order}
            editingItems={editingItems}
            setEditingItems={setEditingItems}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            myOffer={myOffer}
            statusInfo={statusInfo}
        />
      )}
    </div>
  );
};