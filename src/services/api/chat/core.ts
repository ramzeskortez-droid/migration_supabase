import { supabase } from '../../../lib/supabaseClient';

export const getChatMessages = async (orderId: string, offerId?: string, supplierName?: string): Promise<any[]> => {
    let query = supabase.from('chat_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    if (supplierName) {
        const escapedName = supplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const sendChatMessage = async (payload: any): Promise<any> => {
    const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
    if (error) throw error;

    // Unarchive thread
    const supplierName = payload.sender_role === 'SUPPLIER' ? payload.sender_name : payload.recipient_name;
    if (supplierName && supplierName !== 'ADMIN') {
        const escapedName = supplierName.split('"').join('"');
        await supabase.from('chat_messages')
          .update({ is_archived: false })
          .eq('order_id', payload.order_id)
          .or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }

    return data;
};
