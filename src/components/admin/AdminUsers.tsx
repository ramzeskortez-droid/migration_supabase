import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';
import { AppUser } from '../../types';
import { Toast } from '../shared/Toast';
import { UserCheck, UserX, Clock, Users as UsersIcon, Phone, Shield, Calendar, Search, Key, Copy, Check } from 'lucide-react';

export const AdminUsers: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'invites'>('pending');
    const [searchTerm, setSearchTerm] = useState('');
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
    const [inviteRole, setInviteRole] = useState<'operator' | 'buyer'>('buyer');
    const [generatedInvite, setGeneratedInvite] = useState<string | null>(null);

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin_users', activeTab],
        queryFn: () => activeTab === 'invites' ? [] : SupabaseService.getAppUsers(activeTab as any),
        enabled: activeTab !== 'invites'
    });

    const { data: invites, refetch: refetchInvites } = useQuery({
        queryKey: ['admin_invites'],
        queryFn: () => SupabaseService.getActiveInvites(),
        enabled: activeTab === 'invites'
    });

    const handleGenerateInvite = async () => {
        try {
            const code = await SupabaseService.generateInviteCode(inviteRole);
            setGeneratedInvite(code);
            refetchInvites();
            setToast({ message: 'Инвайт-код создан', type: 'success' });
        } catch (e: any) {
            setToast({ message: e.message, type: 'error' });
        }
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setToast({ message: 'Скопировано', type: 'success' });
    };

    const { data: pendingUsers } = useQuery({
        queryKey: ['admin_users_pending_count'],
        queryFn: () => SupabaseService.getAppUsers('pending'),
        refetchInterval: 10000
    });
    
    const pendingCount = pendingUsers?.length || 0;

    const mutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string, status: 'approved' | 'rejected' }) => 
            SupabaseService.updateUserStatus(userId, status),
        onSuccess: (_, variables) => {
            setToast({ 
                message: variables.status === 'approved' ? 'Пользователь успешно одобрен' : 'Пользователь отклонен и удален', 
                type: 'success' 
            });
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            queryClient.invalidateQueries({ queryKey: ['admin_users_pending_count'] });
        },
        onError: (error: any) => {
            setToast({ message: `Ошибка: ${error.message}`, type: 'error' });
        }
    });

    const getRoleTitle = (role: string) => {
        switch(role) {
            case 'operator': return 'Операторы';
            case 'buyer': return 'Закупщики';
            case 'admin': return 'Менеджеры';
            default: return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch(role) {
            case 'operator': return 'bg-blue-50 text-blue-600 border-blue-200';
            case 'buyer': return 'bg-emerald-50 text-emerald-600 border-emerald-200';
            case 'admin': return 'bg-rose-50 text-rose-600 border-rose-200';
            default: return 'bg-slate-50 text-slate-600';
        }
    };

    const filteredUsers = users?.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.phone?.includes(searchTerm) ||
        u.token.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groupUsersByRole = () => {
        const groups = { operator: [], buyer: [], admin: [] } as Record<string, any[]>;
        filteredUsers?.forEach(u => {
            if (groups[u.role]) groups[u.role].push(u);
        });
        return groups;
    };

    const groupedUsers = groupUsersByRole();

    const renderUserCard = (user: any) => (
        <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-base shrink-0 ${
                        user.role === 'admin' ? 'bg-rose-100 text-rose-600' : 
                        user.role === 'operator' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                        <h3 className="font-black text-slate-900 uppercase text-xs flex flex-wrap items-center gap-1.5 break-all">
                            {user.name}
                            <span className={`text-[7px] px-1 py-0.5 rounded-full border shrink-0 ${
                                user.role === 'admin' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                user.role === 'operator' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                                {user.role}
                            </span>
                        </h3>
                        <div className="flex flex-col gap-1 mt-1.5">
                            <div className="flex items-start gap-1.5 text-slate-500 text-[9px] font-bold break-all">
                                <Phone size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                <span>{user.phone || 'Нет телефона'}</span>
                            </div>
                            <div className="flex items-start gap-1.5 text-slate-500 text-[9px] font-bold break-all">
                                <Shield size={10} className="text-slate-400 mt-0.5 shrink-0" />
                                <span className="opacity-60">Токен:</span> <span className="font-mono bg-slate-100 px-1 rounded">{user.token}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right shrink-0">
                    <div className="flex items-center justify-end gap-1 text-slate-400 text-[8px] font-bold mb-3 uppercase">
                        <Calendar size={10} />
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '-'}
                    </div>
                    
                    {activeTab === 'pending' ? (
                        <div className="flex gap-1.5 relative z-10">
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    mutation.mutate({ userId: user.id, status: 'rejected' });
                                }}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm cursor-pointer"
                                title="Отклонить"
                            >
                                <UserX size={16} className="pointer-events-none" />
                            </button>
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    mutation.mutate({ userId: user.id, status: 'approved' });
                                }}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm cursor-pointer"
                                title="Одобрить"
                            >
                                <UserCheck size={16} className="pointer-events-none" />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => mutation.mutate({ userId: user.id, status: 'rejected' })}
                            className="text-[8px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors py-1"
                        >
                            Удалить
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6 h-full flex flex-col relative">
            {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                        <UsersIcon className="text-indigo-600" size={28} />
                        Управление пользователями
                    </h2>
                    <p className="text-slate-500 text-xs font-bold mt-1 uppercase tracking-wider">
                        Модерация и список участников системы
                    </p>
                </div>

                <div className="flex p-1 bg-slate-100 rounded-2xl w-fit">
                    <button 
                        onClick={() => setActiveTab('pending')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'pending' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Clock size={14} />
                        На модерации
                        {pendingCount > 0 && <span className="bg-rose-500 text-white w-2 h-2 rounded-full animate-pulse" />}
                    </button>
                    <button 
                        onClick={() => setActiveTab('approved')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'approved' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <UserCheck size={14} />
                        Список пользователей
                    </button>
                    <button 
                        onClick={() => setActiveTab('invites')}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${activeTab === 'invites' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        <Key size={14} />
                        Инвайты
                    </button>
                </div>
            </div>

            <div className="relative shrink-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                    type="text" 
                    placeholder="Поиск по имени, телефону или токену..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm focus:ring-4 focus:ring-indigo-50 outline-none transition-all"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>

            {activeTab === 'invites' ? (
                <div className="flex flex-col h-full gap-6">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                        <h3 className="text-sm font-black uppercase text-slate-800 mb-4">Генерация нового кода</h3>
                        <div className="flex items-end gap-4">
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Для кого:</label>
                                <div className="flex bg-slate-50 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setInviteRole('buyer')}
                                        className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${inviteRole === 'buyer' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Закупщик
                                    </button>
                                    <button 
                                        onClick={() => setInviteRole('operator')}
                                        className={`flex-1 py-3 rounded-lg text-xs font-black uppercase transition-all ${inviteRole === 'operator' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}
                                    >
                                        Оператор
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={handleGenerateInvite}
                                className="flex-1 py-4 bg-indigo-600 text-white rounded-xl font-black uppercase text-xs hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200"
                            >
                                Сгенерировать код
                            </button>
                        </div>

                        {generatedInvite && (
                            <div className="mt-6 p-4 bg-slate-50 rounded-xl border-2 border-dashed border-indigo-200 flex items-center justify-between animate-in zoom-in-95">
                                <div>
                                    <div className="text-[10px] font-bold text-slate-400 uppercase mb-1">Ваш код:</div>
                                    <div className="text-3xl font-black text-indigo-600 tracking-widest">{generatedInvite}</div>
                                </div>
                                <button 
                                    onClick={() => copyToClipboard(generatedInvite)}
                                    className="p-3 bg-white rounded-xl text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm border border-indigo-100"
                                >
                                    <Copy size={20} />
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex-grow bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-slate-100 font-black text-xs uppercase text-slate-500">Активные инвайты ({invites?.length || 0})</div>
                        <div className="flex-grow overflow-y-auto p-4 space-y-2">
                            {invites?.map((invite: any) => (
                                <div key={invite.code} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-black text-lg ${invite.role === 'buyer' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                                            {invite.role === 'buyer' ? 'B' : 'O'}
                                        </div>
                                        <div>
                                            <div className="font-black text-slate-800 text-lg tracking-widest">{invite.code}</div>
                                            <div className="text-[10px] font-bold text-slate-400 uppercase">{new Date(invite.created_at).toLocaleString('ru-RU')}</div>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => copyToClipboard(invite.code)}
                                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                                    >
                                        <Copy size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ) : isLoading ? (
                <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full"/></div>
            ) : filteredUsers?.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UsersIcon className="text-slate-300" size={40} />
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Пользователи не найдены</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-grow overflow-hidden min-h-0">
                    {['operator', 'buyer', 'admin'].map(role => (
                        <div key={role} className="flex flex-col bg-slate-50/50 rounded-2xl border border-slate-200/60 overflow-hidden h-full">
                            <div className={`px-4 py-3 font-black text-xs uppercase tracking-widest border-b ${getRoleColor(role)}`}>
                                {getRoleTitle(role)} ({groupedUsers[role]?.length || 0})
                            </div>
                            <div className="p-3 overflow-y-auto space-y-3 custom-scrollbar h-full">
                                {groupedUsers[role]?.length === 0 ? (
                                    <div className="text-center py-8 text-[10px] font-bold text-slate-300 uppercase">Пусто</div>
                                ) : (
                                    groupedUsers[role]?.map(renderUserCard)
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
