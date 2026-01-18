import React, { useState } from 'react';
import { ChevronDown, Trash2, ListPlus } from 'lucide-react';
import { AdminChecklistItem } from '../../../services/api/admin/checklist';
import { ChecklistItemRow } from './ChecklistItemRow';

interface Props {
    category: string;
    items: AdminChecklistItem[];
    isExpanded: boolean;
    expandedItems: Set<number>;
    onToggleCategory: () => void;
    onDeleteCategory: () => void;
    // Item Actions
    onToggleItem: (item: AdminChecklistItem) => void;
    onToggleExpandItem: (id: number) => void;
    onDeleteItem: (id: number) => void;
    // Sub Item Actions
    onToggleSub: (item: AdminChecklistItem, subId: string) => void;
    onDeleteSub: (item: AdminChecklistItem, subId: string) => void;
    onAddSub: (item: AdminChecklistItem, text: string) => void;
    // Add Item to Category
    onAddItemToCategory: (text: string, desc: string) => void;
}

export const ChecklistCategory: React.FC<Props> = ({ 
    category, items, isExpanded, expandedItems,
    onToggleCategory, onDeleteCategory,
    onToggleItem, onToggleExpandItem, onDeleteItem,
    onToggleSub, onDeleteSub, onAddSub, onAddItemToCategory
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [newText, setNewText] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const handleSave = () => {
        if (newText.trim()) {
            onAddItemToCategory(newText, newDesc);
            setNewText('');
            setNewDesc('');
            setIsAdding(false);
        }
    };

    const catSubTotal = items.reduce((acc, i) => acc + (i.sub_items?.length || 1), 0);
    const catSubCompleted = items.reduce((acc, i) => acc + (i.sub_items ? i.sub_items.filter(s => s.checked).length : (i.is_checked ? 1 : 0)), 0);

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            {/* Category Header - Clickable Area */}
            <div 
                className="flex items-center justify-between p-4 bg-slate-50 border-b border-slate-100 cursor-pointer select-none group/cat"
                onClick={onToggleCategory}
            >
                <div className="flex items-center gap-3">
                    <div className="text-slate-400 transition-transform duration-200" style={{ transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                        <ChevronDown size={18} />
                    </div>
                    <h3 className="font-black text-slate-700 uppercase text-sm tracking-wide group-hover/cat:text-indigo-600 transition-colors">{category}</h3>
                </div>
                <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md transition-colors ${catSubCompleted === catSubTotal ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-200 text-slate-500'}`}>
                        {catSubCompleted} / {catSubTotal}
                    </span>
                    <button 
                        onClick={onDeleteCategory} 
                        className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" 
                        title="Удалить категорию"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>
            
            {/* Category Content */}
            {isExpanded && (
                <div className="divide-y divide-slate-100">
                    {items.map(item => (
                        <ChecklistItemRow 
                            key={item.id}
                            item={item}
                            isExpanded={expandedItems.has(item.id)}
                            onToggleExpand={() => onToggleExpandItem(item.id)}
                            onToggleCheck={() => onToggleItem(item)}
                            onDelete={() => onDeleteItem(item.id)}
                            onToggleSub={(subId) => onToggleSub(item, subId)}
                            onDeleteSub={(subId) => onDeleteSub(item, subId)}
                            onAddSub={(text) => onAddSub(item, text)}
                        />
                    ))}

                    {/* Add Task to Category Form */}
                    <div className="p-4 bg-slate-50/30">
                        {isAdding ? (
                            <div className="space-y-3 bg-white p-4 rounded-xl border border-indigo-100 animate-in zoom-in-95 shadow-sm">
                                <input 
                                    autoFocus 
                                    value={newText} 
                                    onChange={e => setNewText(e.target.value)} 
                                    placeholder="Название новой задачи..." 
                                    className="w-full border-b border-slate-200 py-1.5 font-bold text-sm outline-none focus:border-indigo-500 transition-colors" 
                                />
                                <input 
                                    value={newDesc} 
                                    onChange={e => setNewDesc(e.target.value)} 
                                    onKeyDown={e => e.key === 'Enter' && handleSave()} 
                                    placeholder="Описание (инструкция)..." 
                                    className="w-full text-xs text-slate-500 outline-none placeholder:text-slate-300" 
                                />
                                <div className="flex justify-end gap-2 pt-2">
                                    <button 
                                        onClick={() => setIsAdding(false)} 
                                        className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase hover:text-slate-600"
                                    >
                                        Отмена
                                    </button>
                                    <button 
                                        onClick={handleSave} 
                                        disabled={!newText.trim()}
                                        className="px-4 py-1.5 bg-indigo-600 text-white text-[10px] font-black uppercase rounded-lg shadow-md hover:bg-indigo-700 transition-colors disabled:opacity-50"
                                    >
                                        Сохранить
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAdding(true)} 
                                className="w-full py-2.5 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 hover:text-indigo-500 hover:border-indigo-200 hover:bg-indigo-50/50 transition-all text-[10px] font-black uppercase flex items-center justify-center gap-2 group"
                            >
                                <ListPlus size={14} className="group-hover:scale-110 transition-transform" /> 
                                Добавить задачу в этот раздел
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
