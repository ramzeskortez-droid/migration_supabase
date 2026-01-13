import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Camera, FileText, Paperclip } from 'lucide-react';
import { Order } from '../../types';

interface OperatorOrderItemsProps {
    order: Order;
    onCopyItem: (e: React.MouseEvent, item: any, idx: number) => void;
}

const PRODUCT_GRID = "grid-cols-[90px_100px_1fr_100px_80px_80px_80px]";
const OFFER_GRID = "grid-cols-[1.2fr_1fr_70px_80px_1.8fr_80px]";

export const OperatorOrderItems: React.FC<OperatorOrderItemsProps> = ({ order, onCopyItem }) => {
    const [openItems, setOpenItems] = useState<Set<string>>(new Set());

    const toggleItem = (itemId: string) => {
        setOpenItems(prev => {
            const next = new Set(prev);
            if (next.has(itemId)) next.delete(itemId);
            else next.add(itemId);
            return next;
        });
    };

    const formatPrice = (val?: number) => {
        if (!val) return '0';
        return new Intl.NumberFormat('ru-RU').format(val);
    };

    const getWinnersForItem = (item: any) => {
        const winners: any[] = [];
        const allowedStatuses = ['КП готово', 'КП отправлено', 'Ручная обработка', 'Архив', 'Выполнен', 'Обработано вручную'];

        if (order.offers && allowedStatuses.includes(order.statusManager || '')) {
            order.offers.forEach((off: any) => {
                if (!off.items) return;
                
                // Ищем позицию в оффере, которая соответствует текущей строке заказа
                const matching = off.items.find((i: any) => {
                    // 1. Приоритет: точное совпадение по ID
                    if (i.order_item_id && String(i.order_item_id) === String(item.id)) return true;
                    // 2. Фолбек: совпадение по имени (для старых данных)
                    if (!i.order_item_id && i.name?.trim().toLowerCase() === item.name?.trim().toLowerCase()) return true;
                    return false;
                });

                if (matching) {
                    if (order.statusManager === 'Ручная обработка' || matching.is_winner || matching.rank === 'ЛИДЕР' || matching.rank === 'LEADER') {
                        winners.push({ ...matching, supplierName: off.clientName }); // Добавляем имя поставщика для контекста
                    }
                }
            });
        }
        return winners;
    };

    // Helper to render file preview
    const renderFilesCell = (files: any[], legacyUrl?: string) => {
        // 1. New logic: itemFiles array
        if (files && files.length > 0) {
            const count = files.length;
            const firstFile = files[0];
            const isImage = firstFile.type?.startsWith('image/') || firstFile.url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
            
            // Логика отображения:
            // > 1 файла -> Иконка стопки файлов + бейдж
            // 1 файл (не фото) -> Иконка файла
            // 1 файл (фото) -> Превью
            const showStack = count > 1;
            const showPreview = count === 1 && isImage;

            return (
                <div className="relative group/files flex justify-center">
                    <div className="relative cursor-pointer">
                        {showPreview ? (
                            <img 
                                src={firstFile.url} 
                                alt="File" 
                                className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm bg-white" 
                            />
                        ) : (
                            <div className={`w-10 h-8 flex items-center justify-center rounded border shadow-sm ${showStack ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-gray-50 border-gray-200 text-gray-500'}`}>
                                {showStack ? <Copy size={16} /> : <FileText size={16} />}
                            </div>
                        )}
                        
                        {count > 1 && (
                            <div className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md z-10 border border-white">
                                {count}
                            </div>
                        )}
                    </div>

                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 p-2 opacity-0 invisible group-hover/files:opacity-100 group-hover/files:visible transition-all duration-200 z-[999]">
                        <div className="text-[9px] font-bold text-gray-400 uppercase mb-1 px-1">Файлы позиции ({count})</div>
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto custom-scrollbar">
                            {files.map((f, i) => (
                                <a 
                                    key={i} 
                                    href={f.url} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="flex items-center gap-2 p-1.5 hover:bg-indigo-50 rounded text-[10px] font-medium text-gray-700 hover:text-indigo-700 transition-colors truncate"
                                >
                                    {f.type?.startsWith('image/') ? <Camera size={12}/> : <Paperclip size={12}/>}
                                    <span className="truncate">{f.name}</span>
                                </a>
                            ))}
                        </div>
                        {/* Стрелочка тултипа */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></div>
                    </div>
                </div>
            );
        }

        // 2. Fallback: Legacy photo_url
        if (legacyUrl) {
            return (
                <a href={legacyUrl} target="_blank" rel="noreferrer" onClick={(e) => e.stopPropagation()} className="hover:opacity-80 transition-opacity flex justify-center">
                    <img src={legacyUrl} alt="Заявка" className="w-10 h-8 object-cover rounded border border-gray-300 shadow-sm" />
                </a>
            );
        }

        return <span className="text-gray-300 text-[10px] text-center block">-</span>;
    };

    if (!order.items || order.items.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-4 p-8">
                <div className="text-center text-[10px] font-bold text-slate-300 uppercase italic">Позиции не найдены</div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mt-4">
            {/* Header */}
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

            {/* List */}
            <div className="divide-y divide-gray-200">
                {order.items.map((item, idx) => {
                    const isItemExpanded = openItems.has(item.id);
                    const winners = getWinnersForItem(item);
                    const isLast = idx === order.items.length - 1;
                    const isProcessed = ['КП готово', 'КП отправлено', 'Ручная обработка', 'Архив', 'Выполнен', 'Обработано вручную'].includes(order.statusManager || '');

                    return (
                        <div key={idx} className={`border-b border-gray-100 last:border-b-0 ${isLast ? 'rounded-b-xl' : ''}`}>
                            {/* Main Item Row */}
                            <div 
                                onClick={() => (winners.length > 0 || isProcessed) && toggleItem(item.id)}
                                className={`bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 transition-colors group/row ${(winners.length > 0 || isProcessed) ? 'cursor-pointer' : ''} ${isLast && !isItemExpanded ? 'rounded-b-xl' : ''}`}
                            >
                                <div className={`grid grid-cols-1 md:${PRODUCT_GRID} gap-4 items-center px-6 py-3`}>
                                    <div className="flex items-center gap-2">
                                        {(winners.length > 0 || isProcessed) && (
                                            <div className="hover:bg-gray-200 rounded-lg p-1 transition-colors">
                                                {isItemExpanded ? <ChevronDown size={14} className="text-gray-600"/> : <ChevronRight size={14} className="text-gray-600"/>}
                                            </div>
                                        )}
                                        <div className="text-gray-600 font-mono font-bold text-xs">{idx + 1}</div>
                                        {['КП готово', 'КП отправлено', 'Ручная обработка', 'Архив', 'Выполнен'].includes(order.statusManager || '') && (
                                            <button 
                                                onClick={(e) => onCopyItem(e, item, idx)}
                                                className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-xl transition-all shadow-sm border border-indigo-100 group/copy ml-1"
                                                title="Скопировать позицию"
                                            >
                                                <Copy size={12} className="group-hover/copy:scale-110 transition-transform" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="text-indigo-600 font-black uppercase text-[11px] truncate">{item.brand || '-'}</div>
                                    <div className="font-black text-gray-900 uppercase text-[12px] tracking-tight truncate">
                                        {item.AdminName || item.name}
                                    </div>
                                    <div className="text-gray-600 font-mono text-[10px] truncate">{item.article || '-'}</div>
                                    <div className="text-gray-700 text-center font-black text-xs">{item.quantity}</div>
                                    <div className="text-gray-600 text-center text-[10px] font-bold uppercase">{item.uom || 'шт'}</div>
                                    
                                    {/* Files Column */}
                                    <div>
                                        {renderFilesCell(item.itemFiles, item.opPhotoUrl)}
                                    </div>
                                </div>
                            </div>

                            {/* Winners (Variants) Row */}
                            {isItemExpanded && (
                                <div className={`bg-white animate-in slide-in-from-top-1 duration-200 overflow-x-auto ${isLast ? 'rounded-b-xl' : ''}`}>
                                    {winners.length > 0 ? (
                                        <>
                                            <div className="bg-slate-800 text-white hidden md:block min-w-[1000px]">
                                                <div className={`grid ${OFFER_GRID} gap-4 px-6 py-2 text-[8px] font-black uppercase tracking-widest items-center`}>
                                                    <div>Варианты</div>
                                                    <div>Бренд</div>
                                                    <div className="text-center">Кол-во</div>
                                                    <div className="text-center">Фото</div>
                                                    <div className="text-left">Цена с учетом доставки</div>
                                                    <div className="text-center">Срок</div>
                                                </div>
                                            </div>

                                            <div className="min-w-[1000px] divide-y divide-gray-100">
                                                {winners.map((win, wIdx) => (
                                                    <div key={wIdx} className="relative transition-all duration-300 bg-emerald-50/30">
                                                        <div className={`grid grid-cols-1 md:${OFFER_GRID} gap-4 px-6 py-3 items-center`}>
                                                            <div className="flex items-center gap-2 font-black text-emerald-700 uppercase text-[10px]">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                                                                Вариант {wIdx + 1}
                                                            </div>
                                                            <div className="text-indigo-600 font-black uppercase text-[10px] truncate">{win.brand || '-'}</div>
                                                            <div className="text-gray-700 text-center font-bold text-xs">{win.offeredQuantity || win.quantity}</div>
                                                            
                                                            {/* Files Column for Offer Item */}
                                                            <div>
                                                                {renderFilesCell(win.itemFiles, win.photoUrl)}
                                                            </div>

                                                            <div className="text-base font-black text-gray-900 leading-none text-left">
                                                                {formatPrice(win.adminPrice || win.sellerPrice)} ₽
                                                            </div>
                                                            <div className="text-orange-600 text-center font-black text-[11px] leading-none">{win.clientDeliveryWeeks || win.deliveryWeeks || '-'} нед.</div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="p-4 bg-slate-50 text-center text-[10px] font-bold text-slate-400 uppercase italic tracking-widest">
                                            Предложений нет или поставщик не выбран
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
