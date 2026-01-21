import React, { useState } from 'react';
import { X, Download, Calendar, Loader2 } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import * as XLSX from 'xlsx';
import { Toast } from '../shared/Toast';

interface ExportBrandsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ExportBrandsModal: React.FC<ExportBrandsModalProps> = ({ isOpen, onClose }) => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    if (!isOpen) return null;

    const handleExport = async () => {
        setLoading(true);
        try {
            const brands = await SupabaseService.getBrandsForExport(startDate, endDate);
            
            if (brands.length === 0) {
                setToast({ message: 'Нет данных за выбранный период', type: 'error' });
                setLoading(false);
                return;
            }

            // Подготовка данных для Excel
            const exportData = brands.map(b => ({
                'ID': b.id,
                'Название бренда': b.name,
                'Дата создания': new Date(b.created_at).toLocaleString('ru-RU'),
                'Кем создан': b.created_by || 'System',
                'Официальный': b.official ? 'Да' : 'Нет'
            }));

            // Создание книги и листа
            const worksheet = XLSX.utils.json_to_sheet(exportData);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Бренды');

            // Настройка ширины колонок
            const wscols = [
                { wch: 10 }, // ID
                { wch: 30 }, // Название
                { wch: 20 }, // Дата
                { wch: 15 }, // Автор
                { wch: 12 }  // Официал
            ];
            worksheet['!cols'] = wscols;

            // Генерация имени файла
            const dateStr = new Date().toISOString().split('T')[0];
            const fileName = `brands_export_${dateStr}.xlsx`;

            // Скачивание
            XLSX.writeFile(workbook, fileName);
            
            setToast({ message: `Успешно экспортировано ${brands.length} записей`, type: 'success' });
            setTimeout(() => {
                onClose();
                setToast(null);
            }, 1500);

        } catch (error: any) {
            console.error('Export error:', error);
            setToast({ message: 'Ошибка при экспорте данных', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
                
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
                    <div className="flex items-center gap-2 text-slate-700">
                        <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                            <Download size={18} />
                        </div>
                        <h3 className="font-black uppercase tracking-tight text-sm">Экспорт брендов</h3>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-lg transition-colors"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6 space-y-5">
                    <p className="text-xs text-slate-500 font-medium">
                        Выберите период для экспорта списка брендов в формате .xlsx. 
                        Если даты не выбраны, будут экспортированы все бренды.
                    </p>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Дата начала
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                <input 
                                    type="date" 
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    max={endDate}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                                Дата окончания
                            </label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                                <input 
                                    type="date" 
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate}
                                    className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer"
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-2">
                    <button 
                        onClick={onClose}
                        className="px-4 py-2 text-[11px] font-black uppercase text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors"
                        disabled={loading}
                    >
                        Отмена
                    </button>
                    <button 
                        onClick={handleExport}
                        disabled={loading}
                        className="px-5 py-2 bg-emerald-600 text-white text-[11px] font-black uppercase rounded-xl shadow-lg shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all flex items-center gap-2 disabled:opacity-70 disabled:pointer-events-none"
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                        Экспортировать
                    </button>
                </div>
            </div>
        </div>
    );
};
