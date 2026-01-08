import React, { useMemo } from 'react';
import { Search, RefreshCw, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Order } from '../../types';
import { ClientOrderCard } from './ClientOrderCard';
import { Pagination } from '../Pagination';

interface ClientOrdersListProps {
  orders: Order[];
  totalOrders: number;
  activeTab: 'active' | 'history';
  setActiveTab: (tab: 'active' | 'history') => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSyncing: boolean;
  onRefresh: () => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  
  // Pagination & Sorting
  currentPage: number;
  itemsPerPage: number;
  setCurrentPage: (page: number) => void;
  setItemsPerPage: (num: number) => void;
  sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
  setSortConfig: (config: any) => void;

  // Actions
  onConfirmPurchase: (id: string) => void;
  onRefuse: (e: React.MouseEvent, order: Order) => void;
  isConfirming: string | null;
}

export const ClientOrdersList: React.FC<ClientOrdersListProps> = ({
  orders,
  totalOrders,
  activeTab,
  setActiveTab,
  searchQuery,
  setSearchQuery,
  isSyncing,
  onRefresh,
  expandedId,
  setExpandedId,
  currentPage,
  itemsPerPage,
  setCurrentPage,
  setItemsPerPage,
  sortConfig,
  setSortConfig,
  onConfirmPurchase,
  onRefuse,
  isConfirming
}) => {
  
  const handleSort = (key: string) => {
      setSortConfig((current: any) => {
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          return { key, direction: 'asc' };
      });
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  // Фильтрация уже сделана на сервере, здесь мы просто фильтруем по табам, если список общий
  const displayOrders = useMemo(() => {
      return orders.filter(o => {
        const status = o.workflowStatus || 'В обработке';
        const isProcessing = status === 'В обработке';
        if (activeTab === 'active' && !isProcessing) return false;
        if (activeTab === 'history' && isProcessing) return false;
        return true;
      });
  }, [orders, activeTab]);

  return (
      <div className="space-y-4">
        <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm" />
        </div>
        
        <div className="flex justify-between items-end border-b border-slate-200">
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('active')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-400'}`}>В обработке {activeTab === 'active' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}</button>
                <button onClick={() => setActiveTab('history')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>Обработанные {activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}</button>
            </div>
            <button onClick={onRefresh} className="mb-2 p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 hidden md:block text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <div className="grid grid-cols-[80px_1fr_130px_50px_80px_110px_20px] gap-3 items-center">
               <div className="cursor-pointer" onClick={() => handleSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div>Модель</div>
               <div>VIN</div>
               <div>Поз.</div>
               <div className="cursor-pointer" onClick={() => handleSort('date')}>Дата <SortIcon column="date"/></div>
               <div className="text-right">Статус</div>
               <div></div>
            </div>
          </div>
          
          {displayOrders.length === 0 && <div className="p-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Список пуст</div>}
          
          {displayOrders.map(order => (
            <ClientOrderCard 
                key={order.id} 
                order={order} 
                isExpanded={expandedId === order.id} 
                onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                onConfirmPurchase={onConfirmPurchase}
                onRefuse={onRefuse}
                isConfirming={isConfirming === order.id}
            />
          ))}
          <Pagination totalItems={totalOrders} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      </div>
  );
};