import { supabase } from '../../../lib/supabaseClient';
import { AppUser } from '../../../types';

export const loginWithToken = async (token: string): Promise<AppUser | null> => {
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('token', token)
    .maybeSingle();
  
  if (error) throw error;
  if (!data) return null;

  if (data.status === 'pending') {
      throw new Error('Ваш аккаунт находится на проверке. Ожидайте подтверждения менеджера.');
  }

  if (data.status === 'rejected') {
      throw new Error('Доступ запрещен. Ваш аккаунт был отклонен.');
  }

  if (data.status !== 'approved') {
       throw new Error('Статус аккаунта не подтвержден.');
  }

  return {
    id: data.id,
    name: data.name,
    token: data.token,
    role: data.role,
    phone: data.phone,
    status: data.status
  };
};
