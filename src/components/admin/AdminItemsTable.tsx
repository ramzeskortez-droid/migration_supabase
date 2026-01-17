import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, FileImage, Camera, Check, Edit2, 
  ExternalLink, Loader2, Pencil, HelpCircle, MessageCircle, FileText, Paperclip, Folder, RefreshCw, ShieldCheck
} from 'lucide-react';
import { Order, RankType, Currency, ExchangeRates } from '../../types';
import { FileDropzone } from '../shared/FileDropzone';
import { useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';
import { useOfficialBrands } from '../../hooks/useOfficialBrands';

interface AdminItemsTableProps {
  order: Order;
  isEditing: boolean;
  editForm: { [key: string]: string };
  setEditForm: (form: any) => void;
  handleItemChange: (orderId: string, offerId: string, itemName: string, field: string, value: any) => void;
  handleLocalUpdateRank: (orderId: string, offerId: string, offerItemId: string, orderItemId: string, currentRank: RankType, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number, clientDeliveryWeeks?: number) => void;
  currentStatus: string;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
  exchangeRates: ExchangeRates | null;
  offerEdits: Record<string, { adminComment?: string, adminPrice?: number, deliveryWeeks?: number }>;
  onOpenChat: (orderId: string, supplierName?: string, supplierId?: string) => void;
  debugMode?: boolean;
  offerEditTimeout?: number;
}

export const AdminItemsTable: React.FC<AdminItemsTableProps> = ({
  order, isEditing, editForm, setEditForm, handleItemChange, handleLocalUpdateRank, 
  currentStatus, openRegistry, toggleRegistry, exchangeRates, offerEdits, onOpenChat, debugMode,
  offerEditTimeout = 5
}) => {
  const queryClient = useQueryClient();
  const [generating, setGenerating] = useState(false);
  const { data: officialBrands } = useOfficialBrands();

  const isOfficial = (brand?: string) => {
      if (!brand) return false;
      return officialBrands?.has(brand.trim().toLowerCase());
  };

  const isOfferLocked = (lockedAt: string | null) => {
      if (!lockedAt) return false;
      const lockTime = new Date(lockedAt).getTime();
      const now = new Date().getTime();
      const diffMin = Math.abs(now - lockTime) / (60 * 1000);
      
      console.log('Lock Debug:', { 
          lockedAt, 
          lockTime, 
          now, 
          diffMin, 
          offerEditTimeout, 
          isLocked: diffMin < offerEditTimeout 
      });

      return diffMin < offerEditTimeout;
  };

  const calculatePrice = (sellerPrice: number, sellerCurrency: Currency, weight: number) => {
    if (!exchangeRates) return 0;
    
    // 1. Конвертация цены товара в рубли
    let itemCostRub = 0;
    if (sellerCurrency === 'CNY') itemCostRub = sellerPrice * exchangeRates.cny_rub;
    else if (sellerCurrency === 'USD') itemCostRub = sellerPrice * (exchangeRates.cny_usd || 0) * exchangeRates.cny_rub; 
    else itemCostRub = sellerPrice;

    // 2. Расчет доставки
    const deliveryCostRub = (weight || 0) * (exchangeRates.delivery_kg_usd || 0) * (exchangeRates.cny_usd || 0) * exchangeRates.cny_rub;
    
    const totalCost = itemCostRub + deliveryCostRub;
    const finalPrice = totalCost * (1 + (exchangeRates.markup_percent || 0) / 100);
    
    return Math.round(finalPrice);
  };

  const formatPrice = (val?: number) => {
      if (!val) return '0';
      return new Intl.NumberFormat('ru-RU').format(val);
  };

  const convertToYuan = (rubles: number): string => {
    if (!exchangeRates?.cny_rub) return "0.00";
    return (rubles / exchangeRates.cny_rub).toFixed(2);
  };

  // Гибкая сетка для офферов (суммарно 100%)
  const PRODUCT_GRID = "grid-cols-[40px_100px_1.5fr_100px_60px_50px_120px]";
  const OFFER_GRID = "grid-cols-[1.5fr_1fr_70px_70px_100px_80px_1.2fr_1fr_130px]";

  const renderFilesIcon = (files: any[], photoUrl?: string) => {
      // Совместимость: если есть photoUrl, но нет files, считаем это 1 картинкой
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
              {/* Dropdown list on hover */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 pb-2 w-48 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none group-hover:pointer-events-auto z-[999]">
                  <div className="bg-white rounded-lg shadow-xl border border-slate-200 p-2">
                      <div className="text-[9px] font-black uppercase text-slate-400 mb-1 border-b border-slate-100 pb-1">Файлы ({allFiles.length})</div>
                      <div className="space-y-1">
                          {allFiles.map((f: any, i: number) => (
                              <a key={i} href={f.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded text-[10px] text-indigo-600 truncate block">
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

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
        <div className="bg-gray-100 border-b border-gray-300 hidden md:block rounded-t-xl">
            <div className={`grid ${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">№</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Бренд</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Наименование</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Артикул</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Кол-во</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Ед.</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Фото</div>
            </div>
        </div>

        {order.items.map((item, idx) => {
            const isExpanded = openRegistry.has(item.name);
            const isLast = idx === order.items.length - 1;
            const official = isOfficial(item.brand);
            
            // Сбор офферов для текущей позиции
            const itemOffers: any[] = []; 
            if (order.offers) { 
                for (const off of order.offers) { 
                    const matching = off.items.find(i => 
                        (i.order_item_id && String(i.order_item_id) === String(item.id)) || 
                        (!i.order_item_id && i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase())
                    ); 
                    
                    const isLocked = isOfferLocked((off as any).locked_at);

                    if (matching) {
                        itemOffers.push({ 
                            offerId: off.id, 
                            clientName: off.clientName, 
                            supplierFiles: off.supplier_files, 
                            item: matching, 
                            ownerId: off.ownerId,
                            isLocked
                        }); 
                    } else if (isLocked) {
                        // ФАНТОМНАЯ СТРОКА (Закупщик редактирует, но позиции еще нет)
                        itemOffers.push({
                            offerId: off.id,
                            clientName: off.clientName,
                            isPhantom: true,
                            ownerId: off.ownerId
                        });
                    }
                } 
            }

            return (
                <div key={idx} className={`border-b border-gray-200 last:border-b-0 ${isLast ? 'rounded-b-xl' : ''}`}>
                    <div 
                        onClick={() => toggleRegistry(item.name)}
                        className={`bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors cursor-pointer ${isLast && !isExpanded ? 'rounded-b-xl' : ''}`}
                    >
                        <div className={`grid grid-cols-1 md:${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                            <div className="flex items-center gap-2">
                                <div className="hover:bg-gray-200 rounded-lg p-1 transition-colors">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                </div>
                                <span className="text-gray-600 font-mono font-bold text-xs">{idx + 1}</span>
                            </div>
                            
                            {/* BRAND */}
                            <div 
                                className={`text-[11px] truncate font-black uppercase flex items-center gap-1 ${official ? 'text-amber-700 underline decoration-amber-400/50 decoration-2 underline-offset-2 cursor-help' : 'text-indigo-600'}`}
                                title={official ? "Официальный представитель" : item.brand}
                            >
                                {item.brand || '-'}
                                {official && <ShieldCheck size={10} className="text-amber-600 shrink-0" />}
                            </div>

                            <div>
                                {isEditing ? (
                                    <input 
                                        value={editForm[`${item.id}_name`] || ''} 
                                        onChange={e => setEditForm({...editForm, [`${item.id}_name`]: e.target.value})} 
                                        className="w-full px-2 py-1 bg-white border border-indigo-300 rounded text-[11px] font-bold uppercase outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                ) : (
                                    <div className="font-black text-gray-900 uppercase text-[12px] tracking-tight truncate">{item.AdminName || item.name}</div>
                                )}
                            </div>
                            <div className="text-gray-600 font-mono text-[10px] truncate">{item.article || '-'}</div>
                            <div className="text-gray-700 text-center font-black text-xs">
                                {isEditing ? (
                                    <input 
                                        type="number" 
                                        value={editForm[`${item.id}_qty`] || ''} 
                                        onChange={e => setEditForm({...editForm, [`${item.id}_qty`]: e.target.value})} 
                                        className="w-16 px-1 py-1 bg-white border border-indigo-300 rounded text-center text-xs font-bold outline-none focus:ring-1 focus:ring-indigo-500 transition-all"
                                    />
                                ) : ( item.quantity )}
                            </div>
                            <div className="text-gray-600 text-center text-[10px] font-bold uppercase">{item.uom || 'шт'}</div>
                            <div className="flex justify-center px-2">
                                {isEditing ? (
                                    <div className="h-[34px] w-full flex items-center justify-center bg-white rounded border border-gray-300 overflow-hidden">
                                        <FileDropzone 
                                            files={(() => { try { return JSON.parse(editForm[`${item.id}_files`] || '[]'); } catch(e) { return []; } })()}
                                            onUpdate={(files) => setEditForm({...editForm, [`${item.id}_files`]: JSON.stringify(files)})}
                                            compact
                                        />
                                    </div>
                                ) : (
                                    renderFilesIcon(item.itemFiles, item.opPhotoUrl)
                                )}
                            </div>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className={`bg-white animate-in slide-in-from-top-1 duration-200 ${isLast ? 'rounded-b-xl' : ''}`}>
                            <div className="bg-slate-800 text-white hidden md:block">
                                <div className={`grid ${OFFER_GRID} gap-4 px-6 py-2 text-[8px] font-black uppercase tracking-widest`}>
                                    <div>Поставщик</div>
                                    <div>Цена закупщика</div>
                                    <div className="text-center">Кол-во</div>
                                    <div className="text-center">Вес (кг)</div>
                                    <div className="text-center">Срок поставки</div>
                                    <div className="text-center">Файлы</div>
                                    <div className="flex items-center gap-1 group relative cursor-help">
                                        <span>Цена для клиента</span>
                                        <HelpCircle size={10} className="text-gray-400" />
                                        <div className="absolute top-full right-0 mt-2 w-56 bg-slate-800 text-white p-3 rounded-lg text-[9px] font-medium opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 shadow-xl border border-slate-600">
                                            <div className="mb-2 font-bold text-indigo-300 border-b border-slate-600 pb-1 uppercase tracking-wider">Формула расчета</div>
                                            <div className="space-y-1 font-mono text-[8px] text-slate-300">
                                                <div>(ЦенаПост * КурсВалюты)</div>
                                                <div>+ (Вес * ТарифДост * КурсUSD)</div>
                                                <div>+ Наценка%</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">Срок для клиента</div>
                                    <div className="text-right pr-4">Действие</div>
                                </div>
                            </div>

                            {itemOffers.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest mb-3">Нет предложений</div>
                                    {debugMode && (
                                        <button 
                                            onClick={async () => {
                                                if (generating) return;
                                                setGenerating(true);
                                                try {
                                                    await SupabaseService.generateTestOffers(order.id);
                                                    queryClient.invalidateQueries({ queryKey: ['order-details', order.id] });
                                                } catch (e) {
                                                    alert('Ошибка: ' + e);
                                                } finally {
                                                    setGenerating(false);
                                                }
                                            }}
                                            disabled={generating}
                                            className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-indigo-100 transition-colors border border-indigo-200 flex items-center gap-2 mx-auto disabled:opacity-50"
                                        >
                                            {generating && <Loader2 className="animate-spin w-3 h-3" />}
                                            Создать Тестовые Офферы
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-100">
                                    {itemOffers.map((off, oIdx) => {
                                        if (off.isPhantom) {
                                            return (
                                                <div key={`phantom-${oIdx}`} className="bg-indigo-50/20 px-6 py-4 flex items-center justify-between border-l-4 border-l-indigo-400">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse"></div>
                                                        <span className="text-[10px] font-black text-indigo-900 uppercase">{off.clientName}</span>
                                                        <span className="text-[10px] font-bold text-indigo-400 italic">Вносит предложение по этой позиции...</span>
                                                    </div>
                                                    <Loader2 size={14} className="animate-spin text-indigo-300" />
                                                </div>
                                            );
                                        }

                                        const isLeader = off.item.is_winner || off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                                        
                                        const autoPrice = calculatePrice(off.item.sellerPrice, off.item.sellerCurrency, off.item.weight);
                                        const editedPrice = offerEdits?.[off.item.id]?.adminPrice;
                                        const currentPriceRub = editedPrice !== undefined ? editedPrice : (off.item.adminPrice ?? autoPrice);

                                        const editedComment = offerEdits?.[off.item.id]?.adminComment;
                                        // const currentComment = editedComment !== undefined ? editedComment : (off.item.adminComment || "");

                                        // Срок
                                        const editedWeeks = offerEdits?.[off.item.id]?.deliveryWeeks;
                                        // Базовый срок = Срок поставщика + Настройка (из курсов)
                                        const baseWeeks = (off.item.deliveryWeeks || 0) + (exchangeRates?.delivery_weeks_add || 0);
                                        // Если уже зафиксировано в БД, берем оттуда, иначе считаем динамически
                                        const currentWeeks = editedWeeks !== undefined ? editedWeeks : (off.item.clientDeliveryWeeks || baseWeeks);

                                        return (
                                            <div key={oIdx} className={`relative transition-all duration-300 ${isLeader ? "bg-emerald-50 shadow-inner" : "hover:bg-gray-50"}`}>
                                                
                                                {/* LOCK OVERLAY */}
                                                {off.isLocked && (
                                                    <div className="absolute inset-0 z-50 bg-white/60 backdrop-blur-[1px] flex items-center justify-center group/lock cursor-help">
                                                        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-lg border border-indigo-100">
                                                            <RefreshCw size={14} className="text-indigo-500 animate-spin" />
                                                            <span className="text-[10px] font-black text-indigo-600 uppercase tracking-tighter">Закупщик вносит изменения...</span>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className={`grid grid-cols-1 md:${OFFER_GRID} gap-4 px-6 py-3 items-center`}>
                                                    <div className="flex items-center gap-2 overflow-hidden">
                                                        <div className="flex flex-col min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-black text-gray-900 uppercase text-[10px] truncate" title={off.clientName}>{off.clientName}</span>
                                                                <button 
                                                                    onClick={() => onOpenChat(order.id, off.clientName, off.ownerId)}
                                                                    className="text-indigo-400 hover:text-indigo-600 transition-colors"
                                                                    title="Чат с поставщиком"
                                                                >
                                                                    <MessageCircle size={12}/>
                                                                </button>
                                                            </div>
                                                            {/* Отображение общих файлов поставщика */}
                                                            {off.supplierFiles && off.supplierFiles.length > 0 && (
                                                                <div className="flex items-center gap-1 text-[8px] text-indigo-500 mt-0.5 group/files cursor-help relative">
                                                                    <Folder size={10} />
                                                                    <span className="font-bold underline decoration-dotted">{off.supplierFiles.length} общ. файл(а)</span>
                                                                    <div className="absolute left-0 top-full mt-1 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50 w-40 opacity-0 group-hover/files:opacity-100 pointer-events-none group-hover/files:pointer-events-auto transition-opacity">
                                                                        {off.supplierFiles.map((sf: any, si: number) => (
                                                                            <a key={si} href={sf.url} target="_blank" rel="noreferrer" className="block text-[9px] text-indigo-600 hover:underline truncate mb-1 last:mb-0">{sf.name}</a>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {isLeader && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></div>}
                                                    </div>
                                                    <div className="text-gray-700 font-bold">
                                                        <span className="text-xs">{off.item.sellerPrice}</span>
                                                        <span className="text-[9px] ml-1 opacity-50">{off.item.sellerCurrency}</span>
                                                    </div>
                                                    <div className="text-gray-700 text-center font-bold text-xs">{off.item.offeredQuantity || off.item.quantity}</div>
                                                    <div className="text-center">
                                                        <span className="text-purple-600 font-black text-[10px] bg-purple-50 px-2 py-0.5 rounded-md">{off.item.weight ? `${off.item.weight} кг` : '-'}</span>
                                                    </div>
                                                    <div className="text-orange-500 text-center font-bold text-[10px]">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} нед.` : '-'}</div>
                                                    
                                                    {/* ФАЙЛЫ / ФОТО ПОЗИЦИИ */}
                                                    <div className="flex items-center justify-center">
                                                        {renderFilesIcon(off.item.itemFiles, off.item.photoUrl)}
                                                    </div>

                                                    <div className="relative group/price">
                                                        {isEditing ? (
                                                            <input 
                                                                type="text" 
                                                                className="w-full px-2 py-1 border border-indigo-300 rounded-lg font-black text-xs outline-none bg-white text-indigo-700 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                value={currentPriceRub}
                                                                onChange={(e) => handleItemChange(order.id, off.item.id, item.name, 'adminPrice', Number(e.target.value.replace(/\D/g, '')))}
                                                            />
                                                        ) : (
                                                            <div className="text-base font-black text-gray-900 leading-none">
                                                                {formatPrice(currentPriceRub)} ₽
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1">
                                                            <div className="text-[9px] font-black text-gray-400 uppercase">≈ {convertToYuan(currentPriceRub)} ¥</div>
                                                        </div>
                                                    </div>

                                                    <div className="text-orange-600 text-center font-black text-[11px] flex justify-center">
                                                        {isEditing ? (
                                                            <div className="relative w-16">
                                                                <input 
                                                                    type="number" 
                                                                    className="w-full px-1 py-1 border border-indigo-300 rounded-lg font-black text-xs text-center outline-none bg-white text-indigo-700 focus:ring-1 focus:ring-indigo-500 transition-all"
                                                                    value={currentWeeks}
                                                                    onChange={(e) => handleItemChange(order.id, off.item.id, item.name, 'deliveryWeeks', Number(e.target.value))}
                                                                />
                                                                <span className="absolute right-1 top-1/2 -translate-y-1/2 text-[8px] text-gray-400 font-bold pointer-events-none">нед</span>
                                                            </div>
                                                        ) : (
                                                            <span>{currentWeeks ? `${currentWeeks} нед.` : '-'}</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex justify-end pr-2">
                                                        {(currentStatus === 'В обработке' || currentStatus === 'Ручная обработка') ? (
                                                            <button
                                                                disabled={off.isLocked}
                                                                onClick={() => handleLocalUpdateRank(order.id, off.offerId, off.item.id, item.id, off.item.rank || '', off.item.sellerPrice, off.item.sellerCurrency, off.item.adminComment, off.item.deliveryRate, currentPriceRub, currentWeeks)}
                                                                className={`w-full py-2 px-3 rounded-xl font-black uppercase text-[9px] transition-all shadow-md ${off.isLocked ? "bg-gray-100 text-gray-300 cursor-not-allowed shadow-none" : isLeader ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                                            >
                                                                {isLeader ? ( <span className="flex items-center justify-center gap-1"><Check size={12} strokeWidth={3} /> Лидер</span> ) : ( "Выбрать" )}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-300 text-[9px] font-black uppercase italic tracking-widest bg-slate-50 px-2 py-1 rounded">
                                                                {isLeader ? 'Выбран (Закрыто)' : 'Торги закрыты'}
                                                            </span>
                                                        )}
                                                    </div>
                                                    
                                                {/* Комментарий поставщика */}
                                                {(off.comment || off.supplierSku) && (
                                                    <div className="md:col-span-6 bg-yellow-50/50 border border-yellow-100 rounded-lg p-2 mt-2 text-[10px] text-yellow-700 flex flex-col gap-1">
                                                        {off.comment && (
                                                            <div className="flex gap-2">
                                                                <span className="font-bold uppercase text-yellow-600/70 shrink-0">Коммент:</span>
                                                                <span>{off.comment}</span>
                                                            </div>
                                                        )}
                                                        {off.supplierSku && (
                                                            <div className="flex gap-2 border-t border-yellow-200/50 pt-1 mt-1">
                                                                <span className="font-bold uppercase text-yellow-600/70 shrink-0">WeChat ID / номер поставщика:</span>
                                                                <span className="font-mono font-bold select-all">{off.supplierSku}</span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
};