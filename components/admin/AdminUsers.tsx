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

    const mutation = useMutation({
        mutationFn: ({ userId, status }: { userId: string, status: 'approved' | 'rejected' }) => 
            SupabaseService.updateUserStatus(userId, status),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin_users'] });
        }
    });

    const filteredUsers = users?.filter(u => 
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.phone?.includes(searchTerm) ||
        u.token.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const renderUserCard = (user: any) => (
        <div key={user.id} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all group">
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                        user.role === 'admin' ? 'bg-rose-100 text-rose-600' : 
                        user.role === 'operator' ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'
                    }`}>
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h3 className="font-black text-slate-900 uppercase text-sm flex items-center gap-2">
                            {user.name}
                            <span className={`text-[8px] px-1.5 py-0.5 rounded-full border ${
                                user.role === 'admin' ? 'bg-rose-50 border-rose-200 text-rose-600' : 
                                user.role === 'operator' ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'
                            }`}>
                                {user.role}
                            </span>
                        </h3>
                        <div className="flex flex-col gap-1 mt-1">
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                                <Phone size={12} className="text-slate-400" />
                                {user.phone || 'Нет телефона'}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold">
                                <Shield size={12} className="text-slate-400" />
                                Токен: <span className="font-mono bg-slate-100 px-1 rounded">{user.token}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="text-right">
                    <div className="flex items-center gap-1 text-slate-400 text-[9px] font-bold mb-3 uppercase">
                        <Calendar size={10} />
                        {user.createdAt ? new Date(user.createdAt).toLocaleDateString('ru-RU') : '-'}
                    </div>
                    
                    {activeTab === 'pending' ? (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => mutation.mutate({ userId: user.id, status: 'rejected' })}
                                className="p-2 bg-red-50 text-red-600 rounded-xl hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                title="Отклонить"
                            >
                                <UserX size={16} />
                            </button>
                            <button 
                                onClick={() => mutation.mutate({ userId: user.id, status: 'approved' })}
                                className="p-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                title="Одобрить"
                            >
                                <UserCheck size={16} />
                            </button>
                        </div>
                    ) : (
                        <button 
                            onClick={() => mutation.mutate({ userId: user.id, status: 'rejected' })}
                            className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-widest transition-colors"
                        >
                            Удалить
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
                        {activeTab !== 'pending' && users?.length ? <span className="bg-rose-500 text-white w-2 h-2 rounded-full animate-pulse" /> : null}
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

            <div className="relative">
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 rounded-2xl animate-pulse" />)}
                </div>
            ) : filteredUsers?.length === 0 ? (
                <div className="py-20 text-center">
                    <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <UsersIcon className="text-slate-300" size={40} />
                    </div>
                    <p className="text-slate-400 font-black text-xs uppercase tracking-widest">Пользователи не найдены</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredUsers?.map(renderUserCard)}
                </div>
            )}
        </div>
    );
};
