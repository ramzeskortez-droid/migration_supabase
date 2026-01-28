import React, { useState } from 'react';
import { FileText, Copy, Paperclip, Camera, ChevronDown, ChevronUp, Edit2, Check, X, Calendar } from 'lucide-react';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { createPortal } from 'react-dom';
import { SupabaseService } from '../../services/supabaseService';
import { useQueryClient } from '@tanstack/react-query';

interface OperatorClientInfoProps {
    order: Order;
    subject: string;
    onUpdate?: () => void;
}

export const OperatorClientInfo: React.FC<OperatorClientInfoProps> = ({ order, subject, onUpdate }) => {
    const queryClient = useQueryClient();
    const [toast, setToast] = useState<{message: string} | null>(null);

    const toIsoDate = (dateStr?: string) => {
        if (!dateStr) return '';
        // Если уже ISO (2026-01-28)
        if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
        // Если RU (28.01.2026)
        const parts = dateStr.split('.');
        if (parts.length === 3) return `${parts[2]}-${parts[1]}-${parts[0]}`;
        return '';
    };

    const toRuDate = (isoStr: string) => {
        if (!isoStr) return null;
        const [y, m, d] = isoStr.split('-');
        return `${d}.${m}.${y}`;
    };

    // Deadline Edit State
    const [isEditingDeadline, setIsEditingDeadline] = useState(false);
    const [newDeadline, setNewDeadline] = useState(toIsoDate(order.deadline));
    const [isSavingDeadline, setIsSavingDeadline] = useState(false);

    // Sync state if order changes
    React.useEffect(() => {
        setNewDeadline(toIsoDate(order.deadline));
    }, [order.deadline]);

    const isArchived = ['Архив', 'Аннулирован', 'Отказ', 'Выполнен', 'Обработано вручную'].includes(order.statusManager || '');

    const handleSaveDeadline = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsSavingDeadline(true);
        try {
            // const finalDate = toRuDate(newDeadline); // Try sending ISO directly if DB expects DATE type
            await SupabaseService.updateOrderMetadata(order.id, { deadline: newDeadline || null });
            setIsEditingDeadline(false);
            setToast({ message: 'Срок обновлен' });
            
            // Invalidate React Query cache (for details)
            queryClient.invalidateQueries({ queryKey: ['order-details', order.id] });
            
            // Trigger parent update (for list)
            if (onUpdate) onUpdate();
            
        } catch (err) {
            console.error(err);
            setToast({ message: 'Ошибка обновления' });
        } finally {
            setIsSavingDeadline(false);
        }
    };

    const handleStartEdit = (e: React.MouseEvent) => {
        e.stopPropagation();
        setNewDeadline(toIsoDate(order.deadline)); // Ensure we have latest value in ISO
        setIsEditingDeadline(true);
    };

    const handleCopySubject = () => {
        navigator.clipboard.writeText(subject);
        setToast({ message: 'Тема скопирована' });
    };

    const hasOrderFiles = order.order_files && order.order_files.length > 0;
    const itemsWithFiles = order.items?.filter(i => (i.itemFiles && i.itemFiles.length > 0) || i.opPhotoUrl) || [];
    const hasAnyFiles = hasOrderFiles || itemsWithFiles.length > 0;
    const [isFilesExpanded, setIsFilesExpanded] = useState(false);

    return (
        <div className="bg-white p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
            {toast && createPortal(
                <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
                    <Toast message={toast.message} onClose={() => setToast(null)} duration={1000}/>
                </div>,
                document.body
            )}

            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400"/>
                    <span className="text-[10px] font-black uppercase text-slate-500">Информация о клиенте</span>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-4 gap-y-2 text-[10px]">
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Имя</span>
                    <span className="font-black text-indigo-600 uppercase text-sm truncate block" title={order.clientName}>{order.clientName}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Телефон</span>
                    <span className="font-bold text-slate-700 truncate block">{order.clientPhone || "-"}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Почта</span>
                    <span className="font-bold text-slate-700 lowercase truncate block" title={order.clientEmail}>{order.clientEmail || "-"}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Адрес</span>
                    <span className="font-black text-slate-800 uppercase truncate block" title={order.location}>{order.location || "-"}</span>
                </div>
                
                {/* Блок редактирования дедлайна */}
                <div>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Срок до
                        {!isArchived && !isEditingDeadline && (
                            <button 
                                onClick={handleStartEdit}
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Изменить"
                            >
                                <Edit2 size={10} />
                            </button>
                        )}
                    </span>
                    {isEditingDeadline ? (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input 
                                type="date" 
                                value={newDeadline}
                                onChange={e => setNewDeadline(e.target.value)}
                                className="w-full max-w-[110px] text-[10px] border border-indigo-300 rounded px-1 py-0.5 focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            <button onClick={handleSaveDeadline} disabled={isSavingDeadline} className="text-emerald-600 hover:text-emerald-700 p-0.5 bg-white rounded shadow-sm border border-emerald-100 shrink-0">
                                <Check size={12} strokeWidth={3} />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); setIsEditingDeadline(false); setNewDeadline(order.deadline || ''); }} className="text-red-500 hover:text-red-600 p-0.5 bg-white rounded shadow-sm border border-red-100 shrink-0">
                                <X size={12} strokeWidth={3} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1">
                            <Calendar size={12} className="text-slate-400"/>
                            <span className={`font-black uppercase ${order.deadline ? 'text-slate-700' : 'text-slate-300'}`}>
                                {order.deadline || '-'}
                            </span>
                        </div>
                    )}
                </div>

                <div>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mb-0.5">
                        Тема письма
                        {subject && subject !== '-' && (
                            <button 
                                onClick={handleCopySubject} 
                                className="text-slate-400 hover:text-indigo-600 transition-colors"
                                title="Копировать"
                            >
                                <Copy size={10} />
                            </button>
                        )}
                    </span>
                    <span className="font-bold text-slate-700 uppercase truncate block" title={subject}>{subject}</span>
                </div>

                {/* Сводный блок файлов */}
                {hasAnyFiles && (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 col-span-2 md:col-span-3 lg:col-span-6 pt-2 border-t border-slate-100 mt-1">
                        <button 
                            onClick={() => setIsFilesExpanded(!isFilesExpanded)}
                            className="flex items-center gap-2 text-[9px] font-bold text-indigo-600 uppercase hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded-lg -ml-2 transition-all"
                        >
                            {isFilesExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isFilesExpanded ? 'Скрыть файлы' : 'Посмотреть список файлов'}
                        </button>
                        
                        {isFilesExpanded && (
                            <div className="space-y-3 mt-3 animate-in slide-in-from-top-1 fade-in duration-200">
                                {/* 1. Общие файлы */}
                                {hasOrderFiles && (
                                    <div className="flex items-start gap-2">
                                        <div className="text-[9px] font-bold text-slate-500 w-24 shrink-0 mt-0.5">Общие:</div>
                                        <div className="flex flex-wrap gap-x-3 gap-y-1">
                                            {order.order_files.map((file, fidx) => (
                                                <a 
                                                    key={`common-${fidx}`}
                                                    href={file.url} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:underline hover:text-indigo-800 transition-colors bg-indigo-50 px-1.5 py-0.5 rounded"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Paperclip size={10} />
                                                    {file.name}
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* 2. Файлы позиций */}
                                {itemsWithFiles.map((item, idx) => {
                                    const files = item.itemFiles && item.itemFiles.length > 0 
                                        ? item.itemFiles 
                                        : (item.opPhotoUrl ? [{ name: 'Фото', url: item.opPhotoUrl, type: 'image/jpeg' }] : []);
                                    
                                    return (
                                        <div key={`item-${idx}`} className="flex items-start gap-2">
                                            <div className="text-[9px] font-bold text-slate-500 w-24 shrink-0 mt-0.5 truncate" title={item.name}>
                                                Поз. {order.items?.indexOf(item)! + 1} ({item.name}):
                                            </div>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1">
                                                {files.map((file: any, fidx: number) => (
                                                    <a 
                                                        key={`item-file-${fidx}`}
                                                        href={file.url} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer"
                                                        className="flex items-center gap-1 text-[10px] font-bold text-slate-600 hover:underline hover:text-indigo-600 transition-colors bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100"
                                                        onClick={(e) => e.stopPropagation()}
                                                    >
                                                        {file.type?.startsWith('image/') ? <Camera size={10} /> : <Paperclip size={10} />}
                                                        {file.name}
                                                    </a>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
