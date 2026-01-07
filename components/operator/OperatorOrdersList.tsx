import React, { useState, useEffect, useCallback } from 'react';
import { Order } from '../../types';
import { SupabaseService } from '../../services/supabaseService';
import { OperatorOrderRow } from './OperatorOrderRow';
import { Virtuoso } from 'react-virtuoso';
import { ArrowUpDown, ArrowUp, ArrowDown, Package, Loader2 } from 'lucide-react';

interface OperatorOrdersListProps {
  refreshTrigger: number;
  ownerToken?: string;
}

type TabType = 'processing' | 'processed' | 'completed' | 'rejected';
type SortField = 'id' | 'client_name' | 'created_at' | 'status_admin';

export const OperatorOrdersList: React.FC<OperatorOrdersListProps> = ({ refreshTrigger, ownerToken }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('processing');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadOrders = async (isLoadMore = false) => {
    // Если токен не передан, не загружаем ничего (безопасность UI)
    if (!ownerToken) {
        setOrders([]);
        return;
    }

    if (loading) return;
    setLoading(true);
    try {
      let statusFilter = '';
      switch (activeTab) {
          case 'processing': statusFilter = 'В обработке'; break;
          case 'processed': statusFilter = 'КП готово,КП отправлено'; break;
          case 'completed': statusFilter = 'Выполнен'; break;
          case 'rejected': statusFilter = 'Аннулирован,Отказ'; break;
      }

      const cursor = isLoadMore && orders.length > 0 ? Number(orders[orders.length - 1].id) : undefined;

      const { data } = await SupabaseService.getOrders(
          cursor, 
          50, // Batch size
          sortField, 
          sortDir, 
          '', 
          statusFilter,
          undefined, // phone
          undefined, // brand
          undefined, // offers
          ownerToken // <-- ИЗОЛЯЦИЯ: передаем токен
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
  }, [refreshTrigger, activeTab, sortField, sortDir, ownerToken]);

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

  const handleToggle = async (id: string) => {
      if (expandedId === id) {
          setExpandedId(null);
      } else {
          setExpandedId(id);
          const order = orders.find(o => o.id === id);
          if (order && (!order.items || order.items.length === 0 || !order.offers)) {
              try {
                  const details = await SupabaseService.getOrderDetails(id);
                  setOrders(prev => prev.map(o => o.id === id ? { 
                      ...o, 
                      items: details.items as any,
                      offers: details.offers as any 
                  } : o));
              } catch (e) { console.error(e); }
          }
      }
  };

  const handleStatusChange = async (orderId: string, newStatus: string) => {
      try {
          await SupabaseService.updateWorkflowStatus(orderId, newStatus);
          loadOrders(); 
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

          <div className="bg-white p-1 rounded-xl border border-slate-200 inline-flex shadow-sm">
              {[
                  { id: 'processing', label: 'В обработке' },
                  { id: 'processed', label: 'Обработанные' },
                  { id: 'completed', label: 'Успешные' },
                  { id: 'rejected', label: 'Забракованные' }
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as TabType)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab.label}
                  </button>
              ))}
          </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
          <div className="hidden md:block border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="p-3 grid grid-cols-[70px_1fr_1fr_90px_100px_140px_20px] gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left border-l-4 border-transparent">
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ Заказа <SortIcon field="id"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('client_name')}>Клиент <SortIcon field="client_name"/></div>
                  <div className="flex items-center">Тема</div>
                  <div className="flex items-center">Срок до</div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('created_at')}>Дата <SortIcon field="created_at"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('status_admin')}>Статус <SortIcon field="status_admin"/></div>
                  <div></div>
              </div>
          </div>

          <div className="flex-grow">
              <Virtuoso
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