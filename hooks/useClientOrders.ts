import { useState, useEffect, useCallback } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order } from '../types';

interface ClientAuth {
  name: string;
  phone: string;
}

export const useClientOrders = (clientAuth: ClientAuth | null) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & Pagination State
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchQuery]);

  const fetchOrders = useCallback(async () => {
    if (!clientAuth) return;
    setIsSyncing(true);
    setError(null);
    try {
      const { data, count } = await SupabaseService.getOrders(
          currentPage,
          itemsPerPage,
          sortConfig?.key || 'id',
          sortConfig?.direction || 'desc',
          searchQuery,
          undefined, // statusFilter is handled by tabs logic inside the list usually, but here we fetch all and filter client-side or we could filter server-side.
          // In the original code, client side filtering was used for tabs ('active' vs 'history').
          // To keep it consistent with original logic where we fetched everything relevant to the client phone:
          clientAuth.phone
      );
      setOrders(data);
      setTotalOrders(count);
    } catch (e) { 
      console.error(e);
      setError('Не удалось загрузить заказы');
    } finally { 
      setIsSyncing(false); 
    }
  }, [clientAuth, currentPage, itemsPerPage, sortConfig, searchQuery]);

  // Initial fetch and polling
  useEffect(() => {
    if (clientAuth) {
      fetchOrders();
      const interval = setInterval(fetchOrders, 15000);
      return () => clearInterval(interval);
    }
  }, [clientAuth, fetchOrders]);

  return {
    orders,
    totalOrders,
    isSyncing,
    error,
    refresh: fetchOrders,
    // Filter & Pagination props
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    sortConfig, setSortConfig
  };
};