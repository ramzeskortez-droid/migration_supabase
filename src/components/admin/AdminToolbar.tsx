import React from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { AdminTab } from '../../types';

interface AdminToolbarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  activeTab: AdminTab;
  setActiveTab: (tab: AdminTab) => void;
  statusCounts: Record<string, number>;
  onRefresh: () => void;
  isSyncing: boolean;
}

export const AdminToolbar: React.FC<AdminToolbarProps> = ({
  searchQuery, setSearchQuery, activeTab, setActiveTab, statusCounts, onRefresh, isSyncing
}) => {
  return (
    <>
      <div className="relative group flex items-center">
          <Search className="absolute left-6 text-slate-400" size={20}/>
          <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по ID, теме, позиции, бренду или почте..." className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" />
      </div>

      <div className="flex justify-between items-end border-b border-slate-200">
          <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {['new', 'manual', 'kp_sent', 'ready_to_buy', 'archive'].map(id => {
                  const label = id === 'new' ? 'Новые' : 
                                id === 'manual' ? 'Ручная' :
                                id === 'kp_sent' ? 'КП готово' : 
                                id === 'ready_to_buy' ? 'КП у клиента' : 
                                id === 'archive' ? 'Архив' : id;
                  
                  const count = statusCounts[id] || 0;
                  // Для Архива можно не показывать каунтер, или показывать сумму (отказ + аннулирован)
                  
                  return (
                      <button key={id} onClick={() => setActiveTab(id as AdminTab)} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all whitespace-nowrap flex items-center gap-2 ${activeTab === id ? 'bg-indigo-600 text-white shadow-md' : 'bg-white border border-slate-200 text-slate-400'}`}>
                          {label}
                          {count > 0 && <span className={`ml-1 px-1.5 py-0.5 rounded-md text-[9px] ${activeTab === id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>+{count}</span>}
                      </button>
                  );
              })}
          </div>
          <button onClick={onRefresh} className="mb-2 p-2 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2 shrink-0 shadow-sm"><RefreshCw size={14} className={isSyncing ? "animate-spin" : ""}/></button>
      </div>
    </>
  );
};