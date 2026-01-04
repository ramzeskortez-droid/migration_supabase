import React from 'react';
import { Ban, AlertCircle, Copy } from 'lucide-react';

interface BuyerItemCardProps {
  item: any;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  isDisabled: boolean;
  orderId: string;
}

export const BuyerItemCard: React.FC<BuyerItemCardProps> = ({ item, index, onUpdate, isDisabled, orderId }) => {
  
  const isUnavailable = item.offeredQuantity === 0;
  const isWinner = item.rank === 'ЛИДЕР' || item.rank === 'LEADER';
  
  // Flash state for validation feedback
  const [flashField, setFlashField] = React.useState<string | null>(null);

  const handleNumInput = (raw: string, field: string, max?: number) => {
      if (isDisabled) return;
      const digits = raw.replace(/[^\d.]/g, ''); 
      let val = parseFloat(digits) || 0;
      
      // Enforce Limits
      let limit = max;
      if (!limit) {
          if (field === 'BuyerPrice') limit = 1000000;
          if (field === 'weight') limit = 1000;
          if (field === 'deliveryWeeks') limit = 52;
      }

      if (limit && val > limit) {
          val = limit;
          // Trigger Flash
          setFlashField(field);
          setTimeout(() => setFlashField(null), 300);
      }
      
      onUpdate(index, field, val);
  };

  const getInputClass = (field: string) => {
      const base = "w-full text-center font-bold text-[10px] border rounded-lg py-1.5 outline-none transition-all duration-300";
      if (isDisabled) return `${base} bg-slate-50 border-slate-200`;
      if (flashField === field) return `${base} bg-red-100 border-red-400 text-red-600`; // Flash style
      if (field === 'BuyerPrice') return `${base} bg-white border-slate-200 focus:border-indigo-500 font-black`;
      return `${base} bg-white border-slate-200 focus:border-indigo-500`;
  };

  const toggleUnavailable = () => {
      if (isDisabled) return;
      const newVal = item.offeredQuantity === 0 ? (item.quantity || 1) : 0;
      onUpdate(index, 'offeredQuantity', newVal);
  };

  return (
    <div className={`flex flex-col gap-3 border rounded-xl p-3 transition-all ${isWinner ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100' : 'bg-slate-50/30 border-slate-100'}`}>
        <div className="flex flex-col md:flex-row justify-between gap-2">
            <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <h4 className={`font-black text-[11px] uppercase transition-all ${isUnavailable ? 'line-through text-red-400' : 'text-slate-900'}`}>
                        {item.AdminName || item.name}
                    </h4>
                    {isWinner && <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm">Выбрано</span>}
                    {isUnavailable && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Нет в наличии</span>}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{item.category}</span>
                    <span className="text-[9px] font-black bg-white/80 px-2 rounded border border-slate-100">Нужно: {item.quantity} шт</span>
                </div>
            </div>
            {item.adminComment && (
                <div className="md:max-w-[250px] bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[9px] text-amber-800 flex items-start gap-2 shadow-sm">
                    <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                    <div><span className="font-black uppercase text-[7px] block mb-0.5 opacity-70">Комментарий менеджера:</span>{item.adminComment}</div>
                </div>
            )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
            <div className="flex items-end gap-2">
                <button onClick={toggleUnavailable} disabled={isDisabled} className={`mb-[1px] p-2 rounded-lg border transition-all ${isUnavailable ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200'}`}><Ban size={14} /></button>
                <div className="flex-grow space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Кол-во</label><input type="text" disabled={isDisabled} value={item.offeredQuantity ?? item.quantity} onChange={e => handleNumInput(e.target.value, 'offeredQuantity', item.quantity)} className={getInputClass('offeredQuantity')} /></div>
            </div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Цена (¥)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.BuyerPrice || ''} onChange={e => handleNumInput(e.target.value, 'BuyerPrice')} className={getInputClass('BuyerPrice')} placeholder="0" /></div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Вес (кг)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.weight || ''} onChange={e => handleNumInput(e.target.value, 'weight')} className={getInputClass('weight')} placeholder="0.0" /></div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Срок (нед)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.deliveryWeeks || ''} onChange={e => handleNumInput(e.target.value, 'deliveryWeeks')} className={getInputClass('deliveryWeeks')} placeholder="1" /></div>
            <div className="col-span-2 md:col-span-1 space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Ссылка на фото (URL)</label><div className="relative"><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? '' : item.photoUrl || ''} onChange={e => onUpdate(index, 'photoUrl', e.target.value)} className="w-full pl-7 pr-2 font-bold text-[10px] border border-slate-200 rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500 transition-all" placeholder="http..." /><Copy size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
        </div>

        {/* НОВОЕ ПОЛЕ: Комментарий поставщика */}
        <div className="space-y-1">
            <label className="text-[7px] font-bold text-slate-400 uppercase block">Комментарий к позиции</label>
            <input 
                type="text" 
                disabled={isDisabled || isUnavailable} 
                value={isUnavailable ? '' : item.comment || ''} 
                onChange={e => onUpdate(index, 'comment', e.target.value)} 
                className="w-full px-3 font-bold text-[9px] border border-slate-200 rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500 transition-all text-slate-600 shadow-inner uppercase" 
                placeholder="Уточнения по бренду, состоянию и т.д..."
                maxLength={100}
            />
        </div>
    </div>
  );
};
