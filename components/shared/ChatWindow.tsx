import React, { useState, useEffect, useRef } from 'react';
import { Send, Link, Package, X } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';

interface ChatWindowProps {
  orderId: string;
  offerId?: string | null;
  supplierName: string;
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  itemName?: string; // Начальный контекст
  onNavigateToOrder?: (orderId: string) => void;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({
  orderId, offerId, supplierName, currentUserRole, itemName, onNavigateToOrder
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Выбор товара
  const [orderItems, setOrderItems] = useState<string[]>([]);
  const [selectedItem, setSelectedItem] = useState<string | null>(itemName || null);
  const [showItemSelector, setShowItemSelector] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Загрузка товаров для выбора
  useEffect(() => {
      const loadItems = async () => {
          if (!orderId) return;
          try {
              const items = await SupabaseService.getOrderItemsSimple(orderId);
              setOrderItems(items);
          } catch (e) { console.error(e); }
      };
      loadItems();
  }, [orderId]);

  // Загрузка сообщений
  const fetchMessages = async () => {
      console.log('ChatWindow fetchMessages:', { orderId, supplierName });
      if (!orderId || !supplierName) return;
      try {
          const data = await SupabaseService.getChatMessages(orderId, offerId || undefined, supplierName);
          console.log('ChatWindow messages received:', data.length);
          setMessages(data);
          
          if (currentUserRole === 'ADMIN') {
             const hasUnread = data.some(m => m.sender_role === 'SUPPLIER' && !m.is_read);
             if (hasUnread) {
                 await SupabaseService.markChatAsRead(orderId, supplierName, 'ADMIN');
             }
          } else {
             // Я Поставщик, читаю сообщения от Админа
             const hasUnread = data.some(m => m.sender_role === 'ADMIN' && !m.is_read);
             if (hasUnread) {
                 await SupabaseService.markChatAsRead(orderId, supplierName, 'SUPPLIER');
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
              item_name: selectedItem || undefined
          });
          setNewMessage('');
          // Не сбрасываем selectedItem, чтобы удобно было продолжать диалог по позиции
          fetchMessages();
      } catch (e: any) {
          console.error('Send error:', e);
          alert('Ошибка отправки: ' + (e.message || JSON.stringify(e)));
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative">
        {/* Context Link Header */}
        <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div 
                className={`flex items-center gap-2 overflow-hidden ${onNavigateToOrder ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => onNavigateToOrder && onNavigateToOrder(orderId)}
            >
                <Link size={12} className="text-indigo-400 shrink-0"/>
                <span className="text-[10px] font-bold text-indigo-700 truncate">
                    {currentUserRole === 'ADMIN' 
                        ? `Поставщик инициировал диалог из заказа #${orderId}` 
                        : `Чат по заказу #${orderId}`
                    }
                </span>
            </div>
            {onNavigateToOrder && (
                <button 
                    onClick={() => onNavigateToOrder(orderId)}
                    className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                >
                    Перейти к заказу &rarr;
                </button>
            )}
        </div>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
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
                            {msg.item_name && (
                                <div className="mb-1 text-[9px] font-bold bg-black/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                    <Package size={8}/> {msg.item_name}
                                </div>
                            )}
                            <div className="leading-relaxed whitespace-pre-wrap">{msg.message}</div>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="bg-white border-t border-slate-100 shrink-0">
            {/* Item Selection Bar */}
            <div className="px-3 pt-2 flex items-center gap-2">
                <button 
                    onClick={() => setShowItemSelector(!showItemSelector)}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 ${selectedItem ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'}`}
                >
                    <Package size={10}/>
                    {selectedItem ? `Позиция: ${selectedItem}` : 'Прикрепить позицию'}
                </button>
                {selectedItem && (
                    <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-red-400">
                        <X size={12}/>
                    </button>
                )}
            </div>

            {showItemSelector && (
                <div className="px-3 py-2 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 fade-in">
                    {orderItems.map(item => (
                        <button 
                            key={item}
                            onClick={() => { setSelectedItem(item); setShowItemSelector(false); }}
                            className={`text-[9px] px-2 py-1 rounded-md border ${selectedItem === item ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
                        >
                            {item}
                        </button>
                    ))}
                </div>
            )}

            <div className="p-3 flex gap-2">
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
    </div>
  );
};