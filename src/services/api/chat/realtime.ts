import { supabase } from '../../../lib/supabaseClient';

export const subscribeToUserChats = (callback: (payload: any) => void, channelId: string) => {
    return supabase.channel(channelId).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, callback).subscribe();
};

export const subscribeToChatMessages = (orderId: string, callback: (payload: any) => void) => {
    return supabase.channel(`chat:${orderId}`).on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `order_id=eq.${orderId}` }, (payload) => callback(payload.new)).subscribe();
};

export const unsubscribeFromChat = (channel: any) => { 
    supabase.removeChannel(channel); 
};
