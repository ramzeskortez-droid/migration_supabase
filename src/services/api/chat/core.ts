import { supabase } from '../../../lib/supabaseClient';

export const getChatMessages = async (
    orderId: string, 
    offerId?: string, 
    supplierName?: string, 
    supplierId?: string, 
    interlocutorRole?: 'OPERATOR' | 'MANAGER' | 'ADMIN',
    currentUserRole?: 'ADMIN' | 'SUPPLIER' | 'OPERATOR'
): Promise<any[]> => {
    let query = supabase.from('chat_messages').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
    
    // --- 1. OPERATOR VIEW ---
    if (currentUserRole === 'OPERATOR') {
        if (interlocutorRole === 'MANAGER' || interlocutorRole === 'ADMIN') {
            // Chat with Manager: Only messages between Operator and Manager/Admin
            query = query.or('and(sender_role.eq.OPERATOR,recipient_name.in.(ADMIN,MANAGER,Менеджер,Manager)),and(sender_role.in.(ADMIN,MANAGER),recipient_name.in.(OPERATOR,Оператор,Operator))');
        } else {
            // Chat with Supplier (Default)
            // Hide Manager-Supplier messages (Isolate threads)
            query = query.not('recipient_name', 'in', '("ADMIN","Manager","Менеджер","Manager")')
                         .not('sender_role', 'in', '("ADMIN","MANAGER")');
            
            // Filter by Supplier (strictly by ID if available)
            if (supplierId) {
                query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`);
            }
        }
    } 
    // --- 2. MANAGER/ADMIN VIEW ---
    else if (currentUserRole === 'ADMIN') {
        if (interlocutorRole === 'OPERATOR') {
            // Chat with Operator: Show only messages between Admin/Manager and Operator
            query = query.or('and(sender_role.in.(ADMIN,MANAGER),recipient_name.in.(OPERATOR,Оператор,Operator)),and(sender_role.eq.OPERATOR,recipient_name.in.(ADMIN,MANAGER,Менеджер,Manager))');
            query = query.neq('sender_role', 'SUPPLIER');
        } else {
            // Chat with Supplier (Default)
            // Hide Operator-related messages
            query = query.not('recipient_name', 'in', '("OPERATOR","Operator","Оператор")')
                         .neq('sender_role', 'OPERATOR');
            
            if (supplierId) {
                query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`);
            }
        }
    }
    // --- 3. SUPPLIER VIEW ---
    else {
        // Supplier sees only their own messages
        if (supplierId) { // supplierId here acts as currentUserId
            query = query.or(`sender_id.eq.${supplierId},recipient_id.eq.${supplierId}`);
        } else if (supplierName) {
             // Fallback for name (if needed for old messages)
             const escapedName = supplierName.split('"').join('"');
             query = query.or(`sender_name.eq."${escapedName}",recipient_name.eq."${escapedName}"`);
        }
        
        // Filter by thread role (Manager vs Operator)
        if (interlocutorRole === 'OPERATOR') {
             query = query.or('sender_role.eq.OPERATOR,recipient_name.eq.OPERATOR,recipient_name.eq.Оператор');
        } else {
             // Manager
             query = query.or('sender_role.eq.ADMIN,sender_role.eq.MANAGER,recipient_name.eq.ADMIN,recipient_name.eq.Менеджер,recipient_name.eq.Manager');
        }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
};

export const sendChatMessage = async (payload: any): Promise<any> => {
    const { data, error } = await supabase.from('chat_messages').insert(payload).select().single();
    if (error) throw error;

    // Unarchive thread
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