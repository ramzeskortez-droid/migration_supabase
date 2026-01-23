import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { Search, RefreshCw, Car, Flame, X, Plus, Loader2, Check } from 'lucide-react';

interface BuyerToolbarProps {
  activeTab: 'new' | 'history' | 'hot' | 'won' | 'lost' | 'cancelled' | 'archive';
  setActiveTab: (tab: 'new' | 'history' | 'hot' | 'won' | 'lost' | 'cancelled' | 'archive') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeBrands: string[]; 
  setActiveBrands: (brands: string[]) => void;
  availableBrands: string[]; // (Unused for now, we use search)
  historyBrands?: string[]; 
  counts: { new: number, history: number, won: number, lost: number, archive: number };
}

export const BuyerToolbar: React.FC<BuyerToolbarProps> = ({
  activeTab, setActiveTab, searchQuery, setSearchQuery, 
  activeBrands = [], setActiveBrands, availableBrands = [], historyBrands = [], counts
}) => {
  const [brandSearch, setBrandSearch] = useState('');
  const [localSearch, setLocalSearch] = useState(searchQuery); 
  
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);
  const [searchResults, setSearchResults] = useState<string[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Sync local search with prop (for external navigation)
  useEffect(() => {
      setLocalSearch(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalSearch(val);
      setSearchQuery(val);
  };

  // Комбинированный поиск брендов: При вводе идем в базу, при пустоте показываем загруженные
  useEffect(() => {
      if (!brandSearch) {
          setSearchResults(availableBrands);
          return;
      }

      // Если в локальном списке есть совпадение - показываем сразу (оптимизация)
      // Но все равно делаем запрос для точности (вдруг новые появились)
      const localMatches = availableBrands.filter(b => b.toLowerCase().includes(brandSearch.toLowerCase()));
      setSearchResults(localMatches);

      const handler = setTimeout(async () => {
          setIsSearching(true);
          try {
              const results = await SupabaseService.searchBrands(brandSearch);
              // Объединяем локальные и серверные (убираем дубли)
              const combined = Array.from(new Set([...localMatches, ...results]));
              setSearchResults(combined);
          } catch (e) {
              console.error(e);
          } finally { 
              setIsSearching(false); 
          }
      }, 300);

      return () => clearTimeout(handler);
  }, [brandSearch, availableBrands]);

  const toggleBrand = (brand: string) => {
      if (activeBrands.includes(brand)) {
          setActiveBrands(activeBrands.filter(b => b !== brand));
      } else {
          setActiveBrands([...activeBrands, brand]);
      }
  };

  return (
    <>
      <div className="space-y-4">
         {/* Основной поиск */}
         <div className="relative group flex items-center">
            <Search className="absolute left-6 text-slate-400" size={20}/>
                      <input 
                        value={localSearch} 
                        onChange={handleSearchChange} 
                        placeholder="Поиск по ID, теме, позиции, бренду или почте..." 
                        className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" 
                      />
         </div>

                  {/* Умный фильтр брендов (Мультивыбор) */}

                  <div className="flex flex-wrap items-center gap-3">

                     <div className="relative">

                         <button 
                             onClick={() => setShowBrandDropdown(!showBrandDropdown)}
                             className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all border-2 ${activeBrands?.length > 0 ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}
                         >
                             <Car size={14} />
                             Все бренды {activeBrands?.length > 0 && `(${activeBrands.length})`}
                         </button>
         
                         {showBrandDropdown && (
                        <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2">
                            <div className="relative">
                                <input 
                                    autoFocus
                                    value={brandSearch}
                                    onChange={(e) => setBrandSearch(e.target.value)}
                                    placeholder="Поиск в базе..."
                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-100 rounded-lg text-xs outline-none mb-2 font-bold pr-8"
                                />
                                {isSearching && <Loader2 size={12} className="absolute right-2 top-2.5 animate-spin text-slate-400" />}
                            </div>
                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">
                                {searchResults.length === 0 && !isSearching && (
                                    <div className="p-2 text-center text-[10px] text-slate-400 font-bold">Ничего не найдено</div>
                                )}
                                {searchResults.map(brand => {
                                    const isSelected = activeBrands.includes(brand);
                                    return (
                                        <button 
                                            key={brand}
                                            onClick={() => toggleBrand(brand)}
                                            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase flex justify-between items-center transition-colors ${isSelected ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                            {brand}
                                            {isSelected && <Check size={12} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Выбранные бренды (Теги) */}
                {activeBrands.map(brand => (
                    <button 
                        key={brand}
                        onClick={() => toggleBrand(brand)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-100 text-indigo-700 rounded-lg text-[9px] font-black uppercase hover:bg-indigo-200 transition-colors"
                    >
                        {brand} <X size={12} />
                    </button>
                ))}

                {activeBrands.length > 0 && (
                    <button 
                        onClick={() => setActiveBrands([])}
                        className="text-[9px] font-bold text-slate-400 hover:text-red-500 underline decoration-dashed"
                    >
                        Сбросить
                    </button>
                )}

                {/* Быстрые теги (ТОП-7 активных) */}
                {activeBrands.length === 0 && historyBrands.length > 0 && (
                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                        {historyBrands.map(brand => (
                            <button 
                                key={brand} 
                                onClick={() => toggleBrand(brand)}
                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap bg-indigo-50 border border-indigo-100 text-indigo-600 hover:bg-indigo-100"
                            >
                                {brand}
                            </button>
                        ))}
                    </div>
                )}


         </div>
      </div>

      <div className="border-b border-slate-200 mt-6 relative">
         <div className="overflow-x-auto no-scrollbar -mx-4 px-4 md:mx-0 md:px-0">
            <div className="flex gap-4 md:gap-6 min-w-max pr-4 md:pr-0">
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
                    onClick={() => setActiveTab('history')} 
                    className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'history' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    В торгах 
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'history' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {counts.history}
                    </span>
                    {activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-blue-600 rounded-full"></span>}
                </button>

                <button 
                    onClick={() => setActiveTab('won')} 
                    className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'won' ? 'text-emerald-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Выигранные 
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'won' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {counts.won}
                    </span>
                    {activeTab === 'won' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-emerald-600 rounded-full"></span>}
                </button>

                <button 
                    onClick={() => setActiveTab('lost')} 
                    className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'lost' ? 'text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Проигранные 
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'lost' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {counts.lost}
                    </span>
                    {activeTab === 'lost' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-slate-600 rounded-full"></span>}
                </button>

                <button 
                    onClick={() => setActiveTab('archive')} 
                    className={`pb-3 text-[11px] font-black uppercase transition-all relative ${activeTab === 'archive' ? 'text-slate-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Архив / Отказ 
                    <span className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] ${activeTab === 'archive' ? 'bg-slate-600 text-white' : 'bg-slate-100 text-slate-400'}`}>
                        {counts.archive}
                    </span>
                    {activeTab === 'archive' && <span className="absolute bottom-[-1px] left-0 right-0 h-[3px] bg-slate-600 rounded-full"></span>}
                </button>
            </div>
         </div>
      </div>

      {showBrandDropdown && <div className="fixed inset-0 z-40" onClick={() => setShowBrandDropdown(false)}></div>}
    </>
  );
};