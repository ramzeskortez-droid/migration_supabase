import React from 'react';
import { Order } from '../../types';
import { SellerOrderRow } from './SellerOrderRow';
import { Pagination } from '../Pagination';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

interface SellerOrdersListProps {
  orders: Order[];
  expandedId: string | null;
  onToggle: (id: string) => void;
  // State for editing items
  editingItemsMap: Record<string, any[]>;
  setEditingItemsMap: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
  // Pagination & Sorting
  totalOrders: number;
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (p: number) => void;
  setItemsPerPage: (p: number) => void;
  sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
  onSort: (key: string) => void;
  // Helpers
  getOfferStatus: (order: Order) => { label: string, color: string, icon: React.ReactNode };
  getMyOffer: (order: Order) => any;
}

export const SellerOrdersList: React.FC<SellerOrdersListProps> = ({
  orders, expandedId, onToggle, 
  editingItemsMap, setEditingItemsMap, onSubmit, isSubmitting,
  totalOrders, currentPage, itemsPerPage, setCurrentPage, setItemsPerPage,
  sortConfig, onSort, getOfferStatus, getMyOffer
}) => {
  
  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* ORIGINAL HEADER ROW */}
        <div className="hidden md:block border-b border-slate-50 border-l-4 border-transparent">
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

        {orders.length === 0 && <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Список пуст</div>}
        
        {orders.map(order => (
            <SellerOrderRow 
                key={order.id} 
                order={order}
                isExpanded={expandedId === order.id}
                onToggle={() => onToggle(order.id)}
                editingItems={expandedId === order.id ? (editingItemsMap[order.id] || order.items) : undefined}
                setEditingItems={(items) => setEditingItemsMap(prev => ({ ...prev, [order.id]: items }))}
                onSubmit={onSubmit}
                isSubmitting={isSubmitting}
                statusInfo={getOfferStatus(order)}
                myOffer={getMyOffer(order)}
            />
        ))}
        
        <Pagination 
            totalItems={totalOrders} 
            itemsPerPage={itemsPerPage} 
            currentPage={currentPage} 
            onPageChange={setCurrentPage} 
            onItemsPerPageChange={setItemsPerPage}
        />
    </div>
  );
};