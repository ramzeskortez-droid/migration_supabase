import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order } from '../types';
import { Toast } from './shared/Toast';
import { SellerAuthModal } from './seller/SellerAuthModal';
import { SellerHeader } from './seller/SellerHeader';
import { SellerStats } from './seller/SellerStats';
import { SellerToolbar } from './seller/SellerToolbar';
import { SellerOrdersList } from './seller/SellerOrdersList';
import { SellerGlobalChat } from './seller/SellerGlobalChat';
import { useOrdersInfinite } from '../hooks/useOrdersInfinite';

export const SellerInterface: React.FC = () => {
  // --- Auth ---
  const [sellerAuth, setSellerAuth] = useState(() => {
      try { return JSON.parse(localStorage.getItem('seller_auth') || 'null'); } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(!sellerAuth);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [availableBrands, setAvailableBrands] = useState<string[]>([]);
  const [marketStats, setMarketStats] = useState({ today: 0, week: 0, month: 0, total: 0, leader: 'N/A' });
  const [statsLoading, setStatsLoading] = useState(false);

  // --- Editing Drafts ---
  const [editingItemsMap, setEditingItemsMap] = useState<Record<string, any[]>>({});

  // --- Handlers Pre-definition ---
  const handleLogin = (name: string, phone: string) => {
      const auth = { name, phone };
      setSellerAuth(auth);
      localStorage.setItem('seller_auth', JSON.stringify(auth));
      setShowAuthModal(false);
  };

  const handleLogout = () => {
      setSellerAuth(null);
      localStorage.removeItem('seller_auth');
      setShowAuthModal(true);
  };

  const getMyOffer = useCallback((order: Order) => {
      if (!sellerAuth?.name) return null;
      return order.offers?.find(off => 
        String(off.clientName || '').trim().toUpperCase() === sellerAuth.name.trim().toUpperCase()
      ) || null;
  }, [sellerAuth]);

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
      brandFilter: activeBrand,
      onlyWithMyOffersName: activeTab === 'history' ? sellerAuth?.name : undefined,
      sortDirection: 'desc',
      limit: 20
  });

  const orders = useMemo(() => data?.pages.flatMap(page => page.data) || [], [data]);

  // --- Effects ---
  
  // Чат: получение количества непрочитанных
  const fetchUnreadCount = useCallback(async () => {
      if (!sellerAuth?.name) return;
      try {
          const { count } = await SupabaseService.getUnreadChatCountForSupplier(sellerAuth.name);
          setUnreadChatCount(count);
      } catch (e) {}
  }, [sellerAuth]);

  useEffect(() => {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000);
      return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  // Load Brands & Stats
  useEffect(() => {
      if (!sellerAuth) return;
      const loadInitialData = async () => {
          setStatsLoading(true);
          try {
              const [brands, stats] = await Promise.all([
                  SupabaseService.getSellerBrands(sellerAuth.name),
                  SupabaseService.getMarketStats()
              ]);
              setAvailableBrands(brands);
              setMarketStats(stats);
          } catch (e) { console.error(e); }
          finally { setStatsLoading(false); }
      };
      loadInitialData();
  }, [sellerAuth]);

  const handleSubmitOffer = async (orderId: string, items: any[]) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      try {
          await SupabaseService.createOffer(orderId, sellerAuth.name, items, '', sellerAuth.phone);
          setExpandedId(null);
          setSuccessToast({ message: 'Предложение отправлено!', id: Date.now().toString() });
          refetch(); // Обновляем список
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
        <SellerAuthModal isOpen={showAuthModal} onLogin={handleLogin} />
        {sellerAuth && (
            <>
                <SellerHeader 
                    sellerName={sellerAuth.name} 
                    sellerPhone={sellerAuth.phone} 
                    onLogout={handleLogout} 
                    onOpenChat={() => setIsGlobalChatOpen(true)}
                    unreadCount={unreadChatCount}
                />
                <SellerStats stats={marketStats} loading={statsLoading} />
                <SellerToolbar 
                    activeTab={activeTab} setActiveTab={setActiveTab}
                    searchQuery={searchQuery} setSearchQuery={setSearchQuery}
                    activeBrand={activeBrand} setActiveBrand={setActiveBrand}
                    availableBrands={availableBrands} counts={{ new: 0, history: 0 }} 
                    onRefresh={() => refetch()} isSyncing={isLoading || isFetchingNextPage}
                />
                <SellerOrdersList 
                    orders={orders}
                    expandedId={expandedId} onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                    onLoadMore={() => fetchNextPage()}
                    hasMore={!!hasNextPage}
                    isLoading={isFetchingNextPage}
                    editingItemsMap={editingItemsMap} setEditingItemsMap={setEditingItemsMap}
                    onSubmit={handleSubmitOffer} isSubmitting={isSubmitting}
                    sortConfig={sortConfig} onSort={() => {}}
                    getOfferStatus={getOfferStatus} getMyOffer={getMyOffer}
                />
                <SellerGlobalChat 
                    isOpen={isGlobalChatOpen}
                    onClose={() => setIsGlobalChatOpen(false)}
                    currentUserRole="SUPPLIER"
                    currentSupplierName={sellerAuth.name}
                    onNavigateToOrder={handleNavigateToOrder}
                />
            </>
        )}
    </div>
  );
};
