import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Trash2, Clock, CheckCircle2, Inbox } from 'lucide-react';
import { supabase } from "../../lib/supabaseClient";

interface Email {
    id: string;
    from_address: string;
    subject: string;
    body: string;
    created_at: string;
    status: string;
}

interface EmailWidgetProps {
    onImportToAI: (text: string) => void;
}

export const EmailWidget: React.FC<EmailWidgetProps> = ({ onImportToAI }) => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'new' | 'archive'>('new');

    const fetchEmails = async () => {
        setLoading(true);
        const statusFilter = activeTab === 'new' ? 'new' : 'processed';
        
        const { data, error } = await supabase
            .from('incoming_emails')
            .select('*')
            .eq('status', statusFilter)
            .order('created_at', { ascending: false })
            .limit(activeTab === 'archive' ? 20 : 50);
        
        if (!error && data) setEmails(data);
        setLoading(false);
    };

    useEffect(() => {
        fetchEmails();

        // Подписка на Realtime (только для новых писем)
        const channel = supabase
            .channel('new-emails')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'incoming_emails' },
                () => {
                    fetchEmails(); // Перезагружаем при любом изменении (вставка/апдейт статуса)
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab]);

    const handleProcess = async (email: Email) => {
        const fullText = `ТЕМА ПИСЬМА: ${email.subject}\n\nСОДЕРЖИМОЕ:\n${email.body}`;
        onImportToAI(fullText);
        
        // Если уже в архиве, не меняем статус и не удаляем из списка
        if (activeTab === 'archive') return;

        await supabase
            .from('incoming_emails')
            .update({ status: 'processed' })
            .eq('id', email.id);
        
        setEmails(prev => prev.filter(e => e.id !== email.id));
    };

    const handleIgnore = async (email: Email) => {
        await supabase
            .from('incoming_emails')
            .update({ status: 'ignored' })
            .eq('id', email.id);
        
        setEmails(prev => prev.filter(e => e.id !== email.id));
    };

    return (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden group">
            <div className="p-5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2 mb-4">
                    <Mail size={20} className="text-indigo-600" />
                    <h3 className="font-black uppercase text-sm text-slate-800 tracking-tight">Почтовый ящик</h3>
                </div>
                
                <div className="flex p-1 bg-slate-100 rounded-xl">
                    <button 
                        onClick={() => setActiveTab('new')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'new' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Новые
                    </button>
                    <button 
                        onClick={() => setActiveTab('archive')}
                        className={`flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                    >
                        Архив
                    </button>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3 bg-slate-50/30">
                {loading ? (
                    <div className="flex items-center justify-center h-full text-slate-300 animate-pulse font-bold text-xs">Загрузка...</div>
                ) : emails.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300 opacity-50 italic">
                        <Inbox size={40} strokeWidth={1.5} className="mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Пусто</span>
                    </div>
                ) : (
                    emails.map(email => (
                        <div key={email.id} className={`p-4 rounded-2xl border transition-all ${activeTab === 'new' ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300' : 'bg-slate-50/50 border-transparent opacity-70 hover:opacity-100'}`}>
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-[9px] font-black text-indigo-600 truncate max-w-[140px] px-2 py-0.5 bg-indigo-50 rounded-md">
                                    {email.from_address}
                                </span>
                                <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                    <Clock size={10} />
                                    {new Date(email.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>
                            <h4 className="text-[11px] font-black text-slate-800 leading-snug mb-1 line-clamp-2 uppercase tracking-tight">
                                {email.subject || '(Без темы)'}
                            </h4>
                            <p className="text-[10px] text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
                                {email.body}
                            </p>
                            
                            {activeTab === 'new' && (
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleProcess(email)}
                                        className="flex-grow py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        В Ассистент <ArrowRight size={12} />
                                    </button>
                                    <button 
                                        onClick={() => handleIgnore(email)}
                                        className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-100 transition-all"
                                        title="В корзину"
                                    >
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            )}
                            
                            {activeTab === 'archive' && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                                        <CheckCircle2 size={12} /> Обработано
                                    </div>
                                    <button 
                                        onClick={() => handleProcess(email)}
                                        className="w-full py-2 bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                    >
                                        В Ассистент <ArrowRight size={12} />
                                    </button>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
