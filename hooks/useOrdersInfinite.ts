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
}

export const useOrdersInfinite = ({
    searchQuery,
    statusFilter,
    clientPhone,
    brandFilter,
    onlyWithMyOffersName,
    sortDirection,
    limit = 50
}: UseOrdersInfiniteProps) => {
    return useInfiniteQuery({
        queryKey: ['orders', { searchQuery, statusFilter, clientPhone, brandFilter, onlyWithMyOffersName, sortDirection }],
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
                onlyWithMyOffersName
            );
            return result;
        },
        initialPageParam: undefined,
        getNextPageParam: (lastPage) => lastPage.nextCursor,
        staleTime: 30000,
    });
};