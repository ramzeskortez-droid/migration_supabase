import React, { useState } from 'react';
import { 
  ChevronRight, ChevronDown, FileImage, Camera, Check, Edit2, 
  ExternalLink, Loader2, Pencil, HelpCircle, MessageCircle
} from 'lucide-react';
import { Order, RankType, Currency, ExchangeRates } from '../../types';

interface AdminItemsTableProps {
  order: Order;
  isEditing: boolean;
  editForm: { [key: string]: string };
  setEditForm: (form: any) => void;
  handleItemChange: (orderId: string, offerId: string, itemName: string, field: string, value: any) => void;
  handleLocalUpdateRank: (orderId: string, offerId: string, offerItemId: string, orderItemId: string, currentRank: RankType, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number, adminPriceRub?: number) => void;
  currentStatus: string;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
  exchangeRates: ExchangeRates | null;
  offerEdits: Record<string, { adminComment?: string, adminPrice?: number }>;
}

import { useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';

export const AdminItemsTable: React.FC<AdminItemsTableProps> = ({
  order, isEditing, editForm, setEditForm, handleItemChange, handleLocalUpdateRank, 
  currentStatus, openRegistry, toggleRegistry, exchangeRates, offerEdits
}) => {
  const queryClient = useQueryClient();
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
                        (i.order_item_id && String(i.order_item_id) === String(item.id)) || 
                        (!i.order_item_id && i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase())
                    ); 
                    if (matching) {
                        itemOffers.push({ offerId: off.id, clientName: off.clientName, item: matching }); 
                    }
                } 
            }

            return (
                <div key={idx} className="border-b border-gray-200 last:border-b-0">
                    <div 
                        onClick={() => toggleRegistry(item.name)}
                        className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors cursor-pointer"
                    >
                        <div className={`grid grid-cols-1 md:${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                            <div className="flex items-center gap-2">
                                <div className="hover:bg-gray-200 rounded-lg p-1 transition-colors">
                                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-600" /> : <ChevronRight className="w-4 h-4 text-gray-600" />}
                                </div>
                                <span className="text-gray-600 font-mono font-bold text-xs">{idx + 1}</span>
                            </div>
                            <div>
                                {isEditing ? (
                                    <input 
                                        value={editForm[`item_${idx}_name`]} 
                                        onChange={e => setEditForm({...editForm, [`item_${idx}_name`]: e.target.value})} 
                                        className="w-full px-2 py-1 bg-indigo-50 border-2 border-indigo-400 rounded text-[11px] font-bold uppercase outline-none ring-2 ring-indigo-400/20 animate-pulse-subtle focus:animate-none focus:bg-white transition-all"
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
                                        value={editForm[`item_${idx}_qty`]} 
                                        onChange={e => setEditForm({...editForm, [`item_${idx}_qty`]: e.target.value})} 
                                        className="w-16 px-1 py-1 bg-indigo-50 border-2 border-indigo-400 rounded text-center text-xs font-bold ring-2 ring-indigo-400/20 animate-pulse-subtle focus:animate-none focus:bg-white transition-all"
                                    />
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
                                </div>
                            ) : (
                                <div className="min-w-[1000px] divide-y divide-gray-100">
                                    {itemOffers.map((off, oIdx) => {
                                        const isLeader = off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                                        
                                        // Расчет цены
                                        const autoPrice = calculatePrice(off.item.sellerPrice, off.item.sellerCurrency, off.item.weight);
                                        // Приоритет: Правка в сессии > База данных > Авторасчет
                                        const editedPrice = offerEdits?.[off.item.id]?.adminPrice;
                                        const currentPriceRub = editedPrice !== undefined ? editedPrice : (off.item.adminPrice ?? autoPrice);

                                        // Комментарий
                                        const editedComment = offerEdits?.[off.item.id]?.adminComment;
                                        const currentComment = editedComment !== undefined ? editedComment : (off.item.adminComment || "");

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
                                                        {isEditing ? (
                                                            <input 
                                                                type="text" 
                                                                className="w-full px-2 py-1 border-2 border-indigo-500 rounded-lg font-black text-xs outline-none bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/30 animate-pulse-subtle focus:animate-none focus:bg-white transition-all"
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

                                                    <div className="text-orange-600 text-center font-black text-[11px]">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} нед.` : '-'}</div>
                                                    
                                                    <div className="flex justify-end pr-2">
                                                        {['В обработке', 'Идут торги'].includes(currentStatus) || isLeader ? (
                                                            <button
                                                                onClick={() => handleLocalUpdateRank(order.id, off.offerId, off.item.id, item.id, off.item.rank || '', off.item.sellerPrice, off.item.sellerCurrency, off.item.adminComment, off.item.deliveryRate, currentPriceRub)}
                                                                className={`w-full py-2 px-3 rounded-xl font-black uppercase text-[9px] transition-all shadow-md ${isLeader ? "bg-emerald-500 text-white hover:bg-emerald-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                                                            >
                                                                {isLeader ? ( <span className="flex items-center justify-center gap-1"><Check size={12} strokeWidth={3} /> Лидер</span> ) : ( "Выбрать" )}
                                                            </button>
                                                        ) : (
                                                            <span className="text-slate-200 text-[9px] font-black uppercase italic tracking-widest">Торги закрыты</span>
                                                        )}
                                                    </div>
                                                    
                                                    {off.item.comment && (
                                                        <div className="col-span-full px-2 pb-1">
                                                            <div className="bg-amber-50 border border-amber-100 px-3 py-1.5 rounded-lg text-[9px] font-medium text-amber-800 flex items-start gap-2">
                                                                <MessageCircle size={12} className="mt-0.5 text-amber-500 shrink-0" />
                                                                <span><span className="font-bold">Поставщик:</span> {off.item.comment}</span>
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="col-span-full mt-2 relative">
                                                        <input 
                                                            type="text" 
                                                            placeholder="Комментарий для поставщика (виден закупщику)..." 
                                                            value={currentComment} 
                                                            onChange={(e) => handleItemChange(order.id, off.item.id, item.name, 'adminComment', e.target.value)} 
                                                            className={`w-full px-4 py-1.5 border rounded-xl text-[10px] font-bold text-gray-600 placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all shadow-inner ${isEditing ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-400/20 animate-pulse-subtle focus:animate-none focus:bg-white' : (currentComment ? 'bg-white border-indigo-100' : 'bg-gray-50 border-gray-200')}`} 
                                                        />
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