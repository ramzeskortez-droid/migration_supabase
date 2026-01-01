import React, { useMemo, useState } from 'react';
import { ChevronDown, Package, MoreHorizontal, Clock, ShoppingCart, AlertCircle, CheckCircle2, Loader2, Copy, Check } from 'lucide-react';
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
    const [copied, setCopied] = useState(false);
    const currentStatus = order.workflowStatus || 'В обработке';
    const displayStatus = currentStatus;
    const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
    const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['В обработке'];

    const handleCopyId = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(order.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

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
        <div className={`transition-all duration-500 border-l-4 border-b border-slate-200 ${isExpanded ? 'border-l-indigo-600 bg-indigo-50/10' : 'border-l-transparent bg-white hover:bg-slate-50'}`}>
            <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 cursor-pointer" onClick={() => onToggle(order.id)}>
            <div className="flex items-center justify-between md:justify-start">
                <div className="flex items-center gap-1 group/id" onClick={handleCopyId}>
                    <span className="font-mono font-bold text-[10px] text-slate-500 group-hover/id:text-indigo-600 transition-colors">{order.id}</span>
                    {copied ? <Check size={10} className="text-emerald-500"/> : <Copy size={10} className="text-slate-300 opacity-0 group-hover/id:opacity-100 transition-all"/>}
                </div>
                <div className="md:hidden flex items-center gap-2 max-w-[60%] justify-end">
                        <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span>
                        <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                </div>
            </div>
            <div className="font-bold text-[10px] uppercase truncate break-words leading-tight text-slate-900">{order.car?.AdminModel || order.car?.model || 'N/A'}</div>
            <div className="font-mono text-[9px] text-slate-400 hidden md:block truncate">{order.vin}</div>
            <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Package size={10}/> {order.items.length}</div>
            <div className="text-[9px] font-bold text-slate-400 hidden md:block">{order.createdAt.split(',')[0]}</div>
            <div className="hidden md:flex justify-end"><span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span></div>
            <div className="hidden md:flex justify-end"><MoreHorizontal size={14} className="text-slate-300" /></div>
            </div>

            {isExpanded && (
            <div className="bg-white border-t border-slate-100 p-6 animate-in slide-in-from-top-2 shadow-inner">
                {currentStatus !== 'В обработке' && !isCancelled && (
                    <div className="mb-8">
                        <div className="hidden md:block relative px-2">
                            <div className="absolute top-2.5 left-0 right-0 h-1 bg-slate-100 rounded-full">
                                <div className={`h-full bg-indigo-500 transition-all rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]`} style={{ width: `${(STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus) / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
                            </div>
                            <div className="relative flex justify-between">
                                {STATUS_STEPS.map((step, idx) => {
                                    const isPassed = idx <= STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus);
                                    const isCurrent = step === (currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus);
                                    return (
                                        <div key={step} className="flex flex-col items-center">
                                            <div className={`w-6 h-6 rounded-full border-2 transition-all flex items-center justify-center ${isPassed ? 'border-indigo-500 bg-white text-indigo-500' : 'border-slate-200 bg-white text-slate-200'} ${isCurrent ? 'ring-4 ring-indigo-50' : ''}`}>
                                                {isPassed ? <CheckCircle2 size={12} /> : <div className="w-1.5 h-1.5 rounded-full bg-current"></div>}
                                            </div>
                                            <span className={`mt-2 text-[7px] font-black uppercase text-center max-w-[70px] ${isPassed ? 'text-slate-900' : 'text-slate-300'}`}>{step}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                <div className="space-y-4">
                    {winningItems.length > 0 ? (
                        <div className="space-y-3">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2"><Package size={12}/> Выбранные предложения</h4>
                            {winningItems.map((item, idx) => {
                                const price = item.adminPrice || item.sellerPrice || 0;
                                const rate = item.deliveryRate || 0;
                                const currency = getCurrencySymbol(item.adminCurrency);
                                
                                return (
                                    <div key={idx} className="p-4 bg-white rounded-2xl border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:border-indigo-200 transition-colors shadow-sm">
                                        <div className="flex-grow space-y-2">
                                            <div className="text-sm font-black uppercase text-slate-900 tracking-tight">{item.AdminName || item.name}</div>
                                            <div className="flex flex-wrap gap-2 items-center">
                                                <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-1 rounded-md font-bold uppercase">{item.category}</span>
                                                <span className="text-[9px] bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md font-bold uppercase">{item.quantity || 1} шт.</span>
                                                {item.photoUrl && (
                                                    <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 flex items-center gap-1 hover:text-indigo-800 transition-colors"><CheckCircle2 size={10}/> Фото</a>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-3 items-center pt-1">
                                                {item.deliveryWeeks && (
                                                    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
                                                        <Clock size={10}/>
                                                        <span className="text-[9px] font-black uppercase">Срок: {item.deliveryWeeks} нед.</span>
                                                    </div>
                                                )}
                                                <span className="text-[10px] font-bold text-slate-400 uppercase">
                                                    Цена ед: <span className="text-slate-700">{price.toLocaleString()} {currency}</span>
                                                    {rate > 0 && <span className="ml-2">Доставка: <span className="text-indigo-600">{rate.toLocaleString()} {currency}</span></span>}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right w-full md:w-auto pt-4 md:pt-0 border-t md:border-t-0 border-slate-50">
                                            <div className="text-xl font-black text-slate-900 tracking-tighter">
                                                {( (item.totalCost !== undefined) ? item.totalCost : ((price * (item.quantity || 1)) + rate)).toLocaleString()} {currency}
                                            </div>
                                            <div className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Итого</div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Clock size={12}/> Запрос в обработке</h4>
                            {order.items.map((item, i) => (
                            <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 flex justify-between items-center border-dashed">
                                <div>
                                    <p className="text-xs font-black uppercase text-slate-800">{item.AdminName || item.name}</p>
                                    <p className="text-[9px] font-bold text-slate-400 uppercase mt-1">{item.category} &bull; {item.quantity} шт.</p>
                                </div>
                                <div className="px-3 py-1 bg-white border border-slate-200 rounded-full shadow-sm animate-pulse">
                                    <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Ждем цены</span>
                                </div>
                            </div>
                            ))}
                        </div>
                    )}
                </div>

                {!order.readyToBuy && !isCancelled && (
                    <div className="bg-slate-900 text-white p-6 rounded-[2rem] flex flex-col md:flex-row justify-between items-center gap-8 mt-8 shadow-2xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="w-full md:w-auto relative z-10">
                            {currentStatus === 'В обработке' ? (
                                <div className="space-y-1">
                                    <span className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] block">Status</span>
                                    <div className="text-2xl font-black leading-none uppercase tracking-tight">Заявка на расчете</div>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-4">
                                    <div className="grid grid-cols-2 gap-x-8 gap-y-1">
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Товары:</span>
                                        <span className="text-xs font-black text-right">{goodsTotal.toLocaleString()} {currencySymbol}</span>
                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Доставка:</span>
                                        <span className="text-xs font-black text-right text-indigo-400">{deliveryTotal.toLocaleString()} {currencySymbol}</span>
                                    </div>
                                    <div className="pt-3 border-t border-white/10">
                                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block mb-1">К оплате:</span>
                                        <div className="text-4xl font-black text-white tracking-tighter leading-none">{totalSum.toLocaleString()} <span className="text-indigo-500">{currencySymbol}</span></div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto relative z-10">
                            <button onClick={(e) => onRefuse(e, order)} className="px-6 py-4 rounded-2xl font-black text-[10px] uppercase bg-white/5 text-slate-400 hover:bg-red-500 hover:text-white transition-all border border-white/10 active:scale-95">Отказаться</button>
                            {showReadyToBuy && (
                                <button onClick={() => onConfirmPurchase(order.id)} disabled={isConfirming} className="px-12 py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all flex items-center justify-center gap-3 shadow-[0_10px_20px_rgba(79,70,229,0.3)] active:scale-95">
                                    {isConfirming ? <Loader2 size={18} className="animate-spin"/> : <ShoppingCart size={18}/>} Готов купить
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