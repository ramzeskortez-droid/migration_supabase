import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, ChevronRight, User, Hash, Package, Archive, Search } from 'lucide-react';
import { ChatWindow } from '../shared/ChatWindow';
import { SupabaseService } from '../../services/supabaseService';

interface BuyerGlobalChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  currentSupplierName?: string; // Для фильтрации чатов поставщика
  onNavigateToOrder?: (orderId: string) => void;
  initialOrderId?: string | null;
  onMessageRead?: (count: number) => void;
}

export const BuyerGlobalChat: React.FC<BuyerGlobalChatProps> = ({
  isOpen, onClose, currentUserRole, currentSupplierName, onNavigateToOrder, initialOrderId, onMessageRead 
}) => {
  const [threads, setThreads] = useState<Record<string, Record<string, any>>>({});
  const [unreadCounts, setUnreadCounts] = useState({ active: 0, archive: 0 }); // NEW
  const [selectedOrder, setSelectedOrder] = useState<string | null>(initialOrderId || null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const processedIds = React.useRef(new Set<number>());

  // ... (useEffect for initialOrderId)

  const fetchThreads = async () => {
      setLoading(true);
      try {
          const filter = currentUserRole === 'SUPPLIER' ? currentSupplierName : undefined;
          
          // Загружаем данные для обоих табов параллельно
          const [activeData, archiveData] = await Promise.all([
              SupabaseService.getGlobalChatThreads(filter, false, currentUserRole),
              SupabaseService.getGlobalChatThreads(filter, true, currentUserRole)
          ]);

          setThreads(activeTab === 'active' ? activeData : archiveData);

          const countUnread = (data: Record<string, Record<string, any>>) => {
              return Object.values(data).reduce((acc, suppliers) => 
                  acc + Object.values(suppliers).reduce((sAcc, sInfo: any) => sAcc + sInfo.unread, 0), 0
              );
          };

          setUnreadCounts({
              active: countUnread(activeData),
              archive: countUnread(archiveData)
          });
          
          // Auto-select logic
          if (initialOrderId) {
              setSelectedOrder(initialOrderId);
              if (currentUserRole === 'SUPPLIER' && currentSupplierName) {
                  setSelectedSupplier(currentSupplierName);
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
          
          const channel = SupabaseService.subscribeToUserChats((payload) => {
              fetchThreads();
          }, 'buyer-global-chat-realtime');

          return () => {
              SupabaseService.unsubscribeFromChat(channel);
          };
      }
  }, [isOpen, currentUserRole, currentSupplierName, activeTab]);

  const handleNavigate = React.useCallback((oid: string) => {
      if (onNavigateToOrder) {
          setTimeout(() => {
              onNavigateToOrder(oid);
              onClose();
          }, 0);
      }
  }, [onNavigateToOrder, onClose]);

  const handleRead = (orderId: string, supplierName: string) => {
      setThreads(prev => {
          const newThreads = { ...prev };
          if (newThreads[orderId] && newThreads[orderId][supplierName]) {
              const currentUnread = newThreads[orderId][supplierName].unread;
              if (currentUnread > 0 && onMessageRead) {
                  setTimeout(() => onMessageRead(currentUnread), 0);
              }
              
              newThreads[orderId][supplierName] = {
                  ...newThreads[orderId][supplierName],
                  unread: 0
              };
          }
          return newThreads;
      });
      setUnreadCounts(prev => ({
          ...prev,
          [activeTab]: Math.max(0, prev[activeTab] - (threads[orderId]?.[supplierName]?.unread || 0))
      }));
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl h-[80vh] flex overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Sidebar: Orders List */}
            <div className="w-1/3 bg-slate-50 border-r border-slate-200 flex flex-col">
                <div className="p-4 border-b border-slate-200 bg-white">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-black uppercase text-slate-800 flex items-center gap-2">
                            <MessageCircle size={18} className="text-indigo-600"/> Сообщения
                        </h2>
                        <button onClick={fetchThreads} className={`text-xs font-bold text-indigo-600 hover:text-indigo-800 ${loading ? 'opacity-50' : ''}`}>
                            Обновить
                        </button>
                    </div>

                    <div className="relative mb-3">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                        <input 
                            type="text" 
                            placeholder="Поиск по № заказа..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 border-transparent focus:bg-white focus:border-indigo-500 rounded-md transition-all outline-none"
                        />
                    </div>
                    
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span>Активные</span>
                            {unreadCounts.active > 0 && (
                                <span className="bg-indigo-600 text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm animate-pulse">
                                    {unreadCounts.active}
                                </span>
                            )}
                        </button>
                        <button 
                            onClick={() => setActiveTab('archive')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all flex items-center justify-center gap-2 ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            <span>Архив</span>
                            {unreadCounts.archive > 0 && (
                                <span className="bg-red-500 text-white text-[9px] min-w-[18px] h-[18px] flex items-center justify-center rounded-full shadow-sm animate-pulse">
                                    {unreadCounts.archive}
                                </span>
                            )}
                        </button>
                    </div>
                </div>                
                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                    {Object.keys(threads).length === 0 && (
                        <div className="text-center text-slate-400 text-xs font-bold mt-10">Нет активных чатов</div>
                    )}

                    {Object.entries(threads)
                        .filter(([orderId]) => orderId.includes(searchQuery.trim()))
                        .map(([orderId, suppliers]) => {
                        const totalUnread = Object.values(suppliers).reduce((acc: number, val: any) => acc + val.unread, 0);
                        const isExpanded = selectedOrder === orderId;

                        return (
                            <div key={orderId} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                <div 
                                    className={`p-3 flex justify-between items-center cursor-pointer transition-colors ${isExpanded ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                                    onClick={() => setSelectedOrder(isExpanded ? null : orderId)}
                                >
                                    <div className="flex items-center gap-2">
                                        <Hash size={14} className="text-slate-400"/>
                                        <span className="font-black text-xs text-slate-700">Заказ #{orderId}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {totalUnread > 0 && <span className="bg-red-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{totalUnread}</span>}
                                        <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90' : ''}`}/>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="border-t border-slate-100 bg-slate-50 p-1 space-y-1">
                                        {Object.entries(suppliers).map(([supplier, info]: [string, any]) => (
                                            <div 
                                                key={supplier}
                                                onClick={() => {
                                                    setSelectedSupplier(supplier);
                                                    handleRead(orderId, supplier);
                                                }}
                                                className={`p-2 rounded-lg cursor-pointer flex justify-between items-center ${selectedSupplier === supplier ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-white text-slate-600'}`}
                                            >
                                                <div className="flex flex-col overflow-hidden w-full group/supplier">
                                                    <span className="font-bold text-[10px] uppercase truncate flex items-center gap-1 justify-between">
                                                        <span className="flex items-center gap-1">
                                                            <User size={10}/> 
                                                            {currentUserRole === 'SUPPLIER' 
                                                                ? ((info.lastAuthorName === currentSupplierName || !info.lastAuthorName) 
                                                                    ? 'Чат с менеджером' 
                                                                    : `Оператор: ${info.lastAuthorName.replace('Оператор - ', '')}`) 
                                                                : supplier}
                                                        </span>
                                                        <div className="flex items-center gap-1">
                                                            {info.unread > 0 && (
                                                                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${selectedSupplier === supplier ? 'bg-white text-indigo-600' : 'bg-red-100 text-red-600'}`}>
                                                                    +{info.unread}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </span>
                                                    <span className={`text-[9px] truncate mt-1 ${selectedSupplier === supplier ? 'text-indigo-200' : 'text-slate-400'}`}>
                                                        {info.lastMessage}
                                                    </span>
                                                </div>
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
                
                {selectedOrder && selectedSupplier ? (
                    <div className="flex flex-col h-full">
                        <div className="p-4 border-b border-slate-100 bg-white">
                            <h3 className="font-black text-lg text-slate-800 uppercase">Заказ #{selectedOrder}</h3>
                            <p className="text-xs font-bold text-slate-400 uppercase flex items-center gap-1">
                                <User size={12}/> 
                                {currentUserRole === 'SUPPLIER' 
                                    ? (threads[selectedOrder]?.[selectedSupplier]?.lastAuthorName === 'ADMIN' ? 'Менеджер' : threads[selectedOrder]?.[selectedSupplier]?.lastAuthorName || 'Оператор') 
                                    : selectedSupplier}
                            </p>
                        </div>
                        <div className="flex-grow overflow-hidden">
                            <ChatWindow 
                                orderId={selectedOrder}
                                supplierName={selectedSupplier}
                                currentUserRole={currentUserRole}
                                onNavigateToOrder={handleNavigate}
                                onRead={handleRead}
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
