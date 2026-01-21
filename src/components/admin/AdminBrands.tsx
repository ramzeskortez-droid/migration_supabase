import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { Brand } from '../../types';
import { Trash2, Edit2, Plus, Check, X, Loader2, Search, User, Tag, AlertCircle, ArrowUp, ArrowDown, ShieldCheck, Download } from 'lucide-react';
import { Pagination } from '../Pagination';
import { Toast } from '../shared/Toast';
import { ExportBrandsModal } from './ExportBrandsModal';

// Функция для поиска похожих строк
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
    const [totalCount, setTotalCount] = useState(0); // Найдено по поиску
    const [absoluteTotal, setAbsoluteTotal] = useState(0); // Всего в БД
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(100);
    const [sortField, setSortField] = useState('id');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
    const [activeTab, setActiveTab] = useState<'all' | 'official'>('all'); // TABS
    
    const [isAddingMode, setIsAddingMode] = useState(false);
    const [newBrandName, setNewBrandName] = useState('');
    const [newBrandOfficial, setNewBrandOfficial] = useState(false); // New state for add
    const [isAdding, setIsAdding] = useState(false);
    
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState('');
    const [editOfficial, setEditOfficial] = useState(false); // New state for edit
    
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [toast, setToast] = useState<{message: string, type?: 'success' | 'error' | 'info'} | null>(null);

    const loadBrands = useCallback(async (isSearchAction = false) => {
        setLoading(true);
        try {
            const pageToLoad = isSearchAction ? 1 : currentPage;
            const { data, count } = await SupabaseService.getBrandsFull(
                pageToLoad, 
                itemsPerPage, 
                search,
                sortField,
                sortDirection,
                activeTab === 'official' // Pass filter
            );
            setBrands(data);
            setTotalCount(count);
            
            // Если поиска нет, обновляем и абсолютный тотал из этого же запроса
            if (!search) {
                setAbsoluteTotal(count);
            } else {
                // Если поиск есть, запрашиваем абсолютный тотал отдельно
                const { count: absCount } = await SupabaseService.getBrandsFull(1, 1, '', 'id', 'desc', activeTab === 'official');
                setAbsoluteTotal(absCount);
            }

            if (isSearchAction) setCurrentPage(1);
        } catch (e) {
            console.error('Load Brands Error:', e);
            setToast({ message: 'Ошибка загрузки данных', type: 'error' });
        } finally {
            setLoading(false);
        }
    }, [currentPage, itemsPerPage, search, sortField, sortDirection, activeTab]);

    useEffect(() => { loadBrands(); }, [currentPage, itemsPerPage, sortField, sortDirection, activeTab]);

    useEffect(() => {
        const handler = setTimeout(() => {
            loadBrands(true);
        }, 500);
        return () => clearTimeout(handler);
    }, [search]);

    // Reset page when tab changes
    useEffect(() => { setCurrentPage(1); }, [activeTab]);
    
    // Set default official status when adding in official tab
    useEffect(() => {
        if (activeTab === 'official') setNewBrandOfficial(true);
        else setNewBrandOfficial(false);
    }, [activeTab]);

    const similarBrands = useMemo(() => findSimilar(newBrandName, brands), [newBrandName, brands]);

    const handleSort = (field: string) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleAdd = async () => {
        const name = newBrandName.trim();
        if (!name) return;
        
        setIsAdding(true);
        try {
            await SupabaseService.addBrand(name, 'Admin', newBrandOfficial);
            setNewBrandName('');
            setNewBrandOfficial(activeTab === 'official');
            setIsAddingMode(false);
            setToast({ message: `Бренд "${name}" успешно добавлен`, type: 'success' });
            
            // Принудительная перезагрузка для обновления счетчиков
            await loadBrands();
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
            await SupabaseService.updateBrand(id, name, editOfficial);
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
                        <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider">Всего: {absoluteTotal}</span>
                            {search && <span className="text-[9px] font-black text-indigo-500 uppercase tracking-wider">• Найдено: {totalCount}</span>}
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex p-1 bg-slate-200 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('all')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${activeTab === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Все бренды
                    </button>
                    <button 
                        onClick={() => setActiveTab('official')}
                        className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all flex items-center gap-1.5 ${activeTab === 'official' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        <ShieldCheck size={12} />
                        Официалы
                    </button>
                </div>

                <div className="flex w-full md:w-auto gap-2">
                    <button 
                        onClick={() => setIsExportModalOpen(true)}
                        className="p-2 bg-white text-slate-500 rounded-xl border border-slate-200 hover:text-emerald-600 hover:border-emerald-200 hover:bg-emerald-50 transition-all shadow-sm"
                        title="Экспорт в Excel"
                    >
                        <Download size={18} />
                    </button>

                    <button 
                        onClick={() => setIsAddingMode(!isAddingMode)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${isAddingMode ? 'bg-slate-200 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
                    >
                        {isAddingMode ? <X size={14}/> : <Plus size={14}/>}
                        {isAddingMode ? 'Отмена' : 'Добавить бренд'}
                    </button>
                </div>
            </div>

            <ExportBrandsModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />

            {/* Action Bar: Search or Add Form */}
            <div className={`p-3 border-b transition-colors shrink-0 ${isAddingMode ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                {isAddingMode ? (
                    <div className="space-y-3">
                        <div className="flex gap-2 items-center">
                            <input 
                                value={newBrandName}
                                onChange={e => setNewBrandName(e.target.value)}
                                placeholder="Введите точное название (соблюдая регистр)..."
                                disabled={isAdding}
                                autoFocus
                                className="flex-grow px-4 py-2 bg-white border border-indigo-200 rounded-xl text-[11px] font-bold outline-none focus:border-indigo-500 shadow-sm"
                                onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            />
                            
                            {/* Official Toggle for New Brand */}
                            <label className="flex items-center gap-2 px-3 py-2 bg-white border border-indigo-100 rounded-xl cursor-pointer select-none hover:border-amber-300 transition-colors">
                                <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${newBrandOfficial ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}>
                                    {newBrandOfficial && <Check size={10} strokeWidth={4} />}
                                </div>
                                <input type="checkbox" className="hidden" checked={newBrandOfficial} onChange={e => setNewBrandOfficial(e.target.checked)} />
                                <span className={`text-[10px] font-black uppercase ${newBrandOfficial ? 'text-amber-600' : 'text-slate-400'}`}>Официал</span>
                            </label>

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
                            placeholder={activeTab === 'official' ? "Поиск по официалам..." : "Поиск по всей базе брендов..."}
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
                            <th className="px-6 py-3 w-20 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('id')}>
                                <div className="flex items-center gap-1">
                                    ID 
                                    {sortField === 'id' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                </div>
                            </th>
                            <th className="px-6 py-3 cursor-pointer hover:text-indigo-600 transition-colors" onClick={() => handleSort('name')}>
                                <div className="flex items-center gap-1">
                                    Название бренда
                                    {sortField === 'name' && (sortDirection === 'asc' ? <ArrowUp size={10}/> : <ArrowDown size={10}/>)}
                                </div>
                            </th>
                            <th className="px-6 py-3">Статус</th>
                            <th className="px-6 py-3">Кем создан</th>
                            <th className="px-6 py-3 text-right">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {loading && brands.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <Loader2 className="animate-spin text-indigo-500" size={32} />
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Загрузка...</span>
                                    </div>
                                </td>
                            </tr>
                        ) : brands.length === 0 && !loading ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-xs font-bold text-slate-400 uppercase italic">Бренды не найдены</td>
                            </tr>
                        ) : brands.map(brand => (
                            <tr key={brand.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="px-6 py-1.5 text-[10px] font-mono text-slate-300">#{brand.id}</td>
                                <td className="px-6 py-1.5">
                                    {editingId === brand.id ? (
                                        <div className="flex gap-2 items-center">
                                            <input 
                                                value={editName}
                                                onChange={e => setEditName(e.target.value)}
                                                className="px-3 py-1 border-2 border-indigo-500 rounded-lg text-[10px] font-black outline-none w-full max-w-xs shadow-inner"
                                                autoFocus
                                                onKeyDown={e => e.key === 'Enter' && handleUpdate(brand.id)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span className={`text-xs font-black tracking-tight ${brand.official ? 'text-amber-700 underline decoration-amber-400/50 decoration-2 underline-offset-2' : 'text-slate-700'}`}>
                                                {brand.name}
                                            </span>
                                            {brand.official && (
                                                <div className="bg-amber-100 text-amber-600 p-0.5 rounded-full" title="Официальный представитель">
                                                    <ShieldCheck size={10} strokeWidth={3} />
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-1.5">
                                    {editingId === brand.id ? (
                                        <label className="flex items-center gap-1.5 cursor-pointer select-none">
                                            <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${editOfficial ? 'bg-amber-500 border-amber-500 text-white' : 'bg-white border-slate-300'}`}>
                                                {editOfficial && <Check size={8} strokeWidth={4} />}
                                            </div>
                                            <input type="checkbox" className="hidden" checked={editOfficial} onChange={e => setEditOfficial(e.target.checked)} />
                                            <span className={`text-[9px] font-black uppercase ${editOfficial ? 'text-amber-600' : 'text-slate-400'}`}>Офиц.</span>
                                        </label>
                                    ) : (
                                        brand.official ? (
                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-100 text-[9px] font-black uppercase tracking-wider">
                                                Официал
                                            </span>
                                        ) : (
                                            <span className="text-[9px] font-bold text-slate-300 uppercase">Обычный</span>
                                        )
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
                                                    onClick={() => { 
                                                        setEditingId(brand.id); 
                                                        setEditName(brand.name); 
                                                        setEditOfficial(!!brand.official); 
                                                    }}
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
