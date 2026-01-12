import { supabase } from '../../../lib/supabaseClient';

export const getOperatorStatusCounts = async (ownerId: string): Promise<Record<string, number>> => {
    // Запрашиваем минимальный набор полей, включая id офферов для определения торгов
    const { data } = await supabase
        .from('orders')
        .select('status_manager, offers(id)')
        .eq('owner_id', ownerId);
    
    const counts: Record<string, number> = {
        processing: 0,
        trading: 0,
        manual: 0,
        processed: 0,
        archive: 0
    };

    data?.forEach((o: any) => {
        const hasOffers = o.offers && o.offers.length > 0;

        if (o.status_manager === 'Ручная обработка') {
            counts.manual++;
        } 
        else if (o.status_manager === 'В обработке') {
            if (hasOffers) {
                counts.trading++;
            } else {
                counts.processing++;
            }
        } 
        else if (o.status_manager === 'КП готово') {
            counts.processed++;
        } 
        else if (['Архив', 'Аннулирован', 'Отказ', 'КП отправлено', 'Выполнен', 'Обработано вручную'].includes(o.status_manager)) {
            counts.archive++;
        }
    });

    return counts;
};
