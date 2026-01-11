import { supabase } from '../../../lib/supabaseClient';

export const approveOrderFast = async (orderId: string, winners: any[]): Promise<void> => {
    const { error } = await supabase.rpc('approve_order_winners', { p_order_id: Number(orderId), p_winners: winners });
    if (error) throw error;
};

export const updateWorkflowStatus = async (orderId: string, status: string): Promise<void> => {
    await supabase.from('orders').update({ status_client: status, status_manager: status, status_updated_at: new Date().toISOString() }).eq('id', orderId);
};

export const refuseOrder = async (orderId: string, reason: string, userRole: 'ADMIN' | 'OPERATOR'): Promise<void> => {
    const status = userRole === 'ADMIN' ? 'Аннулирован' : 'Отказ';
    const { error } = await supabase.from('orders').update({
        status_manager: status,
        status_client: status,
        status_updated_at: new Date().toISOString(),
        refusal_reason: reason
    }).eq('id', orderId);

    if (error) throw error;
};

export const manualApproveOrder = async (orderId: string): Promise<void> => {
    const { error } = await supabase.rpc('set_manual_mode', { p_order_id: Number(orderId) });
    if (error) throw error;
};
