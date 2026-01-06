import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { Send, Link, Package, X, Archive, Paperclip, FileText } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { ConfirmationModal } from './ConfirmationModal';
import { Toast } from './Toast';

interface ChatWindowProps {
  orderId: string;
  offerId?: string | null;
  supplierName: string;
  currentUserRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR';
  currentUserName?: string;
  itemName?: string;
  onNavigateToOrder?: (orderId: string) => void;
  onRead?: (orderId: string, supplierName: string) => void;
}

// -- Sub-components for Optimization --

const ChatImage = ({ src }: { src: string }) => {
    const [isLoaded, setIsLoaded] = useState(false);
    return (
        <div className="relative min-h-[100px] max-w-full bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center border border-black/5">
            {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-50">
                    <Loader2 className="animate-spin text-indigo-400" size={20} />
                </div>
            )}
            <a href={src} target="_blank" rel="noreferrer" className="w-full">
                <img 
                    src={src} 
                    alt="Вложение" 
                    onLoad={() => setIsLoaded(true)}
                    className={`max-w-full h-auto max-h-60 rounded-lg object-cover transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`} 
                />
            </a>
        </div>
    );
};

const MessagesList = memo(({ messages, currentUserRole, messagesEndRef }: { messages: any[], currentUserRole: string, messagesEndRef: React.RefObject<HTMLDivElement | null> }) => {
    return (
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.length === 0 && (
                <div className="text-center text-slate-400 text-xs font-bold mt-10">Сообщений пока нет...</div>
            )}

            {messages.map((msg) => {
                // Определяем "свое" сообщение
                let isMe = false;
                if (currentUserRole === 'SUPPLIER') {
                    isMe = msg.sender_role === 'SUPPLIER';
                } else {
                    // ADMIN и OPERATOR видят сообщения с ролью ADMIN как свои
                    isMe = msg.sender_role === 'ADMIN';
                }

                // Логика отображения имени
                let displayName = msg.sender_name;
                if (msg.sender_role === 'ADMIN') {
                    // Если имя просто "ADMIN", показываем "Менеджер" (старая логика или админ)
                    if (msg.sender_name === 'ADMIN') displayName = 'Менеджер';
                    // Если имя начинается с "Оператор -", оставляем как есть
                }

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${isMe ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white text-slate-700 border border-slate-200 rounded-tl-none'}`}>
                            <div className="mb-1 text-[8px] font-black uppercase opacity-70 flex justify-between gap-4">
                                <span>{displayName}</span>
                                <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            
                            {msg.file_url && (
                                <div className="mb-2 mt-1">
                                    {msg.file_type === 'image' ? (
                                        <ChatImage src={msg.file_url} />
                                    ) : (
                                        <a href={msg.file_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 bg-black/10 p-2 rounded-lg hover:bg-black/20 transition-colors text-inherit">
                                            <FileText size={16}/>
                                            <span className="truncate max-w-[150px]">Файл</span>
                                        </a>
                                    )}
                                </div>
                            )}

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

const ChatInput = memo(({ onSend, loading, orderItems, itemName }: { onSend: (msg: string, item?: string, file?: File) => void, loading: boolean, orderItems: string[], itemName?: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedItem, setSelectedItem] = useState<string | null>(itemName || null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showItemSelector, setShowItemSelector] = useState(false);

    const handleSendClick = () => {
        const val = inputRef.current?.value;
        if (!val?.trim() && !selectedFile) return;
        onSend(val || '', selectedItem || undefined, selectedFile || undefined);
        if (inputRef.current) inputRef.current.value = '';
        setSelectedFile(null);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white border-t border-slate-100 shrink-0">
            {/* Item & File Selection Bar */}
            <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setShowItemSelector(!showItemSelector)}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${selectedItem ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'}`}
                >
                    <Package size={10}/>
                    {selectedItem ? `Позиция: ${selectedItem}` : 'Позиция'}
                </button>
                {selectedItem && (
                    <button onClick={() => setSelectedItem(null)} className="text-slate-300 hover:text-red-400 shrink-0">
                        <X size={12}/>
                    </button>
                )}

                <div className="w-px h-4 bg-slate-200 mx-1"></div>

                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${selectedFile ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-emerald-200 hover:text-emerald-500'}`}
                >
                    <Paperclip size={10}/>
                    {selectedFile ? 'Файл выбран' : 'Файл'}
                </button>
                <input type="file" ref={fileInputRef} hidden onChange={handleFileSelect} />
                
                {selectedFile && (
                    <div className="flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100 shrink-0">
                        <span className="text-[9px] font-bold text-emerald-700 truncate max-w-[100px]">{selectedFile.name}</span>
                        <button onClick={() => { setSelectedFile(null); if(fileInputRef.current) fileInputRef.current.value = ''; }} className="text-emerald-400 hover:text-emerald-600">
                            <X size={10}/>
                        </button>
                    </div>
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
  orderId, offerId, supplierName, currentUserRole, currentUserName, itemName, onNavigateToOrder, onRead
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<string[]>([]);
  
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [toast, setToast] = useState<{message: string} | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const fetchMessages = async () => {
      if (!orderId || !supplierName) return;
      try {
          const data = await SupabaseService.getChatMessages(orderId, offerId || undefined, supplierName);
          
          setMessages(prev => {
              const optimistic = prev.filter(m => typeof m.id === 'number' && m.id > 1000000000000);
              
              if (optimistic.length === 0) {
                  if (prev.length !== data.length) return data;
                  if (data.length > 0 && prev.length > 0) {
                      if (data[data.length - 1].id !== prev[prev.length - 1].id) return data;
                  }
                  if (JSON.stringify(prev) !== JSON.stringify(data)) return data;
                  return prev;
              }
              return [...data, ...optimistic];
          });
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
      if (!messages.length) return;

      const hasUnread = messages.some(m => !m.is_read && m.sender_role !== currentUserRole);
      // Для оператора unread - это если роль отправителя SUPPLIER
      const hasUnreadForOperator = currentUserRole === 'OPERATOR' && messages.some(m => !m.is_read && m.sender_role === 'SUPPLIER');

      if (hasUnread || hasUnreadForOperator) {
          const markRead = async () => {
              if (onRead) onRead(orderId, supplierName);

              if (currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') {
                 await SupabaseService.markChatAsRead(orderId, supplierName, 'ADMIN');
              } else {
                 await SupabaseService.markChatAsRead(orderId, supplierName, 'SUPPLIER');
              }
              
              setMessages(prev => prev.map(m => (!m.is_read && m.sender_role !== currentUserRole) ? { ...m, is_read: true } : m));
          };
          markRead();
      }
  }, [messages, currentUserRole, orderId, supplierName, onRead]);

  useEffect(() => {
      fetchMessages();
      
      const channel = SupabaseService.subscribeToChatMessages(orderId, (newMsg) => {
          // Проверяем, относится ли сообщение к этому диалогу (поставщик)
          const isRelevant = newMsg.sender_name === supplierName || newMsg.recipient_name === supplierName;
          
          if (isRelevant) {
              setMessages(prev => {
                  // 1. Проверяем, есть ли уже сообщение с таким ID (защита от дублей)
                  if (prev.find(m => m.id === newMsg.id)) return prev;

                  // 2. Проверяем, есть ли "оптимистичное" сообщение с таким же текстом
                  // (от меня, недавнее, временный ID)
                  const optimisticMatch = prev.find(m => 
                      m.message === newMsg.message && 
                      m.sender_name === newMsg.sender_name && 
                      typeof m.id === 'number' && m.id > 1000000000000
                  );

                  if (optimisticMatch) {
                      // Заменяем временное на реальное (без дублирования)
                      return prev.map(m => m.id === optimisticMatch.id ? newMsg : m);
                  }

                  // 3. Если совпадений нет — просто добавляем
                  return [...prev, newMsg];
              });
          }
      });

      return () => {
          SupabaseService.unsubscribeFromChat(channel);
      };
  }, [orderId, supplierName]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = useCallback(async (msgText: string, selectedItemName?: string, file?: File) => {
      const tempId = Date.now();
      
      let senderName = 'ADMIN';
      let dbRole: 'ADMIN' | 'SUPPLIER' = 'ADMIN';

      if (currentUserRole === 'OPERATOR') {
          senderName = currentUserName ? `Оператор - ${currentUserName}` : 'Оператор';
          dbRole = 'ADMIN';
      } else if (currentUserRole === 'ADMIN') {
          senderName = 'ADMIN'; // Преобразуется в Менеджер при рендере
          dbRole = 'ADMIN';
      } else {
          senderName = supplierName;
          dbRole = 'SUPPLIER';
      }

      // Optimistic message (without file URL initially)
      const optimisticMsg = {
          id: tempId,
          order_id: Number(orderId),
          sender_role: dbRole,
          sender_name: senderName,
          recipient_name: dbRole === 'ADMIN' ? supplierName : 'ADMIN',
          message: msgText,
          item_name: selectedItemName,
          file_url: file ? URL.createObjectURL(file) : undefined, // Preview
          file_type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : undefined,
          created_at: new Date().toISOString(),
          is_read: false
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

      setLoading(true);
      try {
          let fileUrl = '';
          let fileType = '';

          if (file) {
              fileUrl = await SupabaseService.uploadFile(file, 'chat');
              fileType = file.type.startsWith('image/') ? 'image' : 'file';
          }

          const realMsg = await SupabaseService.sendChatMessage({
              order_id: orderId,
              offer_id: offerId || null,
              sender_role: dbRole,
              sender_name: senderName,
              recipient_name: dbRole === 'ADMIN' ? supplierName : 'ADMIN',
              message: msgText,
              item_name: selectedItemName,
              file_url: fileUrl || undefined,
              file_type: fileType || undefined
          });
          
          setMessages(prev => {
              // Если Realtime уже добавил это сообщение (по ID), то просто удаляем оптимистичное
              if (prev.find(m => m.id === realMsg.id)) {
                  return prev.filter(m => m.id !== tempId);
              }
              // Иначе обновляем оптимистичное на реальное
              return prev.map(m => m.id === tempId ? realMsg : m);
          });
          
      } catch (e: any) {
          console.error('Send error:', e);
          alert('Ошибка отправки: ' + (e.message || JSON.stringify(e)));
          setMessages(prev => prev.filter(m => m.id !== tempId));
      } finally {
          setLoading(false);
      }
  }, [orderId, offerId, supplierName, currentUserRole, currentUserName]);

  const confirmArchive = async () => {
      try {
          await SupabaseService.archiveChat(orderId, supplierName);
          setToast({ message: (currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? 'Чат отправлен в архив' : 'Спасибо! Чат закрыт.' });
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
            title={(currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? "В архив" : "Закрыть вопрос"}
            message={(currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? "Перенести этот чат в архив?" : "Отметить вопрос как решенный и перенести в архив?"}
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
                    {(currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') 
                        ? `Поставщик инициировал диалог из заказа #${orderId}` 
                        : `Чат по заказу #${orderId}`
                    }
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={() => setShowArchiveConfirm(true)}
                    className="text-[9px] font-black uppercase text-slate-500 hover:text-indigo-600 flex items-center gap-1 transition-colors mr-2"
                    title={(currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? "В архив" : "Вопрос решен"}
                >
                    <Archive size={12}/> {(currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? "В архив" : "Вопрос решен"}
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