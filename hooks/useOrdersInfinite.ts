import { useInfiniteQuery } from '@tanstack/react-query';
import { SupabaseService } from '../services/supabaseService';

interface UseOrdersInfiniteProps {
    searchQuery: string;
    statusFilter?: string;
    clientPhone?: string;
    brandFilter?: string | null;
    onlyWithMyOffersName?: string;
    sortDirection: 'asc' | 'desc';
    limit?: number;
    ownerToken?: string;
    buyerToken?: string;
    excludeOffersFrom?: string;
}

export const useOrdersInfinite = ({
    searchQuery,
    statusFilter,
    clientPhone,
    brandFilter,
    onlyWithMyOffersName,
    sortDirection,
    limit = 50,
    ownerToken,
    buyerToken,
    excludeOffersFrom
}: UseOrdersInfiniteProps) => {
    return useInfiniteQuery({
        queryKey: ['orders', { searchQuery, statusFilter, clientPhone, brandFilter, onlyWithMyOffersName, sortDirection, ownerToken, buyerToken, excludeOffersFrom }],
        queryFn: async ({ pageParam }: { pageParam?: number }) => {
            const result = await SupabaseService.getOrders(
                pageParam,
                limit,
                'id',
                sortDirection,
                searchQuery,
                statusFilter,
                clientPhone,
                brandFilter,
                onlyWithMyOffersName,
                ownerToken,
                buyerToken,
                excludeOffersFrom
            );
            return result;
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 5000, // Уменьшаем время жизни кеша до 5 секунд для быстрой реакции
    });
};