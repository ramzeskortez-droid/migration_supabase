import React, { useState } from 'react';
import { Search, RefreshCw, Car, Flame, X, Plus } from 'lucide-react';

interface BuyerToolbarProps {

  activeTab: 'new' | 'history' | 'hot';

  setActiveTab: (tab: 'new' | 'history' | 'hot') => void;

  searchQuery: string;

  setSearchQuery: (query: string) => void;

  activeBrands: string[]; 

  setActiveBrands: (brands: string[]) => void;

  availableBrands: string[];

  historyBrands?: string[]; // Новое свойство

  counts: { new: number, history: number };

  onRefresh: () => void;

  isSyncing: boolean;

}



export const BuyerToolbar: React.FC<BuyerToolbarProps> = ({

  activeTab, setActiveTab, searchQuery, setSearchQuery, 

  activeBrands = [], setActiveBrands, availableBrands = [], historyBrands = [], counts, 

  onRefresh, isSyncing

}) => {

  const [brandSearch, setBrandSearch] = useState('');

  const [showBrandDropdown, setShowBrandDropdown] = useState(false);



  const filteredBrands = availableBrands.filter(b => 

    b.toLowerCase().includes(brandSearch.toLowerCase())

  );



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

                value={searchQuery} 

                onChange={e => setSearchQuery(e.target.value)} 

                placeholder="Поиск по VIN, модели или ID..." 

                className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm transition-all" 

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



                             Бренды {activeBrands?.length > 0 && `(${activeBrands.length})`}



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

                            <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-1">

                                {filteredBrands.length === 0 && (

                                    <div className="p-2 text-center text-[10px] text-slate-400">Ничего не найдено</div>

                                )}

                                {filteredBrands.map(brand => {

                                    const isSelected = activeBrands.includes(brand);

                                    return (

                                        <button 

                                            key={brand}

                                            onClick={() => toggleBrand(brand)}

                                            className={`w-full text-left px-3 py-2 rounded-lg text-[10px] font-black uppercase flex justify-between items-center ${isSelected ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'}`}

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



                {/* Быстрые теги (Персональные бренды поставщика) */}

                {activeBrands.length === 0 && historyBrands.length > 0 && (

                    <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">

                        {historyBrands.map(brand => (

                            <button 

                                key={brand} 

                                onClick={() => toggleBrand(brand)}

                                className="px-3 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all whitespace-nowrap bg-white border border-slate-100 text-slate-400 hover:bg-slate-50"

                            >

                                {brand}

                            </button>

                        ))}

                    </div>

                )}


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

// Simple Check Icon Component
const Check = ({ size }: { size: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
);