import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { Brand } from '../../types';
import { Trash2, Edit2, Plus, Check, X, Loader2, Search, User, Tag, AlertCircle } from 'lucide-react';
import { Pagination } from '../Pagination';
import { Toast } from '../shared/Toast';

// Функция для поиска похожих строк (простая проверка на вхождение и регистр)
function findSimilar(input: string, allBrands: Brand[]): string[] {
    if (input.length < 2) return [];
    const lowInput = input.toLowerCase();
    return allBrands
        .filter(b => {
            const lowName = b.name.toLowerCase();
            return lowName !== lowInput && (lowName.startsWith(lowInput) || lowInput.startsWith(lowName));
        })
        .map(b => b.name)
        .slice(0, 3);
}

export const AdminBrands: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);
    
    // Состояния для добавления
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    
    // Состояния для редактирования
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    
    const [toast, setToast] = useState<{message: string, type?: 'success' | 'error' | 'info'} | null>(null);

    const loadBrands = useCallback(async (isSearchAction = false) => {
        setLoading(true);
        try {
            const pageToLoad = isSearchAction ? 1 : currentPage;
            const { data, count } = await SupabaseService.getBrandsFull(
                pageToLoad, 
                itemsPerPage, 
                search
            );
            setBrands(data);
            setTotalCount(count);
            if (isSearchAction) setCurrentPage(1);
        } catch (e) {
            console.error('Load Brands Error:', e);
            setToast({ message: 'Ошибка загрузки данных', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, search]);

    useEffect(() => { loadBrands(); }, [currentPage, itemsPerPage]);

    useEffect(() => {
        const handler = setTimeout(() => {
            loadBrands(true);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Поиск похожих брендов среди загруженных для подсказки
    const similarBrands = useMemo(() => findSimilar(newBrandName, brands), [newBrandName, brands]);

    const handleAdd = async () => {
        const name = newBrandName.trim();
        if (!name) return;
        
        setIsAdding(true);
        try {
            await SupabaseService.addBrand(name, 'Admin');
            setNewBrandName('');
            setIsAddingMode(false);
            setToast({ message: `Бренд "${name}" успешно добавлен`, type: 'success' });
            loadBrands();
        } catch (e: any) {
            if (e.code === '23505') {
                setToast({ message: `Бренд "${name}" уже существует в базе`, type: 'error' });
            } else {
                setToast({ message: 'Ошибка: ' + (e.message || 'Не удалось добавить бренд'), type: 'error' });
            }
        } finally {
            setIsAdding(false);
        }
    };

    const handleUpdate = async (id: number) => {
        const name = editName.trim();
        if (!name) return;
        try {
            await SupabaseService.updateBrand(id, name);
            setEditingId(null);
            setToast({ message: 'Бренд обновлен', type: 'success' });
            loadBrands();
        } catch (e: any) {
            setToast({ message: 'Ошибка обновления', type: 'error' });
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Удалить бренд?')) return;
        try {
            await SupabaseService.deleteBrand(id);
            setToast({ message: 'Бренд удален', type: 'success' });
            loadBrands();
        } catch (e: any) {
            setToast({ message: 'Ошибка удаления', type: 'error' });
        }
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-[calc(100vh-40px)] animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
            {toast && <Toast message={toast.message} type={toast.type as any} onClose={() => setToast(null)} />}
            
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-600 rounded-xl text-white shadow-lg shadow-indigo-100">
                        <Tag size={18} />
                    </div>
                    <div>
                        <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight leading-none">Бренды</h2>
                        <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-wider">Всего в базе: {totalCount}</p>
                    </div>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <button 
                        onClick={() => setIsAddingMode(!isAddingMode)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${isAddingMode ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
                    >
                        {isAddingMode ? <X size={14}/> : <Plus size={14}/>}
                        {isAddingMode ? 'Отмена' : 'Добавить бренд'}
                    </button>
                </div>
            </div>

            {/* Action Bar: Search or Add Form */}
            <div className={`p-3 border-b transition-colors shrink-0 ${isAddingMode ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                {isAddingMode ? (
                    <div className="space-y-3">
                        <div className="flex gap-2">
                            <input 
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                placeholder="Введите точное название (соблюдая регистр)..."
                                disabled={isAdding}
                                autoFocus
                                className="flex-grow px-4 py-2 bg-white border border-indigo-200 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 shadow-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            <button 
                                onClick={handleAdd}
                                disabled={isAdding || !newBrandName.trim()}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg shadow-indigo-100 hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-50"
                            >
                                {isAdding ? <Loader2 className="animate-spin" size={14} /> : <Check size={14} />} 
                                Сохранить
                            </button>
                        </div>
                        {similarBrands.length > 0 && (
                            <div className="flex items-center gap-2 px-2 animate-in fade-in slide-in-from-top-1">
                                <AlertCircle size={12} className="text-amber-500" />
                                <span className="text-[10px] font-bold text-amber-600 uppercase">Возможно, вы имели в виду:</span>
                                <div className="flex gap-1">
                                    {similarBrands.map(s => (
                                        <button 
                                            key={s} 
                                            onClick={() => setNewBrandName(s)}
                                            className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded text-[9px] font-black hover:bg-amber-200 transition-colors"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Поиск по всей базе брендов..."
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                        />
                    </div>
                )}
            </div>

            {/* Table */}
            <div className="flex-grow overflow-y-auto min-h-0">
                <table className="w-full text-left border-collapse">
                    <thead className="sticky top-0 z-10 bg-slate-50 shadow-sm">
                        <tr className="text-[9px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">
                            <th className="px-6 py-3 w-20">ID</th>
                            <th className="px-6 py-3">Название бренда</th>
                            <th className="px-6 py-3">Кем создан</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading && brands.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Загрузка...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : brands.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-xs font-bold text-slate-400 uppercase italic">Бренды не найдены</td>
                            </tr>
                        ) : brands.map(brand => (
                            <tr key={brand.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-1.5 text-[10px] font-mono text-slate-300">#{brand.id}</td>
                                <td className="px-6 py-1.5">
                                    {editingId === brand.id ? (
                                        <div className="flex gap-2">
                                            <input 
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="px-3 py-1 border-2 border-indigo-500 rounded-lg text-[10px] font-black outline-none w-full max-w-xs shadow-inner"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleUpdate(brand.id)}
                                            />
                                        </div>
                                    ) : (
                                        <span className="text-xs font-black text-slate-700 tracking-tight">{brand.name}</span>
                                    )}
                                </td>
                                <td className="px-6 py-1.5">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-1 rounded-lg ${brand.created_by === 'Admin' ? 'bg-amber-50 text-amber-600' : 'bg-blue-50 text-blue-600'}`}>
                                            <User size={10} />
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-wider ${brand.created_by === 'Admin' ? 'text-amber-600' : 'text-blue-600'}`}>
                                            {brand.created_by}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-1.5 text-right">
                                    <div className="flex justify-end gap-1 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                        {editingId === brand.id ? (
                                            <>
                                                <button onClick={() => handleUpdate(brand.id)} className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-colors">
                                                    <Check size={14} />
                                                </button>
                                                <button onClick={() => setEditingId(null)} className="p-1.5 bg-slate-100 text-slate-400 rounded-lg hover:bg-slate-200 transition-colors">
                                                    <X size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <>
                                                <button 
                                                    onClick={() => { setEditingId(brand.id); setEditName(brand.name); }}
                                                    className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-indigo-50 hover:text-indigo-600 transition-colors"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button 
                                                    onClick={() => handleDelete(brand.id)}
                                                    className="p-1.5 bg-slate-50 text-slate-400 rounded-lg hover:bg-red-50 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Pagination Footer */}
            <div className="shrink-0 bg-white border-t border-slate-100">
                <Pagination 
                    totalItems={totalCount}
                    itemsPerPage={itemsPerPage}
                    currentPage={currentPage}
                    onPageChange={setCurrentPage}
                    onItemsPerPageChange={(newLimit) => {
                        setItemsPerPage(newLimit);
                        setCurrentPage(1);
                    }}
                />
            </div>
        </div>
    );
};