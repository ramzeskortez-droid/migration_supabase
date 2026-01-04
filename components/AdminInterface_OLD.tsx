import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order, OrderStatus, Currency, RankType, OrderItem, ActionLog, AdminModalState, AdminTab } from '../types';
import { Pagination } from './Pagination';
import { 
  Search, RefreshCw, ChevronRight, FileText, 
  History, X, CheckCircle2, Ban, Loader2,
  ArrowUp, ArrowDown, ArrowUpDown, Edit2, Check, AlertCircle, TrendingUp,
  Send, ShoppingCart, CreditCard, Truck, PackageCheck, ChevronDown, ChevronUp, ClipboardList, LayoutDashboard, Settings, Zap, Clock
} from 'lucide-react';

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

const TAB_MAPPING: Record<string, AdminTab> = {
    'В обработке': 'new', 'КП отправлено': 'kp_sent', 'Готов купить': 'ready_to_buy', 'Подтверждение от поставщика': 'supplier_confirmed', 'Ожидает оплаты': 'awaiting_payment', 'В пути': 'in_transit', 'Выполнен': 'completed', 'Аннулирован': 'annulled', 'Отказ': 'refused'
};

export const AdminInterface: React.FC = () => {
  const [currentView, setCurrentView] = useState<'listing' | 'statuses'>('listing');
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0); 
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [seedProgress, setSeedProgress] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('new');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ [key: string]: string }>({}); 
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [vanishingIds, setVanishingIds] = useState<Set<string>>(new Set());
  const [adminModal, setAdminModal] = useState<AdminModalState | null>(null);
  const [refusalReason, setRefusalReason] = useState("");
  
  // Пагинация и Сортировка
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });
  
  // Авто-смена сортировки при переключении табов
  useEffect(() => {
      if (activeTab === 'new') {
          setSortConfig({ key: 'offers', direction: 'desc' });
      } else {
          setSortConfig({ key: 'statusUpdatedAt', direction: 'desc' });
      }
  }, [activeTab]);

  const [openRegistry, setOpenRegistry] = useState<Set<string>>(new Set());
  const interactionLock = useRef<number>(0);

  // Дебаунс для поиска
  useEffect(() => {
    const timer = setTimeout(() => {
        setCurrentPage(1); 
        fetchData(); 
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Маппинг табов на статусы БД
  const getStatusFilter = (tab: AdminTab) => {
      switch(tab) {
          case 'new': return 'В обработке';
          case 'kp_sent': return 'КП отправлено';
          case 'ready_to_buy': return 'Готов купить';
          case 'supplier_confirmed': return 'Подтверждение от поставщика';
          case 'awaiting_payment': return 'Ожидает оплаты';
          case 'in_transit': return 'В пути';
          case 'completed': return 'Выполнен';
          case 'annulled': return 'Аннулирован';
          case 'refused': return 'Отказ';
          default: return undefined;
      }
  };

  const addLog = (text: string, type: 'info' | 'success' | 'error') => {
      const log: ActionLog = { id: Date.now().toString() + Math.random(), time: new Date().toLocaleTimeString(), text, type };
      setLogs(prev => [log, ...prev].slice(0, 50));
  };

  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);
  };

  const fetchData = React.useCallback(async (silent = false) => {
    if (silent && (Date.now() - interactionLock.current < 10000)) return;
    if (!silent) setLoading(true); setIsSyncing(true);
    
    try { 
        const statusFilter = getStatusFilter(activeTab);
        
        // 1. Грузим заказы (Критично)
        const { data, count } = await SupabaseService.getOrders(
            currentPage, 
            itemsPerPage, 
            sortConfig?.key || 'id', 
            sortConfig?.direction || 'desc', 
            searchQuery,
            statusFilter
        );
        setOrders(data); 
        setTotalOrders(count);

        // 2. Грузим счетчики (Не критично, но нужно)
        try {
            const counts = await SupabaseService.getStatusCounts();
            setStatusCounts(counts);
        } catch (e) {
            console.error("Не удалось загрузить счетчики:", e);
        }

    } catch(e) { 
        console.error("Критическая ошибка загрузки:", e);
        addLog("Ошибка загрузки данных", "error"); 
    }
    finally { setLoading(false); setIsSyncing(false); }
  }, [activeTab, currentPage, itemsPerPage, sortConfig, searchQuery]);

  useEffect(() => { 
      fetchData(); 
      // Увеличиваем интервал до 60 сек, чтобы реже перебивать ввод пользователя
      const interval = setInterval(() => fetchData(true), 60000); 
      return () => clearInterval(interval); 
  }, [fetchData]);
  
  useEffect(() => { setCurrentPage(1); }, [activeTab, sortConfig, searchQuery]);

  const handleSort = (key: string) => { 
      setExpandedId(null); 
      setSortConfig(current => { 
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }; 
          const defaultDir = (key === 'date' || key === 'offers' || key === 'id' || key === 'created_at') ? 'desc' : 'asc';
          return { key, direction: defaultDir }; 
      }); 
  };

  const handleLocalUpdateRank = (offerId: string, itemName: string, currentRank: RankType, vin: string, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number) => {
      const newAction = currentRank === 'ЛИДЕР' || currentRank === 'LEADER' ? 'RESET' : undefined;
      setOrders(prev => prev.map(o => { if (o.vin !== vin) return o; return { ...o, offers: o.offers?.map(off => ({ ...off, items: off.items.map(i => { if (i.name?.trim().toLowerCase() === itemName?.trim().toLowerCase()) { if (off.id === offerId) return { ...i, rank: newAction === 'RESET' ? 'РЕЗЕРВ' : 'ЛИДЕР' as RankType, adminPrice, adminCurrency, adminComment, deliveryRate }; else if (!newAction) return { ...i, rank: 'РЕЗЕРВ' as RankType }; } return i; }) })) }; }));
  };

  // Универсальная функция для обновления полей оффера (цена, валюта, тариф, коммент)
  const handleItemChange = (orderId: string, offerId: string, itemName: string, field: string, value: any) => {
      console.log('handleItemChange:', { orderId, offerId, itemName, field, value });
      setOrders(prev => prev.map(o => {
          if (o.id !== orderId) return o;
          return {
              ...o,
              offers: o.offers?.map(off => {
                  if (off.id !== offerId) return off;
                  return {
                      ...off,
                      items: off.items.map(i => {
                          if (i.name.trim().toLowerCase() !== itemName.trim().toLowerCase()) return i;
                          console.log(' -> UPDATING item state:', i.name, field, value);
                          return { ...i, [field]: value };
                      })
                  };
              })
          };
      }));
  };

  const handleFormCP = async (orderId: string) => {
      console.log('handleFormCP called for:', orderId);
      try {
          const order = orders.find(o => o.id === orderId); 
          if (!order) { console.error('Order not found'); return; }
          
          const coveredItems = new Set<string>(); 
          order.offers?.forEach(off => { 
              off.items.forEach(i => { 
                  if (i.rank === 'ЛИДЕР' || i.rank === 'LEADER') {
                      coveredItems.add(i.name.trim().toLowerCase()); 
                  }
              }); 
          });
          
          const missing = order.items.filter(i => !coveredItems.has((i.AdminName || i.name).trim().toLowerCase()));
          console.log('Missing items:', missing);
          
          if (missing.length > 0) { 
              setAdminModal({ type: 'VALIDATION', orderId: orderId, missingItems: missing.map(i => i.AdminName || i.name) }); 
              return; 
          }
          executeApproval(orderId);
      } catch (e) {
          console.error('Error in handleFormCP:', e);
      }
  };

  const executeApproval = async (orderId: string) => {
      setAdminModal(null); 
      setIsSubmitting(orderId); 
      const order = orders.find(o => o.id === orderId); 
      if (!order) return;
      
      console.log('executeApproval START for order:', orderId);
      
      showToast("Фиксация лидеров и формирование КП...");
      
      try {
          const winnersPayload: any[] = [];
          if (order.offers) { 
              for (const off of order.offers) { 
                  for (const item of off.items) { 
                      if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') { 
                          winnersPayload.push({
                              id: item.id,
                              admin_price: item.adminPrice || item.sellerPrice,
                              admin_currency: item.adminCurrency || item.sellerCurrency,
                              delivery_rate: item.deliveryRate || 0,
                              admin_comment: item.adminComment || ''
                          });
                      } 
                  } 
              } 
          }
          
          // Отправляем ОДИН быстрый запрос и ЖДЕМ его
          await SupabaseService.approveOrderFast(orderId, winnersPayload);
          
          // Только ПОСЛЕ успеха переключаем таб. 
          // Так мы гарантируем, что fetchData увидит обновленный заказ.
          setActiveTab('kp_sent'); 
          setExpandedId(orderId); // Явно оставляем развернутым
          
      } catch (e) { 
          console.error(e);
          showToast("Ошибка при утверждении КП");
      } finally { 
          setIsSubmitting(null); 
      }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, workflowStatus: newStatus } : o));
      const targetTab = TAB_MAPPING[newStatus]; if (targetTab) setActiveTab(targetTab);
      showToast(`Статус изменен на: ${newStatus}`);
      try { await SupabaseService.updateWorkflowStatus(orderId, newStatus); } catch(e) { showToast("Ошибка сохранения"); fetchData(true); }
  };

  const handleNextStep = (order: Order) => { const currentIdx = STATUS_STEPS.findIndex(s => s.id === (order.workflowStatus || 'В обработке')); if (currentIdx < STATUS_STEPS.length - 1) handleStatusChange(order.id, STATUS_STEPS[currentIdx + 1].id); };

  const handleRefuse = async () => { if (!adminModal?.orderId) return; setIsSubmitting(adminModal.orderId); try { await SupabaseService.refuseOrder(adminModal.orderId, refusalReason, 'ADMIN'); setAdminModal(null); setRefusalReason(""); setOrders(prev => prev.map(o => o.id === adminModal.orderId ? { ...o, isRefused: true, status: OrderStatus.CLOSED } : o)); setActiveTab('refused'); } catch (e) {} finally { setIsSubmitting(null); } };

  const startEditing = (order: Order) => { setEditingOrderId(order.id); const form: any = {}; form[`car_model`] = order.car?.AdminModel || order.car?.model || ''; form[`car_year`] = order.car?.AdminYear || order.car?.year || ''; form[`car_body`] = order.car?.AdminBodyType || order.car?.bodyType || ''; form[`delivery_weeks`] = order.items[0]?.deliveryWeeks?.toString() || ''; order.items.forEach((item, idx) => { form[`item_${idx}_name`] = item.AdminName || item.name; form[`item_${idx}_qty`] = item.AdminQuantity || item.quantity; }); setEditForm(form); };

  const saveEditing = async (order: Order) => { setIsSubmitting(order.id); const newItems = order.items.map((item, idx) => ({ ...item, AdminName: editForm[`item_${idx}_name`], AdminQuantity: Number(editForm[`item_${idx}_qty`]), deliveryWeeks: Number(editForm[`delivery_weeks`]), car: { ...order.car, AdminModel: editForm[`car_model`], AdminYear: editForm[`car_year`], AdminBodyType: editForm[`car_body`] } })); setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: newItems } : o)); try { await SupabaseService.updateOrderJson(order.id, newItems); setEditingOrderId(null); } catch (e) { fetchData(true); } finally { setIsSubmitting(null); } };

  const toggleRegistry = (id: string) => { setOpenRegistry(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const renderStatusSettings = () => (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-left-4 duration-500">
        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-slate-100">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><Settings size={20}/></div>
            <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">Настройка статусов</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
                <div className="px-4 py-2 bg-slate-900 rounded-xl text-white text-[10px] font-black uppercase tracking-widest text-center shadow-lg">Интерфейс Клиента</div>
                <div className="space-y-2">
                    {['В обработке', 'КП готово', 'Готов купить', 'Подтверждение от поставщика', 'Ожидает оплаты', 'В пути', 'Выполнен', 'Аннулирован', 'Отказ'].map(s => (
                        <div key={s} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400"></div> {s}
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="px-4 py-2 bg-indigo-600 rounded-xl text-white text-[10px] font-black uppercase tracking-widest text-center shadow-lg">Интерфейс Поставщика</div>
                <div className="space-y-2">
                    {['Сбор офферов', 'Идут торги', 'ВЫИГРАЛ', 'ПРОИГРАЛ', 'ЧАСТИЧНО', 'ОТКАЗ', 'Торги завершены'].map(s => (
                        <div key={s} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div> {s}
                        </div>
                    ))}
                </div>
            </div>
            <div className="space-y-4">
                <div className="px-4 py-2 bg-amber-500 rounded-xl text-white text-[10px] font-black uppercase tracking-widest text-center shadow-lg">Интерфейс Админа</div>
                <div className="space-y-2">
                    {STATUS_STEPS.map(s => (
                        <div key={s.id} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-3">
                            <s.icon size={12} className={s.color}/> {s.label}
                        </div>
                    ))}
                    {['Аннулирован', 'Отказ'].map(s => (
                        <div key={s} className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 flex items-center gap-3">
                            <div className="w-1.5 h-1.5 rounded-full bg-red-400"></div> {s}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    </div>
  );

  return (
      <div className="flex min-h-screen bg-slate-50">
          <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
              <div className="px-4 py-6 mb-4">
                  <div className="flex items-center gap-3 text-indigo-600 mb-1">
                      <LayoutDashboard size={24} />
                      <span className="font-black uppercase text-lg tracking-tighter text-slate-900">Admin<span className="text-indigo-600">Panel</span></span>
                  </div>
              </div>
              
              <button 
                onClick={() => setCurrentView('listing')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentView === 'listing' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                  <ClipboardList size={18} /> Листинг
              </button>
              
              <button 
                onClick={() => setCurrentView('statuses')}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentView === 'statuses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
              >
                  <Settings size={18} /> Статусы
              </button>
          </aside>

          <main className="flex-grow p-4 overflow-y-auto">
              {currentView === 'statuses' ? renderStatusSettings() : (
                  <div className="max-w-6xl mx-auto space-y-4">
                      {successToast && (
                         <div className="fixed top-6 right-6 z-[200] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 border border-slate-700">
                             <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white"><CheckCircle2 size={18}/></div>
                             <div className="font-bold text-sm">{successToast.message}</div>
                         </div>
                      )}
                      
                      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                          <div className="flex items-center gap-4">
                              <h1 className="text-lg font-black uppercase text-slate-800">Панель Администратора</h1>
                              <button onClick={() => setShowLogs(!showLogs)} className={`p-2 rounded-lg ${showLogs ? 'bg-slate-200' : 'bg-slate-50'} hover:bg-slate-200 transition-colors`}><History size={18} className="text-slate-600"/></button>
                          </div>
                          
                          <div className="flex gap-2">
                             <button onClick={async () => { if(!confirm('Удалить все?')) return; setLoading(true); try { await SupabaseService.deleteAllOrders(); fetchData(true); } catch(e) {} finally { setLoading(false); } }} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-2"><Ban size={14}/> Очистить БД</button>
                             <div className="flex bg-indigo-50 rounded-lg p-1 border border-indigo-100 items-center">
                                {[100, 1000].map(count => (
                                    <button key={count} disabled={loading} onClick={async () => { setLoading(true); try { await SupabaseService.seedOrders(count, (c) => setSeedProgress(c)); fetchData(true); } catch(e) {} finally { setLoading(false); setSeedProgress(null); } }} className="px-3 py-1.5 hover:bg-white rounded-md text-[10px] font-black uppercase text-indigo-600">{count}</button>
                                ))}
                             </div>
                          </div>
                      </div>

                      <div className="relative group flex items-center">
                          <Search className="absolute left-6 text-slate-400" size={20}/>
                          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" />
                      </div>

                      <div className="flex justify-between items-end border-b border-slate-200">
                          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                              {['new','kp_sent','ready_to_buy','supplier_confirmed','awaiting_payment','in_transit','completed','annulled','refused'].map(id => {
                                  const label = id === 'new' ? 'Новые' : id === 'kp_sent' ? 'КП отпр.' : id === 'ready_to_buy' ? 'Готов купить' : id === 'supplier_confirmed' ? 'Подтверждено' : id === 'awaiting_payment' ? 'Ждет оплаты' : id === 'in_transit' ? 'В пути' : id === 'completed' ? 'Выполнен' : id === 'annulled' ? 'Аннулирован' : 'Отказ';
                                  const count = statusCounts[id] || 0;
                                  return (
                                      <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                          {label}
                                          {count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>+{count}</span>}
                                      </button>
                                  );
                              })}
                          </div>
                          <button onClick={() => fetchData()} className="mb-2 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 shrink-0 shadow-sm"><RefreshCw size={14} className={isSyncing ? "animate-spin" : ""}/></button>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                         <div className={`hidden md:grid ${GRID_COLS} gap-3 p-4 border-b border-slate-100 bg-slate-50 text-[9px] font-black text-slate-400 uppercase tracking-wider select-none h-12 items-center`}>
                             <div className="cursor-pointer flex items-center h-full group" onClick={() => handleSort('id')}>ID <SortIcon column="id"/></div>
                             <div className="cursor-pointer flex items-center h-full group" onClick={() => handleSort('clientName')}>Имя <SortIcon column="clientName"/></div> 
                             <div className="flex items-center h-full">Модель</div>
                             <div className="cursor-pointer flex items-center h-full group" onClick={() => handleSort('created_at')}>Дата <SortIcon column="created_at"/></div>
                             <div className="flex items-center h-full">VIN</div>
                             <div className="flex items-center h-full">Клиент</div>
                             <div className="cursor-pointer flex items-center h-full group" onClick={() => handleSort('offers')}>ОФФЕРЫ <SortIcon column="offers"/></div>
                             <div className="flex items-center h-full">СТАТУС</div>
                             <div className="flex items-center justify-end h-full">Дата</div>
                             <div className="flex items-center justify-end h-full cursor-pointer group" onClick={() => handleSort('statusUpdatedAt')}>ВРЕМЯ <SortIcon column="statusUpdatedAt"/></div>
                             <div></div>
                         </div>

                         {orders.map(order => {
                             const isExpanded = expandedId === order.id; const isEditing = editingOrderId === order.id;
                             const offersCount = order.offers ? order.offers.length : 0;
                             const carBrand = (order.car?.AdminModel || order.car?.model || '').split(' ')[0];
                             const carModel = (order.car?.AdminModel || order.car?.model || '').split(' ').slice(1).join(' ');
                             const carYear = order.car?.AdminYear || order.car?.year;
                             const currentStatus = order.workflowStatus || 'В обработке';
                             const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
                             
                             let statusBorderColor = 'border-l-transparent';
                             let statusBgColor = 'hover:bg-slate-50';
                             if (currentStatus === 'Готов купить' || currentStatus === 'Выполнен') { statusBorderColor = 'border-l-emerald-500'; statusBgColor = 'bg-emerald-50/30 hover:bg-emerald-50/50'; }
                             else if (isCancelled) { statusBorderColor = 'border-l-red-500'; statusBgColor = 'bg-red-50/30 hover:bg-red-50/50'; }
                             else if (currentStatus === 'Подтверждение от поставщика' || currentStatus === 'КП отправлено') { statusBorderColor = 'border-l-amber-400'; statusBgColor = 'bg-amber-50/30 hover:bg-amber-50/50'; }
                             else if (currentStatus === 'В пути' || currentStatus === 'Ожидает оплаты') { statusBorderColor = 'border-l-blue-500'; statusBgColor = 'bg-blue-50/30 hover:bg-blue-50/50'; }

                             const statusConfig = STATUS_STEPS.find(s => s.id === currentStatus);
                             const statusBadgeColor = statusConfig ? `${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}` : 'bg-slate-100 text-slate-500 border-slate-200';

                             return (
                             <div key={order.id} className={`transition-all duration-500 border-l-4 ${isExpanded ? 'border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-4' : `${statusBorderColor} ${statusBgColor} border-b border-slate-200`}`}>
                                 <div className={`grid grid-cols-1 md:${GRID_COLS} gap-2 md:gap-3 p-4 items-center cursor-pointer text-[10px]`} onClick={() => !isEditing && setExpandedId(expandedId === order.id ? null : order.id)}>
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
                                     <div className="hidden md:block"><span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-nowrap ${offersCount > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400'}`}>[{offersCount}] ОФФЕРОВ</span></div>
                                     <div className="hidden md:block"><span className={`inline-flex px-2 py-1 rounded font-black uppercase text-[8px] whitespace-normal text-center leading-tight border ${statusBadgeColor}`}>{currentStatus}</span></div>
                                     <div className="text-left md:text-right font-bold text-slate-400">{order.createdAt.split(',')[0]}</div>
                                     <div className="text-left md:text-right font-mono text-[9px] font-bold text-slate-500">{order.statusUpdatedAt ? order.statusUpdatedAt.split(',')[1]?.trim() : '-'}</div>
                                     <div className="hidden md:flex justify-end"><ChevronRight size={16} className={`text-slate-400 transition-transform ${expandedId === order.id ? 'rotate-90 text-indigo-600' : ''}`}/></div>
                                 </div>
                                 
                                 {isExpanded && (
                                     <div className="p-6 bg-slate-50 border-t border-slate-100 rounded-b-xl cursor-default">
                                         {!isCancelled && (
                                           <div className="mb-8 bg-white p-4 rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                                             <div className="flex items-center justify-between mb-4">
                                                <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2"><TrendingUp size={14}/> Процесс выполнения</h3>
                                                {currentStatus !== 'Выполнен' && currentStatus !== 'В обработке' && (<button onClick={() => handleNextStep(order)} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-1 transition-colors">Следующий шаг <ChevronRight size={12}/></button>)}
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

                                         <div className="space-y-4">
                                             {order.items.map((item, idx) => {
                                                 const itemOffers: any[] = []; 
                                                 if (order.offers) { 
                                                     for (const off of order.offers) { 
                                                         const matching = off.items.find(i => i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()); 
                                                         if (matching && (matching.offeredQuantity || 0) > 0) 
                                                             itemOffers.push({ offerId: off.id, clientName: off.clientName, item: matching }); 
                                                     } 
                                                 }
                                                 
                                                 let minPrice = Infinity;
                                                 let minDelivery = Infinity;
                                                 itemOffers.forEach(o => {
                                                     if (o.item.sellerPrice < minPrice) minPrice = o.item.sellerPrice;
                                                     if (o.item.deliveryWeeks !== undefined && o.item.deliveryWeeks < minDelivery) minDelivery = o.item.deliveryWeeks;
                                                 });

                                                 const leaders = itemOffers.filter(o => o.item.rank === 'ЛИДЕР' || o.item.rank === 'LEADER');
                                                 const others = itemOffers.filter(o => o.item.rank !== 'ЛИДЕР' && o.item.rank !== 'LEADER');
                                                 const showRegistry = currentStatus !== 'В обработке';
                                                 const displayOffers = showRegistry ? leaders : itemOffers;
                                                 const hiddenCount = showRegistry ? others.length : 0;
                                                 const isRegistryOpen = openRegistry.has(item.name);

                                                 return (
                                                     <div key={idx} className="bg-slate-900 rounded-xl overflow-hidden shadow-md">
                                                         <div className="p-3 flex items-center justify-between text-white border-b border-slate-700">
                                                             <div className="flex items-center gap-3">
                                                                 {isEditing ? (
                                                                     <div className="flex gap-2">
                                                                         <input value={editForm[`item_${idx}_name`]} onChange={e => setEditForm({...editForm, [`item_${idx}_name`]: e.target.value})} className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs font-bold uppercase w-64"/>
                                                                         <input type="number" value={editForm[`item_${idx}_qty`]} onChange={e => setEditForm({...editForm, [`item_${idx}_qty`]: e.target.value})} className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs font-bold w-16 text-center"/>
                                                                     </div>
                                                                 ) : (
                                                                     <><span className="font-black text-sm uppercase tracking-wide">{item.AdminName || item.name}</span><span className="text-[10px] font-bold opacity-60 ml-2">({item.AdminQuantity || item.quantity} ШТ)</span></>
                                                                 )}
                                                             </div>
                                                         </div>
                                                         <div className="hidden md:grid grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.5fr_1fr_0.8fr_1fr] gap-2 px-6 py-3 bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] items-center text-center">
                                                             <div className="text-left">Поставщик</div><div>Цена Пост.</div><div>Кол-во</div><div>Вес</div><div>Срок</div><div>Фото</div><div>Доставка</div><div>ЦЕНА АДМИН</div><div>Валюта</div><div></div>
                                                         </div>
                                                         <div className="bg-white p-2 space-y-1">
                                                             {displayOffers.map((off, oIdx) => {
                                                                 const isLeader = off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                                                                 const isBestPrice = off.item.sellerPrice === minPrice && minPrice !== Infinity;
                                                                 const isBestDelivery = off.item.deliveryWeeks === minDelivery && minDelivery !== Infinity;

                                                                 return (
                                                                     <div key={oIdx} className={`p-2 rounded-lg border items-center text-[10px] ${isLeader ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'} md:grid md:grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.5fr_1fr_0.8fr_1fr] md:gap-2 flex flex-col gap-3 relative`}>
                                                                         <div className="hidden md:contents text-center font-bold text-slate-700">
                                                                             <div className="font-black uppercase text-slate-800 truncate text-left flex flex-col gap-1" title={off.clientName}>
                                                                                <div className="flex items-center gap-2">
                                                                                    {off.clientName}
                                                                                    {isLeader && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                                                                </div>
                                                                                <div className="flex flex-wrap gap-1">
                                                                                    {isBestPrice && <span className="bg-indigo-600 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm flex items-center gap-0.5"><Zap size={8}/> Лучшая цена</span>}
                                                                                    {isBestDelivery && <span className="bg-amber-500 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm flex items-center gap-0.5"><Clock size={8}/> Лучший срок</span>}
                                                                                </div>
                                                                             </div>
                                                                             <div className="text-slate-900 font-black">{off.item.sellerPrice} {off.item.sellerCurrency}</div>
                                                                             <div className="text-slate-500">{off.item.offeredQuantity}</div>
                                                                             <div className="text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-lg">{off.item.weight ? `${off.item.weight} кг` : '-'}</div>
                                                                             <div className="text-amber-600 font-black bg-amber-50 px-2 py-1 rounded-lg">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} н.` : '-'}</div>
                                                                             <div className="flex justify-center">{off.item.photoUrl ? (<a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"><FileText size={16}/></a>) : <span className="text-slate-200">-</span>}</div>
                                                                             <div><input type="number" className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl text-center font-black text-xs focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'deliveryRate', e.target.value === '' ? null : Number(e.target.value))} value={off.item.deliveryRate ?? ''} placeholder="0" disabled={order.isProcessed}/></div>
                                                                             <div><input type="number" className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl text-center font-black text-xs focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminPrice', e.target.value === '' ? null : Number(e.target.value))} value={off.item.adminPrice ?? ''} placeholder={String(off.item.sellerPrice || 0)} disabled={order.isProcessed}/></div>
                                                                             <div><select className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase focus:border-indigo-300 transition-all" value={off.item.adminCurrency || off.item.sellerCurrency} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminCurrency', e.target.value)} disabled={order.isProcessed}><option value="CNY">CNY</option><option value="RUB">RUB</option><option value="USD">USD</option></select></div>
                                                                             <div>{currentStatus === 'В обработке' ? (<button onClick={() => handleLocalUpdateRank(off.offerId, item.name, off.item.rank || '', order.vin, off.item.adminPrice, off.item.adminCurrency, off.item.adminComment, off.item.deliveryRate)} className={`w-full py-2 rounded-xl font-black uppercase text-[8px] transition-all shadow-md ${isLeader ? 'bg-emerald-500 text-white scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{isLeader ? 'ЛИДЕР' : 'ВЫБРАТЬ'}</button>) : (isLeader ? <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl flex items-center justify-center"><Check size={18}/></div> : <span className="text-slate-200">-</span>)}</div>
                                                                         </div>
                                                                         
                                                                         <div className="md:hidden w-full space-y-4">
                                                                             <div className="flex justify-between items-center border-b border-slate-100 pb-2"><span className="font-black text-slate-800 truncate uppercase">{off.clientName}</span>{isLeader && <span className="bg-emerald-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Winner</span>}</div>
                                                                             <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg text-[8px] text-center border border-slate-100">
                                                                                 <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Цена Пост</span><span className="font-black text-slate-700">{off.item.sellerPrice} {off.item.sellerCurrency}</span></div>
                                                                                 <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Кол-во</span><span className="font-black text-slate-700">{off.item.offeredQuantity}</span></div>
                                                                                 <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Вес Пост</span><span className="font-black text-indigo-600">{off.item.weight || '-'} кг</span></div>
                                                                                 <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Срок Пост</span><span className="font-black text-amber-600">{off.item.deliveryWeeks || '-'} н</span></div>
                                                                             </div>
                                                                             {off.item.photoUrl && (<div className="flex justify-center p-1 bg-blue-50 rounded-lg"><a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="text-[8px] font-black text-blue-600 flex items-center gap-1 uppercase"><FileText size={10}/> Посмотреть фото</a></div>)}
                                                                             <div className="grid grid-cols-3 gap-3 bg-white p-2 rounded-lg text-[8px] text-center border border-indigo-50 shadow-inner">
                                                                                 <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Цена Продажи</label><div className="relative"><input type="number" className="w-full p-2 border border-indigo-100 rounded-lg text-center font-black text-indigo-600 bg-indigo-50/30" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminPrice', e.target.value === '' ? null : Number(e.target.value))} value={off.item.adminPrice ?? ''} placeholder={String(off.item.sellerPrice || 0)} disabled={order.isProcessed}/></div></div>
                                                                                 <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Валюта</label><select className="w-full p-2 border border-indigo-100 rounded-lg font-black uppercase text-indigo-600 bg-white" value={off.item.adminCurrency || off.item.sellerCurrency} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminCurrency', e.target.value)} disabled={order.isProcessed}><option value="CNY">CNY</option><option value="RUB">RUB</option><option value="USD">USD</option></select></div>
                                                                                 <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Тариф (Дост)</label><input type="number" className="w-full p-2 border border-indigo-100 rounded-lg font-black text-indigo-600 bg-white text-center" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'deliveryRate', e.target.value === '' ? null : Number(e.target.value))} value={off.item.deliveryRate ?? ''} placeholder="0" disabled={order.isProcessed}/></div>
                                                                             </div>
                                                                             <div className="flex gap-2"><div className="flex-grow">{currentStatus === 'В обработке' ? (<button onClick={() => handleLocalUpdateRank(off.offerId, item.name, off.item.rank || '', order.vin, off.item.adminPrice, off.item.adminCurrency, off.item.adminComment, off.item.deliveryRate)} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] shadow-sm ${isLeader ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>{isLeader ? 'ЛИДЕР' : 'ВЫБРАТЬ'}</button>) : (isLeader ? <div className="w-full py-2 bg-emerald-100 text-emerald-600 rounded text-center font-black uppercase text-[9px] flex items-center justify-center gap-1"><Check size={12}/> Выбран</div> : <div className="w-full py-2 bg-slate-100 text-slate-400 rounded text-center text-[9px] uppercase font-bold">Резерв</div>)}</div></div>
                                                                         </div>
                                                                         
                                                                         <div className="col-span-full mt-1"><input type="text" maxLength={90} placeholder="Комментарий..." className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[9px] text-slate-500 outline-none focus:border-indigo-300 transition-colors shadow-inner" value={off.item.adminComment || ""} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminComment', e.target.value)}/></div>
                                                                     </div>
                                                                 );
                                                             })}
                                                             {hiddenCount > 0 && (
                                                                 <div className="mt-2 border-t border-slate-100 pt-2">
                                                                     <button onClick={() => toggleRegistry(item.name)} className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-slate-500 uppercase flex items-center justify-center gap-2"><ClipboardList size={12}/> Реестр остальных предложений ({hiddenCount})</button>
                                                                     {isRegistryOpen && <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 fade-in">{others.map((off, oIdx) => (<div key={oIdx} className="flex gap-4 p-2 rounded border border-slate-100 bg-slate-50 items-center text-[9px] opacity-75 grayscale-[0.5]"><div className="font-bold text-slate-600 w-32 truncate uppercase">{off.clientName}</div><div className="font-mono text-slate-500">{off.item.sellerPrice} {off.item.sellerCurrency}</div><div className="flex-grow text-right text-[8px] text-slate-300 uppercase font-black">Резерв</div></div>))}</div>}
                                                                 </div>
                                                             )}
                                                         </div>
                                                     </div>
                                                 );
                                             })}
                                         </div>
                                         <div className="flex flex-wrap md:flex-nowrap justify-end gap-2 md:gap-3 mt-6 pt-4 border-t border-slate-200">
                                             {isEditing ? (
                                                 <><button onClick={() => setEditingOrderId(null)} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-500 font-black text-[10px] uppercase">Отмена</button><button onClick={() => saveEditing(order)} className="px-6 py-3 rounded-xl bg-indigo-600 text-white font-black text-[10px] uppercase shadow-lg hover:bg-indigo-700 flex items-center gap-2">{isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <Check size={14}/>} Сохранить</button></>
                                             ) : (
                                                 <>{!isCancelled && !order.isProcessed && <button onClick={() => startEditing(order)} className="px-4 py-3 rounded-xl border border-indigo-100 text-indigo-600 bg-indigo-50 font-black text-[10px] uppercase flex items-center gap-2"><Edit2 size={14}/> Изменить</button>}{!isCancelled && <button onClick={() => setAdminModal({ type: 'ANNUL', orderId: order.id })} className="px-4 py-3 rounded-xl border border-red-100 text-red-500 bg-red-50 font-black text-[10px] uppercase flex items-center gap-2"><Ban size={14}/> Аннулировать</button>}                                        {/* Show Approve button ONLY in 'New' status and IF offers exist */}
                                        {currentStatus === 'В обработке' && offersCount > 0 && (
                                            <button onClick={() => { console.log('Button clicked'); handleFormCP(order.id); }} className="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-[10px] uppercase shadow-xl hover:bg-slate-800 transition-all active:scale-95 w-full md:w-auto flex items-center justify-center gap-2">
                                                {isSubmitting === order.id ? <Loader2 size={14} className="animate-spin"/> : <CheckCircle2 size={14}/>} 
                                                Утвердить КП и Отправить
                                            </button>
                                        )}</>
                                 )}
                             </div>
                         </div>
                     )}
                 </div>
                 );
             })}
             <Pagination totalItems={totalOrders} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
          </div>
          </div>
          )}
          </main>
          
          {adminModal && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                      {adminModal.type === 'VALIDATION' ? (
                          <div className="text-center space-y-4">
                              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={24}/></div>
                              <div><h3 className="text-lg font-black uppercase text-slate-800">Внимание!</h3><p className="text-xs font-bold text-slate-500 mt-2">Не выбраны поставщики для позиций:</p><ul className="mt-2 text-[10px] font-bold text-red-500 uppercase bg-red-50 p-2 rounded-lg text-left">{adminModal.missingItems?.map(i => <li key={i}>• {i}</li>)}</ul><p className="text-[10px] text-slate-400 mt-2">Утвердить КП с неполным комплектом?</p></div>
                              <div className="grid grid-cols-2 gap-3"><button onClick={() => setAdminModal(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase">Отмена</button><button onClick={() => executeApproval(adminModal.orderId!)} className="py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase shadow-lg">Всё равно утвердить</button></div>
                          </div>
                      ) : (
                          <div className="space-y-4">
                              <h3 className="text-lg font-black uppercase text-slate-800">Аннулирование заказа</h3>
                              <p className="text-xs text-slate-500 font-bold">Причина отказа (для клиента):</p><textarea value={refusalReason} onChange={e => setRefusalReason(e.target.value)} className="w-full h-24 p-3 border border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-indigo-500 bg-slate-50 uppercase" placeholder="Причина..."/><div className="flex gap-2 justify-end"><button onClick={() => setAdminModal(null)} className="px-4 py-2 text-xs font-bold text-slate-500 uppercase rounded-lg">Отмена</button><button onClick={handleRefuse} className="px-4 py-2 text-xs font-bold text-white bg-red-600 uppercase rounded-lg shadow-lg">Подтвердить</button></div>
                          </div>
                      )}
                  </div>
              </div>
          )}
      </div>
  );
};