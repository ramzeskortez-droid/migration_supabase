import { supabase } from '../../../lib/supabaseClient';

export const markChatAsRead = async (orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER'): Promise<void> => {
    let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
    const escapedName = supplierName.split('"').join('"'); 
    if (readerRole === 'ADMIN') query = query.eq('sender_name', escapedName).eq('sender_role', 'SUPPLIER');
    else query = query.eq('sender_role', 'ADMIN').eq('recipient_name', escapedName);
    await query;
};

export const deleteChatHistory = async (orderId: string, supplierName?: string): Promise<void> => {
    let query = supabase.from('chat_messages').delete().eq('order_id', orderId);
    if (supplierName) {
        const escapedName = supplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    await query;
};

export const archiveChat = async (orderId: string, supplierName: string): Promise<void> => {
    const escapedName = supplierName.split('"').join('"');
    await supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId).or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
};

export const getGlobalChatThreads = async (filterBySupplierName?: string, isArchived: boolean = false): Promise<Record<string, Record<string, any>>> => {
    if (!isArchived) supabase.rpc('auto_archive_chats').then(() => {});
    let query = supabase.from('chat_messages').select('*').eq('is_archived', isArchived).order('created_at', { ascending: false }).limit(500);
    if (filterBySupplierName) {
        const escapedName = filterBySupplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    const { data, error } = await query;
    if (error) throw error;
    const threads: Record<string, Record<string, any>> = {};
    data?.forEach((msg: any) => {
        const oid = String(msg.order_id);
        let supplierKey = msg.sender_role === 'SUPPLIER' ? msg.sender_name : (msg.recipient_name || 'Unknown');
        if (supplierKey === 'Unknown') return;
        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][supplierKey]) {
            threads[oid][supplierKey] = { lastMessage: msg.message, lastAuthorName: msg.sender_name, time: msg.created_at, unread: 0 };
        }
        const isMsgFromOther = filterBySupplierName 
          ? ['ADMIN', 'MANAGER', 'OPERATOR'].includes(msg.sender_role) 
          : (msg.sender_role === 'SUPPLIER');
          
        if (!msg.is_read && isMsgFromOther) threads[oid][supplierKey].unread++;
    });
    return threads;
};
