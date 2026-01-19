import React, { useState, useEffect, useCallback } from 'react';
import { GlobalChatWindow } from '../shared/GlobalChatWindow';
import { EmailWidget } from './EmailWidget';
import { ChatNotification } from '../shared/ChatNotification';
import { Mail, ChevronRight, MessageCircle, User, LogOut } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { useOperatorAuth } from '../../hooks/useOperatorAuth';
import { OperatorOrderCreation } from './OperatorOrderCreation(СозданиеЗаявки)';
import { OperatorOrdersView } from './OperatorOrdersView(ПросмотрЗаявок)';
import { Toast } from '../shared/Toast';
import { useHeaderStore } from '../../store/headerStore';

export const OperatorInterface: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isEmailOpen, setIsEmailOpen] = useState(true);
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [navigateToOrderId, setNavigateToOrderId] = useState<string | undefined>(undefined);
  const [toast, setToast] = useState<{message: string, type: 'info'} | null>(null);
  const [debugMode, setDebugMode] = useState(false);

  useEffect(() => {
      const fetchSettings = async () => {
          try {
              const val = await SupabaseService.getSystemSettings('debug_mode');
              setDebugMode(!!val);
          } catch(e) {}
      };
      fetchSettings();
  }, []);

  const addLog = useCallback((message: string) => {
      const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
      setLogs(prev => [`[${time}] ${message}`, ...prev].slice(0, 50));
  }, []);

  const { currentUser, isAuthChecking, login, logout } = useOperatorAuth(addLog);
  const setHeader = useHeaderStore(s => s.setCustomRightContent);

  // Set Header Content
  useEffect(() => {
      if (currentUser) {
          setHeader(
            <div className="flex items-center gap-6">
                <button 
                    onClick={() => setIsGlobalChatOpen(true)}
                    className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all relative"
                    title="Все сообщения от закупщиков"
                >
                    <MessageCircle size={20} />
                    {unreadChatCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {unreadChatCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-100 h-8">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-900">{currentUser.name}</div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Оператор</div>
                    </div>
                    <div className="h-9 w-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                        <User size={16} strokeWidth={2.5} />
                    </div>
                    <button 
                        onClick={logout}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-2"
                        title="Выйти"
                    >
                        <LogOut size={18} />
                    </button>
                </div>
            </div>
          );
      } else {
          setHeader(null);
      }
      return () => setHeader(null);
  }, [currentUser, unreadChatCount, logout]);
  
  // Redirect if not authenticated
  useEffect(() => {
      if (!isAuthChecking && !currentUser) {
          window.location.href = '/';
      }
  }, [isAuthChecking, currentUser]);

  const handleMessageRead = useCallback((count: number) => {
      setUnreadChatCount(prev => Math.max(0, prev - count));
  }, []);

  // Realtime Notifications & Chat
  useEffect(() => {
      if (!currentUser) return;

      const fetchUnread = async () => {
          try {
              const count = await SupabaseService.getOperatorUnreadCount();
              setUnreadChatCount(count);
          } catch (e) {}
      };
      fetchUnread();
      const interval = setInterval(fetchUnread, 30000);

            const channel = SupabaseService.subscribeToUserChats((payload) => {
                const msg = payload.new;
                
                // Проверяем, адресовано ли сообщение Оператору
                const isToOperator = ['OPERATOR', 'Оператор'].includes(msg.recipient_name);

                // 1. Сообщение от Поставщика
                if (msg.sender_role === 'SUPPLIER' && isToOperator) {
                    setUnreadChatCount(prev => prev + 1);
                    if (!isGlobalChatOpen) setChatNotifications(prev => [...prev, msg].slice(-3));
                }

                // 2. Сообщение от Менеджера
                const isFromManager = ['ADMIN', 'MANAGER', 'Manager', 'Менеджер'].includes(msg.sender_role);
                
                if (isFromManager && isToOperator) {
                    setUnreadChatCount(prev => prev + 1);
                    if (!isGlobalChatOpen) setChatNotifications(prev => [...prev, msg].slice(-3));
                }
            }, `operator-notifications-${currentUser.id}`);

      return () => { 
          SupabaseService.unsubscribeFromChat(channel); 
          clearInterval(interval);
      };
  }, [currentUser, isGlobalChatOpen]);

  const handleImportEmail = (data: any) => {
      setToast({ message: 'Данные письма переданы в ассистент', type: 'info' });
      addLog('Импорт письма...');
      const event = new CustomEvent('importEmailText', { detail: data });
      window.dispatchEvent(event);
  };

  const handleLinkEmail = (emailId: string) => {
      // Передаем ID письма в компонент создания заявки через событие
      // Это потребует обновления AiAssistant или OperatorOrderCreation
      const event = new CustomEvent('linkEmailToOrder', { detail: emailId });
      window.dispatchEvent(event);
      addLog(`Письмо прикреплено к форме создания.`);
  };

  const handleNavigateToOrder = (orderId: string) => {
      setNavigateToOrderId(orderId);
      setIsGlobalChatOpen(false); // Закрываем чат при переходе
  };

  if (isAuthChecking) {
      return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-black uppercase text-xs tracking-widest">Загрузка профиля...</div>;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden relative">
      {toast && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
              <Toast message={toast.message} onClose={() => setToast(null)} type={toast.type} duration={1000} />
          </div>
      )}

      {chatNotifications.map((msg, idx) => (
            <ChatNotification 
                key={msg.id}
                index={idx}
                message={msg} 
                onClose={() => setChatNotifications(prev => prev.filter(m => m.id !== msg.id))}
                onClick={() => {
                    setIsGlobalChatOpen(true);
                    setChatNotifications(prev => prev.filter(m => m.id !== msg.id));
                }}
            />
      ))}
      
      <div className={`flex flex-1 overflow-hidden transition-opacity duration-300 ${!currentUser ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-100'}`}>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <OperatorOrderCreation 
                currentUser={currentUser} 
                onLog={addLog} 
                onOrderCreated={() => setRefreshTrigger(prev => prev + 1)}
                debugMode={debugMode}
            />

            <OperatorOrdersView 
                ownerId={currentUser?.id} 
                refreshTrigger={refreshTrigger} 
                initialSearch={navigateToOrderId}
                onLog={addLog}
            />
          </div>
        </main>

        <aside className={`${isEmailOpen ? 'w-80' : 'w-14'} bg-white border-l border-slate-200 flex flex-col shrink-0 transition-all duration-300 relative`}>
            <button 
                onClick={() => setIsEmailOpen(!isEmailOpen)}
                className={`absolute top-4 z-20 p-2 rounded-xl transition-all ${isEmailOpen ? 'right-4 bg-slate-100 text-slate-500 hover:bg-slate-200' : 'left-1/2 -translate-x-1/2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 shadow-sm'}`}
                title={isEmailOpen ? "Свернуть" : "Почта"}
            >
                {isEmailOpen ? <ChevronRight size={16}/> : <Mail size={20}/>}
            </button>

            <div className={`flex-1 overflow-hidden p-4 pt-16 transition-all duration-300 ${isEmailOpen ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10 pointer-events-none'}`}>
                <EmailWidget onImportToAI={handleImportEmail} onLinkToOrder={handleLinkEmail} currentUserId={currentUser?.id} />
            </div>
        </aside>
      </div>

      <GlobalChatWindow 
        isOpen={isGlobalChatOpen}
        onClose={() => setIsGlobalChatOpen(false)}
        currentUserRole="OPERATOR"
        currentUserName={currentUser?.name}
        onNavigateToOrder={handleNavigateToOrder}
        onMessageRead={handleMessageRead}
        initialSupplierId={undefined} // Пока не открываем конкретный чат по ID
      />
    </div>
  );
};
