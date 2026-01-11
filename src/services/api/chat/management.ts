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

export const getGlobalChatThreads = async (filterBySupplierName?: string, isArchived: boolean = false): Promise<Record<string, Record<string, any>>> => {
    if (!isArchived) supabase.rpc('auto_archive_chats').then(() => {});
    
    // Запрашиваем сообщения. Для счетчиков в табах нам может понадобиться больше данных, 
    // но пока придерживаемся текущей логики фильтрации по is_archived.
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
        
        // Определяем ключ поставщика (с кем чат)
        let supplierKey = msg.sender_role === 'SUPPLIER' ? msg.sender_name : (msg.recipient_name || 'Unknown');
        
        // Спец-случай для системных сообщений OPERATOR -> ADMIN или наоборот
        if (supplierKey === 'OPERATOR' || supplierKey === 'ADMIN') {
            // Если сообщение системное, привязываем его к какому-то ключу или заказу в целом
            // В данном проекте чаты идут [Заказ][Поставщик]. Системное сообщение о ручной обработке 
            // привязано к заказу, но в recipient_name стоит OPERATOR.
            // Чтобы оно попало в список, используем OPERATOR как ключ, если нет закупщика.
            supplierKey = (msg.sender_role === 'SUPPLIER' || msg.recipient_name === 'SUPPLIER') ? supplierKey : 'OPERATOR';
        }

        if (supplierKey === 'Unknown') return;
        
        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][supplierKey]) {
            threads[oid][supplierKey] = { lastMessage: msg.message, lastAuthorName: msg.sender_name, time: msg.created_at, unread: 0 };
        }
        
        // Считаем непрочитанные: сообщение должно быть ВХОДЯЩИМ для текущего пользователя
        // Если мы не знаем кто текущий (в этом методе), считаем "все непрочитанные не от меня" 
        // Логика ниже: если я (Поставщик) смотрю - непрочитанные те, что от ADMIN.
        // Если я (Админ/Опер) смотрю - непрочитанные те, что от SUPPLIER или ADMIN (системные для оператора).
        
        const isMsgIncoming = filterBySupplierName 
          ? ['ADMIN', 'MANAGER', 'OPERATOR'].includes(msg.sender_role) // Я поставщик, входящие от офиса
          : (msg.sender_role === 'SUPPLIER' || (msg.sender_role === 'ADMIN' && msg.recipient_name === 'OPERATOR')); // Я офис, входящие от пост или системные
          
        if (!msg.is_read && isMsgIncoming) {
            threads[oid][supplierKey].unread++;
        }
    });
    return threads;
};
