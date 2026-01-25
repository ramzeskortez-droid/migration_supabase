import React, { memo, useState, useEffect } from 'react';
import { Order } from '../../types';
import { BuyerOrderRow } from './BuyerOrderRow';
import { Virtuoso } from 'react-virtuoso';
import { ArrowUpDown, ArrowUp, ArrowDown, ListFilter, Check, Loader2 } from 'lucide-react';
import { AssignedBuyersBadge } from '../shared/AssignedBuyersBadge';
import { SupabaseService } from '../../services/supabaseService';

interface BuyerOrdersListProps {
  orders: Order[];
  expandedId: string | null;
  onToggle: (id: string | null) => void;
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  editingItemsMap: Record<string, any[]>;
  setEditingItemsMap: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onSubmit: (orderId: string, items: any[], supplierFiles?: any[], status?: string) => Promise<void>;
  isSubmitting: boolean;
  sortConfig: { key: string, direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  getOfferStatus: (order: Order) => any;
  getMyOffer: (order: Order) => any;
  buyerToken?: string;
  buyerId?: string;
  onOpenChat: (orderId: string, targetRole?: 'OPERATOR' | 'MANAGER') => void;
  scrollToId?: string | null;
  activeTab?: string;
  subStatusFilter?: string;
  setSubStatusFilter?: (status: string | undefined) => void;
}

// Columns: ID+Sticker (80), To (80), Deadline (90), Subject (1.5fr), Item (1fr), Status (110), Date (80), Arrow (30)
const GRID_COLS = "grid-cols-[80px_80px_90px_1.5fr_1fr_110px_80px_30px]";

const MemoizedBuyerOrderRow = memo(({
    order, isExpanded, onToggle,
    editingItemsMap, setEditingItemsMap, onSubmit, isSubmitting,
    statusInfo, myOffer, buyerToken, buyerId, onOpenChat, buyersMap
}: any) => {
    
    // Инициализация пустых полей для нового оффера или загрузка существующих
    const getInitialItems = () => {
        if (editingItemsMap[order.id]) return editingItemsMap[order.id];
        
        if (myOffer && myOffer.items) {
             return order.items.map((oi: any) => {
                 const offItem = myOffer.items.find((mi: any) => 
                     String(mi.order_item_id) === String(oi.id) || 
                     (!mi.order_item_id && mi.name?.trim() === oi.name?.trim())
                 );

                 if (offItem) {
                     return {
                         ...oi,
                         comment: offItem.comment || '',
                         originalComment: oi.comment,
                         offeredQuantity: offItem.offeredQuantity ?? offItem.quantity,
                         BuyerPrice: offItem.sellerPrice ?? offItem.price,
                         BuyerCurrency: offItem.sellerCurrency ?? 'RUB',
                         weight: offItem.weight || 0,
                         deliveryWeeks: offItem.deliveryWeeks || 0,
                         photoUrl: offItem.photoUrl,
                         supplierSku: offItem.supplierSku
                     };
                 }
                 
                 return {
                    ...oi,
                    comment: '',
                    originalComment: oi.comment,
                    offeredQuantity: oi.quantity,
                    BuyerPrice: 0,
                    weight: 0,
                    deliveryWeeks: 0
                 };
             });
        }

        return order.items.map((i: any) => ({
            ...i,
            comment: '', 
            originalComment: i.comment, 
            offeredQuantity: i.quantity,
            BuyerPrice: 0,
            weight: 0,
            deliveryWeeks: 0,
            itemFiles: [],
            operatorItemFiles: i.itemFiles || []
        }));
    };

    return (
        <BuyerOrderRow 
            order={order}
            isExpanded={isExpanded}
            onToggle={onToggle}
            editingItems={isExpanded ? getInitialItems() : undefined}
            setEditingItems={(items: any[]) => setEditingItemsMap((prev: any) => ({ ...prev, [order.id]: items }))}
            onSubmit={onSubmit}
            isSubmitting={isSubmitting}
            statusInfo={statusInfo}
            myOffer={myOffer}
            buyerToken={buyerToken}
            buyerId={buyerId}
            gridCols={GRID_COLS} 
            onOpenChat={onOpenChat}
            buyersMap={buyersMap}
        />
    );
});

export const BuyerOrdersList: React.FC<BuyerOrdersListProps> = ({
  orders, expandedId, onToggle, 
  editingItemsMap, setEditingItemsMap, onSubmit, isSubmitting,
  sortConfig, onSort, getOfferStatus, getMyOffer, buyerToken, buyerId, onOpenChat,
  scrollToId, onLoadMore, hasMore, isLoading,
  activeTab, subStatusFilter, setSubStatusFilter
}) => {
  const virtuosoRef = React.useRef<any>(null);
  const [isStatusPopoverOpen, setIsStatusPopoverOpen] = useState(false);
  const [buyersMap, setBuyersMap] = useState<Record<string, any>>({});

  useEffect(() => {
      SupabaseService.getBuyersList().then(users => {
          const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
          setBuyersMap(map);
      });
  }, []);

  // Эффект скролла
  React.useEffect(() => {
      if (scrollToId && orders.length > 0) {
          const index = orders.findIndex(o => o.id === scrollToId);
          if (index !== -1) {
              // Даем время на рендер
              setTimeout(() => {
                  virtuosoRef.current?.scrollToIndex({
                      index,
                      align: 'start',
                      behavior: 'smooth'
                  });
              }, 100);
          }
      }
  }, [scrollToId, orders]);
  
  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const getFilterOptions = () => {
      if (!activeTab) return [];
      switch(activeTab) {
          case 'won': return ['ВЫИГРАЛ', 'ЧАСТИЧНО'];
          case 'cancelled': return ['ОТКАЗ', 'АННУЛИРОВАН'];
          default: return [];
      }
  };

  const filterOptions = getFilterOptions();

  // Клиентская фильтрация по суб-статусу
  const filteredOrders = React.useMemo(() => {
      if (!subStatusFilter) return orders;
      return orders.filter(order => {
          const status = getOfferStatus(order).label;
          return status === subStatusFilter;
      });
  }, [orders, subStatusFilter, getOfferStatus]);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[75vh]">
        {/* HEADER ROW (Фиксированный) */}
        <div className="hidden md:block border-b border-slate-50 border-l-4 border-transparent shrink-0 z-20 bg-slate-50">
            <div className={`p-3 grid ${GRID_COLS} gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left select-none`}>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div>Адресовано</div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('deadline')}>Срок до <SortIcon column="deadline"/></div>
               <div>Тема письма</div>
               <div>Первая позиция</div>
               <div className="flex items-center gap-2 relative">
                   <span className="cursor-pointer group flex items-center gap-1" onClick={() => onSort('status')}>
                        Статус <SortIcon column="status"/>
                   </span>
                   {setSubStatusFilter && filterOptions.length > 1 && (
                       <>
                        <button 
                            onClick={() => setIsStatusPopoverOpen(!isStatusPopoverOpen)}
                            className={`p-1 rounded hover:bg-white hover:text-indigo-600 transition-colors ${subStatusFilter ? 'text-indigo-600 bg-indigo-50' : 'text-slate-400'}`}
                        >
                            <ListFilter size={12} />
                        </button>
                        {isStatusPopoverOpen && (
                            <>
                                <div className="fixed inset-0 z-40" onClick={() => setIsStatusPopoverOpen(false)}></div>
                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 p-1 z-50 animate-in fade-in zoom-in-95 origin-top-left">
                                    <button 
                                        onClick={() => { setSubStatusFilter(undefined); setIsStatusPopoverOpen(false); }}
                                        className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg flex items-center justify-between ${!subStatusFilter ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                    >
                                        <span>Все</span>
                                        {!subStatusFilter && <Check size={12}/>}
                                    </button>
                                    <div className="h-px bg-slate-100 my-1"></div>
                                    {filterOptions.map(status => (
                                        <button 
                                            key={status}
                                            onClick={() => { setSubStatusFilter(status); setIsStatusPopoverOpen(false); }}
                                            className={`w-full text-left px-3 py-2 text-[10px] font-bold rounded-lg flex items-center justify-between ${subStatusFilter === status ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            <span>{status}</span>
                                            {subStatusFilter === status && <Check size={12}/>}
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                       </>
                   )}
               </div>
               <div className="cursor-pointer flex items-center group" onClick={() => onSort('date')}>Дата <SortIcon column="date"/></div>
               <div></div>
            </div>
        </div>

        {/* Виртуализированный список */}
        <div className="flex-grow">
            <Virtuoso
                ref={virtuosoRef}
                style={{ height: '100%' }}
                data={filteredOrders}
                endReached={() => {
                    if (hasMore && !isLoading) onLoadMore();
                }}
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
                        buyerId={buyerId}
                        onOpenChat={onOpenChat}
                        buyersMap={buyersMap}
                    />
                )}
                components={{
                    Footer: () => (
                        <div className="py-8 flex flex-col items-center gap-2">
                            {isLoading && <Loader2 className="animate-spin text-slate-300" size={20}/>}  
                            {!hasMore && orders.length > 0 && <div className="text-[10px] font-bold text-slate-300 uppercase italic text-left w-full px-6">Все заказы загружены</div>}
                        </div>
                    ),
                    EmptyPlaceholder: () => !isLoading ? (
                        <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Список пуст</div>
                    ) : null
                }}
            />
        </div>
    </div>
  );
};