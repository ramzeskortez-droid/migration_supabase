import React, { useCallback, useState } from 'react';
import { Ban, AlertCircle, Copy, XCircle, FileText, FileImage, UploadCloud, ShieldCheck, MoreVertical, Trophy } from 'lucide-react';
import { FileDropzone } from '../shared/FileDropzone';
import { useDropzone } from 'react-dropzone';
import { SupabaseService } from '../../services/supabaseService';
import { useOfficialBrands } from '../../hooks/useOfficialBrands';

interface BuyerItemCardProps {
  item: any;
  sourceItem?: any; // Данные из БД (readonly)
  index: number;
  onUpdate: (index: number, field: string, value: any) => void;
  isDisabled: boolean;
  orderId: string;
  bestStats?: { bestPrice: number | null, bestWeeks: number | null } | null;
  onCopy?: (item: any, index: number) => void;
  requiredFields?: any;
  onToggleStatus?: () => void;
}

export const BuyerItemCard: React.FC<BuyerItemCardProps> = ({ item, sourceItem, index, onUpdate, isDisabled, orderId, bestStats, onCopy, requiredFields = {}, onToggleStatus }) => {
  const { data: officialBrands } = useOfficialBrands();
  const [showMenu, setShowMenu] = useState(false);
  
  const req = requiredFields as any; 
  
  const isUnavailable = item.offeredQuantity === 0;
  const isWinner = item.rank === 'ЛИДЕР' || item.rank === 'LEADER';
  
  // --- LOCAL DROPZONE LOGIC ---
  const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[], event: any) => {
      if (isDisabled || isUnavailable) return;
      event.stopPropagation(); 
      
      const newFiles: any[] = [];
      await Promise.all(acceptedFiles.map(async (file) => {
          try {
              const publicUrl = await SupabaseService.uploadFile(file, 'offers');
              newFiles.push({ 
                  name: file.name, 
                  url: publicUrl, 
                  type: file.type, 
                  size: file.size 
              });
          } catch (e) {
              console.error('File upload failed', e);
          }
      }));

      if (newFiles.length > 0) {
          const currentFiles = item.itemFiles || [];
          onUpdate(index, 'itemFiles', [...currentFiles, ...newFiles]);
      }
  }, [isDisabled, isUnavailable, item.itemFiles, index, onUpdate]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
      onDrop,
      noClick: true,
      noKeyboard: true,
      multiple: true,
      disabled: isDisabled || isUnavailable
  });

  // Используем sourceItem для данных оператора, если он есть (приоритет), иначе item
  const displayItem = sourceItem || item;

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
      
      console.log('BuyerItemCard toggleUnavailable. Has onToggleStatus?', !!onToggleStatus);

      if (onToggleStatus) {
          onToggleStatus();
          return;
      }

      const newVal = item.offeredQuantity === 0 ? (item.quantity || 1) : 0;
      onUpdate(index, 'offeredQuantity', newVal);
  };

  const opBrand = displayItem.brand || '-';
  const isOpBrandOfficial = officialBrands?.has(opBrand?.trim().toLowerCase());

  const opArticle = displayItem.article || '-';
  const opUom = displayItem.uom || 'шт';
  const opPhoto = displayItem.opPhotoUrl || displayItem.photoUrl;

  const renderFilesIcon = (files: any[], photoUrl?: string) => {
      const allFiles = files && files.length > 0 ? files : (photoUrl ? [{url: photoUrl, type: 'image/jpeg'}] : []);
      
      if (allFiles.length === 0) return <span className="text-slate-300 text-[10px]">-</span>;

      if (allFiles.length === 1) {
          const file = allFiles[0];
          const isImage = file.type?.startsWith('image/') || file.url.match(/\.(jpeg|jpg|png|webp)$/i);
          return (
              <a href={file.url} target="_blank" rel="noreferrer" className={`hover:opacity-80 transition-opacity block w-8 h-8 rounded border border-gray-300 overflow-hidden shadow-sm flex items-center justify-center ${!isImage ? 'bg-slate-50 text-indigo-500' : ''}`} title={file.name}>
                  {isImage ? (
                      <img src={file.url} alt="Файл" className="w-full h-full object-cover" />
                  ) : (
                      <FileText size={16} />
                  )}
              </a>
          );
      }

      return (
          <div className="relative group cursor-pointer">
              <div className="w-8 h-8 flex items-center justify-center bg-indigo-50 rounded border border-indigo-200 text-indigo-600 font-black text-[10px] shadow-sm">
                  +{allFiles.length}
              </div>
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-[999]">
                  <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2">
                      <div className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-100 pb-1">Файлы ({allFiles.length})</div>
                      <div className="space-y-1">
                          {allFiles.map((f: any, i: number) => (
                              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-[10px] text-indigo-600 truncate block text-left">
                                  {f.type?.startsWith('image/') || f.url.match(/\.(jpeg|jpg|png|webp)$/i) ? <FileImage size={12}/> : <FileText size={12}/>}
                                  <span className="truncate">{f.name || `Файл ${i+1}`}</span>
                              </a>
                          ))}
                      </div>
                  </div>
              </div>
          </div>
      );
  };

  // Determine requirement status: fields become mandatory ONLY if price is entered
  const hasPrice = item.BuyerPrice > 0;
  
  const isReqPrice = false; // Price is the trigger, it shouldn't show as "error" if empty
  const isReqWeight = hasPrice && (req.weight !== false);
  const isReqWeeks = hasPrice && (req.delivery_weeks !== false);
  const isReqQty = hasPrice && (req.quantity === true);
  const isReqComment = hasPrice && (req.comment === true);
  const isReqSku = hasPrice && (req.supplier_sku === true);
  const isReqImages = hasPrice && (req.images === true);

  const getInputClass = (field: string, value: any) => {
      const base = "w-full text-center font-bold text-xs bg-white border border-gray-200 rounded md:rounded-lg py-1.5 md:py-2 px-1 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all";
      if (isDisabled) return `${base} bg-gray-100 text-gray-500 border-gray-200`;
      
      let isInvalid = false;
      if (field === 'BuyerPrice' && isReqPrice && (!value || value <= 0)) isInvalid = true;
      if (field === 'weight' && isReqWeight && (!value || value <= 0)) isInvalid = true;
      if (field === 'deliveryWeeks' && isReqWeeks && (!value || value < 1)) isInvalid = true;
      if (field === 'offeredQuantity' && isReqQty && (!value || value <= 0)) isInvalid = true;

      if (isInvalid) {
          return `${base} border-red-300 bg-red-50 focus:border-red-500`;
      }
      return base;
  };

  return (
    <div 
        {...getRootProps()}
        className={`mb-6 bg-white border border-gray-200 rounded-xl shadow-sm transition-all relative ${isWinner ? 'ring-2 ring-emerald-500 shadow-md' : ''} ${isUnavailable ? 'border-red-200' : ''} ${isDragActive ? 'ring-4 ring-indigo-500 bg-indigo-50/50' : ''}`}
    >
        <input {...getInputProps()} />

        {/* LOCAL DRAG OVERLAY */}
        {isDragActive && (
            <div className="absolute inset-0 z-[200] bg-indigo-600/90 backdrop-blur-sm rounded-xl flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                <UploadCloud size={40} className="text-white animate-bounce" />
                <span className="text-white font-black uppercase text-sm tracking-tighter">Добавить в Позицию #{index + 1}</span>
            </div>
        )}
        
        {/* 1. ИНФО ОПЕРАТОРА */}
        {/* MOBILE VIEW */}
        <div className="md:hidden p-4 bg-white border-b border-gray-100 rounded-t-xl space-y-3">
            <div className="flex justify-between items-start">
                <div className="text-sm font-mono font-bold text-gray-400 flex items-center gap-2">
                    #{index + 1}
                    {isWinner && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[9px] font-black uppercase flex items-center gap-1"><Trophy size={10}/> Лидер</span>}
                </div>
                <div className={`text-xs font-black uppercase truncate flex items-center gap-1 ${isUnavailable ? 'text-red-400 line-through' : (isOpBrandOfficial ? 'text-amber-700 underline decoration-amber-400/50 decoration-2 underline-offset-2' : 'text-indigo-600')}`}>
                    {opBrand}
                    {isOpBrandOfficial && !isUnavailable && <ShieldCheck size={12} className="text-amber-600" />}
                </div>
            </div>

            <div className="flex flex-col gap-1">
                <span className={`font-black text-sm uppercase break-words leading-tight ${isUnavailable ? 'text-red-500 line-through' : 'text-gray-800'}`}>
                    {item.AdminName || item.name}
                </span>
                {item.adminComment && (
                    <div className="text-[10px] text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded w-fit">
                        Менеджер: {item.adminComment}
                    </div>
                )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                <div className="flex gap-3 text-xs text-gray-500">
                    <span className="font-mono bg-slate-50 px-1.5 rounded">{opArticle}</span>
                    <span className="font-bold">{item.quantity} {opUom}</span>
                </div>
                {renderFilesIcon(displayItem.itemFiles, opPhoto)}
            </div>
        </div>

        {/* DESKTOP VIEW */}
        <div className="hidden md:grid grid-cols-[40px_100px_1fr_100px_60px_60px_60px] gap-4 px-6 py-4 items-center bg-white border-b border-gray-100 rounded-t-xl">
            <div className={`text-sm font-mono font-bold text-center flex flex-col items-center justify-center ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-400'}`}>
                #{index + 1}
                {isWinner && <Trophy size={12} className="text-emerald-500 mt-1"/>}
            </div>
            
            <div className={`text-xs font-black uppercase truncate flex items-center gap-1 ${isUnavailable ? 'text-red-400 line-through' : (isOpBrandOfficial ? 'text-amber-700 underline decoration-amber-400/50 decoration-2 underline-offset-2 cursor-help' : 'text-indigo-600')}`} title={isOpBrandOfficial ? "Официальный представитель" : opBrand}>
                {opBrand}
                {isOpBrandOfficial && !isUnavailable && <ShieldCheck size={12} className="text-amber-600 shrink-0" />}
            </div>

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

            <div className={`text-xs font-mono truncate ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-500'}`} title={opArticle}>{opArticle}</div>
            <div className={`text-xs font-black text-center ${isUnavailable ? 'text-red-500 line-through' : 'text-gray-800'}`}>{item.quantity}</div>
            <div className={`text-[10px] font-bold text-center uppercase ${isUnavailable ? 'text-red-400 line-through' : 'text-gray-400'}`}>{opUom}</div>
            
            <div className="flex justify-center">
                {renderFilesIcon(displayItem.itemFiles, opPhoto)}
            </div>
        </div>

        {/* КОНТЕЙНЕР НИЖНЕЙ ЧАСТИ С ОВЕРЛЕЕМ ПРИ ОТКАЗЕ */}

        <div className="relative">
            {/* 2. БЛОК ЗАКУПЩИКА */}
            <div className={`mx-4 md:mx-6 mt-4 mb-4 rounded-lg overflow-hidden border border-slate-200 ${isUnavailable ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
                {/* Desktop Header */}
                <div className="hidden md:grid bg-slate-900 px-4 py-1.5 grid-cols-[80px_80px_1fr_80px_80px_1fr] gap-4 items-center">
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">Действия</div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Кол-во {isReqQty && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Цена (¥) {isReqPrice && <span className="text-red-500 ml-0.5">*</span>} {bestStats?.bestPrice && <span className="text-emerald-400 ml-1">BEST: {bestStats.bestPrice}</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Вес (кг) {isReqWeight && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Срок (нед) {isReqWeeks && <span className="text-red-500 ml-0.5">*</span>} {bestStats?.bestWeeks && <span className="text-blue-400 ml-1">BEST: {bestStats.bestWeeks}</span>}
                    </div>
                    <div className="text-[9px] font-black text-slate-400 uppercase tracking-wider text-center">
                        Ваши файлы {isReqImages && <span className="text-red-500 ml-0.5">*</span>}
                    </div>
                </div>

                <div className="bg-slate-50 px-4 py-3 grid grid-cols-1 md:grid-cols-[80px_80px_1fr_80px_80px_1fr] gap-3 md:gap-4 items-center">
                    
                    {/* Mobile Actions Header (Dropdown) */}
                    <div className="md:hidden flex justify-between items-center mb-2 pb-2 border-b border-slate-200 relative">
                        <div className="text-xs font-black text-slate-400 uppercase">Данные предложения</div>
                        <div className="relative">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                                className="p-1.5 rounded-lg hover:bg-white text-slate-400 hover:text-indigo-600 transition-colors"
                            >
                                <MoreVertical size={16} />
                            </button>
                            
                            {showMenu && (
                                <>
                                    <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)}></div>
                                    <div className="absolute right-0 top-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl z-40 w-48 overflow-hidden animate-in fade-in zoom-in-95 origin-top-right">
                                        {onCopy && !isDisabled && (
                                            <button 
                                                onClick={() => { onCopy(item, index); setShowMenu(false); }}
                                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50"
                                            >
                                                <Copy size={14} className="text-indigo-500"/> Копировать позицию
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => { toggleUnavailable(); setShowMenu(false); }}
                                            className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center gap-2 ${isUnavailable ? 'text-emerald-600 hover:bg-emerald-50' : 'text-red-600 hover:bg-red-50'}`}
                                        >
                                            {isUnavailable ? <><FileText size={14}/> Вернуть в работу</> : <><Ban size={14}/> Отказаться от позиции</>}
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Desktop Actions */}
                    <div className="hidden md:flex items-center gap-1 justify-center">
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

                    {/* Inputs Grid for Mobile */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:contents">
                        <div className="space-y-1 md:space-y-0">
                            <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Кол-во {isReqQty && <span className="text-red-500">*</span>}</label>
                            <input disabled={isDisabled || isUnavailable} value={item.offeredQuantity ?? item.quantity} onChange={e => handleNumInput(e.target.value, 'offeredQuantity', item.quantity)} className={getInputClass('offeredQuantity', item.offeredQuantity ?? item.quantity)} />
                        </div>
                        
                        <div className="space-y-1 md:space-y-0">
                            <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Цена (¥) {isReqPrice && <span className="text-red-500">*</span>}</label>
                            <input disabled={isDisabled || isUnavailable} value={item.BuyerPrice || ''} onChange={e => handleNumInput(e.target.value, 'BuyerPrice')} className={getInputClass('BuyerPrice', item.BuyerPrice)} placeholder="0" />
                        </div>

                        <div className="space-y-1 md:space-y-0">
                            <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Вес (кг) {isReqWeight && <span className="text-red-500">*</span>}</label>
                            <input disabled={isDisabled || isUnavailable} value={item.weight || ''} onChange={e => handleNumInput(e.target.value, 'weight')} className={getInputClass('weight', item.weight)} placeholder="0.0" />
                        </div>

                        <div className="space-y-1 md:space-y-0">
                            <label className="md:hidden text-[10px] font-bold text-slate-400 uppercase">Срок (нед) {isReqWeeks && <span className="text-red-500">*</span>}</label>
                            <input disabled={isDisabled || isUnavailable} value={item.deliveryWeeks || ''} onChange={e => handleNumInput(e.target.value, 'deliveryWeeks')} className={getInputClass('deliveryWeeks', item.deliveryWeeks)} placeholder="Min 1" />
                        </div>
                    </div>

                    <div className={`mt-2 md:mt-0 h-[40px] md:h-[34px] flex items-center justify-center bg-white rounded border overflow-hidden ${isReqImages && (!item.itemFiles || item.itemFiles.length === 0) ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}>
                        <FileDropzone files={item.itemFiles || (item.photoUrl ? [{name: 'Фото', url: item.photoUrl, type: 'image/jpeg'}] : [])} onUpdate={(files) => onUpdate(index, 'itemFiles', files)} compact />
                    </div>
                </div>
            </div>

        {/* 3. ДОП ИНФО (Комментарий и Поставщик) */}
        <div className={`px-4 md:px-6 pb-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 ${isUnavailable ? 'opacity-30 grayscale blur-[1px]' : ''}`}>
            <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                    Комментарий / Замена / Аналог
                    {isReqComment && <span className="text-red-500 ml-1">*</span>}
                </label>
                <input 
                    disabled={isDisabled || isUnavailable} 
                    value={item.comment || ''} 
                    onChange={e => onUpdate(index, 'comment', e.target.value)} 
                    className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none transition-all
                        ${(isDisabled || isUnavailable) ? 'bg-slate-100 text-gray-500' : 'bg-white text-gray-700 focus:border-indigo-500'} 
                        ${isReqComment && !item.comment ? 'border-red-300 bg-red-50' : ''}`}
                    placeholder="Ваш комментарий..." 
                />
            </div>
            
            <div>
                <label className="block text-[9px] font-black text-slate-400 uppercase mb-1">
                    WeChat ID / номер поставщика
                    {isReqSku && <span className="text-red-500 ml-1">*</span>}
                </label>
                <div className="relative">
                    <input 
                        disabled={isDisabled || isUnavailable} 
                        value={item.supplierSku || ''} 
                        onChange={e => onUpdate(index, 'supplierSku', e.target.value)} 
                        className={`w-full border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none transition-all
                            ${(isDisabled || isUnavailable) ? 'bg-slate-100 text-gray-500' : 'bg-white text-gray-700 focus:border-indigo-500'} 
                            ${isReqSku && !item.supplierSku ? 'border-red-300 bg-red-50' : ''}`} 
                        placeholder="18510860570 / +86-XX-XXXX-XXX" 
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
