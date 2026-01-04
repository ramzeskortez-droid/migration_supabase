import React, { memo } from 'react';
import { 
  ArrowUp, ArrowDown, ArrowUpDown, ChevronDown, ChevronRight, TrendingUp, 
  FileText, Send, ShoppingCart, CheckCircle2, CreditCard, Truck, PackageCheck, Ban, 
  Edit2, Loader2, Check 
} from 'lucide-react';
import { Order, OrderStatus, RankType, Currency } from '../../types';
import { AdminItemsTable } from './AdminItemsTable';
import { Virtuoso } from 'react-virtuoso';
import { useQuery } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';

const GRID_COLS = "grid-cols-[80px_90px_1fr_50px_110px_100px_80px_130px_80px_100px_30px]";

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
    openRegistry, toggleRegistry
}: any) => {
    const isEditing = editingOrderId === order.id;
    const carBrand = (order.car?.AdminModel || order.car?.model || '').split(' ')[0];
    const carModel = (order.car?.AdminModel || order.car?.model || '').split(' ').slice(1).join(' ');
    const carYear = order.car?.AdminYear || order.car?.year;
    const currentStatus = order.workflowStatus || 'В обработке';
    const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';

    // Lazy load details ONLY when expanded
    const { data: details, isLoading: detailsLoading } = useQuery({
        queryKey: ['order-details', order.id],
        queryFn: () => SupabaseService.getOrderDetails(order.id),
        enabled: isExpanded,
        staleTime: 60000
    });

    const fullOrder = { ...order, items: details?.items || [], offers: details?.offers || [] };
    const offersCount = details?.offers?.length || 0; 

    let statusBorderColor = 'border-l-transparent';
    let statusBgColor = 'hover:bg-slate-50';
    if (currentStatus === 'Готов купить' || currentStatus === 'Выполнен') { statusBorderColor = 'border-l-emerald-500'; statusBgColor = 'bg-emerald-50/30 hover:bg-emerald-50/50'; }
    else if (isCancelled) { statusBorderColor = 'border-l-red-500'; statusBgColor = 'bg-red-50/30 hover:bg-red-50/50'; }
    else if (currentStatus === 'Подтверждение от поставщика' || currentStatus === 'КП отправлено') { statusBorderColor = 'border-l-amber-400'; statusBgColor = 'bg-amber-50/30 hover:bg-amber-50/50'; }
    else if (currentStatus === 'В пути' || currentStatus === 'Ожидает оплаты') { statusBorderColor = 'border-l-blue-500'; statusBgColor = 'bg-blue-50/30 hover:bg-blue-50/50'; }

    const statusConfig = STATUS_STEPS.find(s => s.id === currentStatus);
    const statusBadgeColor = statusConfig ? `${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}` : 'bg-slate-100 text-slate-500 border-slate-200';

    return (
        <div className={`transition-all duration-500 border-l-4 ${isExpanded ? 'border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-4 mx-4' : `${statusBorderColor} ${statusBgColor} border-b border-slate-200`}`}>
            <div className={`grid grid-cols-1 md:${GRID_COLS} gap-2 md:gap-3 p-4 items-center cursor-pointer text-[10px]`} onClick={() => !isEditing && onToggle(isExpanded ? null : order.id)}>
                <div className="flex items-center justify-between md:justify-start">
                    <div className="font-mono font-bold text-slate-700">{order.id}</div>
                    <div className="md:hidden flex items-center gap-2">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${offersCount > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-50 text-red-400'}`}>
                            {offersCount} ОФ.
                        </span>
                        <span className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border ${statusBadgeColor}`}>{currentStatus}</span>
                        <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                    </div>
                </div>
                <div className="font-bold text-slate-900 uppercase truncate">{carBrand}</div>
                <div className="font-bold text-slate-700 uppercase truncate break-words leading-tight">{carModel}</div>
                <div className="font-bold text-slate-500">{carYear}</div>
                <div className="font-mono text-slate-500 truncate">{order.vin}</div>
                <div className="font-bold text-slate-500 uppercase truncate break-words leading-tight">{order.clientName}</div>
                <div className="hidden md:block">
                    <span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-nowrap ${offersCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400'}`}>
                        {detailsLoading ? '...' : `[${offersCount}] ОФФЕРОВ`}
                    </span>
                </div>
                <div className="hidden md:block"><span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-normal text-center leading-tight border ${statusBadgeColor}`}>{currentStatus}</span></div>
                <div className="text-left md:text-right font-bold text-slate-400">{order.createdAt.split(',')[0]}</div>
                <div className="text-left md:text-right font-mono text-[9px] font-bold text-slate-500">{order.statusUpdatedAt ? order.statusUpdatedAt.split(',')[1]?.trim() : '-'}</div>
                <div className="hidden md:flex justify-end"><ChevronRight size={16} className={`text-slate-400 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/></div>
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
                                    <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Марка/Модель</label><input value={editForm['car_model']} onChange={e => setEditForm({...editForm, 'car_model': e.target.value})} className="w-full p-2 border rounded text-xs font-bold uppercase"/></div>
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Год</label><input value={editForm['car_year']} onChange={e => setEditForm({...editForm, 'car_year': e.target.value})} className="w-full p-2 border rounded text-xs font-bold"/></div>
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase">Кузов</label><input value={editForm['car_body']} onChange={e => setEditForm({...editForm, 'car_body': e.target.value})} className="w-full p-2 border rounded text-xs font-bold uppercase"/></div>
                                        <div className="col-span-1 space-y-1"><label className="text-[8px] font-bold text-indigo-400 uppercase">Срок (нед)</label><input type="number" value={editForm['delivery_weeks']} onChange={e => setEditForm({...editForm, 'delivery_weeks': e.target.value})} className="w-full p-2 border-2 border-indigo-100 rounded text-xs font-black text-indigo-600 focus:border-indigo-300"/></div>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-2 md:grid-cols-7 gap-3 md:gap-6 text-[10px]">
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Клиент</span><span className="font-black text-indigo-600 uppercase text-sm">{order.clientName}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Телефон</span><span className="font-bold text-slate-700">{order.clientPhone || "-"}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">VIN</span><span className="font-mono font-bold text-slate-600">{order.vin}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Модель</span><span className="font-black text-slate-800 uppercase">{order.car?.AdminModel || order.car?.model}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Марка</span><span className="font-bold text-slate-700 uppercase">{carBrand}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Год</span><span className="font-bold text-slate-700">{carYear}</span></div>
                                        <div><span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Кузов</span><span className="font-bold text-slate-700 uppercase">{order.car?.AdminBodyType || order.car?.bodyType || '-'}</span></div>
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
                            />

                            <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 md:gap-3 mt-6 pt-4 border-t border-slate-200">
                                {isEditing ? (
                                    <><button onClick={() => setEditingOrderId(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase">Отмена</button><button onClick={() => saveEditing(fullOrder)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2">{isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Сохранить</button></>
                                ) : (
                                    <>{!isCancelled && !order.isProcessed && <button onClick={() => startEditing(fullOrder)} className="px-4 py-3 rounded-xl border border-indigo-100 text-indigo-600 bg-indigo-50 font-black text-[10px] uppercase flex items-center gap-2"><Edit2 size={14}/> Изменить</button>}{!isCancelled && <button onClick={() => setAdminModal({ type: 'ANNUL', orderId: order.id })} className="px-4 py-3 rounded-xl border border-red-100 text-red-500 bg-red-50 font-black text-[10px] uppercase flex items-center gap-2"><Ban size={14}/> Аннулировать</button>}
                                    {currentStatus === 'В обработке' && offersCount > 0 && (
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
  handleLocalUpdateRank: (offerId: string, itemName: string, currentRank: RankType, vin: string, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number) => void;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
}

export const AdminOrdersList: React.FC<AdminOrdersListProps> = ({
  orders, sortConfig, handleSort, expandedId, setExpandedId,
  onLoadMore, hasMore, isLoading,
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
             <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>ID <SortIcon column="id"/></div>
             <div className="cursor-pointer flex items-center group" onClick={() => handleSort('clientName')}>Имя <SortIcon column="clientName"/></div> 
             <div>Модель</div>
             <div className="cursor-pointer flex items-center group" onClick={() => handleSort('created_at')}>Дата <SortIcon column="created_at"/></div>
             <div>VIN</div>
             <div>Клиент</div>
             <div>ОФФЕРЫ</div>
             <div>СТАТУС</div>
             <div className="flex justify-end">Дата</div>
             <div className="flex justify-end cursor-pointer group" onClick={() => handleSort('statusUpdatedAt')}>ВРЕМЯ <SortIcon column="statusUpdatedAt"/></div>
             <div></div>
         </div>

         {/* Virtualized List */}
         <div className="flex-grow">
            <Virtuoso
                style={{ height: '100%' }}
                data={orders}
                endReached={() => { 
                    console.log('Virtuoso endReached. hasMore:', hasMore, 'isLoading:', isLoading);
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