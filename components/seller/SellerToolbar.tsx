import React from 'react';
import { Search, RefreshCw, Car } from 'lucide-react';

interface SellerToolbarProps {
  activeTab: 'new' | 'history';
  setActiveTab: (tab: 'new' | 'history') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeBrand: string | null;
  setActiveBrand: (brand: string | null) => void;
  availableBrands: string[];
  counts: { new: number, history: number };
  onRefresh: () => void;
  isSyncing: boolean;
}

export const SellerToolbar: React.FC<SellerToolbarProps> = ({
  activeTab, setActiveTab, searchQuery, setSearchQuery, 
  activeBrand, setActiveBrand, availableBrands, counts, 
  onRefresh, isSyncing
}) => {
  return (
    <>
      <div className="space-y-4">
         <div className="relative group flex items-center">
            <Search className="absolute left-6 text-slate-400" size={20}/>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по VIN или модели..." className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" />
         </div>
         {availableBrands.length > 0 && (
             <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
                <button onClick={() => setActiveBrand(null)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${!activeBrand ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}>Все марки</button>
                {availableBrands.map(brand => (
                    <button key={brand} onClick={() => setActiveBrand(activeBrand === brand ? null : brand)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeBrand === brand ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}>{brand}</button>
                ))}
             </div>
         )}
      </div>

      <div className="flex justify-between items-end border-b border-slate-200 mt-6">
         <div className="flex gap-4">
            <button onClick={() => setActiveTab('new')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'new' ? 'text-slate-900' : 'text-slate-400'}`}>Новые <span className="ml-1 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">{counts.new}</span>{activeTab === 'new' && <span className="absolute bottom-[-2px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}</button>
            <button onClick={() => setActiveTab('history')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>Отправленные <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{counts.history}</span>{activeTab === 'history' && <span className="absolute bottom-[-2px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}</button>
         </div>
         <button onClick={onRefresh} className="mb-2 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
      </div>
    </>
  );
};