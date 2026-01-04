import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import { Part } from './types';

interface PartsListProps {
  parts: Part[];
  setParts: (parts: Part[]) => void;
}

export const PartsList: React.FC<PartsListProps> = ({ parts, setParts }) => {
  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', type: 'Оригинал', quantity: 1 }]);
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
        <div className="grid grid-cols-12 gap-2 px-2">
          <div className={`${headerClass} text-center`}>#</div>
          <div className={`${headerClass} col-span-3`}>Наименование</div>
          <div className={`${headerClass} col-span-2`}>Бренд</div>
          <div className={`${headerClass} col-span-2`}>Артикул</div>
          <div className={`${headerClass} col-span-2`}>Тип</div>
          <div className={`${headerClass} col-span-1 text-center`}>Ед.</div>
          <div className={`${headerClass} col-span-1 text-center`}>Кол-во</div>
        </div>

        {parts.map((part, idx) => (
          <div key={part.id} className="group relative grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-indigo-300 transition-colors">
             <div className="col-span-1 text-center text-slate-400 text-xs font-medium">{idx + 1}</div>
             <div className="col-span-3">
               <input 
                  value={part.name}
                  onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                  placeholder="Наименование"
                  className={inputClass}
               />
             </div>
             <div className="col-span-2">
               <input 
                  value={part.brand}
                  onChange={(e) => updatePart(part.id, 'brand', e.target.value)}
                  placeholder="Бренд"
                  className={inputClass}
               />
             </div>
             <div className="col-span-2">
               <input 
                  value={part.article}
                  onChange={(e) => updatePart(part.id, 'article', e.target.value)}
                  placeholder="Артикул"
                  className={inputClass}
               />
             </div>
             <div className="col-span-2">
               <select 
                  value={part.type}
                  onChange={(e) => updatePart(part.id, 'type', e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer shadow-sm"
                >
                 <option>Оригинал</option>
                 <option>Аналог</option>
               </select>
             </div>
             <div className="col-span-1">
                <input 
                  value={part.uom}
                  onChange={(e) => updatePart(part.id, 'uom', e.target.value)}
                  className={`${inputClass} text-center`}
                />
             </div>
             <div className="col-span-1 flex justify-center">
                <input 
                  type="number"
                  min="0"
                  step="0.1"
                  value={part.quantity}
                  onChange={(e) => updatePart(part.id, 'quantity', parseFloat(e.target.value) || 0)}
                  className={`${inputClass} text-center font-bold`}
                />
             </div>
             
             <button 
                onClick={() => removePart(part.id)}
                className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
             >
               <Trash2 size={16} />
             </button>
          </div>
        ))}

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
