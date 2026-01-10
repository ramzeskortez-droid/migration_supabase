import { supabase } from '../../../lib/supabaseClient';

export const getUnreadChatCount = async (): Promise<number> => {
    const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('sender_role', 'SUPPLIER').eq('is_read', false);
    return count || 0;
};

export const getUnreadChatCountForSupplier = async (supplierName: string): Promise<{ count: number }> => {
    const { count } = await supabase.from('chat_messages').select('*', { count: 'exact', head: true }).eq('recipient_name', supplierName).eq('is_read', false);
    return { count: count || 0 };
};
