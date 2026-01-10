import { supabase } from '../../../lib/supabaseClient';

export async function addBrand(name: string, createdBy: string = 'Admin'): Promise<void> {
    const { error } = await supabase.from('brands').insert({ name, created_by: createdBy });
    if (error) throw error;
}

export async function updateBrand(id: number, name: string): Promise<void> {
    const { error } = await supabase.from('brands').update({ name }).eq('id', id);
    if (error) throw error;
}

export async function deleteBrand(id: number): Promise<void> {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
}
