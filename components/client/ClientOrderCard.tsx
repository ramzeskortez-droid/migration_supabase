import React, { useMemo } from 'react';
import { ChevronDown, Package, MoreHorizontal, Clock, ShoppingCart, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { STATUS_CONFIG, STATUS_STEPS } from '../../constants/statusStyles';

interface ClientOrderCardProps {
  order: Order;
  isExpanded: boolean;
  onToggle: (id: string) => void;
  onConfirmPurchase: (id: string) => void;
  onRefuse: (e: React.MouseEvent, order: Order) => void;
  isConfirming: boolean;
}

export const ClientOrderCard: React.FC<ClientOrderCardProps> = React.memo(({ 
  order, 
  isExpanded, 
  onToggle, 
  onConfirmPurchase, 
  onRefuse, 
  isConfirming 
}) => {
    const currentStatus = order.workflowStatus || 'В обработке';
    const displayStatus = currentStatus;
    const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
    const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['В обработке'];

    const getCurrencySymbol = (curr: string = 'RUB') => {
        switch(curr) { case 'USD': return '$'; case 'CNY': return '¥'; default: return '₽'; }
    };

    // Winning items helper
    const winningItems: any[] = useMemo(() => {
        const items: any[] = [];
        order.offers?.forEach(offer => {
            offer.items.forEach(item => {
                if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') {
                    items.push({
                        ...item,
                        supplierName: offer.clientName
                    });
                }
            });
        });
        return items;
    }, [order.offers]);

    // Расчет сумм (Серверные поля + Fallback)
    const { goodsTotal, deliveryTotal, totalSum, currencySymbol } = useMemo(() => {
        const goods = winningItems.reduce((acc, item) => {
             if (item.goodsCost !== undefined && item.goodsCost !== null) return acc + item.goodsCost;
             return acc + ((item.adminPrice || item.sellerPrice || 0) * (item.quantity || 1));
        }, 0);

        const delivery = winningItems.reduce((acc, item) => acc + (item.deliveryRate || 0), 0);
        
        const total = winningItems.reduce((acc, item) => {
            if (item.totalCost !== undefined && item.totalCost !== null) return acc + item.totalCost;
            return acc + ((item.adminPrice || item.sellerPrice || 0) * (item.quantity || 1)) + (item.deliveryRate || 0);
        }, 0);

        const symbol = getCurrencySymbol(winningItems[0]?.adminCurrency);
        
        return { goodsTotal: goods, deliveryTotal: delivery, totalSum: total, currencySymbol: symbol };
    }, [winningItems]);

    const showReadyToBuy = (currentStatus === 'КП отправлено') && winningItems.length > 0;

    return (
        <div className={`transition-all duration-500 border-l-4 border-b border-slate-200 ${isExpanded ? 'border-l-indigo-600' : 'border-l-transparent'}`}>
            <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 cursor-pointer" onClick={() => onToggle(order.id)}>
            <div className="flex items-center justify-between md:justify-start">
                <span className="font-mono font-bold text-[10px]">{order.id}</span>
                <div className="md:hidden flex items-center gap-2 max-w-[60%] justify-end">
                        <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span>
                        <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            <div className="font-bold text-[10px] uppercase truncate break-words leading-tight">{order.car?.AdminModel || order.car?.model || 'N/A'}</div>
            <div className="font-mono text-[10px] text-slate-500 hidden md:block truncate break-words leading-tight">{order.vin}</div>
            <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Package size={10}/> {order.items.length}</div>
            <div className="text-[9px] font-bold text-slate-400 hidden md:block">{order.createdAt.split(',')[0]}</div>
            <div className="hidden md:flex justify-end"><span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span></div>
            <div className="hidden md:flex justify-end"><MoreHorizontal size={14} className="text-slate-300" /></div>
            </div>

            {isExpanded && (
            <div className="bg-white border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
                {currentStatus !== 'В обработке' && (
                    <div className="mb-6">
                        <div className="hidden md:block relative px-2 mb-8">
                            <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-slate-100">
                                <div className={`h-full bg-emerald-500 transition-all`} style={{ width: `${(STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus) / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
                            </div>
                            <div className="relative flex justify-between">
                                {STATUS_STEPS.map((step, idx) => {
                                    const isPassed = idx <= STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus);
                                    return (
                                        <div key={step} className="flex flex-col items-center">
                                            <div className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${isPassed ? 'border-emerald-500 text-emerald-500' : 'border-slate-200'}`}>
                                                {isPassed && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                            </div>
                                            <span className="mt-2 text-[7px] font-black uppercase text-slate-400 text-center max-w-[60px]">{step}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-3">
                    {winningItems.length > 0 ? (
                        <div className="space-y-3">
                            {winningItems.map((item, idx) => {
                                const price = item.adminPrice || item.sellerPrice || 0;
                                const rate = item.deliveryRate || 0;
                                const currency = getCurrencySymbol(item.adminCurrency);
                                
                                return (
                                    <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                        <div className="flex-grow">
                                            <div className="text-xs font-black uppercase text-slate-900 mb-1">{item.AdminName || item.name}</div>
                                            <div className="flex flex-wrap gap-3 items-center mb-2">
                                                <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category} &bull; {item.quantity || 1} шт.</span>
                                                {item.photoUrl && (
                                                    <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 border-b border-indigo-200 uppercase leading-none pb-0.5">Посмотреть фото</a>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                {item.deliveryWeeks && (
                                                    <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 font-black uppercase shadow-sm flex items-center gap-1">
                                                        <Clock size={12}/> Срок: {item.deliveryWeeks} нед.
                                                    </span>
                                                )}
                                                <span className="text-[9px] font-bold text-slate-500">
                                                    Цена: {price} {currency} {rate > 0 && <span className="text-indigo-600 ml-1">+ Доставка {rate} {currency} (за всю позицию)</span>}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                            <div className="text-lg font-black text-slate-900">
                                                {( (item.totalCost !== undefined) ? item.totalCost : ((price * (item.quantity || 1)) + rate)).toLocaleString()} {currency}
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-400 uppercase">Итого за позицию</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {order.items.map((item, i) => (
                            <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                <div>
                                    <p className="text-[11px] font-black uppercase text-slate-800">{item.AdminName || item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase">{item.category} &bull; {item.quantity} шт.</p>
                                </div>
                                <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Обработка</span>
                                </div>
                            </div>
                            ))}
                        </div>
                    )}
                </div>

                {!order.readyToBuy && !isCancelled && (
                    <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 mt-4 shadow-xl border border-white/10">
                        <div className="w-full md:w-auto space-y-2">
                            {currentStatus === 'В обработке' ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Статус заявки</span>
                                    <div className="text-xl font-black leading-none uppercase">В ОБРАБОТКЕ</div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-1">
                                    <div className="flex justify-between md:justify-start md:gap-4 items-center border-b border-white/5 pb-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Итого по позициям:</span>
                                        <span className="text-xs font-black">{goodsTotal.toLocaleString()} {currencySymbol}</span>
                                    </div>
                                    <div className="flex justify-between md:justify-start md:gap-4 items-center border-b border-white/5 pb-1">
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Итого доставка:</span>
                                        <span className="text-xs font-black text-indigo-400">{deliveryTotal.toLocaleString()} {currencySymbol}</span>
                                    </div>
                                    <div className="flex justify-between md:justify-start md:gap-4 items-center pt-1">
                                        <span className="text-[10px] font-black text-white uppercase tracking-wider">Итого к оплате:</span>
                                        <span className="text-2xl font-black text-emerald-400 leading-none">{totalSum.toLocaleString()} {currencySymbol}</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3 w-full md:w-auto">
                            <button onClick={(e) => onRefuse(e, order)} className="flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition-all border border-white/5">Отказаться</button>
                            {showReadyToBuy && (
                                <button onClick={() => onConfirmPurchase(order.id)} disabled={isConfirming} className="flex-[2] md:flex-none px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                                    {isConfirming ? <Loader2 size={16} className="animate-spin"/> : <ShoppingCart size={16}/>} Готов купить
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
            )}
        </div>
    );
});