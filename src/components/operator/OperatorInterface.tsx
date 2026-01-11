import React, { useState, useEffect, useCallback } from 'react';
import { OperatorHeader } from './OperatorHeader';
import { OperatorAuthModal } from './OperatorAuthModal';
import { GlobalChatWindow } from '../shared/GlobalChatWindow';
import { EmailWidget } from './EmailWidget';
import { ChatNotification } from '../shared/ChatNotification';
import { Mail, ChevronRight } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { useOperatorAuth } from '../../hooks/useOperatorAuth';
import { OperatorOrderCreation } from './OperatorOrderCreation(СозданиеЗаявки)';
import { OperatorOrdersView } from './OperatorOrdersView(ПросмотрЗаявок)';
import { Toast } from '../shared/Toast';

export const OperatorInterface: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [isEmailOpen, setIsEmailOpen] = useState(false);
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

                

                // 1. Сообщение от Поставщика (для общего чата)

                if (msg.recipient_name === 'ADMIN' && msg.sender_role === 'SUPPLIER') {

                    setUnreadChatCount(prev => prev + 1);

                    if (!isGlobalChatOpen) {

                        setChatNotifications(prev => [...prev, msg].slice(-3));

                    }

                }

                // 2. Сообщение от Менеджера (например, о ручной обработке)

                if (msg.recipient_name === 'OPERATOR' && msg.sender_role === 'ADMIN') {

                    setUnreadChatCount(prev => prev + 1);

                    if (!isGlobalChatOpen) {

                        setChatNotifications(prev => [...prev, msg].slice(-3));

                    }

                }

            }, `operator-notifications-${currentUser.id}`);

      return () => { 
          SupabaseService.unsubscribeFromChat(channel); 
          clearInterval(interval);
      };
  }, [currentUser, isGlobalChatOpen]);

  const handleImportEmail = (text: string) => {
      setToast({ message: 'Текст письма передан в ассистент', type: 'info' });
      addLog('Импорт текста из почты...');
      const event = new CustomEvent('importEmailText', { detail: text });
      window.dispatchEvent(event);
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
      {!currentUser && <OperatorAuthModal onLogin={login} />}
      
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
      
      <OperatorHeader 
        operatorName={currentUser?.name || null} 
        onLogout={logout} 
        onOpenChat={() => setIsGlobalChatOpen(true)}
        unreadCount={unreadChatCount}
      />

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
                <EmailWidget onImportToAI={handleImportEmail} />
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
      />
    </div>
  );
};
