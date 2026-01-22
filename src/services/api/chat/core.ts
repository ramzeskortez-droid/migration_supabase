import { supabase } from '../../../lib/supabaseClient';

export const getChatMessages = async (
    orderId: string, 
    currentUserId: string,
    interlocutorId: string,
    offerId?: string
): Promise<any[]> => {
    // STRICT P2P CHAT: Only messages between Me and Interlocutor in this Order
    const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('order_id', orderId)
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${interlocutorId}),and(sender_id.eq.${interlocutorId},recipient_id.eq.${currentUserId})`)
        .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
};

export const sendChatMessage = async (payload: any): Promise<any> => {
    const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
    if (error) throw error;

    // Unarchive thread (Strict P2P)
    // If I send a message to someone, our thread becomes unarchived
    if (payload.sender_id && payload.recipient_id) {
        await supabase.from('chat_messages')
          .update({ is_archived: false })
          .eq('order_id', payload.order_id)
          .or(`and(sender_id.eq.${payload.sender_id},recipient_id.eq.${payload.recipient_id}),and(sender_id.eq.${payload.recipient_id},recipient_id.eq.${payload.sender_id})`);
    }

    return data;
};