import React, { useState } from 'react';
import { Trash2, Plus, CheckCircle, AlertTriangle } from 'lucide-react';
import { Part } from './types';
import { ImageUploader } from '../shared/ImageUploader'; // Import

interface PartsListProps {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  brandsList: string[];
  onAddBrand: (name: string) => void;
}

// ... (getLevenshteinDistance function)

export const PartsList: React.FC<PartsListProps> = ({ parts, setParts, brandsList, onAddBrand }) => {
  const [activeBrandInput, setActiveBrandInput] = useState<number | null>(null);

  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePart = (id: number, field: keyof Part, value: string | number) => {
    setParts(parts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  const inputClass = "w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 placeholder:text-xs text-slate-700 shadow-sm";
  const headerClass = "col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800">Список позиций</h2>
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
          const safeBrandsList = brandsList || [];
          const normalizedInput = (part.brand || '').trim().toLowerCase();
          const exactMatch = normalizedInput && safeBrandsList.some(b => b.toLowerCase() === normalizedInput);
          
          let similarBrands: string[] = [];
          if (!exactMatch && normalizedInput.length > 2) {
              similarBrands = safeBrandsList.filter(b => {
                  const dist = getLevenshteinDistance(b.toLowerCase(), normalizedInput);
                  // Allow distance 1 for len>2, 2 for len>4
                  const threshold = normalizedInput.length > 4 ? 2 : 1;
                  return dist <= threshold;
              }).slice(0, 5);
          }

          const isWarning = !exactMatch && similarBrands.length > 0;
          const isError = !exactMatch && similarBrands.length === 0 && normalizedInput.length > 0;

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
               <div className="relative group/brand">
                 <input 
                    value={part.brand}
                    onChange={(e) => updatePart(part.id, 'brand', e.target.value)}
                    onFocus={() => setActiveBrandInput(part.id)}
                    onBlur={() => setTimeout(() => setActiveBrandInput(null), 200)}
                    placeholder="Бренд"
                    className={`${inputClass} pr-8 transition-colors
                        ${isError ? 'border-red-500 bg-red-50 text-red-700' : ''}
                        ${isWarning ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                    `}
                 />
                 
                 {/* Icons */}
                 {isError && (
                     <button 
                        onClick={() => onAddBrand(part.brand)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-green-500 hover:text-green-600 transition-colors z-10"
                        title="Добавить бренд в базу"
                     >
                        <CheckCircle size={16} />
                     </button>
                 )}
                 {isWarning && (
                     <div className="absolute right-2 top-1/2 -translate-y-1/2 text-yellow-500 cursor-help" title="Есть похожие варианты">
                        <AlertTriangle size={16} />
                     </div>
                 )}

                 {/* Similar Brands Dropdown */}
                 {isWarning && activeBrandInput === part.id && (
                     <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                         <div className="px-2 py-1 bg-yellow-50 text-[9px] font-bold text-yellow-700 uppercase tracking-wider">
                             Возможно вы искали:
                         </div>
                         {similarBrands.map(suggestion => (
                             <div 
                                key={suggestion}
                                onClick={() => updatePart(part.id, 'brand', suggestion)}
                                className="px-3 py-2 text-xs font-medium text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer transition-colors"
                             >
                                {suggestion}
                             </div>
                         ))}
                         <div 
                            className="px-3 py-2 text-[10px] text-slate-400 border-t border-slate-100 italic cursor-pointer hover:bg-slate-50"
                            onClick={() => onAddBrand(part.brand)}
                         >
                            Нет, добавить как новый
                         </div>
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

               {/* Image Uploader */}
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
          className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus size={14} /> ДОБАВИТЬ ПОЗИЦИЮ
        </button>
      </div>
    </section>
  );
};