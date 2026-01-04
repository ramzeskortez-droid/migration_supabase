import React, { useState, useEffect } from 'react';
import { Order } from '../../types';
import { SupabaseService } from '../../services/supabaseService';
import { OperatorOrderRow } from './OperatorOrderRow';
import { Virtuoso } from 'react-virtuoso';
import { ArrowUpDown, ArrowUp, ArrowDown, Package, Loader2 } from 'lucide-react';

interface OperatorOrdersListProps {
  refreshTrigger: number;
}

type TabType = 'processing' | 'processed' | 'completed' | 'rejected';
type SortField = 'id' | 'client_name' | 'created_at' | 'status_admin';

export const OperatorOrdersList: React.FC<OperatorOrdersListProps> = ({ refreshTrigger }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('processing');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const loadOrders = async () => {
    setLoading(true);
    try {
      let statusFilter = '';
      switch (activeTab) {
          case 'processing': statusFilter = 'В обработке'; break;
          case 'processed': statusFilter = 'КП готово'; break;
          case 'completed': statusFilter = 'Выполнен'; break;
          case 'rejected': statusFilter = 'Аннулирован,Отказ'; break;
      }

      const { data } = await SupabaseService.getOrders(
          undefined, 
          100, 
          sortField, 
          sortDir, 
          '', 
          statusFilter
      );
      setOrders(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [refreshTrigger, activeTab, sortField, sortDir]);

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
          // Load items if missing
          const order = orders.find(o => o.id === id);
          if (order && (!order.items || order.items.length === 0)) {
              try {
                  const details = await SupabaseService.getOrderDetails(id);
                  setOrders(prev => prev.map(o => o.id === id ? { ...o, items: details.items as any } : o));
              } catch (e) { console.error(e); }
          }
      }
  };

  return (
    <div className="space-y-4 pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
              <Package size={20} className="text-indigo-600" />
              Архив заявок
          </h2>

          {/* Tabs */}
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
          {/* Table Header */}
          <div className="hidden md:block border-b border-slate-100 bg-slate-50 shrink-0">
              <div className="p-3 grid grid-cols-[70px_1.5fr_100px_100px_140px_20px] gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left border-l-4 border-transparent">
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ Заказа <SortIcon field="id"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('client_name')}>Клиент <SortIcon field="client_name"/></div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('created_at')}>Дата <SortIcon field="created_at"/></div>
                  <div className="flex items-center">Время</div>
                  <div className="cursor-pointer flex items-center group" onClick={() => handleSort('status_admin')}>Статус <SortIcon field="status_admin"/></div>
                  <div></div>
              </div>
          </div>

          {/* Table Body (Virtuoso) */}
          <div className="flex-grow">
              {loading && orders.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
                      <Loader2 className="animate-spin text-indigo-500" size={24} />
                      <span className="text-[10px] font-black uppercase tracking-widest">Загрузка данных...</span>
                  </div>
              ) : (
                  <Virtuoso
                      style={{ height: '100%' }}
                      data={orders}
                      itemContent={(index, order) => (
                          <OperatorOrderRow 
                              key={order.id}
                              order={order}
                              isExpanded={expandedId === order.id}
                              onToggle={() => handleToggle(order.id)}
                          />
                      )}
                      components={{
                          EmptyPlaceholder: () => (
                              <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">
                                  Ничего не найдено
                              </div>
                          )
                      }}
                  />
              )}
          </div>
      </div>
    </div>
  );
};
