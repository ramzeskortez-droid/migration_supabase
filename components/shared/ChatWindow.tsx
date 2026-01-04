import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Send, Link, Package, X, Archive } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { ConfirmationModal } from './ConfirmationModal';
import { Toast } from './Toast';

interface ChatWindowProps {
  orderId: string;
  offerId?: string | null;
  supplierName: string;
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  itemName?: string;
  onNavigateToOrder?: (orderId: string) => void;
  onRead?: (orderId: string, supplierName: string) => void;
}

// -- Sub-components for Optimization --

const MessagesList = memo(({ messages, currentUserRole, messagesEndRef }: { messages: any[], currentUserRole: string, messagesEndRef: React.RefObject<HTMLDivElement | null> }) => {
    return (
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
    );
});

const ChatInput = memo(({ onSend, loading, orderItems, itemName }: { onSend: (msg: string, item?: string) => void, loading: boolean, orderItems: string[], itemName?: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(itemName || null);
    const [showItemSelector, setShowItemSelector] = useState(false);

    const handleSendClick = () => {
        const val = inputRef.current?.value;
        if (!val?.trim()) return;
        onSend(val, selectedItem || undefined);
        if (inputRef.current) inputRef.current.value = '';
    };

    return (
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
                    ref={inputRef}
                    onKeyDown={e => e.key === 'Enter' && handleSendClick()}
                    placeholder="Напишите сообщение..." 
                    className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                />
                <button 
                    disabled={loading}
                    onClick={handleSendClick}
                    className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors shadow-lg disabled:opacity-50"
                >
                    <Send size={18} />
                </button>
            </div>
        </div>
    );
});

// -- Main Component --

const ChatWindowComponent: React.FC<ChatWindowProps> = ({
  orderId, offerId, supplierName, currentUserRole, itemName, onNavigateToOrder, onRead
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<string[]>([]);
  
  // UI State for Actions
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [toast, setToast] = useState<{message: string} | null>(null);

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
      if (!orderId || !supplierName) return;
      try {
          const data = await SupabaseService.getChatMessages(orderId, offerId || undefined, supplierName);
          
          setMessages(prev => {
              if (prev.length !== data.length) return data;
              if (data.length > 0 && prev.length > 0) {
                  if (data[data.length - 1].id !== prev[prev.length - 1].id) return data;
              }
              if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
              if (data.length === 0 && prev.length === 0) return prev;
              return prev;
          });
      } catch (e) {
          console.error(e);
      }
  };

  // Автоматически помечать сообщения как прочитанные
  useEffect(() => {
      if (!messages.length) return;

      const markRead = async () => {
          if (onRead) onRead(orderId, supplierName);

          if (currentUserRole === 'ADMIN') {
             await SupabaseService.markChatAsRead(orderId, supplierName, 'ADMIN');
          } else {
             await SupabaseService.markChatAsRead(orderId, supplierName, 'SUPPLIER');
          }
      };
      
      markRead();
  }, [messages, currentUserRole, orderId, supplierName, onRead]);

  useEffect(() => {
      fetchMessages();
      const interval = setInterval(fetchMessages, 3000); 
      return () => clearInterval(interval);
  }, [orderId, offerId, supplierName]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (msgText: string, selectedItemName?: string) => {
      // Optimistic Update: Show message immediately
      const tempId = Date.now();
      const optimisticMsg = {
          id: tempId,
          order_id: Number(orderId),
          sender_role: currentUserRole,
          sender_name: currentUserRole === 'ADMIN' ? 'ADMIN' : supplierName,
          recipient_name: currentUserRole === 'ADMIN' ? supplierName : 'ADMIN',
          message: msgText,
          item_name: selectedItemName,
          created_at: new Date().toISOString(),
          is_read: false
      };

      setMessages(prev => [...prev, optimisticMsg]);
      // Scroll to bottom immediately
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      setLoading(true);
      try {
          await SupabaseService.sendChatMessage({
              order_id: orderId,
              offer_id: offerId || null,
              sender_role: currentUserRole,
              sender_name: currentUserRole === 'ADMIN' ? 'ADMIN' : supplierName,
              recipient_name: currentUserRole === 'ADMIN' ? supplierName : 'ADMIN',
              message: msgText,
              item_name: selectedItemName
          });
          // Refresh to get real ID and server timestamp
          await fetchMessages();
      } catch (e: any) {
          console.error('Send error:', e);
          alert('Ошибка отправки: ' + (e.message || JSON.stringify(e)));
          // Remove optimistic message on error
          setMessages(prev => prev.filter(m => m.id !== tempId));
      } finally {
          setLoading(false);
      }
  }, [orderId, offerId, supplierName, currentUserRole]);

  const confirmArchive = async () => {
      try {
          await SupabaseService.archiveChat(orderId, supplierName);
          setToast({ message: currentUserRole === 'ADMIN' ? 'Чат отправлен в архив' : 'Спасибо! Чат закрыт.' });
          setShowArchiveConfirm(false);
      } catch (e) {
          console.error(e);
          alert('Ошибка при архивации');
      }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative">
        {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[300]"><Toast message={toast.message} onClose={() => setToast(null)} duration={2000}/></div>}
        
        <ConfirmationModal 
            isOpen={showArchiveConfirm}
            title={currentUserRole === 'ADMIN' ? "В архив" : "Закрыть вопрос"}
            message={currentUserRole === 'ADMIN' ? "Перенести этот чат в архив?" : "Отметить вопрос как решенный и перенести в архив?"}
            confirmLabel="Да"
            variant="primary"
            onConfirm={confirmArchive}
            onCancel={() => setShowArchiveConfirm(false)}
        />

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
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowArchiveConfirm(true)}
                    className="text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors mr-2"
                    title={currentUserRole === 'ADMIN' ? "В архив" : "Вопрос решен"}
                >
                    <Archive size={12}/> {currentUserRole === 'ADMIN' ? "В архив" : "Вопрос решен"}
                </button>
                {onNavigateToOrder && (
                    <button 
                        onClick={() => onNavigateToOrder(orderId)}
                        className="text-[9px] font-black uppercase text-indigo-600 hover:text-indigo-800 hover:underline shrink-0"
                    >
                        Перейти к заказу &rarr;
                    </button>
                )}
            </div>
        </div>

        <MessagesList 
            messages={messages} 
            currentUserRole={currentUserRole} 
            messagesEndRef={messagesEndRef} 
        />

        <ChatInput 
            onSend={handleSend} 
            loading={loading} 
            orderItems={orderItems} 
            itemName={itemName}
        />
    </div>
  );
};

export const ChatWindow = memo(ChatWindowComponent);
