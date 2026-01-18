import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, Trash2, Clock, CheckCircle2, Inbox, Lock, Unlock, User, X } from 'lucide-react';
import { supabase } from "../../lib/supabaseClient";
import { SupabaseService } from '../../services/supabaseService';
import { sanitizeHtml } from '../../utils/sanitize';

interface Email {
    id: string;
    serial_id?: number;
    from_address: string;
    subject: string;
    body: string;
    created_at: string;
    status: string;
    locked_by?: string | null;
    locked_at?: string;
}

interface EmailWidgetProps {
    onImportToAI: (data: any) => void;
    onLinkToOrder: (emailId: string) => void;
    currentUserId?: string;
}

export const EmailWidget: React.FC<EmailWidgetProps> = ({ onImportToAI, onLinkToOrder, currentUserId }) => {
    const [emails, setEmails] = useState<Email[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'new' | 'archive'>('new');
    const [linkedOrders, setLinkedOrders] = useState<Record<string, number>>({}); 
    const [now, setNow] = useState(Date.now());
    const [viewEmail, setViewEmail] = useState<Email | null>(null);

    // Обновляем текущее время раз в 5 секунд для проверки таймаутов
    useEffect(() => {
        const interval = setInterval(() => setNow(Date.now()), 5000);
        return () => clearInterval(interval);
    }, []);

    // Загрузка связанных заказов
    useEffect(() => {
        if (emails.length === 0) return;
        
        const ids = emails.map(e => e.id);
        supabase.from('orders')
            .select('id, email_message_id')
            .in('email_message_id', ids)
            .then(({ data }) => {
                if (data) {
                    const map: Record<string, number> = {};
                    data.forEach((o: any) => {
                         if (o.email_message_id) map[o.email_message_id] = o.id;
                    });
                    setLinkedOrders(map);
                }
            });
    }, [emails]);

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

        const channel = supabase
            .channel('new-emails')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'incoming_emails' },
                (payload) => {
                    console.log('📧 Realtime Email Update:', payload);
                    fetchEmails(); 
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [activeTab]);

    const handleProcess = async (email: Email) => {
        if (activeTab === 'new' && currentUserId) {
            try {
                await SupabaseService.lockEmail(email.id, currentUserId);
            } catch (e) {
                console.error("Lock error", e);
                return; 
            }
        }

        const fullText = `From: ${email.from_address}\nSubject: ${email.subject}\n\n${email.body}`;
        
        onImportToAI({
            text: fullText,
            email: email.from_address,
            subject: email.subject
        });
        
        onLinkToOrder(email.id);
    };

    const handleUnlock = async (email: Email) => {
        if (!currentUserId) return;
        try {
            await SupabaseService.unlockEmail(email.id);
        } catch (e) { console.error(e); }
    };

    const handleIgnore = async (email: Email) => {
        await supabase
            .from('incoming_emails')
            .update({ status: 'ignored' })
            .eq('id', email.id);
        
        setEmails(prev => prev.filter(e => e.id !== e.id));
    };

    return (
        <div className="bg-white border border-slate-200 rounded-3xl shadow-sm flex flex-col h-full overflow-hidden group relative">
            {/* Modal Popup */}
            {viewEmail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setViewEmail(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <div className="p-4 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
                            <div className="min-w-0 pr-2">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-[10px] font-bold text-slate-400" title={viewEmail.id}>
                                        {viewEmail.serial_id ? `#${viewEmail.serial_id}` : `#${viewEmail.id.slice(0, 8)}`}
                                    </span>
                                    <span className="text-[9px] font-bold text-slate-400">{new Date(viewEmail.created_at).toLocaleString('ru-RU')}</span>
                                </div>
                                <h3 className="font-black text-sm text-slate-800 uppercase leading-snug line-clamp-2">{viewEmail.subject || '(Без темы)'}</h3>
                                <div className="text-[10px] font-bold text-indigo-600 mt-1 truncate">{viewEmail.from_address}</div>
                            </div>
                            <button onClick={() => setViewEmail(null)} className="p-2 hover:bg-slate-200 rounded-lg transition-colors shrink-0"><X size={18} className="text-slate-400" /></button>
                        </div>
                        <div className="p-4 overflow-y-auto custom-scrollbar flex-grow bg-white">
                            <div 
                                className="text-xs text-slate-600 whitespace-pre-wrap font-medium leading-relaxed"
                                dangerouslySetInnerHTML={{ __html: sanitizeHtml(viewEmail.body) }}
                            />
                        </div>
                        <div className="p-4 border-t border-slate-100 bg-slate-50 shrink-0 flex gap-3">
                            <button 
                                onClick={() => { handleProcess(viewEmail); setViewEmail(null); }}
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                            >
                                В Ассистент <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="p-5 border-b border-slate-100 bg-white">
                <div className="flex items-center gap-2 mb-4">
                    <Mail size={20} className="text-indigo-600" />
                    <h3 className="font-black uppercase text-sm text-slate-800 tracking-tight">Почтовый ящик china@nai.ru</h3>
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
                    emails.map(email => {
                        const lockTime = email.locked_at ? new Date(email.locked_at).getTime() : 0;
                        const isExpired = (now - lockTime) > 60000;
                        
                        const isLockedByMe = !isExpired && email.locked_by === currentUserId;
                        const isLockedByOther = !isExpired && email.locked_by && !isLockedByMe;

                        return (
                            <div 
                                key={email.id} 
                                onClick={() => setViewEmail(email)}
                                className={`p-4 rounded-2xl border transition-all relative cursor-pointer group/card ${activeTab === 'new' ? 'bg-white border-slate-200 shadow-sm hover:border-indigo-300' : 'bg-slate-50/50 border-transparent opacity-70 hover:opacity-100'} ${isLockedByOther ? 'opacity-50 pointer-events-none grayscale-[0.5]' : ''} ${isLockedByMe ? 'ring-2 ring-indigo-500 ring-offset-2 bg-indigo-50/10' : ''}`}
                            >
                                
                                {isLockedByOther && (
                                    <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
                                        <div className="bg-white/90 px-3 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center gap-2">
                                            <User size={12} className="text-slate-400" />
                                            <span className="text-[9px] font-black text-slate-500 uppercase">Взято в работу</span>
                                        </div>
                                    </div>
                                )}

                                {isLockedByMe && activeTab === 'new' && (
                                    <div className="absolute top-2 right-2 z-20">
                                        <button onClick={(e) => { e.stopPropagation(); handleUnlock(email); }} className="bg-indigo-100 text-indigo-600 px-2 py-1 rounded text-[8px] font-black uppercase hover:bg-red-100 hover:text-red-500 transition-colors flex items-center gap-1" title="Снять блокировку">
                                            <Lock size={10} /> В работе (Вы)
                                        </button>
                                    </div>
                                )}

                                {/* ID and Date Header */}
                                <div className="flex justify-between items-center mb-2 pb-2 border-b border-slate-50">
                                    <span className="text-[10px] font-bold text-slate-400" title={email.id}>
                                        {email.serial_id ? `#${email.serial_id}` : `#${email.id.slice(0, 4)}...${email.id.slice(-4)}`}
                                    </span>
                                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                                        <Clock size={10} />
                                        {new Date(email.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>

                                <div className="flex justify-between items-start mb-2">
                                    <span className="text-[9px] font-black text-indigo-600 truncate max-w-[140px] px-2 py-0.5 bg-indigo-50 rounded-md">
                                        {email.from_address}
                                    </span>
                                </div>
                                <h4 className="text-[11px] font-black text-slate-800 leading-snug mb-1 line-clamp-2 uppercase tracking-tight group-hover/card:text-indigo-600 transition-colors">
                                    {email.subject || '(Без темы)'}
                                </h4>
                                <p className="text-[10px] text-slate-500 line-clamp-2 mb-4 leading-relaxed font-medium">
                                    {email.body}
                                </p>
                                
                                {activeTab === 'new' && (
                                    <div className="flex gap-2" onClick={e => e.stopPropagation()}>
                                        <button 
                                            onClick={() => handleProcess(email)}
                                            disabled={!!isLockedByOther} 
                                            className="flex-grow py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase shadow-md shadow-indigo-100 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            В Ассистент <ArrowRight size={12} />
                                        </button>
                                        <button 
                                            onClick={() => handleIgnore(email)}
                                            disabled={!!isLockedByOther || !!isLockedByMe}
                                            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-400 hover:text-red-500 hover:border-red-100 transition-all disabled:opacity-50"
                                            title="В корзину"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                )}
                                
                                {activeTab === 'archive' && (
                                    <div className="space-y-2" onClick={e => e.stopPropagation()}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-1.5 text-[9px] font-black text-emerald-600 uppercase">
                                                <CheckCircle2 size={12} /> Обработано
                                            </div>
                                            {linkedOrders[email.id] && (
                                                <span className="text-[9px] font-black text-indigo-700 bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md shadow-sm">
                                                    Заказ №{linkedOrders[email.id]}
                                                </span>
                                            )}
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
                        );
                    })
                )}
            </div>
        </div>
    );
};