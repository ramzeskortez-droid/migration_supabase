import { supabase } from '../../../lib/supabaseClient';
import { AppUser } from '../../../types';

export const generateInviteCode = async (role: 'operator' | 'buyer' | 'admin'): Promise<string> => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.rpc('create_invite_code', { p_code: code, p_role: role });
    if (error) throw error;
    return code;
};

export const getActiveInvites = async (): Promise<any[]> => {
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('is_used', false)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data;
};

export const registerUser = async (name: string, token: string, phone: string, role: 'operator' | 'buyer' | 'admin', inviteCode: string): Promise<AppUser> => {
    // 1. Создаем пользователя (pending)
    const { data: user, error: userError } = await supabase
        .from('app_users')
        .insert({ name, token, role, phone, status: 'pending' }) 
        .select()
        .single();
    
    if (userError) throw userError;

    // 2. Активируем инвайт
    const { data: success, error: inviteError } = await supabase.rpc('use_invite_code', {
        p_code: inviteCode,
        p_role: role,
        p_user_id: user.id
    });

    if (inviteError || !success) {
        // Если инвайт недействителен, удаляем пользователя (rollback вручную)
        await supabase.from('app_users').delete().eq('id', user.id);
        throw new Error('Неверный или использованный инвайт-код');
    }

    return {
        id: user.id,
        name: user.name,
        token: user.token,
        role: user.role,
        phone: user.phone,
        status: user.status
    };
};
