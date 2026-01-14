import { supabase } from '../../../lib/supabaseClient';

export const getChatMessages = async (
    orderId: string, 
    offerId?: string, 
    supplierName?: string, 
    supplierId?: string, 
    interlocutorRole?: 'OPERATOR' | 'MANAGER' | 'ADMIN'
): Promise<any[]> => {
    let query = supabase.from('chat_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    
    // Фильтрация по ветке (С кем общаемся?)
    if (interlocutorRole) {
        // Если мы общаемся с Оператором, нам нужны сообщения где sender=OP или recipient=OP
        if (interlocutorRole === 'OPERATOR') {
            // Исправленная логика: используем один OR для всех условий ролей
            // Убрали recipient_role, так как колонки нет в БД
            query = query.or('sender_role.eq.OPERATOR,recipient_name.eq.OPERATOR,recipient_name.eq.Оператор');
        } else {
            // Manager/Admin
            // sender is Admin/Manager OR recipient is Admin/Manager
            query = query.or('sender_role.eq.ADMIN,sender_role.eq.MANAGER,recipient_name.eq.ADMIN,recipient_name.eq.Менеджер');
        }
    }

    if (supplierId) {
        // Если есть ID, ищем по ID или по имени (для старых сообщений)
        const escapedName = supplierName ? supplierName.split('"').join('"') : '';
        query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId},sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
    } else if (supplierName) {
        // Fallback
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
    // Ищем по ID или имени
    let filter = '';
    const supplierId = payload.sender_role === 'SUPPLIER' ? payload.sender_id : payload.recipient_id;
    const supplierName = payload.sender_role === 'SUPPLIER' ? payload.sender_name : payload.recipient_name;

    if (supplierId) {
        filter = `sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`;
    } else if (supplierName && supplierName !== 'ADMIN') {
        const escapedName = supplierName.split('"').join('"');
        filter = `sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`;
    }

    if (filter) {
        await supabase.from('chat_messages')
          .update({ is_archived: false })
          .eq('order_id', payload.order_id)
          .or(filter);
    }

    return data;
};
