import React, { useState, useEffect, useRef, useMemo } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { SupabaseService } from '../../services/supabaseService';
import { Order, OrderStatus, Currency, RankType, ActionLog, AdminModalState, AdminTab, ExchangeRates, WorkflowStatus, AppUser } from '../../types';
import { CheckCircle2, AlertCircle, Settings, FileText, Send, ShoppingCart, CreditCard, Truck, PackageCheck, User, LogOut, Ban, MessageCircle } from 'lucide-react';
import { AdminSidebar } from './AdminSidebar';
import { AdminToolbar } from './AdminToolbar';
import { AdminOrdersList } from './AdminOrdersList';
import { AdminFinanceSettings } from './AdminFinanceSettings';
import { AdminUsers } from './AdminUsers';
import { AdminBrands } from './AdminBrands';
import { AdminSettings } from './AdminSettings';
import { AdminChecklist } from './AdminChecklist';
import { useOrdersInfinite } from '../../hooks/useOrdersInfinite';
import { useQueryClient } from '@tanstack/react-query';
import { GlobalChatWindow } from '../shared/GlobalChatWindow';
import { useHeaderStore } from '../../store/headerStore';
import { useNavigate } from 'react-router-dom';

const STATUS_STEPS = [
  { id: 'В обработке', label: 'В обработке', icon: FileText, color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  { id: 'КП готово', label: 'КП готово', icon: Send, color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  { id: 'Готов купить', label: 'Готов купить', icon: ShoppingCart, color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  { id: 'Выполнен', label: 'Выполнен', icon: PackageCheck, color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200' }
];

const TAB_MAPPING: Record<string, AdminTab> = {
    'В обработке': 'new', 'Ручная обработка': 'manual', 'КП готово': 'kp_sent', 'Готов купить': 'ready_to_buy', 'Выполнен': 'completed', 'Аннулирован': 'archive', 'Отказ': 'archive', 'Обработано вручную': 'archive'
};

export const AdminInterface: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setHeader = useHeaderStore(s => s.setCustomRightContent);
  const [currentView, setCurrentView] = useState<'listing' | 'finance' | 'brands' | 'users' | 'settings' | 'checklist'>('listing');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<AdminTab>('new');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [showLogs, setShowLogs] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<string | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{ [key: string]: string }>({}); 
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [adminModal, setAdminModal] = useState<AdminModalState | null>(null);
  const [refusalReason, setRefusalReason] = useState("");
  const [seedProgress, setSeedProgress] = useState<number | null>(null);
  const [exchangeRates, setExchangeRates] = useState<ExchangeRates | null>(null);
  const [isDbLoading, setIsDbLoading] = useState(false);
  const [offerEdits, setOfferEdits] = useState<Record<string, { adminComment?: string, adminPrice?: number, deliveryWeeks?: number }>>({});
  const [debugMode, setDebugMode] = useState(false);
  const [offerEditTimeout, setOfferEditTimeout] = useState(5);
  const [adminUser, setAdminUser] = useState<AppUser | null>(null);
  
  // Чат
  const [chatTarget, setChatTarget] = useState<{ isOpen: boolean, orderId: string, supplierName?: string, supplierId?: string } | null>(null);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);

  // --- Auth & Header Logic ---
  useEffect(() => {
      const token = localStorage.getItem('adminToken');
      if (token) {
          SupabaseService.loginWithToken(token).then(setAdminUser).catch(console.error);
      }
  }, []);

  const handleLogout = () => {
      localStorage.removeItem('adminToken');
      navigate('/');
  };

  const handleNavigateToOrder = async (orderId: string) => {
      try {
          const { status_admin } = await SupabaseService.getOrderStatus(orderId);
          const tab = TAB_MAPPING[status_admin] || 'new';
          
          setActiveTab(tab);
          setSearchQuery(orderId);
          setExpandedId(orderId);
          // Скролл? Пока просто поиск.
      } catch (e) {
          setSearchQuery(orderId);
      }
  };

  const handleClearDB = async () => { 
      if(!confirm('Удалить все?')) return; 
      setIsDbLoading(true); 
      try { await SupabaseService.deleteAllOrders(); refetch(); } catch(e) {} finally { setIsDbLoading(false); } 
  };

  const handleSeed = async (count: number) => { 
      setIsDbLoading(true); 
      try { await SupabaseService.seedOrders(count, (c) => setSeedProgress(c), 'op1'); refetch(); } catch(e) {} finally { setIsDbLoading(false); setSeedProgress(null); } 
  };

  useEffect(() => {
      setHeader(
        <div className="flex items-center gap-6">
            {/* Debug Controls */}
            {debugMode && (
                <div className="flex gap-2 animate-in fade-in slide-in-from-right-4 mr-4">
                   <button onClick={handleClearDB} disabled={isDbLoading} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-2 hover:bg-red-100 transition-colors">
                      <Ban size={14}/> {isDbLoading ? '...' : 'Очистить БД'}
                   </button>
                   <div className="flex bg-indigo-50 rounded-lg p-1 border border-indigo-100 items-center">
                      {[100, 1000].map(count => (
                          <button key={count} disabled={isDbLoading} onClick={() => handleSeed(count)} className="px-3 py-1.5 hover:bg-white rounded-md text-[10px] font-black uppercase text-indigo-600 transition-colors">
                              {count}
                          </button>
                      ))}
                   </div>
                   {seedProgress !== null && <span className="text-[10px] font-bold text-slate-400 self-center">{seedProgress}%</span>}
                </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setIsGlobalChatOpen(true)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all relative"
                    title="Глобальный чат"
                >
                    <MessageCircle size={20} />
                    {unreadChatCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {unreadChatCount}
                        </span>
                    )}
                </button>
            </div>

            {/* Profile */}
            <div className="flex items-center gap-3 pl-6 border-l border-slate-100 h-8">
                <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900">{adminUser?.name || 'Manager'}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Администратор</div>
                </div>
                <div className="h-9 w-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                    <User size={16} strokeWidth={2.5} />
                </div>
                <button 
                    onClick={handleLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-2"
                    title="Выйти"
                >
                    <LogOut size={18} />
                </button>
            </div>
        </div>
      );
      return () => setHeader(null);
  }, [debugMode, unreadChatCount, showLogs, isDbLoading, seedProgress, adminUser]);

  // Загрузка счетчика непрочитанных
  const fetchUnreadCount = async () => {
      try {
          const count = await SupabaseService.getUnreadChatCount();
          setUnreadChatCount(count);
      } catch (e) {}
  };

  useEffect(() => {
      fetchUnreadCount();
      // Подписка на новые сообщения (глобально)
      const channel = SupabaseService.subscribeToUserChats((payload) => {
          const msg = payload.new;
          if (msg.sender_role === 'SUPPLIER') {
              setUnreadChatCount(prev => prev + 1);
          }
      }, 'admin-global-notifications');

      // ПОДПИСКА НА БЛОКИРОВКИ ОФФЕРОВ (REAL-TIME)
      const lockChannel = supabase
          .channel('offers-locks')
          .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'offers' }, (payload) => {
              console.log('Real-time offer lock update:', payload.new);
              queryClient.invalidateQueries({ queryKey: ['order-details', String(payload.new.order_id)] });
          })
          .subscribe();

      return () => { 
          SupabaseService.unsubscribeFromChat(channel); 
          supabase.removeChannel(lockChannel);
      };
  }, []);
  
  // Сортировка
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  // Маппинг табов на статусы БД
  const getStatusFilter = (tab: AdminTab) => {
      switch(tab) {
          case 'new': return 'В обработке';
          case 'manual': return 'Ручная обработка';
          case 'kp_sent': return 'КП готово';
          case 'ready_to_buy': return 'КП отправлено';
          case 'completed': return 'Выполнен';
          case 'archive': return 'Аннулирован,Отказ,Архив,Обработано вручную';
          default: return undefined;
      }
  };

  // --- React Query Infinite Scroll ---
  const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      refetch
  } = useOrdersInfinite({
      searchQuery,
      statusFilter: getStatusFilter(activeTab),
      sortDirection: sortConfig?.direction || 'desc',
      limit: 50
  });

  const orders = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

  // Принудительное обновление при смене таба
  useEffect(() => {
      refetch();
  }, [activeTab]);

  // Загрузка счетчиков
  const fetchCounts = async () => {
      try {
          const counts = await SupabaseService.getStatusCounts();
          setStatusCounts(counts);
      } catch (e) {}
  };

  const fetchRates = async () => {
      try {
          const rates = await SupabaseService.getExchangeRates();
          setExchangeRates(rates);
      } catch (e) {}
  };

  const fetchSettings = async () => {
      try {
          const mode = await SupabaseService.getSystemSettings('debug_mode');
          setDebugMode(!!mode);
      } catch (e) {}
  };

  useEffect(() => {
      fetchCounts();
      fetchRates();
      fetchSettings();
      const interval = setInterval(fetchCounts, 5000); // Опрос раз в 5 секунд
      return () => clearInterval(interval);
  }, []);

  const addLog = (text: string, type: 'info' | 'success' | 'error') => {
      const log: ActionLog = { id: Date.now().toString() + Math.random(), time: new Date().toLocaleTimeString(), text, type };
      setLogs(prev => [log, ...prev].slice(0, 50));
  };

  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 1000);
  };

  const handleSort = (key: string) => { 
      setExpandedId(null); 
      setSortConfig(current => { 
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }; 
          return { key, direction: 'desc' }; 
      }); 
  };

  const handleLocalUpdateRank = async (orderId: string, offerId: string, offerItemId: string, orderItemId: string, currentRank: RankType, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number, clientDeliveryWeeks?: number) => {
      try {
          const actionType = (currentRank === 'ЛИДЕР' || currentRank === 'LEADER') ? 'RESET' : undefined;
          await SupabaseService.updateRank(offerItemId, orderItemId, offerId, adminPrice, adminCurrency, actionType, adminComment, deliveryRate, adminPriceRub, clientDeliveryWeeks);
          // Инвалидируем детали конкретного заказа, чтобы обновить UI
          queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
      } catch (e) {
          console.error(e);
          showToast("Ошибка при выборе закупщика");
      }
  };

  const handleItemChange = (orderId: string, offerId: string, itemName: string, field: string, value: any) => {
      if (field === 'adminComment' || field === 'adminPrice' || field === 'deliveryWeeks') {
         // offerId here acts as offer_item_id
         setOfferEdits(prev => ({
             ...prev,
             [offerId]: { ...prev[offerId], [field]: value }
         }));
      }
  };

    const handleFormCP = async (orderId: string, isManual: boolean = false) => {
        executeApproval(orderId, isManual);
    };
  
    const executeApproval = async (orderId: string, isManual: boolean) => {
        setAdminModal(null); 
        setIsSubmitting(orderId); 
        
        try {
            const details = await SupabaseService.getOrderDetails(orderId);
            
            const winnersPayload: any[] = [];
            if (details.offers) { 
                for (const off of details.offers) { 
                    for (const item of off.items) { 
                        if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') { 
                            winnersPayload.push({
                                id: item.id,
                                admin_price: item.adminPrice || item.sellerPrice,
                                delivery_rate: item.deliveryRate || 0,
                                admin_comment: item.adminComment || ''
                            });
                        } 
                    }
                }
            }

            if (isManual) {
                if (winnersPayload.length > 0) {
                    await SupabaseService.approveOrderFast(orderId, winnersPayload);
                }
                
                await SupabaseService.updateWorkflowStatus(orderId, 'Ручная обработка');
                await SupabaseService.manualApproveOrder(orderId);

                showToast(`Заказ #${orderId} переведен в ручной режим`);
                setSearchQuery('');
                setActiveTab('manual');
            } else {
                if (winnersPayload.length === 0) {
                    if(!confirm('Нет победителей. Утвердить пустое КП?')) return;
                }
  
                await SupabaseService.approveOrderFast(orderId, winnersPayload);
                
                showToast(`КП по заказу #${orderId} сформировано`);
                setSearchQuery(''); 
                setActiveTab('kp_sent'); 
            }
            queryClient.invalidateQueries({ queryKey: ['order-details', orderId] });
            refetch(); 
        } catch (e) {            console.error(e);
            showToast("Ошибка при утверждении");
        } finally {
            setIsSubmitting(null); 
        }
    };
  const handleStatusChange = async (orderId: string, newStatus: string) => {
      showToast(`Статус изменен на: ${newStatus}`);
      try { 
          await SupabaseService.updateWorkflowStatus(orderId, newStatus); 
          refetch();
      } catch(e) { showToast("Ошибка сохранения"); }
  };

  const handleNextStep = (order: Order) => { const currentIdx = STATUS_STEPS.findIndex(s => s.id === (order.workflowStatus || 'В обработке')); if (currentIdx < STATUS_STEPS.length - 1) handleStatusChange(order.id, STATUS_STEPS[currentIdx + 1].id); };

  const handleRefuse = async () => {
      if (!adminModal?.orderId) return;
      setIsSubmitting(adminModal.orderId);
      try {
          await SupabaseService.refuseOrder(adminModal.orderId, refusalReason || 'Отказано менеджером', 'ADMIN');
          showToast("Заказ аннулирован");
          setAdminModal(null);
          setRefusalReason("");
          refetch();
      } catch (e: any) {
          console.error(e);
          showToast("Ошибка: " + e.message);
      } finally {
          setIsSubmitting(null);
      }
  };

  const startEditing = (order: Order) => { 
      setEditingOrderId(order.id); 
      const form: any = {}; 
      // Initialize client fields
      form[`client_name`] = order.clientName || '';
      form[`client_phone`] = order.clientPhone || '';
      form[`client_email`] = order.clientEmail || '';
      form[`location`] = order.location || '';
      
      order.items.forEach((item) => { 
          form[`${item.id}_name`] = item.AdminName || item.name; 
          form[`${item.id}_qty`] = item.AdminQuantity || item.quantity;
          form[`${item.id}_files`] = JSON.stringify(item.itemFiles || (item.opPhotoUrl ? [{name: 'Фото', url: item.opPhotoUrl, type: 'image/jpeg'}] : []));
      }); 
      setEditForm(form); 
      setOfferEdits({}); // Сброс правок офферов
  };

  const saveEditing = async (order: Order) => { 
      setIsSubmitting(order.id); 
      
      // 1. Сохранение изменений в Items (OrderItems) - используем ID вместо индекса
      const newItems = order.items.map((item) => {
          let files = [];
          try { files = JSON.parse(editForm[`${item.id}_files`] || '[]'); } catch (e) {}

          return { 
              ...item, 
              AdminName: editForm[`${item.id}_name`], 
              AdminQuantity: Number(editForm[`${item.id}_qty`]),
              itemFiles: files,
              opPhotoUrl: files.length > 0 ? files[0].url : (item.opPhotoUrl || null)
          };
      }); 
      
      try { 
          await SupabaseService.updateOrderJson(order.id, newItems); 
          
          // 1.5 Сохранение метаданных клиента
          await SupabaseService.updateOrderMetadata(order.id, {
              client_name: editForm['client_name'],
              client_phone: editForm['client_phone'],
              client_email: editForm['client_email'],
              location: editForm['location']
          });

          // 2. Сохранение изменений в Offers (OfferItems)
          const editKeys = Object.keys(offerEdits);
          if (editKeys.length > 0) {
              await Promise.all(editKeys.map(offerItemId => {
                  const edits = offerEdits[offerItemId];
                  const updates: any = {
                      admin_comment: edits.adminComment,
                      admin_price: edits.adminPrice
                  };
                  if (edits.deliveryWeeks !== undefined) {
                      updates.delivery_days = edits.deliveryWeeks * 7;
                  }
                  return SupabaseService.updateOfferItem(offerItemId, updates);
              }));
          }

          setEditingOrderId(null); 
          setOfferEdits({});
          queryClient.invalidateQueries({ queryKey: ['order-details', order.id] });
          refetch(); 
      } catch (e) { 
          console.error(e);
          showToast("Ошибка сохранения");
      } finally { setIsSubmitting(null); } 
  };

  const [openRegistry, setOpenRegistry] = useState<Set<string>>(new Set());
  const toggleRegistry = (id: string) => { setOpenRegistry(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; }); };

  return (
      <div className="flex min-h-screen bg-slate-50">
          <AdminSidebar currentView={currentView} setCurrentView={setCurrentView} debugMode={debugMode} />

          <main className="flex-grow p-4 overflow-y-auto">
              {currentView === 'users' ? <AdminUsers /> : currentView === 'brands' ? <AdminBrands /> : currentView === 'settings' ? <AdminSettings /> : currentView === 'finance' ? <AdminFinanceSettings /> : currentView === 'checklist' ? <AdminChecklist /> : (
                  <div className="max-w-6xl mx-auto space-y-4">
                      {successToast && (
                         <div className="fixed top-6 right-6 z-[200] bg-slate-800 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 animate-in slide-in-from-top-4 border border-slate-700">
                             <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-white"><CheckCircle2 size={18}/></div>
                             <div className="font-bold text-sm">{successToast.message}</div>
                         </div>
                      )}
                      
                      {/* AdminHeader удален, используется глобальный хедер */}

                      <AdminToolbar 
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        activeTab={activeTab}
                        setActiveTab={setActiveTab}
                        statusCounts={statusCounts}
                      />

                      <AdminOrdersList 
                        orders={orders}
                        sortConfig={sortConfig}
                        handleSort={handleSort}
                        expandedId={expandedId}
                        setExpandedId={setExpandedId}
                        onLoadMore={() => fetchNextPage()}
                        hasMore={!!hasNextPage}
                        isLoading={isFetchingNextPage}
                        editingOrderId={editingOrderId}
                        setEditingOrderId={setEditingOrderId}
                        handleStatusChange={handleStatusChange}
                        handleNextStep={handleNextStep}
                        setAdminModal={setAdminModal}
                        startEditing={startEditing}
                        saveEditing={saveEditing}
                        handleFormCP={handleFormCP}
                        isSubmitting={isSubmitting}
                        editForm={editForm}
                        setEditForm={setEditForm}
                        handleItemChange={handleItemChange}
                        handleLocalUpdateRank={handleLocalUpdateRank}
                        openRegistry={openRegistry}
                        toggleRegistry={toggleRegistry}
                        exchangeRates={exchangeRates}
                        offerEdits={offerEdits}
                        onOpenChat={(orderId, supplierName, supplierId) => setChatTarget({ isOpen: true, orderId, supplierName, supplierId })}
                        debugMode={debugMode}
                        offerEditTimeout={offerEditTimeout}
                      />
                  </div>
              )}
          </main>

          {chatTarget && (
              <GlobalChatWindow 
                  isOpen={chatTarget.isOpen}
                  onClose={() => setChatTarget(null)}
                  currentUserRole="ADMIN"
                  currentUserName={adminUser?.name || 'Manager'}
                  initialOrderId={chatTarget.orderId}
                  initialSupplierFilter={chatTarget.supplierName}
                  initialSupplierId={chatTarget.supplierId}
                  onMessageRead={(count) => setUnreadChatCount(prev => Math.max(0, prev - count))}
                  onNavigateToOrder={handleNavigateToOrder}
              />
          )}

          {isGlobalChatOpen && (
              <GlobalChatWindow 
                  isOpen={isGlobalChatOpen}
                  onClose={() => setIsGlobalChatOpen(false)}
                  currentUserRole="ADMIN"
                  currentUserName={adminUser?.name || 'Manager'}
                  onMessageRead={(count) => setUnreadChatCount(prev => Math.max(0, prev - count))}
                  onNavigateToOrder={handleNavigateToOrder}
              />
          )}

          {adminModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-in zoom-in-95 duration-200">
                      {adminModal.type === 'VALIDATION' ? (
                          <div className="text-center space-y-4">
                              <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto"><AlertCircle size={24}/></div>
                              <div><h3 className="text-lg font-black uppercase text-slate-800">Внимание!</h3><p className="text-xs font-bold text-slate-500 mt-2">Не выбраны закупщики для позиций:</p><ul className="mt-2 text-[10px] font-bold text-red-500 uppercase bg-red-50 p-2 rounded-lg text-left">{adminModal.missingItems?.map(i => <li key={i}>• {i}</li>)}</ul><p className="text-[10px] text-slate-400 mt-2">Утвердить КП с неполным комплектом?</p></div>
                              <div className="grid grid-cols-2 gap-3"><button onClick={() => setAdminModal(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase">Отмена</button><button onClick={() => executeApproval(adminModal.orderId!, adminModal.missingItems?.includes('MANUAL'))} className="py-3 rounded-xl bg-indigo-600 text-white font-black text-xs uppercase shadow-lg">Всё равно утвердить</button></div>
                          </div>
                      ) : (adminModal as any).type === 'LOCK_CONFLICT' ? (
                          <div className="text-center space-y-4">
                              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto animate-pulse"><Clock size={32}/></div>
                              <div>
                                  <h3 className="text-lg font-black uppercase text-slate-800 leading-tight">Закупщики вносят правки</h3>
                                  <p className="text-xs font-bold text-slate-500 mt-2 italic">
                                      {(adminModal as any).lockedSuppliers?.join(', ')} сейчас редактируют свои предложения.
                                  </p>
                                  <p className="text-[10px] text-slate-400 mt-4 leading-relaxed uppercase font-bold">
                                      Если вы утвердите КП сейчас, закупщики <span className="text-red-500">не смогут</span> сохранить свои изменения.
                                  </p>
                              </div>
                              <div className="grid grid-cols-2 gap-3 pt-2">
                                  <button onClick={() => setAdminModal(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Подождать</button>
                                  <button 
                                      onClick={() => executeApproval(adminModal.orderId!, adminModal.missingItems?.includes('MANUAL'))} 
                                      className="py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase shadow-lg shadow-red-200 hover:bg-red-700 transition-colors"
                                  >
                                      Утвердить жестко
                                  </button>
                              </div>
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