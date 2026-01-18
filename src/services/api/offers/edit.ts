import { supabase } from '../../../lib/supabaseClient';

export const editOffer = async (offerId: string, items: any[], supplierFiles?: any[], status: string = 'Активно'): Promise<void> => {
    // 1. Обновляем статус и файлы, снимаем лок
    const { error: offerError } = await supabase.from('offers').update({ 
        status: status, 
        supplier_files: supplierFiles || [],
        locked_at: null 
    }).eq('id', offerId);
    
    if (offerError) throw offerError;

    // 2. Подготовка данных для upsert
    // Нам нужно сопоставить item из UI с offer_items в БД
    const upsertData = items.map(item => {
        // Определяем ID (если есть)
        const dbId = item.offerItemId;
        
        // Определяем order_item_id. В editingItems item.id - это ID родительской order_item
        // Если это новая позиция, у нее тоже item.id (order_item)
        const orderItemId = item.order_item_id || item.id;

        return {
            ...(dbId ? { id: dbId } : {}), // Добавляем ID только если он есть
            offer_id: Number(offerId),
            order_item_id: orderItemId,
            name: item.name,
            quantity: item.offeredQuantity !== undefined ? item.offeredQuantity : (item.quantity || 1),
            price: item.BuyerPrice !== undefined ? item.BuyerPrice : (item.sellerPrice || 0),
            currency: 'CNY',
            delivery_days: item.deliveryWeeks ? item.deliveryWeeks * 7 : (item.delivery_days || 0),
            weight: item.weight !== undefined ? item.weight : (item.weight || 0),
            photo_url: item.photoUrl || '',
            item_files: item.itemFiles || [],
            comment: item.comment || '',
            supplier_sku: item.supplierSku || ''
        };
    });

    const { error: itemsError } = await supabase.from('offer_items').upsert(upsertData, { onConflict: 'offer_id, order_item_id' });
    if (itemsError) throw itemsError;
};
