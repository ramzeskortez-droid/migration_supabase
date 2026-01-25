import React, { useState, useEffect, useCallback } from 'react';
import { Order } from '../../types';
import { SupabaseService } from '../../services/supabaseService';
import { OperatorOrderRow } from './OperatorOrderRow';
import { Virtuoso } from 'react-virtuoso';
import { ArrowUpDown, ArrowUp, ArrowDown, Package, Loader2 } from 'lucide-react';

interface OperatorOrdersListProps {
  refreshTrigger: number;
  ownerId?: string;
  searchQuery?: string;
  activeTab: TabType; // Внешнее управление
  onTabChange: (tab: TabType) => void;
  scrollToId?: string | null;
}

type TabType = 'processing' | 'manual' | 'processed' | 'completed' | 'rejected' | 'archive';
type SortField = 'id' | 'client_name' | 'created_at' | 'status_manager' | 'deadline';

export const OperatorOrdersList: React.FC<OperatorOrdersListProps> = ({ refreshTrigger, ownerId, searchQuery = '', activeTab, onTabChange, scrollToId }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({});
  const [buyersMap, setBuyersMap] = useState<Record<string, any>>({});
  const virtuosoRef = React.useRef<any>(null);

  const updateCounts = useCallback(() => {
      if (ownerId) {
          SupabaseService.getOperatorStatusCounts(ownerId).then(setStatusCounts);
      }
  }, [ownerId]);

  useEffect(() => {
      SupabaseService.getBuyersList().then(users => {
          const map = users.reduce((acc, u) => ({ ...acc, [u.id]: u }), {});
          setBuyersMap(map);
      });
  }, []);

  useEffect(() => {
      updateCounts();
  }, [refreshTrigger, updateCounts]);

  // Эффект скролла
  useEffect(() => {
      if (scrollToId && orders.length > 0) {
          const index = orders.findIndex(o => o.id === scrollToId);
          if (index !== -1) {
              setExpandedId(scrollToId); 
              
              const scroll = () => {
                  virtuosoRef.current?.scrollToIndex({
                      index,
                      align: 'start',
                      behavior: 'auto'
                  });
              };

              // Двойная попытка скролла
              setTimeout(scroll, 100);
              setTimeout(scroll, 600);
          }
      }
  }, [scrollToId, orders]);

  const loadOrders = async (isLoadMore = false) => {
    // Если токен не передан, не загружаем ничего (безопасность UI)
    if (!ownerId) {
        setOrders([]);
        return;
    }

    if (loading) return;
    setLoading(true);
    try {
      let statusFilter = '';
      switch (activeTab) {
          case 'processing': statusFilter = 'В обработке'; break;
          case 'trading': statusFilter = 'В обработке'; break; // Для торгов фильтр тот же, но будет доп. проверка на offers > 0
          case 'manual': statusFilter = 'Ручная обработка'; break;
          case 'processed': statusFilter = 'КП готово'; break;
          case 'archive': statusFilter = 'Архив,Аннулирован,Отказ,КП отправлено,Выполнен,Обработано вручную'; break;
      }

      const cursor = isLoadMore && orders.length > 0 ? Number(orders[orders.length - 1].id) : undefined;

      const { data } = await SupabaseService.getOrders(
          cursor, 
          50, // Batch size
          sortField, 
          sortDir, 
          searchQuery, // Используем searchQuery из пропсов
          statusFilter,
          undefined, // phone
          undefined, // brand
          undefined, // offers
          ownerId,
          undefined, // buyerToken
          undefined, // excludeOffersFrom
          undefined, // buyerTab
          (activeTab === 'processing' || activeTab === 'trading') ? activeTab : undefined
      );

      if (isLoadMore) {
          setOrders(prev => [...prev, ...data]);
      } else {
          setOrders(data);
      }
      setHasMore(data.length === 50);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger, activeTab, sortField, sortDir, ownerId, searchQuery]);

  const loadMore = useCallback(() => {
      if (!loading && hasMore) {
          loadOrders(true);
      }
  }, [loading, hasMore, orders, activeTab, sortField, sortDir]);

  const handleSort = (field: SortField) => {
      if (sortField === field) {
          setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
      } else {
          setSortField(field);
          setSortDir('desc');
      }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
      if (sortField !== field) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50" />;
      return sortDir === 'asc' 
          ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> 
          : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const handleToggle = (id: string) => {
      setExpandedId(expandedId === id ? null : id);
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
      try {
          await SupabaseService.updateWorkflowStatus(orderId, newStatus);
          loadOrders(); 
          updateCounts(); // Обновление счетчиков
      } catch (e) {
          console.error(e);
          alert('Ошибка обновления статуса');
      }
  };

  return (
    <div className="space-y-4 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Package size={20} className="text-indigo-600" />
              Архив заявок
          </h2>

          <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm overflow-x-auto max-w-full no-scrollbar">
              {[
                  { id: 'processing', label: 'В обработке' },
                  { id: 'trading', label: 'Идут торги' },
                  { id: 'manual', label: 'Ручная' },
                  { id: 'processed', label: 'КП готово' },
                  { id: 'archive', label: 'Архив' }
              ].map(tab => {
                  const count = statusCounts[tab.id] || 0;
                  return (
                      <button 
                        key={tab.id}
                        onClick={() => onTabChange(tab.id as TabType)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-1.5 ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {tab.label}
                        {count > 0 && <span className={`px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>{count}</span>}
                      </button>
                  );
              })}
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="hidden md:block border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="p-3 grid grid-cols-[70px_1fr_100px_1fr_1fr_90px_100px_140px_20px] gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left border-l-4 border-transparent">
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ Заказа <SortIcon field="id"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('client_name')}>Клиент <SortIcon field="client_name"/></div>
                  <div className="flex items-center">Закупщик(и)</div>
                  <div className="flex items-center">Почта</div>
                  <div className="flex items-center">Тема</div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('deadline')}>Срок до <SortIcon field="deadline"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('created_at')}>Дата <SortIcon field="created_at"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('status_manager')}>Статус <SortIcon field="status_manager"/></div>
                  <div></div>
              </div>
          </div>

          <div className="flex-grow">
              <Virtuoso
                  ref={virtuosoRef}
                  style={{ height: '100%' }}
                  data={orders}
                  endReached={loadMore}
                  itemContent={(index, order) => (
                      <OperatorOrderRow 
                          key={order.id}
                          order={order}
                          isExpanded={expandedId === order.id}
                          onToggle={() => handleToggle(order.id)}
                          onStatusChange={handleStatusChange}
                          buyersMap={buyersMap}
                      />
                  )}
                  components={{
                      Footer: () => loading ? (
                          <div className="p-4 text-center">
                              <Loader2 className="animate-spin inline-block text-indigo-500" size={20} />
                          </div>
                      ) : null,
                      EmptyPlaceholder: () => !loading ? (
                          <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                              Ничего не найдено
                          </div>
                      ) : null
                  }}
              />
          </div>
      </div>
    </div>
  );
};