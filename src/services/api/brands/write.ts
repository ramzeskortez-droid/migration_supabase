import { supabase } from '../../../lib/supabaseClient';

export async function addBrand(name: string, createdBy: string = 'Admin', official: boolean = false): Promise<void> {
    const { error } = await supabase.from('brands').insert({ name, created_by: createdBy, official });
    if (error) throw error;
}

export async function updateBrand(id: number, name: string, official?: boolean): Promise<void> {
    const updates: any = { name };
    if (official !== undefined) updates.official = official;
    
    const { error } = await supabase.from('brands').update(updates).eq('id', id);
    if (error) throw error;
}

export async function deleteBrand(id: number): Promise<void> {
    const { error } = await supabase.from('brands').delete().eq('id', id);
    if (error) throw error;
}
