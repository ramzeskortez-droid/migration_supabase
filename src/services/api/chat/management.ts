import { supabase } from '../../../lib/supabaseClient';

export const markChatAsRead = async (orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR'): Promise<void> => {
    // Базовый запрос на обновление
    let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
    
    const escapedName = supplierName.split('"').join('"'); 
    
    if (readerRole === 'ADMIN' || readerRole === 'OPERATOR') {
        // Менеджер или Оператор читают: 
        // 1. Сообщения от этого поставщика
        // 2. Системные сообщения (ADMIN -> OPERATOR) по этому заказу
        query = query.or(`and(sender_name.eq."${escapedName}",sender_role.eq.SUPPLIER),and(sender_role.eq.ADMIN,recipient_name.eq.OPERATOR)`);
    } else {
        // Поставщик читает: сообщения от ADMIN/OPERATOR к нему
        query = query.eq('sender_role', 'ADMIN').eq('recipient_name', escapedName);
    }
    
    const { error } = await query;
    if (error) console.error('Error marking as read:', error);
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

export const getGlobalChatThreads = async (
    filterBySupplierName?: string, 
    isArchived: boolean = false, 
    currentUserRole?: 'ADMIN' | 'SUPPLIER' | 'OPERATOR'
): Promise<Record<string, Record<string, any>>> => {
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
        
        let threadKey = 'Unknown';

        if (currentUserRole === 'SUPPLIER') {
            // Для Закупщика разделяем ветки: Менеджер и Оператор
            if (msg.sender_role === 'ADMIN' || msg.recipient_name === 'ADMIN') {
                threadKey = 'Менеджер';
            } else if (msg.sender_role === 'OPERATOR' || msg.recipient_name === 'OPERATOR') {
                threadKey = 'Оператор';
            } else {
                // Fallback: Если сообщение между поставщиками (не должно быть) или системное
                threadKey = 'Оператор';
            }
        } else {
            // Для Менеджера/Оператора группируем по Имени Поставщика
            threadKey = msg.sender_role === 'SUPPLIER' ? msg.sender_name : (msg.recipient_name || 'Unknown');
            
            // Если это системное сообщение (ADMIN -> OPERATOR), оно не привязано к поставщику
            if (threadKey === 'OPERATOR' || threadKey === 'ADMIN') {
                // Пытаемся понять, касается ли это поставщика. Если нет - это внутренний чат.
                // Но мы хотим видеть это сообщение. Пусть будет 'OPERATOR' (Системное)
                // Если мы фильтруем по поставщику (например в GlobalChatWindow), то мы видим только его сообщения.
                // Если мы без фильтра (Админ смотрит всё), то системные сообщения будут в отдельной куче?
                // Пока оставим 'OPERATOR' для системных.
                threadKey = 'OPERATOR';
            }
        }

        if (threadKey === 'Unknown') return;
        
        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][threadKey]) {
            threads[oid][threadKey] = { lastMessage: msg.message, lastAuthorName: msg.sender_name, time: msg.created_at, unread: 0 };
        }
        
        const isMsgIncoming = filterBySupplierName 
          ? ['ADMIN', 'MANAGER', 'OPERATOR'].includes(msg.sender_role) // Я поставщик, входящие от офиса
          : (msg.sender_role === 'SUPPLIER' || (msg.sender_role === 'ADMIN' && msg.recipient_name === 'OPERATOR')); // Я офис
          
        if (!msg.is_read && isMsgIncoming) {
            threads[oid][threadKey].unread++;
        }
    });
    return threads;
};
