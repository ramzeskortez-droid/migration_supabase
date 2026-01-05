import React from 'react';
import { Ban, AlertCircle } from 'lucide-react';
import { ImageUploader } from '../shared/ImageUploader';

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
  
  const [flashField, setFlashField] = React.useState<string | null>(null);

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
      if (limit && val > limit) {
          val = limit;
          setFlashField(field);
          setTimeout(() => setFlashField(null), 300);
      }
      onUpdate(index, field, val);
  };

  const getInputClass = (field: string) => {
      const base = "w-full text-center font-bold text-[10px] border rounded-lg py-1.5 outline-none transition-all duration-300";
      if (isDisabled) return `${base} bg-slate-50 border-slate-200`;
      if (flashField === field) return `${base} bg-red-100 border-red-400 text-red-600`; 
      if (field === 'BuyerPrice') return `${base} bg-white border-slate-200 focus:border-indigo-500 font-black`;
      return `${base} bg-white border-slate-200 focus:border-indigo-500`;
  };

  const toggleUnavailable = () => {
      if (isDisabled) return;
      const newVal = item.offeredQuantity === 0 ? (item.quantity || 1) : 0;
      onUpdate(index, 'offeredQuantity', newVal);
  };

  // ДАННЫЕ ЗАЯВКИ (ОТ ОПЕРАТОРА)
  // Теперь берем строго из полей БД. Если их нет (старые заказы) - показываем прочерк.
  // Фоллбэк на парсинг убираем, чтобы не путать данные.
  const opBrand = item.brand || '-';
  const opArticle = item.article || '-';
  const opUom = item.uom || 'шт';
  const opPhoto = item.opPhotoUrl; // Changed from photoUrl

  return (
    <div className={`flex flex-col gap-3 border rounded-xl p-3 transition-all ${isWinner ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100' : 'bg-slate-50/30 border-slate-100'}`}>
        
        {/* БЛОК ЗАЯВКИ (READONLY) */}
        <div className="grid grid-cols-[30px_4fr_2fr_3fr_1fr_1fr_1fr] gap-2 items-center pb-3 border-b border-slate-200/50">
            <div className="text-center text-slate-400 text-xs font-medium">#{index + 1}</div>
            
            <div>
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Наименование</span>
                <span className={`font-black text-[11px] uppercase ${isUnavailable ? 'line-through text-red-400' : 'text-slate-900'}`}>
                    {item.AdminName || item.name}
                </span>
            </div>

            <div>
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Бренд</span>
                <span className="font-bold text-slate-700 text-[10px] uppercase">{opBrand}</span>
            </div>

            <div>
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Артикул</span>
                <span className="font-bold text-slate-600 text-[10px]">{opArticle}</span>
            </div>

            <div className="text-center">
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Ед.</span>
                <span className="text-[10px] font-medium text-slate-500">{opUom}</span>
            </div>

            <div className="text-center">
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Кол-во</span>
                <span className="text-[10px] font-black bg-white px-1.5 py-0.5 rounded border border-slate-200">{item.quantity}</span>
            </div>

            <div className="text-center">
                <span className="block text-[7px] font-bold text-slate-400 uppercase mb-0.5">Фото</span>
                {opPhoto ? (
                    <a href={opPhoto} target="_blank" rel="noreferrer" className="text-[18px] hover:scale-110 transition-transform block">📷</a>
                ) : (
                    <span className="text-slate-300">-</span>
                )}
            </div>
        </div>

        {/* СТАТУС ПОЗИЦИИ */}
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
                {isWinner && <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] font-black uppercase shadow-sm">ВЫ ВЫИГРАЛИ ЭТУ ПОЗИЦИЮ</span>}
                {isUnavailable && <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded text-[8px] font-black uppercase">Вы отказались</span>}
            </div>
            {item.adminComment && (
                <div className="bg-amber-50 border border-amber-100 px-2 py-1 rounded text-[9px] text-amber-800 flex items-center gap-1">
                    <AlertCircle size={10} className="text-amber-500" />
                    <span className="font-bold">Менеджер:</span> {item.adminComment}
                </div>
            )}
        </div>

        {/* БЛОК ОФФЕРА (INPUTS) */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end bg-white p-2 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-end gap-2">
                <button onClick={toggleUnavailable} disabled={isDisabled} className={`mb-[1px] p-2 rounded-lg border transition-all ${isUnavailable ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200'}`} title={isUnavailable ? "Вернуть в работу" : "Нет в наличии"}><Ban size={14} /></button>
                <div className="flex-grow space-y-1"><label className="text-[7px] font-bold text-indigo-400 uppercase block">Предложить кол-во</label><input type="text" disabled={isDisabled} value={item.offeredQuantity ?? item.quantity} onChange={e => handleNumInput(e.target.value, 'offeredQuantity', item.quantity)} className={getInputClass('offeredQuantity')} /></div>
            </div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Цена (¥)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.BuyerPrice || ''} onChange={e => handleNumInput(e.target.value, 'BuyerPrice')} className={getInputClass('BuyerPrice')} placeholder="0" /></div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Вес (кг)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.weight || ''} onChange={e => handleNumInput(e.target.value, 'weight')} className={getInputClass('weight')} placeholder="0.0" /></div>
            <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Срок (нед)</label><input type="text" disabled={isDisabled || isUnavailable} value={isUnavailable ? 0 : item.deliveryWeeks || ''} onChange={e => handleNumInput(e.target.value, 'deliveryWeeks')} className={getInputClass('deliveryWeeks')} placeholder="1" /></div>
            
            <div className="col-span-2 md:col-span-1 space-y-1">
                <label className="text-[7px] font-bold text-slate-400 uppercase block">Ваше фото</label>
                <div className={isDisabled || isUnavailable ? 'opacity-50 pointer-events-none' : ''}>
                    <ImageUploader 
                        currentUrl={item.photoUrl} 
                        onUpload={(url) => onUpdate(index, 'photoUrl', url)} 
                        folder="offers"
                        compact
                    />
                </div>
            </div>
        </div>

        {/* Комментарий поставщика */}
        <div className="space-y-1 px-2 pb-1">
            <input 
                type="text" 
                disabled={isDisabled || isUnavailable} 
                value={isUnavailable ? '' : item.comment || ''} 
                onChange={e => onUpdate(index, 'comment', e.target.value)} 
                className="w-full px-0 border-b border-dashed border-slate-300 py-1 bg-transparent outline-none focus:border-indigo-500 transition-all text-[10px] text-slate-600 placeholder:text-slate-300" 
                placeholder="Добавить комментарий для менеджера..."
                maxLength={100}
            />
        </div>
    </div>
  );
};