import { supabase } from '../../../lib/supabaseClient';

export const lockEmail = async (emailId: string, userId: string): Promise<void> => {
    const { error } = await supabase
        .from('incoming_emails')
        .update({ 
            locked_by: userId,
            locked_at: new Date().toISOString()
        })
        .eq('id', emailId);
    
    if (error) throw error;
};

export const unlockEmail = async (emailId: string): Promise<void> => {
    const { error } = await supabase
        .from('incoming_emails')
        .update({ 
            locked_by: null,
            locked_at: null
        })
        .eq('id', emailId);
    
    if (error) throw error;
};
