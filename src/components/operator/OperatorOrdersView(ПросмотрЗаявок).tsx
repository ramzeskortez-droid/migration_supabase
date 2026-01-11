import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { OperatorOrdersList } from './OperatorOrdersList';
import { SupabaseService } from '../../services/supabaseService';

interface OperatorOrdersViewProps {
    ownerId: string | undefined;
    refreshTrigger: number;
    initialSearch?: string;
    onLog: (msg: string) => void;
}

export const OperatorOrdersView: React.FC<OperatorOrdersViewProps> = ({ ownerId, refreshTrigger, initialSearch, onLog }) => {
    const [searchQuery, setSearchQuery] = useState(initialSearch || '');
    const [debouncedQuery, setDebouncedQuery] = useState(initialSearch || '');
    const [activeTab, setActiveTab] = useState<'processing' | 'processed' | 'completed' | 'rejected'>('processing');
    const [scrollToId, setScrollToId] = useState<string | null>(null);
    const listRef = useRef<HTMLDivElement>(null);

    // Debounce Search
    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedQuery(searchQuery);
        }, 300);
        return () => clearTimeout(handler);
    }, [searchQuery]);

    // Обработка внешнего перехода
    useEffect(() => {
        if (initialSearch && initialSearch !== searchQuery) {
            handleNavigateToOrder(initialSearch);
        }
    }, [initialSearch]);

    const handleNavigateToOrder = async (orderId: string) => {
        // ... (без изменений)
    };

    return (
        <div className="space-y-4" ref={listRef}>
            <div className="relative group flex items-center">
                <Search className="absolute left-6 text-slate-400" size={20}/>
                <input 
                    value={searchQuery} 
                    onChange={e => setSearchQuery(e.target.value)} 
                    placeholder="Поиск по ID, клиенту или телефону..." 
                    className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" 
                />
            </div>
            <OperatorOrdersList 
                refreshTrigger={refreshTrigger} 
                ownerId={ownerId} 
                searchQuery={debouncedQuery} 
                activeTab={activeTab}
                onTabChange={setActiveTab}
                scrollToId={scrollToId}
            />
        </div>
    );
};
