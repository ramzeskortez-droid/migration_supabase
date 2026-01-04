import React, { useState } from 'react';
import { Search, RefreshCw, Car, Flame, X } from 'lucide-react';

interface BuyerToolbarProps {
  activeTab: 'new' | 'history' | 'hot';
  setActiveTab: (tab: 'new' | 'history' | 'hot') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeBrand: string | null;
  setActiveBrand: (brand: string | null) => void;
  availableBrands: string[];
  counts: { new: number, history: number };
  onRefresh: () => void;
  isSyncing: boolean;
}

export const BuyerToolbar: React.FC<BuyerToolbarProps> = ({
  activeTab, setActiveTab, searchQuery, setSearchQuery, 
  activeBrand, setActiveBrand, availableBrands, counts, 
  onRefresh, isSyncing
}) => {
  const [brandSearch, setBrandSearch] = useState('');
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const filteredBrands = availableBrands.filter(b => 
    b.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <>
      <div className="space-y-4">
         {/* Основной поиск */}
         <div className="relative group flex items-center">
            <Search className="absolute left-6 text-slate-400" size={20}/>
            <input 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
                placeholder="Поиск по VIN или модели..." 
                className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm transition-all" 
            />
         </div>

         {/* Умный фильтр брендов (Задача 2.3) */}
         <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
                <button 
                    onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${activeBrand ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                >
                    <Car size={14} />
                    {activeBrand || 'Все марки'}
                </button>

                {showBrandDropdown && (
                    <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                        <input 
                            autoFocus
                            value={brandSearch}
                            onChange={(e) => setBrandSearch(e.target.value)}
                            placeholder="Найти бренд..."
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none mb-2 font-bold"
                        />
                        <div className="max-h-60 overflow-y-auto custom-scrollbar">
                            <button 
                                onClick={() => { setActiveBrand(null); setShowBrandDropdown(false); }}
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-[10px] font-bold uppercase text-slate-400"
                            >
                                Все марки
                            </button>
                            {filteredBrands.map(brand => (
                                <button 
                                    key={brand}
                                    onClick={() => { setActiveBrand(brand); setShowBrandDropdown(false); }}
                                    className={`w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 text-[10px] font-black uppercase ${activeBrand === brand ? 'text-indigo-600 bg-indigo-50' : 'text-slate-600'}`}
                                >
                                    {brand}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {activeBrand && (
                <button 
                    onClick={() => setActiveBrand(null)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-500 rounded-lg text-[9px] font-black uppercase hover:bg-slate-200 transition-colors"
                >
                    {activeBrand} <X size={12} />
                </button>
            )}

            {/* Быстрые теги (Топ-5 марок для удобства) */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                {availableBrands.slice(0, 5).map(brand => (
                    <button 
                        key={brand} 
                        onClick={() => setActiveBrand(activeBrand === brand ? null : brand)}
                        className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap ${activeBrand === brand ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-100 text-slate-400 hover:bg-slate-50'}`}
                    >
                        {brand}
                    </button>
                ))}
            </div>
         </div>
      </div>

      <div className="flex justify-between items-end border-b border-slate-200 mt-6">
         <div className="flex gap-6">
            <button 
                onClick={() => setActiveTab('new')} 
                className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'new' ? 'text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Новые 
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'new' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {counts.new}
                </span>
                {activeTab === 'new' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-slate-900 rounded-full"></span>}
            </button>

            <button 
                onClick={() => setActiveTab('hot')} 
                className={`pb-3 text-[11px] font-black uppercase transition-all relative flex items-center gap-1.5 ${activeTab === 'hot' ? 'text-orange-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <Flame size={14} className={activeTab === 'hot' ? 'animate-pulse' : ''} />
                Горящие 🔥
                {activeTab === 'hot' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-orange-600 rounded-full"></span>}
            </button>

            <button 
                onClick={() => setActiveTab('history')} 
                className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
            >
                Отправленные 
                <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'history' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                    {counts.history}
                </span>
                {activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-indigo-600 rounded-full"></span>}
            </button>
         </div>
         <button 
            onClick={onRefresh} 
            className="mb-2 p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all flex items-center gap-2 shadow-sm"
         >
            <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/>
         </button>
      </div>

      {showBrandDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowBrandDropdown(false)}></div>}
    </>
  );
};