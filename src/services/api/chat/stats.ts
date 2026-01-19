import { supabase } from '../../../lib/supabaseClient';

export const getUnreadChatCount = async (): Promise<number> => {
    // Admin only sees messages addressed to ADMIN/MANAGER
    const { count } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('sender_role', 'SUPPLIER')
        .in('recipient_name', ['ADMIN', 'MANAGER', 'Manager', 'Менеджер'])
        .eq('is_read', false);
    return count || 0;
};

export const getUnreadChatCountForSupplier = async (supplierName: string): Promise<{ count: number }> => {
    // Supplier sees messages addressed to THEM (by name)
    const escapedName = supplierName.split('"').join('"');
    const { count } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_name', escapedName)
        .eq('is_read', false);
    return { count: count || 0 };
};

export const getOperatorUnreadCount = async (): Promise<number> => {
    // Operator sees messages from SUPPLIER to OPERATOR, or from ADMIN/MANAGER to OPERATOR
    const { count } = await supabase.from('chat_messages')
        .select('*', { count: 'exact', head: true })
        .or('and(sender_role.eq.SUPPLIER,recipient_name.eq.OPERATOR),and(sender_role.eq.SUPPLIER,recipient_name.eq.Оператор),and(sender_role.eq.ADMIN,recipient_name.eq.OPERATOR),and(sender_role.eq.MANAGER,recipient_name.eq.OPERATOR)')
        .eq('is_read', false);
    return count || 0;
};
