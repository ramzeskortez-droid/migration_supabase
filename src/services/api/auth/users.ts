import { supabase } from '../../../lib/supabaseClient';
import { AppUser } from '../../../types';

export const getAppUsers = async (status: 'pending' | 'approved'): Promise<AppUser[]> => {
    const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data.map((u: any) => ({
        id: u.id,
        name: u.name,
        token: u.token,
        role: u.role,
        phone: u.phone,
        status: u.status,
        createdAt: u.created_at
    }));
};

export const updateUserStatus = async (userId: string, status: 'approved' | 'rejected'): Promise<void> => {
    if (status === 'rejected') {
        const { error, count } = await supabase.from('app_users').delete({ count: 'exact' }).eq('id', userId);
        if (error) throw error;
        if (count === 0) throw new Error('Пользователь не найден или нет прав на удаление');
    } else {
        const { data, error } = await supabase.from('app_users').update({ status }).eq('id', userId).select();
        if (error) throw error;
        if (!data || data.length === 0) throw new Error('Пользователь не найден или нет прав на обновление (RLS)');
    }
};
