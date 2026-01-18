import React, { useState } from 'react';
import { Check, ChevronDown, Trash2, Info, X, Plus } from 'lucide-react';
import { AdminChecklistItem } from '../../../services/api/admin/checklist';

interface Props {
    item: AdminChecklistItem;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onToggleCheck: () => void;
    onDelete: () => void;
    onToggleSub: (subId: string) => void;
    onDeleteSub: (subId: string) => void;
    onAddSub: (text: string) => void;
}

export const ChecklistItemRow: React.FC<Props> = ({ 
    item, isExpanded, onToggleExpand, onToggleCheck, onDelete, onToggleSub, onDeleteSub, onAddSub 
}) => {
    const [isAdding, setIsAdding] = useState(false);
    const [subText, setSubText] = useState('');

    const handleSave = () => {
        if (subText.trim()) {
            onAddSub(subText);
            setSubText('');
            // Keep input open for rapid entry? Or close? Let's keep open.
        }
    };

    return (
        <div className={`flex flex-col transition-all group ${item.is_checked ? 'bg-slate-50/50' : 'hover:bg-slate-50'}`}>
            {/* Header Row - Click to Expand */}
            <div 
                className="flex items-center justify-between p-4 cursor-pointer select-none"
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Checkbox - Click to Check (Stop Propagation) */}
                    <div 
                        onClick={(e) => { e.stopPropagation(); onToggleCheck(); }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all shrink-0 ${item.is_checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 text-transparent hover:border-emerald-400 bg-white'}`}
                    >
                        <Check size={14} strokeWidth={4} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className={`font-bold text-sm transition-all truncate ${item.is_checked ? 'text-slate-400 line-through' : 'text-slate-700'}`}>
                            {item.text}
                        </div>
                        {/* Preview description if collapsed */}
                        {!isExpanded && item.description && (
                            <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {item.description}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 pl-2">
                    <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180 text-indigo-500' : 'text-slate-300'}`}>
                        <ChevronDown size={16} />
                    </div>
                    <button 
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded-lg hover:bg-red-50"
                        title="Удалить"
                    >
                        <Trash2 size={16} />
                    </button>
                </div>
            </div>

            {/* Expanded Content */}
            {isExpanded && (
                <div className="px-12 pb-4 space-y-3 animate-in slide-in-from-top-1 duration-200 cursor-default" onClick={(e) => e.stopPropagation()}>
                    {/* Full Description */}
                    {item.description && (
                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs font-medium text-slate-600 flex gap-3">
                            <Info size={16} className="text-indigo-500 shrink-0 mt-0.5" />
                            <span className="leading-relaxed">{item.description}</span>
                        </div>
                    )}

                    {/* Sub Items List */}
                    <div className="space-y-2 mt-2">
                        {item.sub_items?.map(sub => (
                            <div key={sub.id} className="flex items-center gap-3 group/sub">
                                {/* Sub Checkbox */}
                                <div 
                                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                                    onClick={() => onToggleSub(sub.id)}
                                >
                                    <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0 ${sub.checked ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 bg-white group-hover/sub:border-emerald-400'}`}>
                                        {sub.checked && <Check size={10} strokeWidth={4} />}
                                    </div>
                                    <span className={`text-xs font-medium transition-all truncate ${sub.checked ? 'text-slate-400 line-through decoration-slate-300' : 'text-slate-700'}`}>
                                        {sub.text}
                                    </span>
                                </div>
                                
                                {/* Sub Delete */}
                                <button 
                                    onClick={() => onDeleteSub(sub.id)}
                                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover/sub:opacity-100 p-1 transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))}

                        {/* Add Sub Item Inline Form */}
                        {isAdding ? (
                            <div className="flex items-center gap-2 mt-2 animate-in fade-in">
                                <input 
                                    autoFocus
                                    value={subText}
                                    onChange={(e) => setSubText(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                                    placeholder="Новый шаг..."
                                    className="flex-1 bg-white border border-indigo-200 rounded px-2 py-1 text-xs outline-none focus:border-indigo-500 text-slate-700"
                                />
                                <button onClick={handleSave} className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                    <Check size={14}/>
                                </button>
                                <button onClick={() => { setIsAdding(false); setSubText(''); }} className="p-1 text-slate-400 hover:text-slate-600">
                                    <X size={14}/>
                                </button>
                            </div>
                        ) : (
                            <button 
                                onClick={() => setIsAdding(true)}
                                className="mt-2 text-[10px] font-bold text-indigo-500 hover:text-indigo-700 flex items-center gap-1 opacity-50 hover:opacity-100 transition-opacity"
                            >
                                <Plus size={12}/> Добавить подпункт
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
