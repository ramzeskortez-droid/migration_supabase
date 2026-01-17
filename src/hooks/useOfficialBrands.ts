import { useQuery } from '@tanstack/react-query';
import { SupabaseService } from '../services/supabaseService';

export const useOfficialBrands = () => {
  return useQuery({
    queryKey: ['official-brands'],
    queryFn: async () => {
      const brands = await SupabaseService.getOfficialBrands();
      // Возвращаем Set для быстрого поиска O(1) и нормализуем к нижнему регистру
      return new Set(brands.map(b => b.trim().toLowerCase()));
    },
    staleTime: 1000 * 60 * 60, // 1 час (список официалов меняется редко)
  });
};
