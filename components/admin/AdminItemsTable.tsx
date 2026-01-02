import React, { useState } from 'react';
import { CheckCircle2, Zap, Clock, FileText, Check, ClipboardList, MessageCircle } from 'lucide-react';
import { Order, OrderItem, RankType, Currency } from '../../types';
import { ChatModal } from '../shared/ChatModal';

interface AdminItemsTableProps {
  order: Order;
  isEditing: boolean;
  editForm: { [key: string]: string };
  setEditForm: (form: any) => void;
  handleItemChange: (orderId: string, offerId: string, itemName: string, field: string, value: any) => void;
  handleLocalUpdateRank: (offerId: string, itemName: string, currentRank: RankType, vin: string, adminPrice?: number, adminCurrency?: Currency, adminComment?: string, deliveryRate?: number) => void;
  currentStatus: string;
  openRegistry: Set<string>;
  toggleRegistry: (id: string) => void;
}

export const AdminItemsTable: React.FC<AdminItemsTableProps> = ({
  order, isEditing, editForm, setEditForm, handleItemChange, handleLocalUpdateRank, currentStatus, openRegistry, toggleRegistry
}) => {
  const [chatState, setChatState] = useState<{ isOpen: boolean, offerId?: string, supplierName: string } | null>(null);

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
            let minDelivery = Infinity;
            itemOffers.forEach(o => {
                if (o.item.sellerPrice < minPrice) minPrice = o.item.sellerPrice;
                if (o.item.deliveryWeeks !== undefined && o.item.deliveryWeeks < minDelivery) minDelivery = o.item.deliveryWeeks;
            });

            const leaders = itemOffers.filter(o => o.item.rank === 'ЛИДЕР' || o.item.rank === 'LEADER');
            const others = itemOffers.filter(o => o.item.rank !== 'ЛИДЕР' && o.item.rank !== 'LEADER');
            const showRegistry = currentStatus !== 'В обработке';
            const displayOffers = showRegistry ? leaders : itemOffers;
            const hiddenCount = showRegistry ? others.length : 0;
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
                    <div className="hidden md:grid grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.5fr_1fr_0.8fr_1fr] gap-2 px-6 py-3 bg-white/5 text-[9px] font-black text-slate-500 uppercase tracking-[0.15em] items-center text-center">
                        <div className="text-left">Поставщик</div><div>Цена Пост.</div><div>Кол-во</div><div>Вес</div><div>Срок</div><div>Фото</div><div>Доставка</div><div>ЦЕНА АДМИН</div><div>Валюта</div><div></div>
                    </div>
                    <div className="bg-white p-2 space-y-1">
                        {displayOffers.map((off, oIdx) => {
                            const isLeader = off.item.rank === 'ЛИДЕР' || off.item.rank === 'LEADER';
                            const isBestPrice = off.item.sellerPrice === minPrice && minPrice !== Infinity;
                            const isBestDelivery = off.item.deliveryWeeks === minDelivery && minDelivery !== Infinity;

                            return (
                                <div key={oIdx} className={`p-2 rounded-lg border items-center text-[10px] ${isLeader ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100'} md:grid md:grid-cols-[2fr_1fr_0.5fr_0.5fr_0.5fr_0.5fr_1.5fr_1fr_0.8fr_1fr] md:gap-2 flex flex-col gap-3 relative`}>
                                    <div className="hidden md:contents text-center font-bold text-slate-700">
                                        <div className="font-black uppercase text-slate-800 truncate text-left flex flex-col gap-1" title={off.clientName}>
                                        <div className="flex items-center gap-2">
                                            {off.clientName}
                                            {isLeader && <CheckCircle2 size={14} className="text-emerald-500"/>}
                                            <button 
                                                onClick={() => setChatState({ isOpen: true, offerId: off.offerId, supplierName: off.clientName })}
                                                className="p-1.5 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-colors"
                                                title="Чат с поставщиком"
                                            >
                                                <MessageCircle size={12} />
                                            </button>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {isBestPrice && <span className="bg-indigo-600 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm flex items-center gap-0.5"><Zap size={8}/> Лучшая цена</span>}
                                            {isBestDelivery && <span className="bg-amber-500 text-white text-[7px] px-1.5 py-0.5 rounded-md font-black uppercase shadow-sm flex items-center gap-0.5"><Clock size={8}/> Лучший срок</span>}
                                        </div>
                                        </div>
                                        <div className="text-slate-900 font-black">{off.item.sellerPrice} {off.item.sellerCurrency}</div>
                                        <div className="text-slate-500">{off.item.offeredQuantity}</div>
                                        <div className="text-indigo-600 font-black bg-indigo-50 px-2 py-1 rounded-lg">{off.item.weight ? `${off.item.weight} кг` : '-'}</div>
                                        <div className="text-amber-600 font-black bg-amber-50 px-2 py-1 rounded-lg">{off.item.deliveryWeeks ? `${off.item.deliveryWeeks} н.` : '-'}</div>
                                        <div className="flex justify-center">{off.item.photoUrl ? (<a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="p-2 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm"><FileText size={16}/></a>) : <span className="text-slate-200">-</span>}</div>
                                        
                                        {/* Delivery Input Fix: Value is empty string if null/0 so placeholder shows */}
                                        <div>
                                            <input 
                                                type="number" 
                                                className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl text-center font-black text-xs focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none" 
                                                onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'deliveryRate', e.target.value === '' ? null : Number(e.target.value))} 
                                                value={off.item.deliveryRate || ''} 
                                                placeholder="Стоим..." 
                                                disabled={order.isProcessed}
                                                title="Введите стоимость доставки"
                                            />
                                        </div>

                                        <div><input type="number" className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl text-center font-black text-xs focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminPrice', e.target.value === '' ? null : Number(e.target.value))} value={off.item.adminPrice ?? ''} placeholder={String(off.item.sellerPrice || 0)} disabled={order.isProcessed}/></div>
                                        <div><select className="w-full px-2 py-2 border-2 border-slate-100 rounded-xl font-black text-[10px] uppercase focus:border-indigo-300 transition-all" value={off.item.adminCurrency || off.item.sellerCurrency} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminCurrency', e.target.value)} disabled={order.isProcessed}><option value="CNY">CNY</option><option value="RUB">RUB</option><option value="USD">USD</option></select></div>
                                        <div>{currentStatus === 'В обработке' ? (<button onClick={() => handleLocalUpdateRank(off.offerId, item.name, off.item.rank || '', order.vin, off.item.adminPrice, off.item.adminCurrency, off.item.adminComment, off.item.deliveryRate)} className={`w-full py-2 rounded-xl font-black uppercase text-[8px] transition-all shadow-md ${isLeader ? 'bg-emerald-500 text-white scale-105' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>{isLeader ? 'ЛИДЕР' : 'ВЫБРАТЬ'}</button>) : (isLeader ? <div className="bg-emerald-100 text-emerald-600 p-2 rounded-xl flex items-center justify-center"><Check size={18}/></div> : <span className="text-slate-200">-</span>)}</div>
                                    </div>
                                    
                                    {/* Supplier Comment Display */}
                                    {off.item.comment && (
                                        <div className="flex items-start gap-2 mt-2 px-2">
                                            <div className="bg-blue-50 text-blue-600 px-2 py-1 rounded-tr-xl rounded-bl-xl rounded-br-xl text-[9px] font-bold shadow-sm relative border border-blue-100">
                                                <span className="absolute -top-1.5 -left-1 w-2 h-2 bg-blue-50 border-l border-t border-blue-100 transform -rotate-45"></span>
                                                <span className="opacity-70 text-[8px] uppercase block mb-0.5">Вопрос поставщика:</span>
                                                {off.item.comment}
                                            </div>
                                        </div>
                                    )}

                                    <div className="md:hidden w-full space-y-4">
                                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                                            <div className="flex items-center gap-2">
                                                <span className="font-black text-slate-800 truncate uppercase">{off.clientName}</span>
                                                <button 
                                                    onClick={() => setChatState({ isOpen: true, offerId: off.offerId, supplierName: off.clientName })}
                                                    className="p-1.5 rounded-full bg-indigo-50 text-indigo-600"
                                                >
                                                    <MessageCircle size={14} />
                                                </button>
                                            </div>
                                            {isLeader && <span className="bg-emerald-500 text-white text-[7px] px-1.5 py-0.5 rounded font-black tracking-widest uppercase">Winner</span>}
                                        </div>
                                        <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg text-[8px] text-center border border-slate-100">
                                            <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Цена Пост</span><span className="font-black text-slate-700">{off.item.sellerPrice} {off.item.sellerCurrency}</span></div>
                                            <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Кол-во</span><span className="font-black text-slate-700">{off.item.offeredQuantity}</span></div>
                                            <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Вес Пост</span><span className="font-black text-indigo-600">{off.item.weight || '-'} кг</span></div>
                                            <div><span className="block text-slate-400 font-bold uppercase mb-0.5">Срок Пост</span><span className="font-black text-amber-600">{off.item.deliveryWeeks || '-'} н</span></div>
                                        </div>
                                        {off.item.photoUrl && (<div className="flex justify-center p-1 bg-blue-50 rounded-lg"><a href={off.item.photoUrl} target="_blank" rel="noreferrer" className="text-[8px] font-black text-blue-600 flex items-center gap-1 uppercase"><FileText size={10}/> Посмотреть фото</a></div>)}
                                        <div className="grid grid-cols-3 gap-3 bg-white p-2 rounded-lg text-[8px] text-center border border-indigo-50 shadow-inner">
                                            <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Цена Продажи</label><div className="relative"><input type="number" className="w-full p-2 border border-indigo-100 rounded-lg text-center font-black text-indigo-600 bg-indigo-50/30" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminPrice', e.target.value === '' ? null : Number(e.target.value))} value={off.item.adminPrice ?? ''} placeholder={String(off.item.sellerPrice || 0)} disabled={order.isProcessed}/></div></div>
                                            <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Валюта</label><select className="w-full p-2 border border-indigo-100 rounded-lg font-black uppercase text-indigo-600 bg-white" value={off.item.adminCurrency || off.item.sellerCurrency} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminCurrency', e.target.value)} disabled={order.isProcessed}><option value="CNY">CNY</option><option value="RUB">RUB</option><option value="USD">USD</option></select></div>
                                            <div className="space-y-1"><label className="block text-indigo-500 font-black uppercase mb-0.5 text-[7px]">Тариф (Дост)</label><input type="number" className="w-full p-2 border border-indigo-100 rounded-lg font-black text-indigo-600 bg-white text-center" onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'deliveryRate', e.target.value === '' ? null : Number(e.target.value))} value={off.item.deliveryRate ?? ''} placeholder="0" disabled={order.isProcessed}/></div>
                                        </div>
                                        <div className="flex gap-2"><div className="flex-grow">{currentStatus === 'В обработке' ? (<button onClick={() => handleLocalUpdateRank(off.offerId, item.name, off.item.rank || '', order.vin, off.item.adminPrice, off.item.adminCurrency, off.item.adminComment, off.item.deliveryRate)} className={`w-full py-3 rounded-xl font-black uppercase text-[10px] shadow-sm ${isLeader ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white'}`}>{isLeader ? 'ЛИДЕР' : 'ВЫБРАТЬ'}</button>) : (isLeader ? <div className="w-full py-2 bg-emerald-100 text-emerald-600 rounded text-center font-black uppercase text-[9px] flex items-center justify-center gap-1"><Check size={12}/> Выбран</div> : <div className="w-full py-2 bg-slate-100 text-slate-400 rounded text-center text-[9px] uppercase font-bold">Резерв</div>)}</div></div>
                                    </div>
                                    
                                    <div className="col-span-full mt-1"><input type="text" maxLength={90} placeholder="Комментарий..." className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-[9px] text-slate-500 outline-none focus:border-indigo-300 transition-colors shadow-inner" value={off.item.adminComment || ""} onChange={(e) => handleItemChange(order.id, off.offerId, item.name, 'adminComment', e.target.value)}/></div>
                                </div>
                            );
                        })}
                        {hiddenCount > 0 && (
                            <div className="mt-2 border-t border-slate-100 pt-2">
                                <button onClick={() => toggleRegistry(item.name)} className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-[9px] font-bold text-slate-500 uppercase flex items-center justify-center gap-2"><ClipboardList size={12}/> Реестр остальных предложений ({hiddenCount})</button>
                                {isRegistryOpen && <div className="mt-2 space-y-1 animate-in slide-in-from-top-2 fade-in">{others.map((off, oIdx) => (<div key={oIdx} className="flex gap-4 p-2 rounded border border-slate-100 bg-slate-50 items-center text-[9px] opacity-75 grayscale-[0.5]"><div className="font-bold text-slate-600 w-32 truncate uppercase">{off.clientName}</div><div className="font-mono text-slate-500">{off.item.sellerPrice} {off.item.sellerCurrency}</div><div className="flex-grow text-right text-[8px] text-slate-300 uppercase font-black">Резерв</div></div>))}</div>}
                            </div>
                        )}
                    </div>
                </div>
            );
        })}
        {chatState && (
            <ChatModal 
                isOpen={chatState.isOpen}
                onClose={() => setChatState(null)}
                orderId={order.id}
                offerId={chatState.offerId}
                supplierName={chatState.supplierName}
                currentUserRole="ADMIN"
            />
        )}
    </div>
  );
};