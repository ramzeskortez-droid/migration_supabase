import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, ChevronRight, User, Hash, Archive, Search, Shield, ShoppingBag, Headset } from 'lucide-react';
import { ChatWindow } from './ChatWindow';
import { SupabaseService } from '../../services/supabaseService';
import { supabase } from '../../lib/supabaseClient';

interface GlobalChatWindowProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigateToOrder?: (orderId: string) => void;
  currentUserRole: 'ADMIN' | 'SUPPLIER' | 'OPERATOR';
  currentUserName?: string;
  currentUserId: string;
  onMessageRead?: (count: number) => void;
  initialOrderId?: string;
  initialSupplierId?: string; 
  initialSupplierName?: string; // Passed name for new chats
}

export const GlobalChatWindow: React.FC<GlobalChatWindowProps> = ({ isOpen, onClose, onNavigateToOrder, currentUserRole, currentUserName, currentUserId, onMessageRead, initialOrderId, initialSupplierId, initialSupplierName }) => {
  const [threads, setThreads] = useState<Record<string, Record<string, any>>>({});
  const [unreadCounts, setUnreadCounts] = useState({ active: 0, archive: 0 }); 
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedInterlocutorId, setSelectedInterlocutorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const processedIds = React.useRef(new Set<number>());

  // Force selection on open
  useEffect(() => {
      if (isOpen && initialOrderId && initialSupplierId) {
          setSelectedOrder(initialOrderId);
          setSelectedInterlocutorId(initialSupplierId);
      }
  }, [isOpen, initialOrderId, initialSupplierId]);

  const fetchThreads = async () => {
      if (!currentUserId) return;
      setLoading(true);
      try {
          const [activeData, archiveData] = await Promise.all([
              SupabaseService.getGlobalChatThreads(currentUserId, false),
              SupabaseService.getGlobalChatThreads(currentUserId, true)
          ]);

          setThreads(activeTab === 'active' ? activeData : archiveData);

          const countUnread = (data: Record<string, Record<string, any>>) => {
              return Object.values(data).reduce((acc, interlocutors) => 
                  acc + Object.values(interlocutors).reduce((sAcc, sInfo: any) => sAcc + sInfo.unread, 0), 0
              );
          };

          setUnreadCounts({
              active: countUnread(activeData),
              archive: countUnread(archiveData)
          });
          
          // Virtual Thread Creation (if selected but missing)
          if (initialOrderId && initialSupplierId) {
             const exists = (activeData[initialOrderId]?.[initialSupplierId]) || (archiveData[initialOrderId]?.[initialSupplierId]);
             
             if (!exists && activeTab === 'active') {
                 // Fetch name if not provided
                 let displayName = initialSupplierName || 'Пользователь';
                 let role = 'UNKNOWN';

                 if (!initialSupplierName) {
                     try {
                         const { data: userData } = await supabase
                            .from('app_users')
                            .select('name, role')
                            .eq('id', initialSupplierId)
                            .maybeSingle();
                         
                         if (userData) {
                             displayName = userData.name;
                             role = userData.role;
                         }
                     } catch (e) { }
                 }

                 setThreads(prev => ({
                     ...prev,
                     [initialOrderId]: {
                         ...prev[initialOrderId],
                         [initialSupplierId]: {
                             unread: 0,
                             lastMessage: 'Начать диалог',
                             supplierId: initialSupplierId,
                             displayName: displayName,
                             role: role,
                             virtual: true
                         }
                     }
                 }));
             }
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      if (isOpen) {
          fetchThreads();
          // ... subscription ...
          const channel = SupabaseService.subscribeToUserChats((payload) => {
              const msg = payload.new;
              if (processedIds.current.has(msg.id)) return;
              processedIds.current.add(msg.id);
              if (msg.sender_id === currentUserId || msg.recipient_id === currentUserId) {
                  fetchThreads();
              }
          }, 'global-chat-realtime');
          return () => { SupabaseService.unsubscribeFromChat(channel); };
      }
  }, [isOpen, activeTab, currentUserId]); // Removed initial props from dep array to avoid loops

  // ... handleNavigate, handleRead ...
  const handleNavigate = React.useCallback((oid: string) => {
      if (onNavigateToOrder) {
          setTimeout(() => {
              onNavigateToOrder(oid);
              onClose();
          }, 0);
      }
  }, [onNavigateToOrder, onClose]);

  const handleRead = (orderId: string, interlocutorId: string) => {
      setThreads(prev => {
          const newThreads = { ...prev };
          if (newThreads[orderId] && newThreads[orderId][interlocutorId]) {
              newThreads[orderId][interlocutorId] = {
                  ...newThreads[orderId][interlocutorId],
                  unread: 0
              };
          }
          return newThreads;
      });
      // API call logic...
      SupabaseService.markChatAsRead(orderId, currentUserId, interlocutorId);
  };

  const getRoleIcon = (role: string) => {
      if (role === 'admin' || role === 'manager' || role === 'MANAGER' || role === 'ADMIN') return <Shield size={10} className="text-emerald-600"/>;
      if (role === 'operator' || role === 'OPERATOR') return <Headset size={10} className="text-indigo-600"/>;
      return <ShoppingBag size={10} className="text-amber-600"/>;
  };

  const getRoleName = (role: string) => {
      if (role === 'admin' || role === 'manager' || role === 'MANAGER' || role === 'ADMIN') return 'Менеджер';
      if (role === 'operator' || role === 'OPERATOR') return 'Оператор';
      return 'Закупщик';
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Sidebar */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
                {/* ... Header and Search ... */}
                <div className="p-4 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-black uppercase text-slate-800 flex items-center gap-2">
                            <MessageCircle size={18} className="text-indigo-600"/> Сообщения
                        </h2>
                        <button onClick={fetchThreads} className={`text-xs font-bold text-indigo-600 hover:text-indigo-800 ${loading ? 'opacity-50' : ''}`}>
                            Обновить
                        </button>
                    </div>
                    {/* ... Tabs ... */}
                     <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button onClick={() => setActiveTab('active')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Активные {unreadCounts.active > 0 && `(${unreadCounts.active})`}</button>
                        <button onClick={() => setActiveTab('archive')} className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>Архив {unreadCounts.archive > 0 && `(${unreadCounts.archive})`}</button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                    {Object.entries(threads).map(([orderId, interlocutors]) => {
                        const isExpanded = selectedOrder === orderId;
                        return (
                            <div key={orderId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group/order">
                                <div className={`p-3 flex justify-between items-center cursor-pointer ${isExpanded ? 'bg-slate-100' : 'hover:bg-slate-50'}`} onClick={() => setSelectedOrder(isExpanded ? null : orderId)}>
                                    <div className="flex items-center gap-2"><Hash size={14} className="text-slate-400"/><span className="font-black text-xs text-slate-700">Заказ #{orderId}</span></div>
                                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`}/>
                                </div>
                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50 p-1 space-y-1">
                                        {Object.entries(interlocutors).map(([iid, info]: [string, any]) => (
                                            <div key={iid} onClick={() => { setSelectedInterlocutorId(iid); handleRead(orderId, iid); }} className={`p-2 rounded-lg cursor-pointer flex justify-between items-center ${selectedInterlocutorId === iid ? 'bg-indigo-600 text-white' : 'hover:bg-white text-slate-600'}`}>
                                                <div className="flex flex-col"><span className="font-bold text-[10px] uppercase">{info.displayName}</span><span className={`text-[9px] truncate ${selectedInterlocutorId === iid ? 'text-indigo-200' : 'text-slate-400'}`}>{info.lastMessage}</span></div>
                                                {info.unread > 0 && <span className="bg-red-500 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full">+{info.unread}</span>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="w-2/3 flex flex-col bg-white relative">
                <button onClick={onClose} className="absolute top-4 right-4 p-2 bg-slate-100 hover:bg-slate-200 rounded-full z-10 transition-colors"><X size={20} className="text-slate-500"/></button>
                
                {selectedOrder && selectedInterlocutorId ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-white">
                            <h3 className="font-black text-lg text-slate-800 uppercase">Заказ #{selectedOrder}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                                <User size={12}/> {threads[selectedOrder]?.[selectedInterlocutorId]?.displayName || initialSupplierName || '...'}
                            </p>
                        </div>
                        <div className="flex-grow overflow-hidden">
                             <ChatWindow 
                                 orderId={selectedOrder}
                                 supplierName={threads[selectedOrder]?.[selectedInterlocutorId]?.displayName || initialSupplierName || 'Собеседник'} 
                                 supplierId={selectedInterlocutorId} 
                                 currentUserRole={currentUserRole}
                                 currentUserName={currentUserName}
                                 currentUserId={currentUserId}
                                 onNavigateToOrder={handleNavigate}
                                 onRead={(oid, name) => handleRead(oid, selectedInterlocutorId)}
                                 isArchived={activeTab === 'archive'}
                                 onArchiveUpdate={fetchThreads}
                             />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                        <MessageCircle size={48} className="mb-4 opacity-20"/>
                        <span className="font-black uppercase text-sm tracking-widest">Выберите чат слева</span>
                    </div>
                )}
            </div>
        </div>
    </div>,
    document.body
  );
};
