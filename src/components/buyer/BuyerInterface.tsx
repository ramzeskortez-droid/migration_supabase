import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';
import { Order, AppUser } from '../../types';
import { Toast } from '../shared/Toast';
import { ChatNotification } from '../shared/ChatNotification';
import { BuyerAuthModal } from './BuyerAuthModal';
import { BuyerHeader } from './BuyerHeader';
import { BuyerDashboard } from './BuyerDashboard';
import { BuyerToolbar } from './BuyerToolbar';
import { BuyerOrdersList } from './BuyerOrdersList';
import { BuyerGlobalChat } from './BuyerGlobalChat';
import { useOrdersInfinite } from '../../hooks/useOrdersInfinite';

export const BuyerInterface: React.FC = () => {
  const queryClient = useQueryClient();

  // --- Auth ---
  const [buyerAuth, setBuyerAuth] = useState<AppUser | null>(() => {
      try { return JSON.parse(localStorage.getItem('buyer_auth_token') || 'null'); } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(!buyerAuth);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'hot' | 'won' | 'lost' | 'cancelled'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  
  const [availableBrands, setAvailableBrands] = useState<string[]>([]); 
  const [historyBrands, setHistoryBrands] = useState<string[]>([]); 
  const [quickBrands, setQuickBrands] = useState<string[]>([]); 
  const [tabCounts, setTabCounts] = useState({ new: 0, hot: 0, history: 0, won: 0, lost: 0, cancelled: 0 });

  const [editingItemsMap, setEditingItemsMap] = useState<Record<string, any[]>>({});
  const listRef = React.useRef<HTMLDivElement>(null);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ 
    key: 'deadline', 
    direction: 'asc' 
  });

  // --- Realtime Notifications ---
  useEffect(() => {
      if (!buyerAuth) return;
      const channel = SupabaseService.subscribeToUserChats((payload) => {
          const msg = payload.new;
          if (msg.recipient_name === buyerAuth.name) {
              setUnreadChatCount(prev => prev + 1);
              if (!isGlobalChatOpen) {
                  setChatNotifications(prev => [...prev, msg].slice(-3));
              }
          }
      }, `buyer-notifications-${buyerAuth.id}`);
      return () => { SupabaseService.unsubscribeFromChat(channel); };
  }, [buyerAuth, isGlobalChatOpen]);

  // --- Handlers ---
  const handleSort = (key: string) => {
    setSortConfig(prev => ({
        key,
        direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleLogin = (user: AppUser) => {
      setBuyerAuth(user);
      localStorage.setItem('buyer_auth_token', JSON.stringify(user));
      setShowAuthModal(false);
  };

  const handleLogout = () => {
      setBuyerAuth(null);
      setExpandedId(null);
      setEditingItemsMap({});
      localStorage.removeItem('buyer_auth_token');
      queryClient.removeQueries();
      setShowAuthModal(true);
  };

  // ВОССТАНОВЛЕННАЯ ФУНКЦИЯ
  const getMyOffer = useCallback((order: Order) => {
      if (!buyerAuth?.name) return null;
      return order.offers?.find(off => 
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
      if (!buyerAuth?.name) return;
      try {
          const { count } = await SupabaseService.getUnreadChatCountForSupplier(buyerAuth.name);
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

  const handleSubmitOffer = async (orderId: string, items: any[], supplierFiles?: any[]) => {
      if (!buyerAuth) return;
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          await SupabaseService.createOffer(orderId, buyerAuth.name, items, buyerAuth.phone, buyerAuth.id, supplierFiles);
          setExpandedId(null);
          setSuccessToast({ message: `Предложение к заказу № ${orderId} отправлено!`, id: Date.now().toString() });
          refetch();
          fetchCounts();
          SupabaseService.getSupplierUsedBrands(buyerAuth.name).then(setHistoryBrands);
          SupabaseService.getBuyerQuickBrands(buyerAuth.name).then(setQuickBrands);
      } catch (e: any) {
          alert('Ошибка при отправке: ' + (e.message || JSON.stringify(e)));
      } finally {
          setIsSubmitting(false);
      }
  };

  const [initialChatOrder, setInitialChatOrder] = useState<string | null>(null);

  const handleOpenChat = useCallback((orderId?: string) => {
      setInitialChatOrder(orderId || null);
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
          
          if (hasMyOffer) setActiveTab('history');
          else if (status_admin === 'В обработке') {
              const threeDaysAgo = new Date();
              threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
              const order = orders.find(o => o.id === orderId); // Пытаемся найти в текущих если загружено
              // Здесь логика даты на сервере уже есть, поэтому просто переключаем таб
              setActiveTab(status_admin === 'В обработке' ? 'new' : 'history');
          }
          
          setSearchQuery(orderId);
          setExpandedId(orderId);
          setScrollToId(orderId);
          setTimeout(() => {
              setScrollToId(null);
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 500);
      } catch (e) {
          setSearchQuery(orderId);
          setExpandedId(orderId);
      }
  };

  const getOfferStatus = useCallback((order: Order) => {
    const myOffer = getMyOffer(order);
    if (!myOffer) return { label: 'Сбор офферов', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
    const isRefusal = myOffer.items.every((item: any) => (item.offeredQuantity || 0) === 0);
    if (isRefusal) return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: null };
    
    // Статус ГОРИТ вычисляется на сервере и приходит в statusAdmin
    if (order.statusAdmin === 'ГОРИТ') return { label: 'ГОРИТ', color: 'bg-orange-600 text-white border-orange-700 animate-pulse', icon: null };

    const isBiddingActive = order.statusAdmin === 'В обработке' || order.statusAdmin === 'ОТКРЫТ';
    if (isBiddingActive && !order.isProcessed) return { label: 'Идут торги', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: null };
    
    const winningItems = myOffer.items.filter((i: any) => i.is_winner || i.rank === 'ЛИДЕР' || i.rank === 'LEADER');
    if (winningItems.length === myOffer.items.length) return { label: 'ВЫИГРАЛ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: null };
    else if (winningItems.length === 0) return { label: 'ПРОИГРАЛ', color: 'bg-red-50 text-red-600 border-red-100', icon: null };
    else return { label: 'ЧАСТИЧНО', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
  }, [getMyOffer]);

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
        {successToast && <Toast message={successToast.message} onClose={() => setSuccessToast(null)} />}
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
        <BuyerAuthModal isOpen={showAuthModal} onLogin={handleLogin} />
        {buyerAuth && (
            <>
                <BuyerHeader 
                    buyerName={buyerAuth.name} 
                    buyerPhone={buyerAuth.phone || ''} 
                    onLogout={handleLogout} 
                    onOpenChat={() => setIsGlobalChatOpen(true)}
                    unreadCount={unreadChatCount}
                />
                
                <BuyerDashboard userId={buyerAuth.id} />

                <div ref={listRef}>
                    <BuyerToolbar 
                        activeTab={activeTab} setActiveTab={setActiveTab}
                        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                        activeBrands={activeBrands} setActiveBrands={setActiveBrands}
                        availableBrands={availableBrands}
                        historyBrands={quickBrands} 
                        counts={tabCounts} 
                        onRefresh={() => {
                            refetch();
                            fetchCounts();
                            queryClient.invalidateQueries({ queryKey: ['buyerStats'] });
                        }} 
                        isSyncing={isLoading || isFetchingNextPage}
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
                        onOpenChat={handleOpenChat}
                        scrollToId={scrollToId}
                    />
                </div>
                <BuyerGlobalChat 
                    isOpen={isGlobalChatOpen}
                    onClose={() => setIsGlobalChatOpen(false)}
                    currentUserRole="SUPPLIER"
                    currentSupplierName={buyerAuth.name}
                    onNavigateToOrder={handleNavigateToOrder}
                    initialOrderId={initialChatOrder}
                    onMessageRead={handleMessageRead}
                />
            </>
        )}
    </div>
  );
};
