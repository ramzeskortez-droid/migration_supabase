import React from 'react';
import { Ban, AlertCircle, Copy, XCircle } from 'lucide-react';
import { FileDropzone } from '../shared/FileDropzone';

interface BuyerItemCardProps {
  item: any;
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  isDisabled: boolean;
  orderId: string;
  bestStats?: { bestPrice: number | null, bestWeeks: number | null } | null;
  onCopy?: (item: any, index: number) => void;
  isRequired?: boolean;
}

export const BuyerItemCard: React.FC<BuyerItemCardProps> = ({ item, index, onUpdate, isDisabled, orderId, bestStats, onCopy, isRequired }) => {
  
  const isUnavailable = item.offeredQuantity === 0;
  const isWinner = item.rank === 'ЛИДЕР' || item.rank === 'LEADER';
  
  const handleNumInput = (raw: string, field: string, max?: number) => {
      if (isDisabled) return;
      const digits = raw.replace(/[^\d.]/g, ''); 
      let val = parseFloat(digits) || 0;
      
      let limit = max;
      if (!limit) {
          if (field === 'BuyerPrice') limit = 1000000;
          if (field === 'weight') limit = 1000;
          if (field === 'deliveryWeeks') limit = 52;
      }

      if (limit && val > limit) val = limit;
      onUpdate(index, field, val);
  };

  const toggleUnavailable = () => {
      if (isDisabled) return;
      const newVal = item.offeredQuantity === 0 ? (item.quantity || 1) : 0;
      onUpdate(index, 'offeredQuantity', newVal);
  };

  const opBrand = item.brand || '-';
  const opArticle = item.article || '-';
  const opUom = item.uom || 'шт';
  const opPhoto = item.opPhotoUrl;

  const getInputClass = (field: string) => {
      const base = "w-full text-center font-bold text-xs bg-white border border-gray-200 rounded md:rounded-lg py-1.5 md:py-2 px-1 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all";
      if (isDisabled) return `${base} bg-gray-100 text-gray-500 border-gray-200`;
      
      if (field === 'deliveryWeeks' && (item.deliveryWeeks || 0) > 0 && (item.deliveryWeeks || 0) < 4) {
          return `${base} border-rose-300 text-rose-600 focus:border-rose-500`;
      }
      return base;
  };

  return (
    <div className={`mb-6 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm transition-all relative ${isWinner ? 'ring-2 ring-emerald-500 shadow-md' : ''} ${isUnavailable ? 'border-red-200' : ''}`}>
        
        {/* 1. ИНФО ОПЕРАТОРА */}
        <div className="grid grid-cols-[40px_1fr_100px_100px_60px_60px_60px] gap-4 px-6 py-4 items-center bg-white border-b border-gray-100">
            <div className={`text-sm font-mono font-bold text-center ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-400'}`}>#{index + 1}</div>
            
            <div className="flex flex-col">
                <span className={`font-black text-sm uppercase ${isUnavailable ? 'text-red-500 line-through' : 'text-gray-800'}`}>
                    {item.AdminName || item.name}
                </span>
                {item.adminComment && (
                    <div className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded mt-1 w-fit">
                        Менеджер: {item.adminComment}
                    </div>
                )}
            </div>

            <div className={`text-xs font-bold uppercase truncate ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-600'}`} title={opBrand}>{opBrand}</div>
            <div className={`text-xs font-mono truncate ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-500'}`} title={opArticle}>{opArticle}</div>
            <div className={`text-xs font-black text-center py-1 rounded ${isUnavailable ? 'text-red-500 line-through bg-red-50' : 'text-gray-800 bg-gray-100'}`}>{item.quantity}</div>
            <div className={`text-[10px] font-bold text-center uppercase ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-400'}`}>{opUom}</div>
            
            <div className="flex justify-center">
                {opPhoto ? (
                    <a href={opPhoto} target="_blank" rel="noreferrer" className={`w-10 h-8 rounded border overflow-hidden hover:opacity-80 block shadow-sm transition-all ${isUnavailable ? 'grayscale opacity-40 border-red-200' : 'border-gray-200'}`}>
                        <img src={opPhoto} className="w-full h-full object-cover" alt="" />
                    </a>
                ) : (
                    <span className="text-gray-200 text-[10px]">-</span>
                )}
            </div>
        </div>

        {/* КОНТЕЙНЕР НИЖНЕЙ ЧАСТИ С ОВЕРЛЕЕМ ПРИ ОТКАЗЕ */}
        <div className="relative">
            {/* 2. БЛОК ЗАКУПЩИКА */}
            <div className={`mx-6 mt-4 mb-4 rounded-lg overflow-hidden border border-slate-200 ${isUnavailable ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
                <div className="bg-slate-900 px-4 py-1.5 grid grid-cols-[80px_80px_1fr_80px_80px_1fr] gap-4 items-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Действия</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Кол-во</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Цена (¥) {bestStats?.bestPrice && <span className="text-emerald-400 ml-1">BEST: {bestStats.bestPrice}</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Вес (кг)</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Срок (нед) {bestStats?.bestWeeks && <span className="text-blue-400 ml-1">BEST: {bestStats.bestWeeks}</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Ваши файлы</div>
                </div>

                <div className="bg-slate-50 px-4 py-3 grid grid-cols-[80px_80px_1fr_80px_80px_1fr] gap-4 items-center">
                    <div className="flex items-center gap-1 justify-center">
                        {onCopy && !isDisabled && (
                            <button 
                                onClick={() => onCopy(item, index)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-white rounded-lg transition-colors"
                                title="Копировать"
                            >
                                <Copy size={16} />
                            </button>
                        )}
                        <button 
                            onClick={toggleUnavailable} 
                            disabled={isDisabled} 
                            className={`p-2 rounded-lg transition-colors border border-transparent ${isUnavailable ? 'bg-red-600 text-white shadow-lg shadow-red-900/50' : 'text-slate-400 hover:text-red-500 hover:bg-white hover:border-slate-200'}`} 
                            title={isUnavailable ? "Вернуть" : "Отказаться"}
                        >
                            <Ban size={14} />
                        </button>
                    </div>

                    <input disabled={isDisabled || isUnavailable} value={item.offeredQuantity ?? item.quantity} onChange={e => handleNumInput(e.target.value, 'offeredQuantity', item.quantity)} className={getInputClass('offeredQuantity')} />
                    <input disabled={isDisabled || isUnavailable} value={item.BuyerPrice || ''} onChange={e => handleNumInput(e.target.value, 'BuyerPrice')} className={getInputClass('BuyerPrice')} placeholder="0" />
                    <input disabled={isDisabled || isUnavailable} value={item.weight || ''} onChange={e => handleNumInput(e.target.value, 'weight')} className={getInputClass('weight')} placeholder="0.0" />
                    <input disabled={isDisabled || isUnavailable} value={item.deliveryWeeks || ''} onChange={e => handleNumInput(e.target.value, 'deliveryWeeks')} className={getInputClass('deliveryWeeks')} placeholder="Min 4" />

                    <div className="h-[34px] flex items-center justify-center bg-white rounded border border-gray-300 overflow-hidden">
                        <FileDropzone files={item.itemFiles || (item.photoUrl ? [{name: 'Фото', url: item.photoUrl, type: 'image/jpeg'}] : [])} onUpdate={(files) => onUpdate(index, 'itemFiles', files)} compact />
                    </div>
                </div>
            </div>

        {/* 3. ДОП ИНФО (Комментарий и Поставщик) */}
        <div className={`px-6 pb-4 bg-white grid grid-cols-2 gap-4 ${isUnavailable ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
            <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">Комментарий / Замена / Аналог</label>
                <input 
                    disabled={isDisabled || isUnavailable} 
                    value={item.comment || ''} 
                    onChange={e => onUpdate(index, 'comment', e.target.value)} 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-gray-700 placeholder:text-gray-400 focus:border-indigo-500 focus:bg-white outline-none transition-colors" 
                    placeholder="Ваш комментарий..." 
                />
            </div>
            
            <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                    Название и номер поставщика
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    <input 
                        disabled={isDisabled || isUnavailable} 
                        value={item.supplierSku || ''} 
                        onChange={e => onUpdate(index, 'supplierSku', e.target.value)} 
                        className={`w-full bg-white border border-slate-200 rounded-lg py-2 px-3 text-xs outline-none focus:border-indigo-500 transition-all ${isRequired && !item.supplierSku ? 'border-red-300 bg-red-50' : ''}`} 
                        placeholder="Напр: Ли / #123-45" 
                    />
                </div>
            </div>
        </div>

            {/* ОВЕРЛЕЙ ОТКАЗА */}
            {isUnavailable && (
                <div className="absolute inset-0 bg-white/60 backdrop-blur-[2px] flex items-center justify-center z-20 animate-in fade-in duration-300 cursor-pointer" onClick={toggleUnavailable}>
                    <div className="bg-red-600 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-red-200 flex flex-col items-center gap-2 transform -rotate-1 border-4 border-white">
                        <XCircle size={32} />
                        <span className="font-black uppercase tracking-tighter text-sm text-center">нажмите, чтобы вернуться в работу</span>
                    </div>
                </div>
            )}
        </div>
    </div>
  );
};
