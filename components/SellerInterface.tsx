import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order } from '../types';
import { Toast } from './shared/Toast';
import { Clock, Ban, CheckCircle2, XCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { SellerAuthModal } from './seller/SellerAuthModal';
import { SellerHeader } from './seller/SellerHeader';
import { SellerStats } from './seller/SellerStats';
import { SellerToolbar } from './seller/SellerToolbar';
import { SellerOrdersList } from './seller/SellerOrdersList';

export const SellerInterface: React.FC = () => {
  // --- Auth ---
  const [sellerAuth, setSellerAuth] = useState(() => {
      try { return JSON.parse(localStorage.getItem('seller_auth') || 'null'); } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(!sellerAuth);

  // --- Data ---
  const [orders, setOrders] = useState<Order[]>([]); // Raw orders (up to 1000)
  const [marketStats, setMarketStats] = useState({ today: 0, week: 0, month: 0, total: 0, leader: 'N/A' });
  const [isSyncing, setIsSyncing] = useState(false);
  const [statsLoading, setStatsLoading] = useState(false);

  // --- UI State ---
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeBrand, setActiveBrand] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Editing Drafts ---
  const [editingItemsMap, setEditingItemsMap] = useState<Record<string, any[]>>({});

  // --- Pagination & Sort ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20); // Default 20 items per page
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  // --- Effects ---
  
  // 1. Load Orders (Polling) - Hybrid Approach (Load 1000, Filter Client-Side)
  const fetchOrders = useCallback(async (silent = false) => {
      if (!sellerAuth) return;
      if (!silent) setIsSyncing(true);
      try {
          const { data } = await SupabaseService.getOrders(1, 1000, 'created_at', 'desc', '');
          setOrders(data);
      } catch (e) {
          console.error(e);
      } finally {
          setIsSyncing(false);
      }
  }, [sellerAuth]);

  useEffect(() => {
      fetchOrders();
      const interval = setInterval(() => fetchOrders(true), 15000);
      return () => clearInterval(interval);
  }, [fetchOrders]);

  // 2. Load Stats (Independent)
  useEffect(() => {
      if (!sellerAuth) return;
      const loadStats = async () => {
          setStatsLoading(true);
          try {
              const stats = await SupabaseService.getMarketStats();
              setMarketStats(stats);
          } catch (e) { console.error(e); }
          finally { setStatsLoading(false); }
      };
      loadStats();
  }, [sellerAuth]);

  // Reset page when filters change
  useEffect(() => {
      setCurrentPage(1);
  }, [activeTab, searchQuery, activeBrand]);

  // --- Handlers ---
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

  const handleSubmitOffer = async (orderId: string, items: any[]) => {
      if (isSubmitting) return;
      setIsSubmitting(true);
      const order = orders.find(o => o.id === orderId);
      if (!order) return;

      try {
          await SupabaseService.createOffer(orderId, sellerAuth.name, items, order.vin, sellerAuth.phone);
          // Optimistic update
          setOrders(prev => prev.map(o => o.id === orderId ? { 
              ...o, 
              offers: [...(o.offers || []), { clientName: sellerAuth.name, items } as any] 
          } : o));
          setExpandedId(null);
          setSuccessToast({ message: 'Предложение отправлено!', id: Date.now().toString() });
      } catch (e: any) {
          console.error(e);
          alert('Ошибка при отправке: ' + (e.message || JSON.stringify(e)));
      } finally {
          setIsSubmitting(false);
      }
  };

  // --- Derived Data (Client-Side Logic) ---
  
  const getMyOffer = useCallback((order: Order) => {
      if (!sellerAuth?.name) return null;
      const nameToMatch = sellerAuth.name.trim().toUpperCase();
      return order.offers?.find(off => 
        String(off.clientName || '').trim().toUpperCase() === nameToMatch
      ) || null;
  }, [sellerAuth]);

  const hasSentOfferByMe = useCallback((order: Order) => {
      if (!sellerAuth) return false;
      return !!getMyOffer(order);
  }, [getMyOffer, sellerAuth]);

  // Filter & Sort
  const filteredOrders = useMemo(() => {
      if (!sellerAuth) return [];
      
      let result = orders.filter(o => {
        const isSentByMe = hasSentOfferByMe(o);
        
        // Tab Logic (Status Check)
        // Seller sees order if it is 'OPEN'/'PROCESSING' AND not processed yet
        // OR if he already participated (History tab)
        const isRelevant = activeTab === 'new' 
          ? ((o.statusAdmin === 'ОТКРЫТ' || o.statusAdmin === 'В обработке') && !o.isProcessed && !isSentByMe && !o.isRefused)
          : isSentByMe;
        
        if (!isRelevant) return false;
        
        // Brand Filter
        if (activeBrand) {
            const brand = o.car?.model?.split(' ')[0].toUpperCase() || '';
            const carBrand = o.car?.brand?.toUpperCase() || '';
            if (brand !== activeBrand && carBrand !== activeBrand) return false;
        }

        // Search Filter (Deep Search)
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const match = 
                o.id.toLowerCase().includes(q) ||
                o.vin.toLowerCase().includes(q) ||
                (o.car?.model || '').toLowerCase().includes(q) ||
                (o.car?.brand || '').toLowerCase().includes(q) ||
                o.items.some(i => i.name.toLowerCase().includes(q));
            if (!match) return false;
        }
        
        return true;
      });

      // Sorting
      if (sortConfig) {
          result.sort((a, b) => {
              let valA: any = '';
              let valB: any = '';

              switch (sortConfig.key) {
                  case 'id':
                      valA = parseInt(a.id.replace(/\D/g, '')) || 0;
                      valB = parseInt(b.id.replace(/\D/g, '')) || 0;
                      break;
                  case 'brand':
                      valA = (a.car?.brand || '').toLowerCase();
                      valB = (b.car?.brand || '').toLowerCase();
                      break;
                  case 'model':
                      valA = (a.car?.model || '').toLowerCase();
                      valB = (b.car?.model || '').toLowerCase();
                      break;
                  case 'year':
                      valA = Number(a.car?.year || 0);
                      valB = Number(b.car?.year || 0);
                      break;
                  case 'date':
                      valA = new Date(a.createdAt).getTime();
                      valB = new Date(b.createdAt).getTime();
                      break;
                  case 'status':
                      valA = (a.statusAdmin || '').toLowerCase();
                      valB = (b.statusAdmin || '').toLowerCase();
                      break;
                  default:
                      valA = a.id;
                      valB = b.id;
              }

              if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
              if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
              return 0;
          });
      }

      return result;
  }, [orders, activeTab, activeBrand, searchQuery, sortConfig, sellerAuth, hasSentOfferByMe]);

  // Dynamic Brands (from loaded orders)
  const availableBrands = useMemo(() => {
      const brands = new Set<string>();
      orders.forEach(o => {
          if (o.status !== 'ЗАКРЫТ' && !o.isRefused) {
             const brand = o.car?.model?.split(' ')[0].toUpperCase();
             if (brand) brands.add(brand);
          }
      });
      return Array.from(brands).sort();
  }, [orders]);

  // Counts
  const tabCounts = useMemo(() => {
      const newCount = orders.filter(o => !hasSentOfferByMe(o) && (o.statusAdmin === 'ОТКРЫТ' || o.statusAdmin === 'В обработке') && !o.isProcessed && !o.isRefused && o.visibleToClient === 'Y').length;
      const historyCount = orders.filter(o => hasSentOfferByMe(o)).length;
      return {
          new: newCount,
          history: historyCount
      };
  }, [orders, hasSentOfferByMe]);

  const getOfferStatus = useCallback((order: Order) => {
    const myOffer = getMyOffer(order);
    if (!myOffer) return { label: 'Сбор офферов', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={10}/> };

    const isRefusal = myOffer.items.every((item: any) => (item.offeredQuantity || 0) === 0);
    if (isRefusal) {
        return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: <Ban size={10}/> };
    }

    const isBiddingActive = order.statusAdmin === 'В обработке' || order.statusAdmin === 'ОТКРЫТ';

    if (isBiddingActive && !order.isProcessed) {
        return { label: 'Идут торги', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Loader2 size={10} className="animate-spin"/> };
    }

    const winningItems = myOffer.items.filter((i: any) => i.rank === 'ЛИДЕР' || i.rank === 'LEADER');
    const totalItems = myOffer.items.length;

    if (winningItems.length === totalItems) {
        return { label: 'ВЫИГРАЛ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10}/> };
    } else if (winningItems.length === 0) {
        return { label: 'ПРОИГРАЛ', color: 'bg-red-50 text-red-600 border-red-100', icon: <XCircle size={10}/> };
    } else {
        return { label: 'ЧАСТИЧНО', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle size={10}/> };
    }
  }, [getMyOffer]);

  const handleSort = (key: string) => {
      setSortConfig(current => {
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          return { key, direction: 'asc' };
      });
  };

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
                />

                <SellerStats stats={marketStats} loading={statsLoading} />

                <SellerToolbar 
                    activeTab={activeTab}
                    setActiveTab={setActiveTab}
                    searchQuery={searchQuery}
                    setSearchQuery={setSearchQuery}
                    activeBrand={activeBrand}
                    setActiveBrand={setActiveBrand}
                    availableBrands={availableBrands}
                    counts={tabCounts}
                    onRefresh={() => fetchOrders()}
                    isSyncing={isSyncing}
                />

                <SellerOrdersList 
                    orders={filteredOrders}
                    totalOrders={filteredOrders.length}
                    expandedId={expandedId}
                    onToggle={(id) => setExpandedId(expandedId === id ? null : id)}
                    editingItemsMap={editingItemsMap}
                    setEditingItemsMap={setEditingItemsMap}
                    onSubmit={handleSubmitOffer}
                    isSubmitting={isSubmitting}
                    currentPage={currentPage}
                    itemsPerPage={itemsPerPage}
                    setCurrentPage={setCurrentPage}
                    setItemsPerPage={setItemsPerPage}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    getOfferStatus={getOfferStatus}
                    getMyOffer={getMyOffer}
                />
            </>
        )}
    </div>
  );
};