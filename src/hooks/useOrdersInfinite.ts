import { useInfiniteQuery } from '@tanstack/react-query';
import { SupabaseService } from '../services/supabaseService';

interface UseOrdersInfiniteProps {
    searchQuery: string;
    statusFilter?: string;
    clientPhone?: string;
    brandFilter?: string[] | null; 
    onlyWithMyOffersName?: string;
    sortBy?: string;
    sortDirection: 'asc' | 'desc';
    limit?: number;
    ownerToken?: string;
    buyerToken?: string;
    excludeOffersFrom?: string;
    buyerTab?: 'new' | 'hot' | 'history' | 'won' | 'lost' | 'cancelled'; // Новый параметр
}

export const useOrdersInfinite = ({
    searchQuery,
    statusFilter,
    clientPhone,
    brandFilter,
    onlyWithMyOffersName,
    sortBy = 'id',
    sortDirection,
    limit = 50,
    ownerToken,
    buyerToken,
    excludeOffersFrom,
    buyerTab
}: UseOrdersInfiniteProps) => {
    return useInfiniteQuery({
        queryKey: ['orders', { searchQuery, statusFilter, clientPhone, brandFilter, onlyWithMyOffersName, sortBy, sortDirection, ownerToken, buyerToken, excludeOffersFrom, buyerTab }],
        queryFn: async ({ pageParam }: { pageParam?: number }) => {
            const result = await SupabaseService.getOrders(
                pageParam,
                limit,
                sortBy,
                sortDirection,
                searchQuery,
                statusFilter,
                clientPhone,
                brandFilter,
                onlyWithMyOffersName,
                ownerToken,
                buyerToken,
                excludeOffersFrom,
                buyerTab
            );
            return result;
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5000, // Уменьшаем время жизни кеша до 5 секунд для быстрой реакции
    });
};