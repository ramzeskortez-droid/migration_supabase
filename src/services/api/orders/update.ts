import { supabase } from '../../../lib/supabaseClient';

export const updateOrderMetadata = async (orderId: string, metadata: { client_name?: string, client_phone?: string, client_email?: string, location?: string, deadline?: string | null }): Promise<void> => {

    const { error } = await supabase

        .from('orders')

        .update(metadata)

        .eq('id', orderId);



    if (error) throw error;

};

export const updateOrderJson = async (orderId: string, newItems: any[]): Promise<void> => {
    console.log('Starting updateOrderJson', { orderId, itemsCount: newItems.length });

    // Обновляем позиции последовательно
    for (const item of newItems) {
        if (!item.id) {
            console.warn('Skipping item without ID', item);
            continue;
        }

        const updates = {
            name: item.AdminName || item.name, 
            quantity: item.AdminQuantity || item.quantity,
            comment: item.comment, 
            category: item.category, 
            photo_url: item.photo_url,
            brand: item.brand, 
            article: item.article, 
            uom: item.uom,
            item_files: item.itemFiles || []
        };

        console.log(`Updating item ${item.id}:`, updates);

        const { data, error } = await supabase
            .from('order_items')
            .update(updates)
            .eq('id', item.id)
            .select();

        if (error) {
            console.error('Update error for item', item.id, error);
            throw new Error(`Ошибка обновления позиции ${item.id}: ${error.message}`);
        }

        if (!data || data.length === 0) {
            console.error(`Update returned 0 rows for item ${item.id}. Possible RLS or ID mismatch.`);
        } else {
            console.log(`Successfully updated item ${item.id}`, data);
            
            // Paranoid verification
            const { data: verify } = await supabase.from('order_items').select('name').eq('id', item.id).single();
            console.log(`VERIFICATION for ${item.id}: DB Value = "${verify?.name}"`);
        }
    }
    console.log('All updates finished');
};

export const updateOrderItemPrice = async (itemId: string, updates: { adminPrice?: number, isManualPrice?: boolean }): Promise<void> => {
    const { error } = await supabase.from('order_items').update({
        admin_price: updates.adminPrice,
        is_manual_price: updates.isManualPrice
    }).eq('id', itemId);
    if (error) throw error;
};
