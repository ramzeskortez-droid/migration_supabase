import React, { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Part } from './types';
import { ImageUploader } from '../shared/ImageUploader';
import { SupabaseService } from '../../services/supabaseService';

interface PartsListProps {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  onAddBrand: (name: string) => void;
}

export const PartsList: React.FC<PartsListProps> = ({ parts, setParts, onAddBrand }) => {
  const [activeBrandInput, setActiveBrandInput] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Кэш проверенных брендов: { "makita": "Makita" } или { "unknown": null }
  const [brandCache, setBrandCache] = useState<Record<string, string | null>>({});
  const [validating, setValidating] = useState<Set<number>>(new Set());

  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePart = (id: number, field: keyof Part, value: string | number) => {
    setParts(parts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  // Эффект 1: Динамические подсказки при вводе (только для активного поля)
  useEffect(() => {
      const activePart = parts.find(p => p.id === activeBrandInput);
      const query = activePart?.brand?.trim();

      if (!query || query.length < 2) {
          setSuggestions([]);
          return;
      }

      const handler = setTimeout(async () => {
          try {
              const results = await SupabaseService.searchBrands(query);
              setSuggestions(results);
          } catch (e) {}
      }, 300);

      return () => clearTimeout(handler);
  }, [activeBrandInput, parts]);

  // Эффект 2: Фоновая проверка существования бренда в базе (для всех полей)
  useEffect(() => {
      parts.forEach(part => {
          const brandName = part.brand?.trim();
          if (!brandName || brandCache[brandName.toLowerCase()] !== undefined) return;

          const check = async () => {
              setValidating(prev => new Set(prev).add(part.id));
              try {
                  const dbName = await SupabaseService.checkBrandExists(brandName);
                  setBrandCache(prev => ({ ...prev, [brandName.toLowerCase()]: dbName }));
              } catch (e) {}
              finally { setValidating(prev => { const n = new Set(prev); n.delete(part.id); return n; }); }
          };
          check();
      });
  }, [parts, brandCache]);

  const inputClass = "w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 placeholder:text-xs text-slate-700 shadow-sm";
  const headerClass = "col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Список позиций</h2>
      </div>
      
      <div className="space-y-3">
        {/* Header Row */}
        <div className="grid grid-cols-[30px_4fr_2fr_3fr_1fr_1fr_1fr] gap-2 px-2 items-center">
          <div className={`${headerClass} text-center`}>#</div>
          <div className={headerClass}>Наименование</div>
          <div className={headerClass}>Бренд</div>
          <div className={headerClass}>Артикул</div>
          <div className={`${headerClass} text-center`}>Ед.</div>
          <div className={`${headerClass} text-center`}>Кол-во</div>
          <div className={`${headerClass} text-center`}>Фото</div>
        </div>

        {parts.map((part, idx) => {
          const brandValue = part.brand?.trim() || '';
          const dbName = brandCache[brandValue.toLowerCase()];
          const isChecking = validating.has(part.id);
          
          // Валидно, если нашли в базе (dbName не null)
          const isValid = dbName !== undefined && dbName !== null;
          // Предупреждение, если нет точного совпадения, но есть подсказки (только для активного поля)
          const isWarning = !isValid && activeBrandInput === part.id && suggestions.length > 0;
          // Ошибка, если проверили и не нашли ничего похожего
          const isError = brandValue.length > 0 && dbName === null && !isChecking && !isWarning;
          // Регистр отличается от базы
          const needsFix = isValid && dbName !== brandValue;

          return (
            <div key={part.id} className="group relative grid grid-cols-[30px_4fr_2fr_3fr_1fr_1fr_1fr] gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-indigo-300 transition-colors">
               <div className="text-center text-slate-400 text-xs font-medium">{idx + 1}</div>
               
               <div>
                 <input 
                    value={part.name}
                    onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                    placeholder="Наименование"
                    className={inputClass}
                 />
               </div>

               {/* Brand Input */}
               <div className="relative">
                 <input 
                    value={part.brand}
                    onChange={(e) => updatePart(part.id, 'brand', e.target.value)}
                    onFocus={() => setActiveBrandInput(part.id)}
                    onBlur={() => setTimeout(() => setActiveBrandInput(null), 200)}
                    placeholder="Бренд"
                    className={`${inputClass} pr-8
                        ${isError ? 'border-red-500 bg-red-50 text-red-700' : ''}
                        ${isWarning ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                        ${isValid ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}
                    `}
                 />
                 
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isChecking && <Loader2 size={12} className="animate-spin text-slate-400" />}
                    {isValid && !needsFix && <CheckCircle size={14} className="text-emerald-500" />}
                    {isWarning && <AlertTriangle size={14} className="text-yellow-500" />}
                    {needsFix && (
                        <button 
                            onClick={() => updatePart(part.id, 'brand', dbName)}
                            className="text-amber-500 hover:text-amber-600 transition-all hover:rotate-180"
                            title={`Найдено: ${dbName}. Нажмите для исправления регистра.`}
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    {isError && (
                        <button 
                            onClick={() => onAddBrand(part.brand)}
                            className="text-red-500 hover:text-red-600 transition-colors"
                            title="Бренда нет в базе. Нажмите чтобы добавить."
                        >
                            <AlertTriangle size={14} />
                        </button>
                    )}
                 </div>

                 {/* Suggestions */}
                 {activeBrandInput === part.id && suggestions.length > 0 && (
                     <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                         {suggestions.map(s => (
                             <div 
                                key={s}
                                onClick={() => {
                                    updatePart(part.id, 'brand', s);
                                    setBrandCache(prev => ({ ...prev, [s.toLowerCase()]: s }));
                                    setSuggestions([]);
                                }}
                                className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer"
                             >
                                {s}
                             </div>
                         ))}
                     </div>
                 )}
               </div>

               <div>
                 <input 
                    value={part.article}
                    onChange={(e) => updatePart(part.id, 'article', e.target.value)}
                    placeholder="Артикул"
                    className={inputClass}
                 />
               </div>

               <div>
                  <input 
                    value={part.uom}
                    onChange={(e) => updatePart(part.id, 'uom', e.target.value)}
                    className={`${inputClass} text-center`}
                  />
               </div>

               <div className="flex justify-center">
                  <input 
                    type="number"
                    min="0"
                    step="0.1"
                    value={part.quantity}
                    onChange={(e) => updatePart(part.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className={`${inputClass} text-center font-bold`}
                  />
               </div>

               <div className="flex justify-center">
                   <ImageUploader 
                       currentUrl={part.photoUrl} 
                       onUpload={(url) => updatePart(part.id, 'photoUrl', url)} 
                       compact
                   />
               </div>
               
               <button 
                  onClick={() => removePart(part.id)}
                  className="absolute -right-12 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
               >
                 <Trash2 size={16} />
               </button>
            </div>
          );
        })}

        <button 
          onClick={addPart}
          className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 uppercase tracking-widest"
        >
          <Plus size={14} /> Добавить позицию
        </button>
      </div>
    </section>
  );
};
