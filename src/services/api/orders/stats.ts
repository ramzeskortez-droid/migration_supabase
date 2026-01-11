import { supabase } from '../../../lib/supabaseClient';

export const getOperatorStatusCounts = async (ownerId: string): Promise<Record<string, number>> => {
    const { data } = await supabase
        .from('orders')
        .select('status_manager, status_client, is_manual_processing')
        .eq('owner_id', ownerId);
    
    const counts: Record<string, number> = {
        processing: 0,
        manual: 0,
        processed: 0,
        completed: 0,
        rejected: 0,
        archive: 0
    };

    data?.forEach((o: any) => {
        if (o.status_manager === 'Ручная обработка') {
            counts.manual++;
        } else if (o.status_manager === 'В обработке') {
            counts.processing++;
        } else if (['КП готово', 'КП отправлено'].includes(o.status_manager)) {
            counts.processed++;
        } else if (o.status_manager === 'Выполнен') {
            counts.completed++;
            // counts.archive++; // Выполнен больше не в архиве? Или старые заказы?
            // Если мы переводим в статус 'Архив', то считаем 'Архив'
        } else if (['Аннулирован', 'Отказ', 'Архив'].includes(o.status_manager)) {
            counts.rejected++;
            counts.archive++;
        }
    });

    return counts;
};
