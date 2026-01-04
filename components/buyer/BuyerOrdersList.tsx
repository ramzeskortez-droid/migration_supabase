import React, { memo } from 'react';
import { Order } from '../../types';
import { BuyerOrderRow } from './BuyerOrderRow';
import { Virtuoso } from 'react-virtuoso';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface BuyerOrdersListProps {
  orders: Order[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  // State for editing items
  editingItemsMap: Record<string, any[]>;
  setEditingItemsMap: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
  // Sorting
  sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  // Helpers
  getOfferStatus: (order: Order) => { label: string, color: string, icon: React.ReactNode };
  getMyOffer: (order: Order) => any;
  buyerToken?: string;
}

// -- Подкомпонент строки (Мемоизированный) --
const MemoizedBuyerOrderRow = memo(({ 
    order, isExpanded, onToggle, 
    editingItemsMap, setEditingItemsMap, onSubmit, isSubmitting,
    statusInfo, myOffer, buyerToken
}: any) => (
    <BuyerOrderRow 
        order={order}
        isExpanded={isExpanded}
        onToggle={onToggle}
        editingItems={isExpanded ? (editingItemsMap[order.id] || order.items) : undefined}
        setEditingItems={(items: any[]) => setEditingItemsMap((prev: any) => ({ ...prev, [order.id]: items }))}
        onSubmit={onSubmit}
        isSubmitting={isSubmitting}
        statusInfo={statusInfo}
        myOffer={myOffer}
        buyerToken={buyerToken}
    />
));

export const BuyerOrdersList: React.FC<BuyerOrdersListProps> = ({
  orders, expandedId, onToggle, 
  editingItemsMap, setEditingItemsMap, onSubmit, isSubmitting,
  sortConfig, onSort, getOfferStatus, getMyOffer, buyerToken
}) => {
  
  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
        {/* HEADER ROW (Фиксированный) */}
        <div className="hidden md:block border-b border-slate-50 border-l-4 border-transparent shrink-0 z-20 bg-slate-50">
            <div className="p-3 grid grid-cols-[70px_100px_2fr_1.5fr_60px_90px_140px_20px] gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left select-none">
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('brand')}>Марка <SortIcon column="brand"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('model')}>Модель <SortIcon column="model"/></div>
               <div>VIN</div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('year')}>Год <SortIcon column="year"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('date')}>Дата <SortIcon column="date"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('status')}>Статус <SortIcon column="status"/></div>
               <div></div>
            </div>
        </div>

        {/* Виртуализированный список */}
        <div className="flex-grow">
            <Virtuoso
                style={{ height: '100%' }}
                data={orders}
                itemContent={(index, order) => (
                    <MemoizedBuyerOrderRow 
                        key={order.id}
                        order={order}
                        isExpanded={expandedId === order.id}
                        onToggle={() => onToggle(expandedId === order.id ? null : order.id)}
                        editingItemsMap={editingItemsMap}
                        setEditingItemsMap={setEditingItemsMap}
                        onSubmit={onSubmit}
                        isSubmitting={isSubmitting}
                        statusInfo={getOfferStatus(order)}
                        myOffer={getMyOffer(order)}
                        buyerToken={buyerToken}
                    />
                )}
                components={{
                    EmptyPlaceholder: () => (
                        <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Список пуст</div>
                    )
                }}
            />
        </div>
    </div>
  );
};