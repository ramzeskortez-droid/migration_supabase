import React, { useState } from 'react';
import { CheckCircle2, FileText, Check, Edit3 } from 'lucide-react';
import { Order, RankType, Currency, ExchangeRates } from '../../types';
import { ChatModal } from '../shared/ChatModal';

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

export const AdminItemsTable: React.FC<AdminItemsTableProps> = ({
  order, isEditing, editForm, setEditForm, handleItemChange, handleLocalUpdateRank, currentStatus, openRegistry, toggleRegistry, exchangeRates
}) => {
  // Храним ID айтемов офферов, у которых включен ручной режим редактирования цены
  const [manualPriceIds, setManualPriceIds] = useState<Set<string>>(new Set());
  
  // Локальный стейт для значений цен (ключ: `offerId_itemId`, значение: число)
  const [localPrices, setLocalPrices] = useState<Record<string, number>>({});

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

  return (
    <div className="space-y-4">
        {order.items.map((item, idx) => {
            const itemOffers: any[] = []; 
            if (order.offers) { 
                for (const off of order.offers) { 
                    const matching = off.items.find(i => i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()); 
                    if (matching && (matching.offeredQuantity || 0) > 0) 
                        itemOffers.push({ offerId: off.id, clientName: off.clientName, item: matching }); 
                } 
            }
            
            let minPrice = Infinity;
            itemOffers.forEach(o => {
                if (o.item.sellerPrice < minPrice) minPrice = o.item.sellerPrice;
            });

            const leaders = itemOffers.filter(o => o.item.rank === 'ЛИДЕР' || o.item.rank === 'LEADER');
            // Show all offers if status is 'В обработке' or 'Идут торги' (just in case)
            const showRegistry = !['В обработке', 'Идут торги'].includes(currentStatus);
            const displayOffers = showRegistry ? leaders : itemOffers;
            const isRegistryOpen = openRegistry.has(item.name);

            return (
                <div key={idx} className="bg-slate-900 rounded-xl overflow-hidden shadow-md">
                    <div className="p-3 flex items-center justify-between text-white border-b border-slate-700">
                        <div className="flex items-center gap-3">
                            {isEditing ? (
                                <div className="flex gap-2">
                                    <input value={editForm[`item_${idx}_name`]} onChange={e => setEditForm({...editForm, [`item_${idx}_name`]: e.target.value})} className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs font-bold uppercase w-64"/>
                                    <input type="number" value={editForm[`item_${idx}_qty`]} onChange={e => setEditForm({...editForm, [`item_${idx}_qty`]: e.target.value})} className="bg-slate-800 text-white px-2 py-1 rounded border border-slate-600 text-xs font-bold w-16 text-center"/>
                                </div>
                            ) : (
                                <><span className="font-black text-sm uppercase tracking-wide">{item.AdminName || item.name}</span><span className="text-[10px] font-bold opacity-60 ml-2">({item.AdminQuantity || item.quantity} ШТ)</span></>
                            )}
                        </div>
                    </div>

                    {/* Настольный заголовок */}
                    <div className="hidden md:grid grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.8fr_1fr] gap-2 px-6 py-3 bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-widest items-center text-center">
                        <div className="text-left">Закупщик</div>
                        <div>Цена Закупа</div>
                        <div>Кол-во</div>
                        <div>Вес</div>
                        <div>Срок</div>
                        <div>Фото</div>
                        <div>ИТОГО ДЛЯ КЛИЕНТА (₽)</div>
                        <div>Действие</div>
                    </div>

                    <div className="bg-white p-2 space-y-1">
                        {displayOffers.map((off, oIdx) => {
                            const isLeader = off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                            const isManual = manualPriceIds.has(off.item.id) || off.item.isManualPrice;
                            
                            // Расчет дефолтной цены
                            const autoPrice = calculatePrice(off.item.sellerPrice, off.item.sellerCurrency, off.item.weight);
                            
                            // Уникальный ключ для локального стейта
                            const priceKey = `${off.offerId}_${off.item.id}`;
                            
                            // Текущая цена: 
                            // 1. Если есть в localPrices (мы только что ввели) -> берем её
                            // 2. Если есть сохраненная в БД adminPriceRub -> берем её
                            // 3. Иначе -> авторасчет
                            const currentPriceRub = localPrices[priceKey] ?? off.item.adminPriceRub ?? autoPrice;

                            // Эквивалент в юанях (обратный счет)
                            const equivCny = exchangeRates?.cny_rub ? Math.round(currentPriceRub / exchangeRates.cny_rub) : 0;

                            return (
                                <div key={oIdx} className={`p-2 rounded-lg border items-center text-[10px] ${isLeader ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-white border-slate-100'} md:grid md:grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.8fr_1fr] md:gap-2 flex flex-col gap-3 relative`}>
                                    
                                    {/* ПК ВЕРСИЯ */}
                                    <div className="hidden md:contents text-center font-bold text-slate-700">
                                        <div className="font-black uppercase text-slate-800 truncate text-left flex items-center gap-2" title={off.clientName}>
                                            {off.clientName}
                                            {isLeader && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                        </div>
                                        
                                        <div className="text-slate-900 font-black text-xs">{off.item.sellerPrice} <span className="text-[9px] opacity-50">{off.item.sellerCurrency}</span></div>
                                        <div className="text-slate-500">{off.item.offeredQuantity}</div>
                                        <div className="text-indigo-600 font-black bg-indigo-50/50 px-2 py-1 rounded-lg">{off.item.weight ? `${off.item.weight} кг` : '-'}</div>
                                        <div className="text-amber-600 font-black bg-amber-50/50 px-2 py-1 rounded-lg">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} н.` : '-'}</div>
                                        <div className="flex justify-center">{off.item.photoUrl ? (<a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"><FileText size={16}/></a>) : <span className="text-slate-200">-</span>}</div>
                                        
                                        {/* Единое поле цены */}
                                        <div className="flex items-center gap-1 group">
                                            <div className="relative flex-grow">
                                                {isManual ? (
                                                    <input 
                                                        type="text" 
                                                        className="w-full px-3 py-2.5 rounded-xl text-center font-black text-sm transition-all outline-none border-2 bg-white border-amber-400 text-amber-700 ring-4 ring-amber-50" 
                                                        onChange={(e) => handlePriceChange(priceKey, e.target.value)}
                                                        value={currentPriceRub} 
                                                        disabled={order.isProcessed}
                                                        autoFocus
                                                    />
                                                ) : (
                                                    <div className="w-full px-3 py-2.5 rounded-xl text-center font-black text-sm bg-slate-100 border-2 border-transparent text-slate-600">
                                                        {formatPrice(currentPriceRub)} ₽
                                                    </div>
                                                )}
                                                
                                                {/* Справочная цена в Юанях */}
                                                <div className="absolute -bottom-4 left-0 w-full text-center text-[8px] font-black text-slate-300 uppercase truncate">
                                                    ≈ {equivCny} ¥
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <button 
                                                    onClick={() => toggleManualPrice(off.item.id)}
                                                    className={`p-1.5 rounded-lg transition-all ${isManual ? 'bg-amber-100 text-amber-600' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                                                    title={isManual ? "Сохранить и заблокировать" : "Редактировать вручную"}
                                                >
                                                    <Edit3 size={12} />
                                                </button>
                                            </div>
                                        </div>

                                        <div>
                                            {currentStatus === 'В обработке' ? (
                                                <button 
                                                    onClick={() => {
                                                        // При выборе берем актуальную цену (локальную или авто)
                                                        handleLocalUpdateRank(order.id, off.offerId, item.name, off.item.rank || '', order.vin, off.item.sellerPrice, off.item.sellerCurrency, off.item.adminComment, off.item.deliveryRate, currentPriceRub);
                                                    }} 
                                                    className={`w-full py-2.5 rounded-xl font-black uppercase text-[9px] transition-all shadow-md ${isLeader ? 'bg-emerald-500 text-white scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                                >
                                                    {isLeader ? 'ЛИДЕР' : 'ВЫБРАТЬ'}
                                                </button>
                                            ) : (
                                                isLeader ? <div className="bg-emerald-100 text-emerald-600 p-2.5 rounded-xl flex items-center justify-center"><Check size={18}/></div> : <span className="text-slate-200">-</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    {/* МОБИЛЬНАЯ ВЕРСИЯ */}
                                    <div className="md:hidden w-full space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 truncate uppercase">{off.clientName}</span>
                                            </div>
                                            {isLeader && <span className="bg-emerald-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Winner</span>}
                                        </div>
                                        
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                                <span className="block text-[8px] font-black text-slate-400 uppercase mb-1">Закуп</span>
                                                <span className="font-black text-slate-700">{off.item.sellerPrice} {off.item.sellerCurrency}</span>
                                            </div>
                                            <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-center">
                                                <span className="block text-[8px] font-black text-indigo-400 uppercase mb-1">Для клиента (₽)</span>
                                                <span className="font-black text-indigo-700 text-lg">
                                                    {formatPrice(currentPriceRub)}
                                                </span>
                                                <span className="block text-[8px] text-indigo-400 mt-1">≈ {equivCny} ¥</span>
                                            </div>
                                        </div>
                                        
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => toggleManualPrice(off.item.id)}
                                                className={`flex-1 py-3 rounded-xl font-bold text-[10px] uppercase flex items-center justify-center gap-2 border-2 ${isManual ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-slate-50 border-slate-100 text-slate-500'}`}
                                            >
                                                <Edit3 size={14} /> {isManual ? 'Сохранить' : 'Изм. цену'}
                                            </button>
                                            {currentStatus === 'В обработке' && (
                                                <button 
                                                    onClick={() => handleLocalUpdateRank(order.id, off.offerId, item.name, off.item.rank || '', order.vin, off.item.sellerPrice, off.item.sellerCurrency, off.item.adminComment, off.item.deliveryRate, currentPriceRub)}
                                                    className={`flex-1 py-3 rounded-xl font-black uppercase text-[10px] shadow-sm ${isLeader ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}
                                                >
                                                    {isLeader ? 'ВЫБРАНО' : 'ВЫБРАТЬ'}
                                                </button>
                                            )}
                                        </div>
                                        
                                        {isManual && (
                                            <input 
                                                type="text"
                                                className="w-full p-3 border-2 border-amber-300 rounded-xl text-center font-black text-lg text-amber-800 outline-none bg-amber-50"
                                                value={currentPriceRub}
                                                onChange={(e) => handlePriceChange(priceKey, e.target.value)}
                                                placeholder="Введите цену..."
                                            />
                                        )}
                                    </div>
                                    
                                    <div className="col-span-full mt-1 flex gap-2">
                                        <input 
                                            type="text" 
                                            maxLength={90} 
                                            placeholder="Комментарий для клиента или заметка..." 
                                            className="flex-grow px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-[10px] text-slate-600 outline-none focus:border-indigo-300 transition-colors" 
                                            value={off.item.adminComment || ""} 
                                            onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminComment', e.target.value)}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            );
        })}
    </div>
  );
};