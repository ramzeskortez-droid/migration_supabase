import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order, AppUser } from '../types';
import { Toast } from './shared/Toast';
import { BuyerAuthModal } from './buyer/BuyerAuthModal';
import { BuyerHeader } from './buyer/BuyerHeader';
import { BuyerStats } from './buyer/BuyerStats';
import { BuyerToolbar } from './buyer/BuyerToolbar';
import { BuyerOrdersList } from './buyer/BuyerOrdersList';
import { BuyerGlobalChat } from './buyer/BuyerGlobalChat';
import { useOrdersInfinite } from '../hooks/useOrdersInfinite';

export const BuyerInterface: React.FC = () => {
  // --- Auth ---
  const [buyerAuth, setBuyerAuth] = useState<AppUser | null>(() => {
      try { return JSON.parse(localStorage.getItem('buyer_auth_token') || 'null'); } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(!buyerAuth);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'hot'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [activeBrands, setActiveBrands] = useState<string[]>([]);
  
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  
  const [availableBrands, setAvailableBrands] = useState<string[]>([]); // Все бренды
  const [historyBrands, setHistoryBrands] = useState<string[]>([]); // Бренды поставщика
  
  const [marketStats, setMarketStats] = useState({ today: 0, week: 0, month: 0, total: 0, leader: 'N/A' });
  const [statsLoading, setStatsLoading] = useState(false);

  // --- Editing Drafts ---
  const [editingItemsMap, setEditingItemsMap] = useState<Record<string, any[]>>({});

  // --- Handlers Pre-definition ---
  const handleLogin = (user: AppUser) => {
      setBuyerAuth(user);
      localStorage.setItem('buyer_auth_token', JSON.stringify(user));
      setShowAuthModal(false);
  };

  const handleLogout = () => {
      setBuyerAuth(null);
      localStorage.removeItem('buyer_auth_token');
      setShowAuthModal(true);
  };

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
      statusFilter: activeTab === 'new' ? 'В обработке' : undefined,
      brandFilter: activeBrands.length > 0 ? activeBrands : null,
      onlyWithMyOffersName: activeTab === 'history' ? buyerAuth?.name : undefined,
      excludeOffersFrom: activeTab === 'new' ? buyerAuth?.name : undefined,
      sortDirection: 'desc',
      limit: 20,
      buyerToken: buyerAuth?.token 
  });

  const orders = useMemo(() => {
      let result = data?.pages.flatMap(page => page.data) || [];
      if (activeTab === 'hot') {
          const threeDaysAgo = new Date();
          threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
          return result.filter(o => {
              const parts = o.createdAt.split(',')[0].split('.');
              const orderDate = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
              return orderDate < threeDaysAgo && (!o.offers || o.offers.length === 0);
          });
      }
      return result;
  }, [data, activeTab]);

  // --- Effects ---
  const fetchUnreadCount = useCallback(async () => {
      if (!buyerAuth?.name) return;
      try {
          const { count } = await SupabaseService.getUnreadChatCountForSupplier(buyerAuth.name);
          setUnreadChatCount(count);
      } catch (e) {}
  }, [buyerAuth]);

  useEffect(() => {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
      if (!buyerAuth) return;
      const loadInitialData = async () => {
          setStatsLoading(true);
          try {
              const [brands, histBrands, stats] = await Promise.all([
                  SupabaseService.getBrandsList(),
                  SupabaseService.getSupplierUsedBrands(buyerAuth.name), // Ваши бренды
                  SupabaseService.getMarketStats()
              ]);
              setAvailableBrands(brands);
              setHistoryBrands(histBrands);
              setMarketStats(stats);
          } catch (e) { console.error(e); }
          finally { setStatsLoading(false); }
      };
      loadInitialData();
  }, [buyerAuth]);

  const handleSubmitOffer = async (orderId: string, items: any[]) => {
      if (!buyerAuth) return;
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          await SupabaseService.createOffer(orderId, buyerAuth.name, items, '', buyerAuth.phone);
          setExpandedId(null);
          setSuccessToast({ message: 'Предложение отправлено!', id: Date.now().toString() });
          refetch();
          // Обновляем список "моих" брендов, если добавился новый
          SupabaseService.getSupplierUsedBrands(buyerAuth.name).then(setHistoryBrands);
      } catch (e: any) {
          alert('Ошибка при отправке: ' + (e.message || JSON.stringify(e)));
      } finally {
          setIsSubmitting(false);
      }
  };

  const handleNavigateToOrder = (orderId: string) => {
      setSearchQuery(orderId);
      setExpandedId(orderId);
  };

  const getOfferStatus = useCallback((order: Order) => {
    const myOffer = getMyOffer(order);
    if (!myOffer) return { label: 'Сбор офферов', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
    const isRefusal = myOffer.items.every((item: any) => (item.offeredQuantity || 0) === 0);
    if (isRefusal) return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: null };
    const isBiddingActive = order.statusAdmin === 'В обработке' || order.statusAdmin === 'ОТКРЫТ';
    if (isBiddingActive && !order.isProcessed) return { label: 'Идут торги', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: null };
    const winningItems = myOffer.items.filter((i: any) => i.rank === 'ЛИДЕР' || i.rank === 'LEADER');
    if (winningItems.length === myOffer.items.length) return { label: 'ВЫИГРАЛ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: null };
    else if (winningItems.length === 0) return { label: 'ПРОИГРАЛ', color: 'bg-red-50 text-red-600 border-red-100', icon: null };
    else return { label: 'ЧАСТИЧНО', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: null };
  }, [getMyOffer]);

  const sortConfig = { key: 'id', direction: 'desc' as const };

  return (
    <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
        {successToast && <Toast message={successToast.message} onClose={() => setSuccessToast(null)} />}
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
                <BuyerStats stats={marketStats} loading={statsLoading} />
                <BuyerToolbar 
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    activeBrands={activeBrands} setActiveBrands={setActiveBrands}
                    availableBrands={availableBrands} // Все
                    historyBrands={historyBrands}     // Персональные
                    counts={{ new: 0, history: 0 }} 
                    onRefresh={() => refetch()} isSyncing={isLoading || isFetchingNextPage}
                />
                <BuyerOrdersList 
                    orders={orders}
                    expandedId={expandedId} onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                    onLoadMore={() => fetchNextPage()}
                    hasMore={!!hasNextPage}
                    isLoading={isFetchingNextPage}
                    editingItemsMap={editingItemsMap} setEditingItemsMap={setEditingItemsMap}
                    onSubmit={handleSubmitOffer} isSubmitting={isSubmitting}
                    sortConfig={sortConfig} onSort={() => {}}
                    getOfferStatus={getOfferStatus} getMyOffer={getMyOffer}
                    buyerToken={buyerAuth?.token}
                />
                <BuyerGlobalChat 
                    isOpen={isGlobalChatOpen}
                    onClose={() => setIsGlobalChatOpen(false)}
                    currentUserRole="SUPPLIER"
                    currentSupplierName={buyerAuth.name}
                    onNavigateToOrder={handleNavigateToOrder}
                />
            </>
        )}
    </div>
  );
};