import { supabase } from '../../../lib/supabaseClient';

export const markChatAsRead = async (orderId: string, currentUserId: string, interlocutorId: string): Promise<void> => {
    // Mark as read ONLY messages from Interlocutor to Me in this Order
    const { error } = await supabase.from('chat_messages')
        .update({ is_read: true })
        .eq('order_id', orderId)
        .eq('sender_id', interlocutorId)
        .eq('recipient_id', currentUserId);
    
    if (error) console.error('Error marking as read:', error);
};

export const deleteChatHistory = async (orderId: string, currentUserId: string, interlocutorId: string): Promise<void> => {
    // Delete messages between Me and Interlocutor
    await supabase.from('chat_messages')
        .delete()
        .eq('order_id', orderId)
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${interlocutorId}),and(sender_id.eq.${interlocutorId},recipient_id.eq.${currentUserId})`);
};

export const archiveChat = async (orderId: string, currentUserId: string, interlocutorId: string): Promise<void> => {
    // Archive thread between Me and Interlocutor
    await supabase.from('chat_messages')
        .update({ is_archived: true })
        .eq('order_id', orderId)
        .or(`and(sender_id.eq.${currentUserId},recipient_id.eq.${interlocutorId}),and(sender_id.eq.${interlocutorId},recipient_id.eq.${currentUserId})`);
};

export const getGlobalChatThreads = async (
    currentUserId: string,
    isArchived: boolean = false
): Promise<Record<string, Record<string, any>>> => {
    // 1. Fetch relevant messages (where I am Sender OR Recipient)
    const { data: messages, error } = await supabase
        .from('chat_messages')
        .select('id, order_id, sender_id, recipient_id, sender_role, recipient_name, message, created_at, is_read, is_archived')
        .eq('is_archived', isArchived)
        .or(`sender_id.eq.${currentUserId},recipient_id.eq.${currentUserId}`)
        .order('is_read', { ascending: true }) // Unread first
        .order('created_at', { ascending: false }) // Then newest
        .limit(2000); // Increased limit for better coverage

    if (error) throw error;
    
    const threads: Record<string, Record<string, any>> = {};
    const interlocutorIds = new Set<string>();

    // 2. Group messages into threads
    messages?.forEach((msg: any) => {
        const oid = String(msg.order_id);
        
        // Determine Interlocutor (The other person)
        let interlocutorId: string | null = null;
        if (msg.sender_id === currentUserId) {
            interlocutorId = msg.recipient_id;
        } else {
            interlocutorId = msg.sender_id;
        }

        if (!interlocutorId) return; // Should not happen in strict P2P
        interlocutorIds.add(interlocutorId);

        if (!threads[oid]) threads[oid] = {};
        if (!threads[oid][interlocutorId]) {
            threads[oid][interlocutorId] = { 
                lastMessage: msg.message, 
                time: msg.created_at, 
                unread: 0,
                supplierId: interlocutorId, // Keeping naming for compat, but it's just Interlocutor ID
                displayName: 'Загрузка...', // Placeholder
                role: 'UNKNOWN'
            };
        }
        
        // Count Unread (Only messages SENT to ME)
        if (!msg.is_read && msg.recipient_id === currentUserId) {
            threads[oid][interlocutorId].unread++;
        }
    });

    // 3. Fetch User Details for Interlocutors
    if (interlocutorIds.size > 0) {
        const { data: users } = await supabase
            .from('app_users')
            .select('id, name, role')
            .in('id', Array.from(interlocutorIds));
        
        const userMap = new Map(users?.map(u => [u.id, u]) || []);

        // 4. Enrich threads with Names and Roles
        Object.keys(threads).forEach(oid => {
            Object.keys(threads[oid]).forEach(iid => {
                const user = userMap.get(iid);
                if (user) {
                    threads[oid][iid].displayName = user.name || 'Без имени';
                    threads[oid][iid].role = user.role;
                } else {
                    threads[oid][iid].displayName = 'Неизвестный пользователь';
                }
            });
        });
    }

    return threads;
};