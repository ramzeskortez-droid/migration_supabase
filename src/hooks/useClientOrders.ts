import { useState, useMemo } from 'react';
import { useOrdersInfinite } from './useOrdersInfinite';

interface ClientAuth {
  name: string;
  phone: string;
}

export const useClientOrders = (clientAuth: ClientAuth | null) => {
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const {
      data,
      fetchNextPage,
      hasNextPage,
      isFetchingNextPage,
      isLoading,
      refetch
  } = useOrdersInfinite({
      searchQuery,
      clientPhone: clientAuth?.phone,
      // Для клиента: фильтрация статусов на сервере
      // Если active, то не 'Выполнен' и не 'Отказ'
      // Если history, то 'Выполнен' или 'Отказ'
      // Но так как statusFilter принимает одно значение, мы будем фильтровать на клиенте (как и было), 
      // либо нужно усложнять API.
      // Пока оставим client-side фильтрацию статусов для простоты, т.к. у клиента мало заказов.
      sortDirection: sortDirection,
      limit: 20
  });

  const orders = useMemo(() => {
      let result = data?.pages.flatMap(page => page.data) || [];
      
      // Client-side status filtering for tabs
      if (activeTab === 'active') {
          result = result.filter(o => o.statusManager !== 'Выполнен' && o.statusManager !== 'Отказ' && o.statusManager !== 'Аннулирован');
      } else {
          result = result.filter(o => o.statusManager === 'Выполнен' || o.statusManager === 'Отказ' || o.statusManager === 'Аннулирован');
      }
      return result;
  }, [data, activeTab]);

  return {
    orders,
    totalOrders: orders.length, 
    isSyncing: isLoading || isFetchingNextPage,
    isLoading,
    fetchNextPage, // Экспортируем для списка
    hasNextPage,   // Экспортируем для списка
    onLoadMore: fetchNextPage, // Алиас
    hasMore: hasNextPage,      // Алиас
    error: null,
    refresh: refetch,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    currentPage: 1, 
    itemsPerPage: 20,
    setCurrentPage: () => {},
    setItemsPerPage: () => {},
    sortConfig: { key: 'id', direction: sortDirection },
    setSortConfig: (cfg: any) => setSortDirection(cfg.direction),
    // Actions needed for list
    onConfirmPurchase: () => {}, // Handled in UI
    onRefuse: () => {}, // Handled in UI
    isConfirming: null
  };
};
