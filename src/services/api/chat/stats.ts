import { supabase } from '../../../lib/supabaseClient';

export const getUserUnreadCount = async (currentUserId: string): Promise<number> => {
    const { count } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', currentUserId)
        .eq('is_read', false);
    return count || 0;
};
