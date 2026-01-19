import { supabase } from '../../../lib/supabaseClient';

export const markChatAsRead = async (orderId: string, supplierName: string, readerRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR', supplierId?: string, readerId?: string): Promise<void> => {
    let query = supabase.from('chat_messages').update({ is_read: true }).eq('order_id', orderId);
    
    const escapedName = supplierName.split('"').join('"'); 
    
    if (readerRole === 'ADMIN' || readerRole === 'OPERATOR') {
        if (supplierId) {
             query = query.or(`sender_id.eq.${supplierId},and(sender_role.in.(ADMIN,OPERATOR),recipient_id.eq.${supplierId})`);
        } else {
             query = query.or(`and(sender_name.eq."${escapedName}",sender_role.eq.SUPPLIER),and(sender_role.eq.ADMIN,recipient_name.eq.OPERATOR)`);
        }
    } else {
        if (readerId) {
            query = query.eq('recipient_id', readerId);
        }
        if (supplierName === 'Оператор' || supplierName === 'OPERATOR') {
            query = query.eq('sender_role', 'OPERATOR');
        } else {
            query = query.in('sender_role', ['ADMIN', 'MANAGER']);
        }
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
        
        // --- 1. VISIBILITY LOGIC ---
        if (currentUserRole === 'ADMIN') {
             if (msg.sender_role === 'OPERATOR') return; 
             if (msg.sender_role === 'SUPPLIER' && (msg.recipient_name === 'OPERATOR' || msg.recipient_name === 'Оператор')) return;
        }

        // --- 2. THREAD GROUPING ---
        let threadKey = 'Unknown';
        let supplierId = null;
        let interlocutorRole = 'SUPPLIER';
        let interlocutorName = 'Unknown';
        let interlocutorId: string | null = null;

        if (currentUserRole === 'SUPPLIER') {
            const sender = msg.sender_role?.toUpperCase();
            const recipient = msg.recipient_name?.toUpperCase();
            const isOperatorChannel = sender === 'OPERATOR' || recipient === 'OPERATOR' || recipient === 'ОПЕРАТОР';

            threadKey = isOperatorChannel ? 'Оператор' : 'Менеджер';
            interlocutorRole = isOperatorChannel ? 'OPERATOR' : 'MANAGER';
        } else {
            const isMeSender = (currentUserRole === 'ADMIN' && ['ADMIN','MANAGER'].includes(msg.sender_role)) || 
                               (currentUserRole === 'OPERATOR' && msg.sender_role === 'OPERATOR');

            if (isMeSender) {
                interlocutorName = msg.recipient_name;
                interlocutorId = msg.recipient_id;
            } else {
                interlocutorName = msg.sender_name;
                interlocutorId = msg.sender_id;
            }

            // Force grouping for Operator chat (Admin view)
            if (currentUserRole === 'ADMIN') {
                const isOperatorChat = msg.sender_role === 'OPERATOR' || ['OPERATOR', 'Operator', 'Оператор'].includes(msg.recipient_name);
                if (isOperatorChat) {
                    threadKey = 'Оператор';
                    interlocutorRole = 'OPERATOR';
                    interlocutorName = 'Оператор';
                    supplierId = null; 
                }
            } 
            
            // Force grouping for Manager chat (Operator view)
            if (currentUserRole === 'OPERATOR') {
                 const isManagerChat = ['ADMIN', 'MANAGER', 'Manager', 'Менеджер'].includes(msg.sender_role) || ['ADMIN', 'MANAGER', 'Manager', 'Менеджер'].includes(msg.recipient_name);
                 if (isManagerChat) {
                     threadKey = 'Менеджер';
                     interlocutorRole = 'MANAGER';
                     interlocutorName = 'Менеджер';
                     supplierId = null;
                 }
            }

            // Regular logic
            if (!threadKey || threadKey === 'Unknown') {
                // If it's a supplier chat (or remaining case)
                threadKey = interlocutorId || interlocutorName || 'Unknown';
                supplierId = interlocutorId;
            }
        }

        if (threadKey === 'Unknown') return;
        
        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][threadKey]) {
            threads[oid][threadKey] = { 
                lastMessage: msg.message, 
                lastAuthorName: msg.sender_name, 
                time: msg.created_at, 
                unread: 0,
                supplierId: supplierId,
                displayName: interlocutorName,
                role: interlocutorRole
            };
        }
        
        // --- 3. UNREAD COUNTER ---
        let isMsgIncoming = false;
        
        if (currentUserRole === 'SUPPLIER') {
            if (threadKey === 'Оператор') {
                isMsgIncoming = msg.sender_role === 'OPERATOR';
            } else { // Менеджер
                isMsgIncoming = ['ADMIN', 'MANAGER'].includes(msg.sender_role);
            }
        } else {
            // Admin/Operator
            if (currentUserRole === 'OPERATOR') {
                 // From Supplier OR From Manager (if in Manager thread)
                 if (threadKey === 'Менеджер') isMsgIncoming = ['ADMIN', 'MANAGER'].includes(msg.sender_role);
                 else isMsgIncoming = msg.sender_role === 'SUPPLIER';
            } else {
                 // Admin: From Supplier OR From Operator
                 if (threadKey === 'Оператор') isMsgIncoming = msg.sender_role === 'OPERATOR';
                 else isMsgIncoming = msg.sender_role === 'SUPPLIER';
            }
        }
          
        if (!msg.is_read && isMsgIncoming) {
            threads[oid][threadKey].unread++;
        }
    });
    return threads;
};