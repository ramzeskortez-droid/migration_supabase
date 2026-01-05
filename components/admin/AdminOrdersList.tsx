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
// ID (80), Subject (1.5fr), Brand (90), First Item (1fr), Date (80), Time (60), Offers (70), Stats (70), Status (110), Arrow (30)
const GRID_COLS = "grid-cols-[80px_1.5fr_90px_1fr_80px_60px_70px_70px_110px_30px]";

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
    openRegistry, toggleRegistry, exchangeRates
}: any) => {
    const isEditing = editingOrderId === order.id;
    const carBrand = (order.car?.AdminModel || order.car?.model || '').split(' ')[0];
    const currentStatus = order.workflowStatus || 'В обработке';
    const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';

    // Lazy load details ONLY when expanded
    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['order-details', order.id],
        queryFn: () => SupabaseService.getOrderDetails(order.id),
        enabled: isExpanded,
        staleTime: 0
    });

    const fullOrder = { ...order, items: details?.items || order.items || [], offers: details?.offers || order.offers || [] };
    const offersCount = order.offers?.length || 0; 

    // Stats: Total Items / Covered
    const totalItems = order.items?.length || 0;
    const itemsWithWinners = new Set();
    order.offers?.forEach((o: any) => {
        o.items?.forEach((i: any) => {
            if (i.rank === 'ЛИДЕР') itemsWithWinners.add(i.name);
        });
    });
    const coveredItems = itemsWithWinners.size;

    // Subject & First Item
    const firstItem = order.items?.[0];
    const firstItemName = firstItem?.name || '-';
    // Safe comment access
    const comment = firstItem?.comment || '';
    const subjectMatch = comment.match(/\[Тема: (.*?)\]/);
    const subject = subjectMatch ? subjectMatch[1] : '-';

    // Brand from item logic
    const displayBrand = order.car?.brand || '-'; 

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
            <div className={`grid grid-cols-1 md:${GRID_COLS} gap-2 md:gap-3 p-4 items-center cursor-pointer text-[10px]`} onClick={() => !isEditing && onToggle(isExpanded ? null : order.id)}>
                
                {/* 1. ID + Sticker */}
                <div className="flex items-center gap-2">
                    <div className="font-mono font-bold text-slate-700">{order.id}</div>
                    {stickerColor && <div className={`w-2.5 h-2.5 rounded-full bg-${stickerColor}-500 shadow-sm`}></div>}
                </div>
                
                {/* 2. Subject (Longest) */}
                <div className="font-bold text-slate-600 truncate" title={subject}>{subject}</div>

                {/* 3. Brand */}
                <div className="font-bold text-slate-900 uppercase truncate">{displayBrand}</div>

                {/* 4. First Item */}
                <div className="font-bold text-slate-700 truncate">{firstItemName}</div>

                {/* 5. Date */}
                <div className="text-right font-bold text-slate-400">{order.createdAt.split(',')[0]}</div>

                {/* 6. Time */}
                <div className="text-right font-mono font-bold text-slate-500">{order.statusUpdatedAt ? order.statusUpdatedAt.split(',')[1]?.trim() : '-'}</div>

                {/* 7. Offers */}
                <div className="flex justify-center">
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${offersCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                        {offersCount} ОФ.
                    </span>
                </div>

                {/* 8. Stats */}
                <div className="text-center font-mono font-bold text-slate-600 bg-slate-100 rounded px-1">
                    {totalItems} / <span className={coveredItems === totalItems ? 'text-emerald-600' : 'text-slate-600'}>{coveredItems}</span>
                </div>

                {/* 9. Status (Rightmost) */}
                <div className="flex justify-center">
                    <span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-normal text-center leading-tight border ${statusBadgeColor}`}>{currentStatus}</span>
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
                            {!isCancelled && (
                            <div className="mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                <div className="flex items-center justify-between mb-4">
                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Процесс выполнения</h3>
                                {currentStatus !== 'Выполнен' && currentStatus !== 'В обработке' && (<button onClick={() => handleNextStep(fullOrder)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-colors">Следующий шаг <ChevronRight size={12}/></button>)}
                                </div>
                                <div className="flex items-center justify-between relative px-2 overflow-x-auto no-scrollbar pb-2">
                                    <div className="absolute top-4 left-0 w-full h-0.5 bg-slate-100 -z-0"></div>
                                    {STATUS_STEPS.map((step, idx) => {
                                        const currentStatusIdx = STATUS_STEPS.findIndex(s => s.id === currentStatus);
                                        const isPassed = idx <= currentStatusIdx; const isInteractive = currentStatus !== 'В обработке';
                                        return (
                                            <div key={step.id} className={`relative z-10 flex flex-col items-center gap-1.5 group shrink-0 ${isInteractive ? 'cursor-pointer' : 'cursor-not-allowed opacity-80'} ${idx > 0 ? 'ml-8' : ''}`} onClick={() => isInteractive && handleStatusChange(order.id, step.id)}>
                                                <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isPassed ? `${step.bg} ${step.color} ${step.border}` : 'bg-white border-slate-200 text-slate-300'}`}><step.icon size={12} className={idx === currentStatusIdx ? 'animate-pulse' : ''} /></div>
                                                <span className={`text-[7px] font-black uppercase transition-colors whitespace-nowrap ${isPassed ? 'text-slate-800' : 'text-slate-300'}`}>{step.label}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                            )}

                            <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                                <div className="flex items-center gap-2 mb-3"><FileText size={14} className="text-slate-400"/><span className="text-[10px] font-black uppercase text-slate-500">Детали заказа</span></div>
                                {isEditing ? (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Бренд</label><input value={editForm['car_model']} onChange={e => setEditForm({...editForm, 'car_model': e.target.value})} className="w-full p-2 border rounded text-xs font-bold uppercase" placeholder="Бренд товара..."/></div>
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-indigo-400 uppercase">Срок (нед)</label><input type="number" value={editForm['delivery_weeks']} onChange={e => setEditForm({...editForm, 'delivery_weeks': e.target.value})} className="w-full p-2 border-2 border-indigo-100 rounded text-xs font-black text-indigo-600 focus:border-indigo-300"/></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 text-[10px]">
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Клиент</span><span className="font-black text-indigo-600 uppercase text-sm">{order.clientName}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Телефон</span><span className="font-bold text-slate-700">{order.clientPhone || "-"}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Бренд</span><span className="font-black text-slate-800 uppercase">{displayBrand}</span></div>
                                    </div>
                                )}
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
                            />

                            <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 md:gap-3 mt-6 pt-4 border-t border-slate-200">
                                {isEditing ? (
                                    <><button onClick={() => setEditingOrderId(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase">Отмена</button><button onClick={() => saveEditing(fullOrder)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2">{isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Сохранить</button></>
                                ) : (
                                    <>{!isCancelled && !order.isProcessed && <button onClick={() => startEditing(fullOrder)} className="px-4 py-3 rounded-xl border border-indigo-100 text-indigo-600 bg-indigo-50 font-black text-[10px] uppercase flex items-center gap-2"><Edit2 size={14}/> Изменить</button>}{!isCancelled && <button onClick={() => setAdminModal({ type: 'ANNUL', orderId: order.id })} className="px-4 py-3 rounded-xl border border-red-100 text-red-500 bg-red-50 font-black text-[10px] uppercase flex items-center gap-2"><Ban size={14}/> Аннулировать</button>}
                                    {currentStatus === 'В обработке' && (order.offers?.length > 0) && (
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
  handleLocalUpdateRank: (orderId: string, offerId: string, itemName: string, currentRank: RankType, vin: string, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number) => void;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
  exchangeRates: any;
}

export const AdminOrdersList: React.FC<AdminOrdersListProps> = ({
  orders, sortConfig, handleSort, expandedId, setExpandedId,
  onLoadMore, hasMore, isLoading, exchangeRates,
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
        <div className={`hidden md:grid ${GRID_COLS} gap-3 p-4 border-b border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider select-none shrink-0 z-20`}>
             <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ ЗАКАЗА <SortIcon column="id"/></div>
             <div className="flex items-center">ТЕМА ПИСЬМА</div>
             <div>БРЕНД</div>
             <div>ПОЗИЦИЯ</div>
             <div className="text-right">ДАТА</div>
             <div className="text-right cursor-pointer group" onClick={() => handleSort('statusUpdatedAt')}>ВРЕМЯ <SortIcon column="statusUpdatedAt"/></div>
             <div className="text-center">ОФФЕРЫ</div>
             <div className="text-center">ПОЗИЦИЙ</div>
             <div className="text-center">СТАТУС</div>
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
                        {...rowProps}
                    />
                )}
                components={{
                    Footer: () => (
                        <div className="py-8 flex flex-col items-center gap-2">
                            {isLoading && <Loader2 className="animate-spin text-slate-300" size={20}/>}
                            {!hasMore && orders.length > 0 && <div className="text-[10px] font-bold text-slate-300 uppercase italic">Все заказы загружены ({orders.length})</div>}
                            {hasMore && !isLoading && <button onClick={onLoadMore} className="text-[10px] text-indigo-500 hover:underline">Загрузить еще</button>}
                        </div>
                    )
                }}
            />
         </div>
    </div>
  );
};