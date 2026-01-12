import React, { useState } from 'react';
import { FileText, Copy, Paperclip, Camera, ChevronDown, ChevronUp } from 'lucide-react';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { createPortal } from 'react-dom';

interface OperatorClientInfoProps {
    order: Order;
    subject: string;
}

export const OperatorClientInfo: React.FC<OperatorClientInfoProps> = ({ order, subject }) => {
    const [toast, setToast] = useState<{message: string} | null>(null);

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

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-slate-400"/>
                    <span className="text-[10px] font-black uppercase text-slate-500">Информация о клиенте</span>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-6 text-[10px]">
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Имя</span>
                    <span className="font-black text-indigo-600 uppercase text-sm">{order.clientName}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Телефон</span>
                    <span className="font-bold text-slate-700">{order.clientPhone || "-"}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Почта</span>
                    <span className="font-bold text-slate-700 lowercase">{order.clientEmail || "-"}</span>
                </div>
                <div>
                    <span className="block text-[8px] font-bold text-slate-400 uppercase mb-1">Адрес</span>
                    <span className="font-black text-slate-800 uppercase">{order.location || "-"}</span>
                </div>
                <div>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase mb-1">
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
                    <span className="font-bold text-slate-700 uppercase">{subject}</span>
                </div>

                {/* Сводный блок файлов */}
                {hasAnyFiles && (
                    <div className="md:col-span-5 pt-3 border-t border-slate-100 mt-1">
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
