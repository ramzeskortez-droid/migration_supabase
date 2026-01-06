import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, FileImage, Camera, Check, Edit2, 
  ExternalLink, Loader2, Pencil
} from 'lucide-react';
import { Order, RankType, Currency, ExchangeRates } from '../../types';

interface AdminItemsTableProps {
  order: Order;
  isEditing: boolean;
  editForm: { [key: string]: string };
  setEditForm: (form: any) => void;
  handleItemChange: (orderId: string, offerId: string, itemName: string, field: string, value: any) => void;
  handleLocalUpdateRank: (orderId: string, offerId: string, itemName: string, currentRank: RankType, vin: string, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number) => void;
  currentStatus: string;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
  exchangeRates: ExchangeRates | null;
}

import { SupabaseService } from '../../services/supabaseService';

export const AdminItemsTable: React.FC<AdminItemsTableProps> = ({
  order, isEditing, editForm, setEditForm, handleItemChange, handleLocalUpdateRank, 
  currentStatus, openRegistry, toggleRegistry, exchangeRates
}) => {
  const [manualPriceIds, setManualPriceIds] = useState<Set<string>>(new Set());
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});
  const [generating, setGenerating] = useState(false);

  const calculatePrice = (sellerPrice: number, sellerCurrency: Currency, weight: number) => {
    if (!exchangeRates) return 0;
    
    let basePriceRub = 0;
    if (sellerCurrency === 'CNY') basePriceRub = sellerPrice * exchangeRates.cny_rub;
    else if (sellerCurrency === 'USD') basePriceRub = sellerPrice * exchangeRates.usd_rub;
    else basePriceRub = sellerPrice;

    const deliveryCostRub = (weight || 0) * (exchangeRates.delivery_kg_usd || 0) * exchangeRates.usd_rub;
    const totalCost = basePriceRub + deliveryCostRub;
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

  const toggleManualPrice = (id: string) => {
      setManualPriceIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handlePriceChange = (key: string, val: string) => {
      const num = parseInt(val.replace(/\D/g, '')) || 0;
      setLocalPrices(prev => ({ ...prev, [key]: num }));
  };

  // Гибкая сетка для офферов (суммарно 100%)
  const PRODUCT_GRID = "grid-cols-[50px_1fr_120px_80px_80px_80px]";
  const OFFER_GRID = "grid-cols-[1.5fr_1fr_70px_70px_100px_80px_1.2fr_1fr_130px]";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4 overflow-hidden">
        <div className="bg-gray-100 border-b border-gray-300 hidden md:block">
            <div className={`grid ${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">№</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Наименование</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider">Артикул</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Кол-во</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Ед.</div>
                <div className="text-[9px] font-black uppercase text-gray-500 tracking-wider text-center">Фото</div>
            </div>
        </div>

        {order.items.map((item, idx) => {
            const isExpanded = openRegistry.has(item.name);
            const itemOffers: any[] = []; 
            if (order.offers) { 
                for (const off of order.offers) { 
                    const matching = off.items.find(i => 
                        (i.order_item_id && i.order_item_id === item.id) || 
                        (i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase())
                    ); 
                    if (matching) {
                        itemOffers.push({ offerId: off.id, clientName: off.clientName, item: matching }); 
                    }
                } 
            }

            return (
                <div key={idx} className="border-b border-gray-200 last:border-b-0">
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors">
                        <div className={`grid grid-cols-1 md:${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                            <div className="flex items-center gap-2">
                                <button onClick={() => toggleRegistry(item.name)} className="hover:bg-gray-200 rounded-lg p-1 transition-colors">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                </button>
                                <span className="text-gray-600 font-mono font-bold text-xs">{idx + 1}</span>
                            </div>
                            <div>
                                {isEditing ? (
                                    <input value={editForm[`item_${idx}_name`]} onChange={e => setEditForm({...editForm, [`item_${idx}_name`]: e.target.value})} className="w-full px-2 py-1 bg-white border border-indigo-200 rounded text-[11px] font-bold uppercase outline-none"/>
                                ) : (
                                    <div className="font-black text-gray-900 uppercase text-[12px] tracking-tight truncate">{item.AdminName || item.name}</div>
                                )}
                            </div>
                            <div className="text-gray-600 font-mono text-[10px] truncate">{item.article || '-'}</div>
                            <div className="text-gray-700 text-center font-black text-xs">
                                {isEditing ? (
                                    <input type="number" value={editForm[`item_${idx}_qty`]} onChange={e => setEditForm({...editForm, [`item_${idx}_qty`]: e.target.value})} className="w-16 px-1 py-1 bg-white border border-indigo-200 rounded text-center text-xs font-bold"/>
                                ) : ( item.quantity )}
                            </div>
                            <div className="text-gray-600 text-center text-[10px] font-bold uppercase">{item.uom || 'шт'}</div>
                            <div className="flex justify-center">
                                {item.opPhotoUrl ? (
                                    <a href={item.opPhotoUrl} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
                                        <img src={item.opPhotoUrl} alt="Заявка" className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm" />
                                    </a>
                                ) : ( <span className="text-gray-300 text-[10px]">-</span> )}
                            </div>
                        </div>
                    </div>

                    {isExpanded && (
                        <div className="bg-white animate-in slide-in-from-top-1 duration-200 overflow-x-auto">
                            <div className="bg-slate-800 text-white hidden md:block min-w-[1000px]">
                                <div className={`grid ${OFFER_GRID} gap-4 px-6 py-2 text-[8px] font-black uppercase tracking-widest`}>
                                    <div>Поставщик</div>
                                    <div>Цена закупщика</div>
                                    <div className="text-center">Кол-во</div>
                                    <div className="text-center">Вес (кг)</div>
                                    <div className="text-center">Срок поставки</div>
                                    <div className="text-center">Фото</div>
                                    <div>Цена для клиента</div>
                                    <div className="text-center">Срок для клиента</div>
                                    <div className="text-right pr-4">Действие</div>
                                </div>
                            </div>

                            {itemOffers.length === 0 ? (
                                <div className="p-10 text-center">
                                    <div className="text-[10px] font-black text-slate-300 uppercase italic tracking-widest mb-3">Нет предложений</div>
                                    <button 
                                        onClick={async () => {
                                            if (generating) return;
                                            setGenerating(true);
                                            try {
                                                await SupabaseService.generateTestOffers(order.id);
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
                                </div>
                            ) : (
                                <div className="min-w-[1000px] divide-y divide-gray-100">
                                    {itemOffers.map((off, oIdx) => {
                                        const isLeader = off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                                        const priceKey = `${off.offerId}_${off.item.id}`;
                                        const isManual = manualPriceIds.has(off.item.id) || off.item.isManualPrice;
                                        
                                        const autoPrice = calculatePrice(off.item.sellerPrice, off.item.sellerCurrency, off.item.weight);
                                        const currentPriceRub = localPrices[priceKey] ?? off.item.adminPriceRub ?? autoPrice;

                                        return (
                                            <div key={oIdx} className={`relative transition-all duration-300 border-l-4 ${isLeader ? "bg-emerald-50 border-l-emerald-500 shadow-inner" : "hover:bg-gray-50 border-l-transparent"}`}>
                                                <div className={`grid grid-cols-1 md:${OFFER_GRID} gap-4 px-6 py-3 items-center`}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-black text-gray-900 uppercase text-[10px] truncate" title={off.clientName}>{off.clientName}</span>
                                                        {isLeader && <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>}
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
                                                    <div className="flex items-center justify-center">
                                                        {off.item.photoUrl ? (
                                                            <a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="hover:opacity-80 transition-opacity">
                                                                <img src={off.item.photoUrl} alt="Фото" className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm" />
                                                            </a>
                                                        ) : ( <Camera className="w-4 h-4 text-gray-200" /> )}
                                                    </div>

                                                    <div className="relative group/price">
                                                        {isManual ? (
                                                            <input 
                                                                type="text" 
                                                                className="w-full px-2 py-1 border-2 border-amber-400 rounded-lg font-black text-xs outline-none bg-white text-amber-700"
                                                                value={currentPriceRub}
                                                                onChange={(e) => handlePriceChange(priceKey, e.target.value)}
                                                                autoFocus
                                                            />
                                                        ) : (
                                                            <div className="text-base font-black text-gray-900 leading-none">
                                                                {formatPrice(currentPriceRub)} ₽
                                                            </div>
                                                        )}
                                                        <div className="flex items-center justify-between mt-1">
                                                            <div className="text-[9px] font-black text-gray-400 uppercase">≈ {convertToYuan(currentPriceRub)} ¥</div>
                                                            <button 
                                                                onClick={() => toggleManualPrice(off.item.id)}
                                                                className={`p-1 rounded hover:bg-slate-100 transition-colors ${isManual ? 'text-amber-600' : 'text-slate-300 hover:text-indigo-500'}`}
                                                            >
                                                                <Pencil size={10} />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="text-orange-600 text-center font-black text-[11px]">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} нед.` : '-'}</div>
                                                    
                                                    <div className="flex justify-end pr-2">
                                                        {['В обработке', 'Идут торги'].includes(currentStatus) || isLeader ? (
                                                            <button
                                                                onClick={() => handleLocalUpdateRank(order.id, off.offerId, item.name, off.item.rank || '', order.vin, off.item.sellerPrice, off.item.sellerCurrency, off.item.adminComment, off.item.deliveryRate, currentPriceRub)}
                                                                className={`w-full py-2 px-3 rounded-xl font-black uppercase text-[9px] transition-all shadow-md ${isLeader ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                                            >
                                                                {isLeader ? ( <span className="flex items-center justify-center gap-1"><Check size={12} strokeWidth={3} /> Лидер</span> ) : ( "Выбрать" )}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-200 text-[9px] font-black uppercase italic tracking-widest">Торги закрыты</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="col-span-full mt-2 relative">
                                                        <input type="text" placeholder="Комментарий для поставщика (если проиграл)..." value={off.item.adminComment || ""} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminComment', e.target.value)} className="w-full px-4 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-[10px] font-bold text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300 transition-all shadow-inner" />
                                                        <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-300" />
                                                    </div>
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