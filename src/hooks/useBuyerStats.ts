import { useQuery } from '@tanstack/react-query';
import { SupabaseService } from '../services/supabaseService';

export const useBuyerStats = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['buyerStats', userId],
    queryFn: async () => {
      if (!userId) return null;
      return await SupabaseService.getBuyerDashboardStats(userId);
    },
    enabled: !!userId,
    staleTime: 0, // Всегда свежие данные (без кеша)
    refetchOnWindowFocus: true
  });
};
