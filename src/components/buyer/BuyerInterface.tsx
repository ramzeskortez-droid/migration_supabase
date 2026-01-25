import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';
import { Order, AppUser } from '../../types';
import { Toast } from '../shared/Toast';
import { ChatNotification } from '../shared/ChatNotification';
import { BuyerDashboard } from './BuyerDashboard';
import { BuyerToolbar } from './BuyerToolbar';
import { BuyerOrdersList } from './BuyerOrdersList';
import { BuyerGlobalChat } from './BuyerGlobalChat';
import { useOrdersInfinite } from '../../hooks/useOrdersInfinite';
import { useNavigate } from 'react-router-dom';
import { useHeaderStore } from '../../store/headerStore';
import { MessageCircle, User, LogOut } from 'lucide-react';
import { playNotificationSound } from '../../utils/sound';

export const BuyerInterface: React.FC = () => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const setHeader = useHeaderStore(s => s.setCustomRightContent);

  // --- Auth ---
  const [buyerAuth, setBuyerAuth] = useState<AppUser | null>(() => {
      try { return JSON.parse(localStorage.getItem('buyer_auth_token') || 'null'); } catch { return null; }
  });

  useEffect(() => {
      if (!buyerAuth) {
          navigate('/');
      }
  }, [buyerAuth, navigate]);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'hot' | 'won' | 'lost' | 'cancelled'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Persist active brands filter
  const [activeBrands, setActiveBrands] = useState<string[]>(() => {
      try { return JSON.parse(localStorage.getItem('buyer_active_brands') || '[]'); } catch { return []; }
  });

  useEffect(() => {
      localStorage.setItem('buyer_active_brands', JSON.stringify(activeBrands));
  }, [activeBrands]);

  const [uiToast, setUiToast] = useState<{message: string, type: 'success' | 'error', id: string} | null>(null);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const isChatOpenRef = React.useRef(isGlobalChatOpen);
  useEffect(() => { isChatOpenRef.current = isGlobalChatOpen; }, [isGlobalChatOpen]);

  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  const [subStatusFilter, setSubStatusFilter] = useState<string | undefined>(undefined);
  
  const [availableBrands, setAvailableBrands] = useState<string[]>([]); 
  const [historyBrands, setHistoryBrands] = useState<string[]>([]); 
  const [quickBrands, setQuickBrands] = useState<string[]>([]); 
  const [tabCounts, setTabCounts] = useState({ new: 0, hot: 0, history: 0, won: 0, lost: 0, cancelled: 0 });

  const [editingItemsMap, setEditingItemsMap] = useState<Record<string, any[]>>({});
  const listRef = React.useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
    key: 'id', 
    direction: 'desc' 
  });

  const handleLogout = useCallback(() => {
      setBuyerAuth(null);
      setExpandedId(null);
      setEditingItemsMap({});
      setSubStatusFilter(undefined);
      localStorage.removeItem('buyer_auth_token');
      queryClient.removeQueries();
      navigate('/');
  }, [navigate, queryClient]);

  // Set Header Content (Unified Header)
  useEffect(() => {
      if (buyerAuth) {
          setHeader(
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setIsGlobalChatOpen(true)}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all relative"
                    title="Все сообщения"
                >
                    <MessageCircle size={20} />
                    {unreadChatCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {unreadChatCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-100 h-8">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-900">{buyerAuth.name}</div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Закупщик</div>
                    </div>
                    <div className="h-9 w-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
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
      } else {
          setHeader(null);
      }
      return () => setHeader(null);
  }, [buyerAuth, unreadChatCount, handleLogout]);

  // --- Realtime Notifications ---
  useEffect(() => {
      if (!buyerAuth) return;
      const channel = SupabaseService.subscribeToUserChats((payload) => {
          const msg = payload.new;
          // Check by ID first (reliable), then fallback to Name
          if (msg.recipient_id === buyerAuth.id || msg.recipient_name === buyerAuth.name) {
              setUnreadChatCount(prev => prev + 1);
              // Fire and forget sound (non-blocking)
              setTimeout(() => playNotificationSound(0.75), 0);
              
              if (!isChatOpenRef.current) {
                  setChatNotifications(prev => [...prev, msg].slice(-3));
              }
          }
      }, `buyer-notifications-${buyerAuth.id}`);
      return () => { SupabaseService.unsubscribeFromChat(channel); };
  }, [buyerAuth]);

  // --- Handlers ---
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // ВОССТАНОВЛЕННАЯ ФУНКЦИЯ
  const getMyOffer = useCallback((order: Order) => {
      if (!buyerAuth) return null;
      return order.offers?.find(off => 
        off.ownerId === buyerAuth.id ||
        String(off.clientName || '').trim().toUpperCase() === buyerAuth.name.trim().toUpperCase()
      ) || null;
  }, [buyerAuth]);

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
      buyerTab: activeTab,
      brandFilter: activeBrands.length > 0 ? activeBrands : null,
      onlyWithMyOffersName: buyerAuth?.name,
      excludeOffersFrom: buyerAuth?.name,
      sortBy: sortConfig.key,
      sortDirection: sortConfig.direction,
      limit: 20,
      buyerToken: buyerAuth?.token 
  });

  const orders = useMemo(() => {
      return data?.pages.flatMap(page => page.data) || [];
  }, [data]);

  // Принудительное обновление при смене таба или сортировки
  useEffect(() => {
      setSubStatusFilter(undefined);
      refetch();
  }, [activeTab, sortConfig, refetch]);

  // --- Effects ---
  const fetchCounts = useCallback(async () => {
      if (!buyerAuth?.name) return;
      try {
          const counts = await SupabaseService.getBuyerTabCounts(buyerAuth.name);
          setTabCounts(counts);
      } catch (e) {}
  }, [buyerAuth]);

  const fetchUnreadCount = useCallback(async () => {
      if (!buyerAuth?.id) return;
      try {
          const count = await SupabaseService.getUserUnreadCount(buyerAuth.id);
          setUnreadChatCount(count);
      } catch (e) {}
  }, [buyerAuth]);

  useEffect(() => {
      fetchUnreadCount();
      fetchCounts();
      const interval = setInterval(() => {
          fetchUnreadCount();
          fetchCounts();
      }, 30000);
      return () => clearInterval(interval);
  }, [fetchUnreadCount, fetchCounts]);

  useEffect(() => {
      if (!buyerAuth) return;
      const loadInitialData = async () => {
          try {
              const [brands, histBrands, qBrands] = await Promise.all([
                  SupabaseService.getBrandsList(),
                  SupabaseService.getSupplierUsedBrands(buyerAuth.name),
                  SupabaseService.getBuyerQuickBrands(buyerAuth.name)
              ]);
              setAvailableBrands(brands);
              setHistoryBrands(histBrands);
              setQuickBrands(qBrands);
          } catch (e) { console.error(e); }
      };
      loadInitialData();
  }, [buyerAuth]);

  const handleSubmitOffer = async (orderId: string, items: any[], supplierFiles?: any[], status: string = 'Активно') => {
      if (!buyerAuth) return;
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          const order = orders.find(o => o.id === orderId);
          const existingOffer = order ? getMyOffer(order) : null;

          if (existingOffer) {
              await SupabaseService.editOffer(existingOffer.id, items, supplierFiles, status);
          } else {
              await SupabaseService.createOffer(orderId, buyerAuth.name, items, buyerAuth.phone, buyerAuth.id, supplierFiles, status);
          }

          setExpandedId(null);
          setUiToast({ message: status === 'Отказ' ? `Вы отказались от заказа № ${orderId}` : `Предложение к заказу № ${orderId} отправлено!`, type: 'success', id: Date.now().toString() });
          refetch();
          fetchCounts();
          SupabaseService.getSupplierUsedBrands(buyerAuth.name).then(setHistoryBrands);
          SupabaseService.getBuyerQuickBrands(buyerAuth.name).then(setQuickBrands);
      } catch (e: any) {
          setUiToast({ message: 'Ошибка при отправке: ' + (e.message || JSON.stringify(e)), type: 'error', id: Date.now().toString() });
      } finally {
          setIsSubmitting(false);
      }
  };

  const [initialChatOrder, setInitialChatOrder] = useState<string | null>(null);
  const [initialTargetRole, setInitialTargetRole] = useState<'OPERATOR' | 'MANAGER' | undefined>(undefined);

  const handleOpenChat = useCallback((orderId?: string, targetRole?: 'OPERATOR' | 'MANAGER') => {
      setInitialChatOrder(orderId || null);
      setInitialTargetRole(targetRole);
      setIsGlobalChatOpen(true);
  }, []);

  const handleMessageRead = useCallback((count: number) => {
      setUnreadChatCount(prev => Math.max(0, prev - count));
  }, []);

  const handleNavigateToOrder = async (orderId: string) => {
      if (!buyerAuth?.name) return;
      try {
          const { status_admin, supplier_names } = await SupabaseService.getOrderStatus(orderId);
          const hasMyOffer = supplier_names.some(name => name.trim().toUpperCase() === buyerAuth.name.trim().toUpperCase());
          
          if (hasMyOffer) {
              setActiveTab('history');
          } else if (status_admin === 'В обработке') {
              setActiveTab('new');
          } else {
              setActiveTab('archive');
          }
          
          setSearchQuery(orderId); // Форсируем поиск
          setExpandedId(orderId); // Форсируем раскрытие
          setScrollToId(orderId); // Форсируем скролл
          
          setTimeout(() => {
              setScrollToId(null);
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 1000);
      } catch (e) {
          console.error('Nav error:', e);
          setSearchQuery(orderId);
          setExpandedId(orderId);
      }
  };

  const getOfferStatus = useCallback((order: Order) => {
    const myOffer = getMyOffer(order);
    if (!myOffer) return { label: 'Сбор офферов', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
    
    // 1. Приоритет: Отказ закупщика или Аннулирование менеджером
    if (myOffer.status === 'Отказ') return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: null };
    if (order.statusManager === 'Аннулирован' || order.statusManager === 'Отказ') return { label: 'АННУЛИРОВАН', color: 'bg-red-50 text-red-600 border-red-100', icon: null };

    // Проверка на "скрытый" отказ (все позиции в 0)
    const isRefusal = myOffer.items?.every((item: any) => (item.offeredQuantity || 0) === 0);
    if (isRefusal) return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: null };
    
    // 2. Статус в процессе торгов
    if (order.statusManager === 'В обработке' && !order.isProcessed) {
        return { label: 'НОВЫЙ', color: 'bg-blue-100 text-blue-700', icon: null };
    }

    const isBiddingActive = order.statusManager === 'В обработке' || order.statusManager === 'ОТКРЫТ';
    if (isBiddingActive && !order.isProcessed) return { label: 'Идут торги', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: null };
    
    // 3. Статусы по результатам обработки
    const winningItems = myOffer.items?.filter((i: any) => i.is_winner || i.rank === 'ЛИДЕР' || i.rank === 'LEADER') || [];
    const totalItems = myOffer.items?.length || 0;

    if (winningItems.length > 0) {
        if (winningItems.length === totalItems) {
            return { label: 'ВЫИГРАЛ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: null };
        }
        return { label: 'ЧАСТИЧНО', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
    }

    if (order.isProcessed) {
        return { label: 'ПРОИГРАЛ', color: 'bg-red-50 text-red-600 border-red-100', icon: null };
    }

    return { label: 'Обработка', color: 'bg-slate-100 text-slate-500', icon: null };
  }, [getMyOffer]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
        {uiToast && <Toast message={uiToast.message} type={uiToast.type} onClose={() => setUiToast(null)} />}
        {chatNotifications.map((msg, idx) => (
            <ChatNotification 
                key={msg.id}
                index={idx}
                message={msg} 
                onClose={() => setChatNotifications(prev => prev.filter(m => m.id !== msg.id))}
                onClick={() => {
                    handleOpenChat(String(msg.order_id));
                    setChatNotifications(prev => prev.filter(m => m.id !== msg.id));
                }}
            />
        ))}
        {buyerAuth && (
            <>
                <BuyerDashboard userId={buyerAuth.id} />

                <div ref={listRef}>
                    <BuyerToolbar 
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        activeBrands={activeBrands} setActiveBrands={setActiveBrands}
                        availableBrands={availableBrands}
                        historyBrands={quickBrands} 
                        counts={tabCounts} 
                    />
                    <BuyerOrdersList 
                        orders={orders}
                        expandedId={expandedId} onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                        onLoadMore={() => fetchNextPage()}
                        hasMore={!!hasNextPage}
                        isLoading={isFetchingNextPage}
                        editingItemsMap={editingItemsMap} setEditingItemsMap={setEditingItemsMap}
                        onSubmit={handleSubmitOffer} isSubmitting={isSubmitting}
                        sortConfig={sortConfig} onSort={handleSort}
                        getOfferStatus={getOfferStatus} getMyOffer={getMyOffer}
                        buyerToken={buyerAuth?.token}
                        buyerId={buyerAuth?.id}
                        onOpenChat={handleOpenChat}
                        scrollToId={scrollToId}
                        activeTab={activeTab}
                        subStatusFilter={subStatusFilter}
                        setSubStatusFilter={setSubStatusFilter}
                    />
                </div>
                <BuyerGlobalChat 
                    isOpen={isGlobalChatOpen}
                    onClose={() => setIsGlobalChatOpen(false)}
                    currentUserRole="SUPPLIER"
                    currentSupplierName={buyerAuth.name}
                    currentSupplierId={buyerAuth.id} // NEW
                    onNavigateToOrder={handleNavigateToOrder}
                    initialOrderId={initialChatOrder}
                    initialTargetRole={initialTargetRole}
                    onMessageRead={handleMessageRead}
                />
            </>
        )}
    </div>
  );
};
