import { supabase } from '../../../lib/supabaseClient';

export const updateOrderMetadata = async (orderId: string, metadata: { client_name?: string, client_phone?: string, client_email?: string, location?: string }): Promise<void> => {
    const { error } = await supabase.from('orders').update(metadata).eq('id', orderId);
    if (error) throw error;
};

export const updateOrderJson = async (orderId: string, newItems: any[]): Promise<void> => {
    // Обновляем существующие позиции по ID
    const updates = newItems.map(item => {
        if (!item.id) return null;
        
        return supabase.from('order_items').update({
            name: item.AdminName || item.name, 
            quantity: item.AdminQuantity || item.quantity,
            comment: item.comment, 
            category: item.category, 
            photo_url: item.photo_url,
            brand: item.brand, 
            article: item.article, 
            uom: item.uom,
            item_files: item.itemFiles || []
        }).eq('id', item.id);
    }).filter(Boolean);

    if (updates.length > 0) {
        const results = await Promise.all(updates);
        
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            console.error('Update errors:', errors);
            throw new Error(`Ошибка обновления позиций: ${errors[0].error?.message}`);
        }
    }
};

export const updateOrderItemPrice = async (itemId: string, updates: { adminPrice?: number, isManualPrice?: boolean }): Promise<void> => {
    const { error } = await supabase.from('order_items').update({
        admin_price: updates.adminPrice,
        is_manual_price: updates.isManualPrice
    }).eq('id', itemId);
    if (error) throw error;
};
