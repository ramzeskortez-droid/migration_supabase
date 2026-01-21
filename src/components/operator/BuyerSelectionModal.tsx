import React, { useState, useEffect } from 'react';
import { X, Users, Check } from 'lucide-react';
import { AppUser } from '../../types';
import { SupabaseService } from '../../services/supabaseService';

interface BuyerSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (selectedIds: string[] | null) => void;
    isSaving: boolean;
}

export const BuyerSelectionModal: React.FC<BuyerSelectionModalProps> = ({ isOpen, onClose, onConfirm, isSaving }) => {
    const [buyers, setBuyers] = useState<AppUser[]>([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [sendToAll, setSendToAll] = useState(false); // Изначально FALSE
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsLoading(true);
            setSendToAll(false); // Никто не выбран
            setSelectedIds([]);  // Список пуст
            SupabaseService.getBuyersList()
                .then(setBuyers)
                .finally(() => setIsLoading(false));
        }
    }, [isOpen]);

    const toggleBuyer = (id: string) => {
        setSendToAll(false); // Отключаем "Всем" если выбираем конкретного
        setSelectedIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSetAll = () => {
        setSendToAll(true);
        setSelectedIds([]);
    };

    const handleConfirm = () => {
        if (!sendToAll && selectedIds.length === 0) return;
        onConfirm(sendToAll ? null : selectedIds);
    };

    if (!isOpen) return null;

    const isNothingSelected = !sendToAll && selectedIds.length === 0;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-5 h-5 text-indigo-500" />
                        Кому отправить заявку?
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors">
                        <X className="w-5 h-5 text-slate-500" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-2 overflow-y-auto flex-1">
                    <button
                        onClick={handleSetAll}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl mb-2 transition-all border-2 ${
                            sendToAll
                            ? 'bg-red-50 border-red-500 text-red-700 shadow-sm'
                            : 'bg-white border-slate-100 hover:bg-slate-50 text-slate-600'
                        }`}
                    >
                        <span className="font-black uppercase text-sm tracking-wider">Всем закупщикам</span>
                        {sendToAll && <Check className="w-6 h-6 text-red-600" />}
                    </button>

                    <div className="relative py-3">
                        <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-100"></span></div>
                        <div className="relative flex justify-center text-[10px] uppercase text-slate-400 font-black bg-white px-2">Или выбрать из списка</div>
                    </div>

                    <div className="space-y-1">
                        {isLoading ? (
                            <div className="flex justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                            </div>
                        ) : (
                            buyers.map(buyer => (
                                <button
                                    key={buyer.id}
                                    onClick={() => toggleBuyer(buyer.id)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl transition-all border ${
                                        selectedIds.includes(buyer.id)
                                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-1 ring-indigo-500/20'
                                        : 'bg-white border-transparent hover:bg-slate-50 text-slate-600'
                                    }`}
                                >
                                    <span className="font-bold">{buyer.name}</span>
                                    {selectedIds.includes(buyer.id) && <Check className="w-5 h-5 text-indigo-600" />}
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
                    <button 
                        onClick={handleConfirm}
                        disabled={isSaving || isLoading || isNothingSelected}
                        className={`w-full py-4 px-4 rounded-2xl font-black uppercase tracking-widest text-white shadow-lg transition-all ${
                            isSaving || isLoading || isNothingSelected
                            ? 'bg-slate-300 shadow-none cursor-not-allowed text-slate-500'
                            : sendToAll 
                                ? 'bg-red-600 hover:bg-red-700 shadow-red-200 animate-pulse-subtle' 
                                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'
                        }`}
                    >
                        {isSaving ? 'Запись...' : (
                            isNothingSelected 
                            ? 'ВЫБЕРИТЕ ЗАКУПЩИКА' 
                            : sendToAll ? 'ОТПРАВИТЬ ВСЕМ' : `ОТПРАВИТЬ ВЫБРАННЫМ (${selectedIds.length})`
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};