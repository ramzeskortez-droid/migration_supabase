import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';

interface ChatWindowProps {
  orderId: string;
  offerId?: string | null;
  supplierName: string;
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  itemName?: string;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  orderId, offerId, supplierName, currentUserRole, itemName
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
      if (!orderId || !supplierName) return;
      try {
          const data = await SupabaseService.getChatMessages(orderId, offerId || undefined, supplierName);
          setMessages(data);
          
          // Если мы в чате и роль текущего пользователя совпадает с получателем непрочитанных сообщений, помечаем
          // НО: логика getChatMessages возвращает все сообщения.
          // Если я АДМИН, я должен пометить сообщения от SUPPLIER как прочитанные.
          if (currentUserRole === 'ADMIN') {
             const hasUnread = data.some(m => m.sender_role === 'SUPPLIER' && !m.is_read);
             if (hasUnread) {
                 await SupabaseService.markChatAsRead(orderId, supplierName);
             }
          }
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); 
      return () => clearInterval(interval);
  }, [orderId, offerId, supplierName]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
      if (!newMessage.trim()) return;
      setLoading(true);
      try {
          await SupabaseService.sendChatMessage({
              order_id: orderId,
              offer_id: offerId || null,
              sender_role: currentUserRole,
              sender_name: currentUserRole === 'ADMIN' ? 'ADMIN' : supplierName,
              recipient_name: currentUserRole === 'ADMIN' ? supplierName : 'ADMIN',
              message: newMessage,
              item_name: itemName
          });
          setNewMessage('');
          fetchMessages();
      } catch (e: any) {
          console.error('Send error:', e);
          alert('Ошибка отправки: ' + (e.message || JSON.stringify(e)));
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50">
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {itemName && (
                <div className="text-center text-[10px] font-bold text-slate-400 uppercase mb-4">
                    <span className="bg-slate-200 px-2 py-1 rounded-full">Контекст: {itemName}</span>
                </div>
            )}
            
            {messages.length === 0 && (
                <div className="text-center text-slate-400 text-xs font-bold mt-10">Сообщений пока нет...</div>
            )}

            {messages.map((msg) => {
                const isMe = msg.sender_role === currentUserRole;
                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                            <div className="mb-1 text-[8px] font-black uppercase opacity-70 flex justify-between gap-4">
                                <span>{msg.sender_role === 'ADMIN' ? 'Менеджер' : msg.sender_name}</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            {msg.item_name && <div className="mb-1 text-[9px] font-bold bg-black/10 px-1 rounded inline-block">{msg.item_name}</div>}
                            <div className="leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        <div className="p-3 bg-white border-t border-slate-100 flex gap-2 shrink-0">
            <input 
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Напишите сообщение..." 
                className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
            />
            <button 
                disabled={loading}
                onClick={handleSend}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
            >
                <Send size={18} />
            </button>
        </div>
    </div>
  );
};