import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';
import { AppUser } from '../../types';
import { UserCheck, UserX, Clock, Users as UsersIcon, Phone, Shield, Calendar, Search } from 'lucide-react';

export const AdminUsers: React.FC = () => {
    const queryClient = useQueryClient();
    const [activeTab, setActiveTab] = useState<'pending' | 'approved'>('pending');
    const [searchTerm, setSearchTerm] = useState('');

    const { data: users, isLoading } = useQuery({
        queryKey: ['admin_users', activeTab],
        queryFn: () => SupabaseService.getAppUsers(activeTab)
    });

    const { data: pendingUsers } = useQuery({
        queryKey: ['admin_users_pending_count'],
        queryFn: () => SupabaseService.getAppUsers('pending'),
        refetchInterval: 10000
    });
    
    const pendingCount = pendingUsers?.length || 0;

    const mutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string, status: 'approved' | 'rejected' }) => 
            SupabaseService.updateUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
            queryClient.invalidateQueries({ queryKey: ['admin_users_pending_count'] });
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
        <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group overflow-hidden">
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
                        <div className="flex gap-1.5">
                            <button 
                                onClick={() => mutation.mutate({ userId: user.id, status: 'rejected' })}
                                className="p-1.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Отклонить"
                            >
                                <UserX size={14} />
                            </button>
                            <button 
                                onClick={() => mutation.mutate({ userId: user.id, status: 'approved' })}
                                className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Одобрить"
                            >
                                <UserCheck size={14} />
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
        <div className="p-6 space-y-6 h-full flex flex-col">
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

            {isLoading ? (
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
