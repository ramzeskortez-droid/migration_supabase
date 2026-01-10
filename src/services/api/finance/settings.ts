import { supabase } from '../../../lib/supabaseClient';

export async function getSystemSettings(key: string): Promise<any> {
  const { data, error } = await supabase
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .maybeSingle();
  
  if (error) return null;
  return data?.value || null;
}

export async function updateSystemSettings(key: string, value: any, updatedBy: string): Promise<void> {
    const { error } = await supabase.from('system_settings').upsert({
        key,
        value,
        updated_by: updatedBy,
        updated_at: new Date().toISOString()
    });
    if (error) throw error;
}
