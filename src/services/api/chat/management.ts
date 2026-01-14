import { supabase } from '../../../lib/supabaseClient';

export const markChatAsRead = async (orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR', supplierId?: string): Promise<void> => {
    let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
    
    const escapedName = supplierName.split('"').join('"'); 
    
    if (readerRole === 'ADMIN' || readerRole === 'OPERATOR') {
        if (supplierId) {
             query = query.or(`sender_id.eq.${supplierId},and(sender_role.in.(ADMIN,OPERATOR),recipient_id.eq.${supplierId})`);
        } else {
             query = query.or(`and(sender_name.eq."${escapedName}",sender_role.eq.SUPPLIER),and(sender_role.eq.ADMIN,recipient_name.eq.OPERATOR)`);
        }
    } else {
        // Поставщик читает: сообщения от ADMIN, MANAGER или OPERATOR
        query = query.in('sender_role', ['ADMIN', 'MANAGER', 'OPERATOR']);
        if (supplierId) query = query.eq('recipient_id', supplierId);
        else query = query.eq('recipient_name', escapedName);
    }
    
    const { error } = await query;
    if (error) console.error('Error marking as read:', error);
};

export const deleteChatHistory = async (orderId: string, supplierName?: string, supplierId?: string): Promise<void> => {
    let query = supabase.from('chat_messages').delete().eq('order_id', orderId);
    if (supplierId) {
        query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`);
    } else if (supplierName) {
        const escapedName = supplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    await query;
};

export const archiveChat = async (orderId: string, supplierName: string, supplierId?: string): Promise<void> => {
    let query = supabase.from('chat_messages').update({ is_archived: true }).eq('order_id', orderId);
    if (supplierId) {
        query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`);
    } else {
        const escapedName = supplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    await query;
};

export const getGlobalChatThreads = async (
    filterBySupplierName?: string, 
    isArchived: boolean = false, 
    currentUserRole?: 'ADMIN' | 'SUPPLIER' | 'OPERATOR',
    filterBySupplierId?: string
): Promise<Record<string, Record<string, any>>> => {
    if (!isArchived) supabase.rpc('auto_archive_chats').then(() => {});
    
    let query = supabase.from('chat_messages').select('*').eq('is_archived', isArchived).order('created_at', { ascending: false }).limit(500);
    
    if (filterBySupplierId) {
        query = query.or(`sender_id.eq.${filterBySupplierId},recipient_id.eq.${filterBySupplierId}`);
    } else if (filterBySupplierName) {
        const escapedName = filterBySupplierName.split('"').join('"');
        query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    const threads: Record<string, Record<string, any>> = {};
    data?.forEach((msg: any) => {
        const oid = String(msg.order_id);
        
        // --- 1. VISIBILITY LOGIC (Кто что видит) ---
        if (currentUserRole === 'ADMIN') {
             // Менеджер НЕ должен видеть переписку Оператор <-> Поставщик
             // Если отправитель Оператор - скрываем
             if (msg.sender_role === 'OPERATOR') return; 
             // Если Поставщик пишет Оператору (определяем по recipient_name) - скрываем
             if (msg.sender_role === 'SUPPLIER' && (msg.recipient_name === 'OPERATOR' || msg.recipient_name === 'Оператор')) return;
        }

        // --- 2. THREAD GROUPING (Как группируем) ---
        let threadKey = 'Unknown';
        let supplierId = null;

        if (currentUserRole === 'SUPPLIER') {
            // Для Закупщика есть только два собеседника: Оператор и Менеджер
            // Определяем "канал" сообщения
            const sender = msg.sender_role?.toUpperCase();
            const recipient = msg.recipient_name?.toUpperCase();
            
            const isOperatorChannel = 
                sender === 'OPERATOR' || 
                recipient === 'OPERATOR' || 
                recipient === 'ОПЕРАТОР';

            threadKey = isOperatorChannel ? 'Оператор' : 'Менеджер';
        } else {
            // Для Менеджера/Оператора: Группировка по Поставщику (имя или ID)
            if (msg.sender_role === 'SUPPLIER') {
                threadKey = msg.sender_name;
                supplierId = msg.sender_id;
            } else {
                // Если мы писали, то собеседник - получатель
                threadKey = msg.recipient_name || 'Unknown';
                supplierId = msg.recipient_id;
            }
            
            // Защита от системных имен в заголовках тредов
            if (['OPERATOR', 'ADMIN', 'MANAGER', 'Оператор', 'Менеджер'].includes(threadKey)) {
                // Если имя системное, значит что-то пошло не так с определением имени поставщика.
                // Пытаемся найти нормальное имя или оставляем как есть, но это сигнал об ошибке данных.
                // В контексте Админа threadKey ДОЛЖЕН быть именем поставщика.
            }
        }

        if (threadKey === 'Unknown') return;
        
        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][threadKey]) {
            threads[oid][threadKey] = { 
                lastMessage: msg.message, 
                lastAuthorName: msg.sender_name, // Для отображения "кто написал последний"
                time: msg.created_at, 
                unread: 0,
                supplierId: supplierId // Store ID
            };
        }
        
        // --- 3. UNREAD COUNTER ---
        // Считаем непрочитанные ТОЛЬКО входящие
        let isMsgIncoming = false;
        
        if (currentUserRole === 'SUPPLIER') {
            // Для поставщика входящие: от Админа/Менеджера или Оператора
            // Но считаем только те, что в этом треде
            if (threadKey === 'Оператор') {
                isMsgIncoming = msg.sender_role === 'OPERATOR';
            } else { // Менеджер
                isMsgIncoming = ['ADMIN', 'MANAGER'].includes(msg.sender_role);
            }
        } else {
            // Для Админа/Оператора входящие: от Поставщика
            isMsgIncoming = msg.sender_role === 'SUPPLIER';
            // А также сообщения от Админа к Оператору? Нет, это внутренние.
            // Нас интересует чат с поставщиком.
        }
          
        if (!msg.is_read && isMsgIncoming) {
            threads[oid][threadKey].unread++;
        }
    });
    return threads;
};
