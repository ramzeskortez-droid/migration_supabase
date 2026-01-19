import React, { useState, useEffect, useRef, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Send, Link, Package, X, Archive, Paperclip, FileText, Loader2, Trash2 } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { ConfirmationModal } from './ConfirmationModal';
import { Toast } from './Toast';

interface ChatWindowProps {
  orderId: string;
  offerId?: string | null;
  supplierName: string;
  supplierId?: string; // UUID собеседника (Закупщика)
  currentUserRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR';
  currentUserName?: string;
  currentUserId?: string; // UUID текущего пользователя
  itemName?: string;
  onNavigateToOrder?: (orderId: string) => void;
  onRead?: (orderId: string, supplierName: string) => void;
  isArchived?: boolean;
  onArchiveUpdate?: () => void;
  threadRole?: 'OPERATOR' | 'MANAGER' | 'ADMIN'; 
}

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
                // Определение "Я" или "Собеседник" для позиционирования
                let isMe = false;
                if (currentUserRole === 'SUPPLIER') isMe = msg.sender_role === 'SUPPLIER';
                else if (currentUserRole === 'OPERATOR') isMe = msg.sender_role === 'OPERATOR' || (msg.sender_role === 'ADMIN' && msg.sender_name.includes('Оператор')); // Fallback для старых
                else if (currentUserRole === 'ADMIN') isMe = msg.sender_role === 'ADMIN' || msg.sender_role === 'MANAGER';

                // Определение цвета и имени на основе роли
                let bubbleClass = 'bg-white text-slate-700 border border-slate-200';
                let displayName = msg.sender_name;

                if (msg.sender_role === 'SUPPLIER') {
                    // Закупщик - Желтый
                    bubbleClass = 'bg-amber-100 text-slate-800 border-amber-200';
                } else if (msg.sender_role === 'OPERATOR') {
                    // Оператор - Синий
                    bubbleClass = 'bg-indigo-600 text-white border-indigo-600';
                } else if (msg.sender_role === 'ADMIN' || msg.sender_role === 'MANAGER') {
                    // Менеджер - Зеленый
                    bubbleClass = 'bg-emerald-600 text-white border-emerald-600';
                    if (msg.sender_name === 'ADMIN') displayName = 'Менеджер';
                }

                // Коррекция углов для "пузырька"
                const roundedClass = isMe ? 'rounded-tr-none' : 'rounded-tl-none';

                return (
                    <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] p-3 rounded-2xl text-xs font-medium shadow-sm ${bubbleClass} ${roundedClass}`}>
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
                                <div className="mb-1 flex flex-wrap gap-1">
                                    {msg.item_name.split(',').map((item: string) => (
                                        <div key={item} className="text-[9px] font-bold bg-black/10 px-2 py-0.5 rounded inline-flex items-center gap-1">
                                            <Package size={8}/> {item.trim()}
                                        </div>
                                    ))}
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

const ChatInput = memo(({ onSend, loading, orderItems, itemName }: { onSend: (msg: string, items?: string[], file?: File) => void, loading: boolean, orderItems: string[], itemName?: string }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set(itemName ? [itemName] : []));
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [showItemSelector, setShowItemSelector] = useState(false);

    const handleSendClick = () => {
        const val = inputRef.current?.value;
        if (!val?.trim() && !selectedFile) return;
        onSend(val || '', Array.from(selectedItems), selectedFile || undefined);
        if (inputRef.current) inputRef.current.value = '';
        setSelectedFile(null);
        setSelectedItems(new Set());
    };

    const toggleSelectedItem = (item: string) => {
        setSelectedItems(prev => {
            const next = new Set(prev);
            if (next.has(item)) next.delete(item);
            else next.add(item);
            return next;
        });
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setSelectedFile(e.target.files[0]);
        }
    };

    return (
        <div className="bg-white border-t border-slate-100 shrink-0">
            <div className="px-3 pt-2 flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                <button 
                    onClick={() => setShowItemSelector(!showItemSelector)}
                    className={`text-[9px] font-bold uppercase px-2 py-1 rounded-lg border transition-all flex items-center gap-1 shrink-0 ${selectedItems.size > 0 ? 'bg-indigo-50 text-indigo-600 border-indigo-200' : 'bg-slate-50 text-slate-400 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'}`}
                >
                    <Package size={10}/>
                    {selectedItems.size > 0 ? `Позиций: ${selectedItems.size}` : 'Прикрепить позиции'}
                </button>
                {selectedItems.size > 0 && (
                    <button onClick={() => setSelectedItems(new Set())} className="text-slate-300 hover:text-red-400 shrink-0">
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
                <div className="px-3 py-2 flex flex-wrap gap-2 animate-in slide-in-from-bottom-2 fade-in max-h-32 overflow-y-auto bg-slate-50 border-t border-slate-100">
                    {orderItems.map(item => (
                        <button 
                            key={item}
                            onClick={() => toggleSelectedItem(item)}
                            className={`text-[9px] px-2 py-1 rounded-md border transition-all ${selectedItems.has(item) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'}`}
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
  orderId, offerId, supplierName, supplierId, currentUserRole, currentUserName, currentUserId, itemName, onNavigateToOrder, onRead, isArchived, onArchiveUpdate, threadRole
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [orderItems, setOrderItems] = useState<string[]>([]);
  
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
          // Pass threadRole to filter messages
          // If SUPPLIER, use own ID to find messages. If ADMIN/OP, use interlocutor ID.
          const targetId = currentUserRole === 'SUPPLIER' ? currentUserId : supplierId;
          // Fix for messages without ID: Search by MY name if Supplier, else by Interlocutor name
          const nameToSearch = currentUserRole === 'SUPPLIER' ? currentUserName : supplierName;
          
          const data = await SupabaseService.getChatMessages(orderId, offerId || undefined, nameToSearch, targetId, threadRole, currentUserRole);
          setMessages(data);
      } catch (e) {
          console.error(e);
      }
  };

        useEffect(() => {

        if (!messages.length) return;

  

        // Mark Read logic

        let shouldMark = false;

        if (currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') {

            shouldMark = messages.some(m => !m.is_read && (m.sender_role === 'SUPPLIER' || (m.sender_role === 'ADMIN' && m.recipient_name === 'OPERATOR')));

        } else if (currentUserRole === 'SUPPLIER') {

            const targetSenderRoles = threadRole === 'OPERATOR' ? ['OPERATOR'] : ['ADMIN', 'MANAGER'];

            shouldMark = messages.some(m => !m.is_read && targetSenderRoles.includes(m.sender_role));

        }

  

        if (shouldMark) {

  
          const markRead = async () => {
              if (onRead) onRead(orderId, supplierName);
              // Pass role to service
              const myRoleGroup = (currentUserRole === 'ADMIN' || currentUserRole === 'OPERATOR') ? 'ADMIN' : 'SUPPLIER';
              await SupabaseService.markChatAsRead(orderId, supplierName, myRoleGroup, supplierId, currentUserId);
              
              setMessages(prev => prev.map(m => (!m.is_read) ? { ...m, is_read: true } : m));
          };
          markRead();
      }
  }, [messages, currentUserRole, orderId, supplierName, onRead]);

  useEffect(() => {
      fetchMessages();
      const channel = SupabaseService.subscribeToChatMessages(orderId, (newMsg) => {
          let isRelevant = false;

          // 1. Check by UUID (Most reliable)
          if (supplierId) {
              isRelevant = newMsg.sender_id === supplierId || newMsg.recipient_id === supplierId;
          }

          // 2. Check by Role (For system chats: Operator <-> Manager)
          if (!isRelevant) {
              const isMsgFromManager = ['ADMIN', 'MANAGER'].includes(newMsg.sender_role);
              const isMsgToManager = ['ADMIN', 'MANAGER', 'Менеджер', 'Manager'].includes(newMsg.recipient_name);
              const isMsgFromOperator = newMsg.sender_role === 'OPERATOR';
              const isMsgToOperator = ['OPERATOR', 'Оператор'].includes(newMsg.recipient_name);

              console.log('RT DEBUG:', { threadRole, currentUserRole, isMsgFromManager, isMsgToManager, isMsgFromOperator, isMsgToOperator, msg: newMsg.message });

              if (threadRole === 'OPERATOR') {
                  // Admin/Supplier <-> Operator
                  // If I am Admin, I want to see (Admin -> Operator) or (Operator -> Admin)
                  if (currentUserRole === 'ADMIN') {
                      isRelevant = (isMsgFromManager && isMsgToOperator) || (isMsgFromOperator && isMsgToManager);
                  } else {
                      // Supplier <-> Operator
                      isRelevant = newMsg.sender_role === 'OPERATOR' || isMsgToOperator;
                  }
              } else if (threadRole === 'MANAGER') {
                  // Operator/Supplier <-> Manager
                  if (currentUserRole === 'OPERATOR') {
                      isRelevant = (isMsgFromOperator && isMsgToManager) || (isMsgFromManager && isMsgToOperator);
                  } else {
                      // Supplier <-> Manager
                      isRelevant = isMsgFromManager || isMsgToManager;
                  }
              } else {
                  // Fallback to Name (Legacy/Simple)
                  isRelevant = newMsg.sender_name === supplierName || newMsg.recipient_name === supplierName;
              }
          }
          
          if (isRelevant) {
              setMessages(prev => {
                  if (prev.find(m => m.id === newMsg.id)) return prev;
                  // Remove optimistic message if real one arrived
                  const optimisticMatch = prev.find(m => m.message === newMsg.message && m.sender_name === newMsg.sender_name && typeof m.id === 'number' && m.id > 1000000000000);
                  if (optimisticMatch) return prev.map(m => m.id === optimisticMatch.id ? newMsg : m);
                  return [...prev, newMsg];
              });
          }
      });
      return () => { SupabaseService.unsubscribeFromChat(channel); };
  }, [orderId, supplierName, supplierId, threadRole]);

  useEffect(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDelete = async () => {
      try {
          await SupabaseService.deleteChatHistory(orderId, supplierName, supplierId);
          if (onArchiveUpdate) onArchiveUpdate();
          setToast({ message: 'Чат удален' });
          setMessages([]);
      } catch (e) { }
  };

  const handleSend = useCallback(async (msgText: string, selectedItemNames?: string[], file?: File) => {
      const tempId = Date.now();
      let senderName = 'Менеджер';
      let dbRole: 'MANAGER' | 'OPERATOR' | 'SUPPLIER' | 'ADMIN' = 'MANAGER';
      let recipientName = supplierName;
      let senderId = currentUserId;
      let recipientId = supplierId; // ID собеседника (если я Админ - то ID закупщика, если я Закупщик - то NULL/АдминID)

      if (currentUserRole === 'OPERATOR') {
          senderName = currentUserName ? `${currentUserName}` : 'Оператор';
          dbRole = 'OPERATOR';
          recipientName = supplierName;
          recipientId = supplierId;
      } else if (currentUserRole === 'ADMIN') {
          senderName = 'Менеджер';
          dbRole = 'MANAGER'; // or ADMIN
          recipientName = supplierName;
          recipientId = supplierId;
      } else {
          // I AM SUPPLIER
          senderName = currentUserName || 'Закупщик';
          dbRole = 'SUPPLIER';
          
          if (threadRole === 'OPERATOR') {
              recipientName = 'OPERATOR';
          } else {
              recipientName = 'ADMIN';
          }
      }

      const optimisticMsg = {
          id: tempId,
          order_id: Number(orderId),
          sender_role: dbRole,
          sender_name: senderName,
          recipient_name: recipientName,
          message: msgText,
          item_name: selectedItemNames?.join(', '), 
          file_url: file ? URL.createObjectURL(file) : undefined,
          file_type: file ? (file.type.startsWith('image/') ? 'image' : 'file') : undefined,
          created_at: new Date().toISOString(),
          is_read: false
      };

      setMessages(prev => [...prev, optimisticMsg]);
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

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
              recipient_name: recipientName,
              sender_id: senderId,
              recipient_id: recipientId,
              message: msgText,
              item_name: selectedItemNames?.join(', '),
              file_url: fileUrl || undefined,
              file_type: fileType || undefined,
              is_archived: false
          });
          
          setMessages(prev => {
              if (prev.find(m => m.id === realMsg.id)) return prev.filter(m => m.id !== tempId);
              return prev.map(m => m.id === tempId ? realMsg : m);
          });
          
          if (isArchived && onArchiveUpdate) onArchiveUpdate();

      } catch (e: any) {
          console.error('Send error:', e);
          setMessages(prev => prev.filter(m => m.id !== tempId));
      }
  }, [orderId, offerId, supplierName, currentUserRole, currentUserName, isArchived, onArchiveUpdate, supplierId, currentUserId]);

    return (
      <div className="flex flex-col h-full overflow-hidden bg-slate-50 relative">
          {toast && createPortal(
              <div className="fixed top-4 right-4 z-[9999] animate-in slide-in-from-top-2 fade-in duration-300">
                  <Toast message={toast.message} onClose={() => setToast(null)} duration={1000}/>
              </div>,
              document.body
          )}
          
          <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex items-center justify-between shadow-sm z-10 shrink-0">
            <div 
                className={`flex items-center gap-2 overflow-hidden ${onNavigateToOrder ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
                onClick={() => onNavigateToOrder && onNavigateToOrder(orderId)}
            >
                <Link size={12} className="text-indigo-400 shrink-0"/>
                <span className="text-[10px] font-bold text-indigo-700 truncate">
                    Чат по заказу #{orderId} ({supplierName})
                </span>
            </div>
            <div className="flex items-center gap-2">
                <button 
                    onClick={handleDelete}
                    className="text-[9px] font-black uppercase text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors mr-2"
                    title="Удалить чат"
                >
                    <Trash2 size={12}/> Удалить
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