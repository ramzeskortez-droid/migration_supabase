import React, { memo } from 'react';
import { 
  ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, TrendingUp, 
  FileText, Send, ShoppingCart, CheckCircle2, CreditCard, Truck, PackageCheck, Ban, 
  Edit2, Loader2, Check, Tag
} from 'lucide-react';
import { Order, OrderStatus, RankType, Currency } from '../../types';
import { AdminItemsTable } from './AdminItemsTable';
import { Virtuoso } from 'react-virtuoso';
import { useQuery } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';

// Updated Columns: 
// ID (80), Subject (1.5fr), Deadline (110), Date (130), Time (100), Offers (100), Stats (100), Status (1.2fr), Arrow (40)
const GRID_COLS = "grid-cols-[80px_1.5fr_110px_130px_100px_100px_100px_1.2fr_40px]";

const STATUS_STEPS = [
  { id: 'В обработке', label: 'В обработке', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  { id: 'КП отправлено', label: 'КП отправлено', icon: Send, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  { id: 'Готов купить', label: 'Готов купить', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  { id: 'Подтверждение от поставщика', label: 'Подтверждение', icon: CheckCircle2, color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  { id: 'Ожидает оплаты', label: 'Ждет оплаты', icon: CreditCard, color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
  { id: 'В пути', label: 'В пути', icon: Truck, color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  { id: 'Выполнен', label: 'Выполнен', icon: PackageCheck, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200' }
];

// -- Sub-component: Order Row (Memoized) --

const AdminOrderRow = memo(({ 
    order, 
    isExpanded, 
    onToggle,
    editingOrderId, setEditingOrderId,
    handleStatusChange, handleNextStep, setAdminModal,
    startEditing, saveEditing, handleFormCP, isSubmitting,
    editForm, setEditForm, handleItemChange, handleLocalUpdateRank,
    openRegistry, toggleRegistry, exchangeRates, offerEdits
}: any) => {
    const isEditing = editingOrderId === order.id;
    // Removed carBrand logic as car fields are dropped
    const currentStatus = order.workflowStatus || 'В обработке';
    const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';

    // Lazy load details ONLY when expanded
    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['order-details', order.id],
        queryFn: () => SupabaseService.getOrderDetails(order.id),
        enabled: isExpanded,
        staleTime: 0
    });

    const fullOrder = { 
        ...order, 
        items: details?.items || order.items || [], 
        offers: details?.offers || order.offers || [],
        order_files: details?.orderFiles || order.order_files
    };
    const offersCount = order.offers?.length || 0; 

    // Stats: Total Items / Covered (Has at least one offer)
    const totalItems = order.items?.length || 0;
    const itemsWithOffers = new Set();
    order.offers?.forEach((o: any) => {
        o.items?.forEach((i: any) => {
            // Count item if it has a price (valid offer)
            if (i.name && (i.price > 0 || i.sellerPrice > 0)) itemsWithOffers.add(i.name);
        });
    });
    const coveredItems = itemsWithOffers.size;
    
    // Stats Coloring
    let statsBadgeColor = 'bg-slate-100 text-slate-400';
    if (totalItems > 0 && coveredItems === totalItems) statsBadgeColor = 'bg-emerald-100 text-emerald-700';
    else if (coveredItems > 0) statsBadgeColor = 'bg-amber-100 text-amber-700';

    // Subject & First Item
    const firstItem = order.items?.[0];
    const firstItemName = firstItem?.name || '-';
    // Safe comment access
    const comment = firstItem?.comment || '';
    const subjectMatch = comment.match(/\[Тема: (.*?)\]/);
    const subject = subjectMatch ? subjectMatch[1] : '-';

    // Removed displayBrand logic

    // Status Badge
    const statusConfig = STATUS_STEPS.find(s => s.id === currentStatus);
    const statusBadgeColor = statusConfig ? `${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}` : 'bg-slate-100 text-slate-500 border-slate-200';

    let statusBorderColor = 'border-l-transparent';
    let statusBgColor = 'hover:bg-slate-50';
    if (currentStatus === 'Готов купить' || currentStatus === 'Выполнен') { statusBorderColor = 'border-l-emerald-500'; statusBgColor = 'bg-emerald-50/30 hover:bg-emerald-50/50'; }
    else if (isCancelled) { statusBorderColor = 'border-l-red-500'; statusBgColor = 'bg-red-50/30 hover:bg-red-50/50'; }
    else if (currentStatus === 'Подтверждение от поставщика' || currentStatus === 'КП отправлено') { statusBorderColor = 'border-l-amber-400'; statusBgColor = 'bg-amber-50/30 hover:bg-amber-50/50'; }
    else if (currentStatus === 'В пути' || currentStatus === 'Ожидает оплаты') { statusBorderColor = 'border-l-blue-500'; statusBgColor = 'bg-blue-50/30 hover:bg-blue-50/50'; }

    // Sticker logic (first label)
    const stickerColor = order.buyerLabels?.[0]?.color;

    return (
        <div className={`transition-all duration-500 border-l-4 ${isExpanded ? 'border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-4 mx-4' : `${statusBorderColor} ${statusBgColor} border-b border-slate-200`}`}>
            <div className={`grid grid-cols-1 md:${GRID_COLS} gap-2 md:gap-3 p-4 items-center cursor-pointer text-[10px] text-left`} onClick={() => !isEditing && onToggle(isExpanded ? null : order.id)}>
                
                {/* 1. ID + Sticker */}
                <div className="flex items-center gap-2">
                    <div className="text-[11px] font-black text-indigo-600">#{order.id}</div>
                    {stickerColor && <div className={`w-2.5 h-2.5 rounded-full bg-${stickerColor}-500 shadow-sm`}></div>}
                </div>
                
                {/* 2. Subject (Longest) */}
                <div className="font-bold text-slate-600 truncate" title={subject}>{subject}</div>

                {/* 4.5 Deadline */}
                <div className="text-left font-black text-red-500 bg-red-50 px-2 py-1 rounded truncate mr-2">
                    {order.deadline || '-'}
                </div>

                {/* 5. Date */}
                <div className="text-left font-bold text-slate-400">{order.createdAt.split(',')[0]}</div>

                {/* 6. Time */}
                <div className="text-left font-mono font-bold text-slate-500">{order.statusUpdatedAt ? order.statusUpdatedAt.split(',')[1]?.trim() : '-'}</div>

                {/* 7. Offers */}
                <div className="text-left">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${offersCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {offersCount} ОФ.
                    </span>
                </div>

                {/* 8. Stats */}
                <div className="text-left">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase ${statsBadgeColor}`}>
                        {totalItems} / {coveredItems}
                    </span>
                </div>

                {/* 9. Status (Rightmost) */}
                <div className="text-left">
                    <span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-normal text-left leading-tight border ${statusBadgeColor}`}>{currentStatus}</span>
                </div>

                {/* 10. Arrow */}
                <div className="flex justify-end"><ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/></div>
            </div>
            
            {isExpanded && (
                <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl cursor-default">
                    {detailsLoading ? (
                        <div className="flex items-center justify-center py-12"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>
                    ) : (
                        <>
                            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-3"><FileText size={14} className="text-slate-400"/><span className="text-[10px] font-black uppercase text-slate-500">Информация о клиенте</span></div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-[10px]">
                                    <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Имя</span><span className="font-black text-indigo-600 uppercase text-sm">{order.clientName}</span></div>
                                    <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Телефон</span><span className="font-bold text-slate-700">{order.clientPhone || "-"}</span></div>
                                    <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Почта</span><span className="font-bold text-slate-700 lowercase">{order.clientEmail || "-"}</span></div>
                                    <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Адрес</span><span className="font-black text-slate-800 uppercase">{order.location || "-"}</span></div>
                                    
                                    {/* Новая широкая строка: Файлы по заявке */}
                                    {order.order_files && order.order_files.length > 0 && (
                                        <div className="md:col-span-4 pt-3 border-t border-slate-100 mt-1">
                                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Файлы по заявке</span>
                                            <div className="flex flex-wrap gap-x-2 gap-y-1 text-[11px] font-bold text-indigo-600">
                                                {order.order_files.map((file, fidx) => (
                                                    <React.Fragment key={fidx}>
                                                        <a 
                                                            href={file.url} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {file.name}
                                                        </a>
                                                        {fidx < order.order_files.length - 1 && <span className="text-slate-300">,</span>}
                                                    </React.Fragment>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <AdminItemsTable 
                                order={fullOrder}
                                isEditing={isEditing}
                                editForm={editForm}
                                setEditForm={setEditForm}
                                handleItemChange={handleItemChange}
                                handleLocalUpdateRank={handleLocalUpdateRank}
                                currentStatus={currentStatus}
                                openRegistry={openRegistry}
                                toggleRegistry={toggleRegistry}
                                exchangeRates={exchangeRates}
                                offerEdits={offerEdits}
                            />

                            <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 md:gap-3 mt-6 pt-4 border-t border-slate-200">
                                {isEditing ? (
                                    <><button onClick={() => setEditingOrderId(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase">Отмена</button><button onClick={() => saveEditing(fullOrder)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2">{isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Сохранить</button></>
                                ) : (
                                    <>{!isCancelled && !order.isProcessed && <button onClick={() => startEditing(fullOrder)} className="px-4 py-3 rounded-xl border border-indigo-100 text-indigo-600 bg-indigo-50 font-black text-[10px] uppercase flex items-center gap-2"><Edit2 size={14}/> Изменить</button>}{!isCancelled && <button onClick={() => setAdminModal({ type: 'ANNUL', orderId: order.id })} className="px-4 py-3 rounded-xl border border-red-100 text-red-500 bg-red-50 font-black text-[10px] uppercase flex items-center gap-2"><Ban size={14}/> Аннулировать</button>}
                                    {currentStatus === 'В обработке' && (fullOrder.offers?.length > 0) && (
                                        <button onClick={() => { handleFormCP(order.id); }} className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95 w-full md:w-auto flex items-center justify-center gap-2">
                                            {isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} 
                                            Утвердить КП и Отправить
                                        </button>
                                    )}</>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
});

// -- Main Component --

interface AdminOrdersListProps {
  orders: Order[];
  sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
  handleSort: (key: string) => void;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  // Handlers
  onLoadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  // ... row props ...
  editingOrderId: string | null;
  setEditingOrderId: (id: string | null) => void;
  handleStatusChange: (orderId: string, status: string) => void;
  handleNextStep: (order: Order) => void;
  setAdminModal: (modal: any) => void;
  startEditing: (order: Order) => void;
  saveEditing: (order: Order) => Promise<void>;
  handleFormCP: (orderId: string) => void;
  isSubmitting: string | null;
  editForm: any;
  setEditForm: (form: any) => void;
  handleItemChange: (orderId: string, offerId: string, itemName: string, field: string, value: any) => void;
  handleLocalUpdateRank: (orderId: string, offerId: string, offerItemId: string, orderItemId: string, currentRank: RankType, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number) => void;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
  exchangeRates: any;
  offerEdits: any;
}

export const AdminOrdersList: React.FC<AdminOrdersListProps> = ({
  orders, sortConfig, handleSort, expandedId, setExpandedId,
  onLoadMore, hasMore, isLoading, exchangeRates, offerEdits,
  ...rowProps
}) => {

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const toggleExpand = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[70vh]">
        {/* Header (Sticky) */}
        <div className={`hidden md:grid ${GRID_COLS} gap-3 p-4 border-b border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider select-none shrink-0 z-[300] border-l-4 border-transparent`}>
             <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ ЗАКАЗА <SortIcon column="id"/></div>
             <div className="flex items-center">ТЕМА ПИСЬМА</div>
             <div className="text-left cursor-pointer group flex items-center gap-1" onClick={() => handleSort('deadline')}>СРОК ДО <SortIcon column="deadline"/></div>
             <div className="text-left cursor-pointer group flex items-center gap-1" onClick={() => handleSort('date')}>ДАТА СОЗДАНИЯ <SortIcon column="date"/></div>
             <div className="text-left cursor-pointer group flex items-center gap-1" onClick={() => handleSort('statusUpdatedAt')}>ВРЕМЯ <SortIcon column="statusUpdatedAt"/></div>
             <div className="text-left">ОФФЕРЫ</div>
             <div className="text-left">ПОЗИЦИЙ</div>
             <div className="text-left">СТАТУС</div>
             <div></div>
         </div>

         {/* Virtualized List */}
         <div className="flex-grow">
            <Virtuoso
                style={{ height: '100%' }}
                data={orders}
                endReached={() => {
                    if (hasMore && !isLoading) onLoadMore();
                }}
                atBottomThreshold={200}
                increaseViewportBy={200}
                itemContent={(index, order) => (
                    <AdminOrderRow 
                        key={order.id}
                        order={order}
                        isExpanded={expandedId === order.id}
                        onToggle={toggleExpand}
                        exchangeRates={exchangeRates}
                        offerEdits={offerEdits}
                        {...rowProps}
                    />
                )}
                components={{
                    Footer: () => (
                        <div className="py-8 flex flex-col items-center gap-2">
                            {isLoading && <Loader2 className="animate-spin text-slate-300" size={20}/>}  
                            {!hasMore && orders.length > 0 && <div className="text-[10px] font-bold text-slate-300 uppercase italic text-left w-full px-6">Все заказы загружены ({orders.length})</div>}
                            {hasMore && !isLoading && <button onClick={onLoadMore} className="text-[10px] text-indigo-500 hover:underline">Загрузить еще</button>}
                        </div>
                    )
                }}
            />
         </div>
    </div>
  );
};