import React, { useState, useEffect } from 'react';
import { Trash2, Plus, CheckCircle, AlertTriangle, Loader2, RefreshCw } from 'lucide-react';
import { Part } from './types';
import { FileDropzone } from '../shared/FileDropzone';
import { SupabaseService } from '../../services/supabaseService';

interface PartsListProps {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  onAddBrand: (name: string) => void;
  onValidationChange?: (isValid: boolean) => void; // Коллбэк для валидации
  requiredFields?: any;
  highlightedFields?: Set<string>;
  blinkTrigger?: number;
}

export const PartsList: React.FC<PartsListProps> = ({ parts, setParts, onAddBrand, onValidationChange, requiredFields = {}, highlightedFields = new Set(), blinkTrigger = 0 }) => {
  const [activeBrandInput, setActiveBrandInput] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  
  // Кэш проверенных брендов: { "makita": "Makita" } или { "unknown": null }
  const [brandCache, setBrandCache] = useState<Record<string, string | null>>({});
  const [validating, setValidating] = useState<Set<number>>(new Set());

  // Helper for animation
  const getHighlightClass = (partId: number, field: string) => {
      if (highlightedFields.has(`part_${partId}_${field}`)) {
          return 'ring-2 ring-red-500 bg-red-50 animate-[pulse_0.5s_ease-in-out_1]';
      }
      return '';
  };

  // Эффект: уведомляем родителя об изменении общей валидности брендов
  useEffect(() => {
    if (!onValidationChange) return;
    
    const allValid = parts.every(part => {
        const brandValue = part.brand?.trim() || '';
        if (!brandValue) return false;
        
        const dbName = brandCache[brandValue.toLowerCase()];
        const isStrictMatch = (dbName !== undefined && dbName !== null && dbName === brandValue) || part.isNewBrand;
        return isStrictMatch;
    });

    onValidationChange(allValid);
  }, [parts, brandCache, onValidationChange]);

  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePart = (id: number, field: keyof Part, value: any) => {
    setParts(parts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  const updatePartFields = (id: number, updates: Partial<Part>) => {
    setParts(parts.map(part => part.id === id ? { ...part, ...updates } : part));
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
          <div className={headerClass}>Наименование {requiredFields.name && <span className="text-red-500">*</span>}</div>
          <div className={headerClass}>Бренд {requiredFields.brand && <span className="text-red-500">*</span>}</div>
          <div className={headerClass}>Артикул {requiredFields.article && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Ед. {requiredFields.uom && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Кол-во {requiredFields.quantity && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Фото {requiredFields.photos && <span className="text-red-500">*</span>}</div>
        </div>

        {parts.map((part, idx) => {
          const brandValue = part.brand?.trim() || '';
          const dbName = brandCache[brandValue.toLowerCase()];
          const isChecking = validating.has(part.id);
          
          // 1. Строгое совпадение (Зеленое)
          // Либо текст совпадает с базой (с учетом регистра), либо нажат флаг "Новый бренд"
          const isStrictMatch = (dbName !== undefined && dbName !== null && dbName === brandValue) || part.isNewBrand;
          
          // 2. Нестрогое совпадение / Подсказки (Желтое)
          // Есть в базе, но регистр не тот, ИЛИ бренда нет, но есть поисковые подсказки
          const isNonStrictMatch = (!isStrictMatch && dbName !== undefined && dbName !== null && dbName !== brandValue) || 
                                   (!isStrictMatch && !dbName && suggestions.length > 0 && activeBrandInput === part.id);

          // 3. Ошибка / Нет совпадений (Красное)
          // Бренда нет в базе, подсказок нет, и не нажат флаг "Новый бренд"
          const isError = brandValue.length > 0 && !isStrictMatch && !isNonStrictMatch && !isChecking;

          const needsFix = dbName && dbName !== brandValue && !part.isNewBrand;

          return (
            <div key={part.id} className="group relative grid grid-cols-[30px_4fr_2fr_3fr_1fr_1fr_1fr] gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-indigo-300 transition-colors">
               <div className="text-center text-slate-400 text-xs font-medium">{idx + 1}</div>
               
               <div>
                 <input 
                    key={`name_${part.id}_${blinkTrigger}`}
                    value={part.name}
                    onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                    placeholder="Наименование"
                    className={`${inputClass} ${getHighlightClass(part.id, 'name')}`}
                 />
               </div>

               {/* Brand Input */}
               <div className="relative">
                 <input 
                    key={`brand_${part.id}_${blinkTrigger}`}
                    value={part.brand}
                    onChange={(e) => {
                        updatePart(part.id, 'brand', e.target.value);
                        if (part.isNewBrand) updatePart(part.id, 'isNewBrand', false); // Сбрасываем флаг при редактировании
                    }}
                    onFocus={() => setActiveBrandInput(part.id)}
                    onBlur={() => setTimeout(() => setActiveBrandInput(null), 200)}
                    placeholder="Бренд"
                    className={`${inputClass} pr-8
                        ${isError ? 'border-red-500 bg-red-50 text-red-700' : ''}
                        ${isNonStrictMatch ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                        ${isStrictMatch ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : ''}
                        ${getHighlightClass(part.id, 'brand')}
                    `}
                 />
                 
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {isChecking && <Loader2 size={12} className="animate-spin text-slate-400" />}
                    {isStrictMatch && <CheckCircle size={14} className="text-emerald-500" />}
                    {isNonStrictMatch && <AlertTriangle size={14} className="text-yellow-500" />}
                    {needsFix && (
                        <button 
                            onClick={() => updatePart(part.id, 'brand', dbName)}
                            className="text-amber-500 hover:text-amber-600 transition-all hover:rotate-180"
                            title={`Найдено: ${dbName}. Нажмите для исправления регистра.`}
                        >
                            <RefreshCw size={14} />
                        </button>
                    )}
                    {(isError || isNonStrictMatch) && !part.isNewBrand && (
                        <button 
                            onClick={() => updatePart(part.id, 'isNewBrand', true)}
                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                            title="Добавить как новый бренд"
                        >
                            <Plus size={14} />
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
                    className={`${inputClass} ${getHighlightClass(part.id, 'article')}`}
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
                    min="1"
                    step="1"
                    value={part.quantity}
                    onKeyDown={(e) => {
                        if (e.key === '.' || e.key === ',') e.preventDefault();
                    }}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        updatePart(part.id, 'quantity', isNaN(val) ? 1 : val);
                    }}
                    className={`${inputClass} text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getHighlightClass(part.id, 'quantity')}`}
                  />
               </div>

               <div className="flex justify-center px-2">
                                     <div className="h-[34px] w-full flex items-center justify-center bg-white rounded border border-gray-300 overflow-hidden">
                                         <FileDropzone 
                                             files={part.itemFiles || (part.photoUrl ? [{name: 'Фото', url: part.photoUrl, type: 'image/jpeg'}] : [])} 
                                             onUpdate={(files) => {
                                                 updatePartFields(part.id, {
                                                     itemFiles: files,
                                                     photoUrl: files.length > 0 ? files[0].url : ''
                                                 });
                                             }} 
                                             compact
                                         />
                                     </div>
                  
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
