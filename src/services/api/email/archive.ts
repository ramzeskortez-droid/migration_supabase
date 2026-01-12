import { supabase } from '../../../lib/supabaseClient';

export const archiveEmail = async (emailId: string): Promise<void> => {
    const { error } = await supabase
        .from('incoming_emails')
        .update({ status: 'processed' })
        .eq('id', emailId);
    
    if (error) throw error;
};
