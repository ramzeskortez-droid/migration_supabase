import { supabase } from '../../../lib/supabaseClient';

export const createOrder = async (items: any[], clientName: string, clientPhone?: string, ownerId?: string, deadline?: string, clientEmail?: string, location?: string, orderFiles?: any[], emailMessageId?: string | null): Promise<string> => {
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert({
        client_name: clientName, client_phone: clientPhone, client_email: clientEmail,
        location: location || 'РФ', owner_id: ownerId, deadline: deadline || null,
        order_files: orderFiles || [],
        email_message_id: emailMessageId || null
      })
      .select().single();

    if (orderError) throw orderError;

    const itemsToInsert = items.map(item => ({
      order_id: orderData.id, name: item.name, quantity: item.quantity || 1,
      comment: item.comment, category: item.category, photo_url: item.photoUrl || null,
      brand: item.brand || null, article: item.article || null, uom: item.uom || 'шт',
      item_files: item.itemFiles || []
    }));

    const { error: itemsError } = await supabase.from('order_items').insert(itemsToInsert);
    if (itemsError) throw itemsError;
    return String(orderData.id);
};
