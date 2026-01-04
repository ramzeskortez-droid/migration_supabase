import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, MessageCircle, ChevronRight, User, Hash, Package } from 'lucide-react';
import { ChatWindow } from '../shared/ChatWindow';
import { SupabaseService } from '../../services/supabaseService';

interface SellerGlobalChatProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  currentSupplierName?: string; // Для фильтрации чатов поставщика
  onNavigateToOrder?: (orderId: string) => void;
}

export const SellerGlobalChat: React.FC<SellerGlobalChatProps> = ({ 
  isOpen, onClose, currentUserRole, currentSupplierName, onNavigateToOrder 
}) => {
  const [threads, setThreads] = useState<Record<string, Record<string, any>>>({});
  const [selectedOrder, setSelectedOrder] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'archive'>('active');

  const fetchThreads = async () => {
      setLoading(true);
      try {
          // Если я поставщик, передаю свое имя для фильтрации
          const filter = currentUserRole === 'SUPPLIER' ? currentSupplierName : undefined;
          const isArchived = activeTab === 'archive';
          const data = await SupabaseService.getGlobalChatThreads(filter, isArchived);
          setThreads(data);
      } catch (e) {
          console.error(e);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
      fetchThreads();
      const interval = setInterval(fetchThreads, 10000); 
      return () => clearInterval(interval);
  }, [isOpen, currentUserRole, currentSupplierName, activeTab]); // Added activeTab dependency

  const handleNavigate = React.useCallback((oid: string) => {
      if (onNavigateToOrder) {
          onNavigateToOrder(oid);
          onClose();
      }
  }, [onNavigateToOrder, onClose]);

  const handleRead = (orderId: string, supplierName: string) => {
      setThreads(prev => {
          const newThreads = { ...prev };
          if (newThreads[orderId] && newThreads[orderId][supplierName]) {
              newThreads[orderId][supplierName] = {
                  ...newThreads[orderId][supplierName],
                  unread: 0
              };
          }
          return newThreads;
      });
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
                    
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            onClick={() => setActiveTab('active')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'active' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Активные
                        </button>
                        <button 
                            onClick={() => setActiveTab('archive')}
                            className={`flex-1 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${activeTab === 'archive' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                            Архив
                        </button>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto p-2 space-y-2">
                    {Object.keys(threads).length === 0 && (
                        <div className="text-center text-slate-400 text-xs font-bold mt-10">Нет активных чатов</div>
                    )}

                    {Object.entries(threads).map(([orderId, suppliers]) => {
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
                                                <div className="flex flex-col overflow-hidden w-full">
                                                    <span className="font-bold text-[10px] uppercase truncate flex items-center gap-1 justify-between">
                                                        <span className="flex items-center gap-1"><User size={10}/> {currentUserRole === 'SUPPLIER' ? 'Чат с менеджером' : supplier}</span>
                                                        {info.unread > 0 && (
                                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full ${selectedSupplier === supplier ? 'bg-white text-indigo-600' : 'bg-red-100 text-red-600'}`}>
                                                                +{info.unread}
                                                            </span>
                                                        )}
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
                                <User size={12}/> {currentUserRole === 'SUPPLIER' ? 'Менеджер' : selectedSupplier}
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