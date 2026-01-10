import { supabase } from '../../../lib/supabaseClient';

export async function uploadFile(file: File, folder: 'orders' | 'offers' | 'chat'): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${folder}/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.${fileExt}`;

    const { error } = await supabase.storage
        .from('attachments')
        .upload(fileName, file);

    if (error) throw error;

    const { data } = supabase.storage
        .from('attachments')
        .getPublicUrl(fileName);
    
    return data.publicUrl;
}
