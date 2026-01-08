import React, { useState, useEffect, useCallback } from 'react';
import { OperatorHeader } from './operator/OperatorHeader';
import { SystemStatusSidebar } from './operator/SystemStatusSidebar';
import { OrderInfoForm } from './operator/OrderInfoForm';
import { PartsList } from './operator/PartsList';
import { AiAssistant } from './operator/AiAssistant';
import { SystemStatusHorizontal } from './operator/SystemStatusHorizontal';
import { OperatorAuthModal } from './operator/OperatorAuthModal';
import { OperatorOrdersList } from './operator/OperatorOrdersList';
import { GlobalChatWindow } from './shared/GlobalChatWindow';
import { EmailWidget } from './operator/EmailWidget';
import { OrderInfo, Part, LogHistory, DisplayStats } from './operator/types';
import { SupabaseService } from '../services/supabaseService';
import { Toast } from './shared/Toast';
import { ChatNotification } from './shared/ChatNotification';
import { AppUser } from '../types';
import { Search } from 'lucide-react';

export const OperatorInterface: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);

  // State
  const [parts, setParts] = useState<Part[]>([
    { id: 1, name: '', article: '', brand: '', uom: 'шт', quantity: 1 }
  ]);
  
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    deadline: '',
    region: '',
    city: '',
    email: '',
    clientEmail: '',
    emailSubject: '',
    clientName: '',
    clientPhone: ''
  });

  const [requestHistory, setRequestHistory] = useState<LogHistory[]>([]);
  const [displayStats, setDisplayStats] = useState<DisplayStats>({
    rpm: 0,
    tpm: 0,
    totalRequests: 0,
    resetIn: 0,
    logs: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [isBrandsValid, setIsBrandsValid] = useState(false); // Валидность брендов
  const [toast, setToast] = useState<{message: string, type?: 'success' | 'error' | 'info'} | null>(null);
  const [chatNotifications, setChatNotifications] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'processing' | 'processed' | 'completed' | 'rejected'>('processing');
  const [scrollToId, setScrollToId] = useState<string | null>(null);
  
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // ... (useCallbacks and useEffects remain same)

  const handleMessageRead = useCallback((count: number) => {
      setUnreadChatCount(prev => Math.max(0, prev - count));
  }, []);

  // ... (keeping other functions)

  const handleNavigateToOrder = async (orderId: string) => {
      try {
          const { status_admin } = await SupabaseService.getOrderStatus(orderId);
          
          // Определяем таб
          if (['КП готово', 'КП отправлено'].includes(status_admin)) {
              setActiveTab('processed');
          } else if (['Выполнен'].includes(status_admin)) {
              setActiveTab('completed');
          } else if (['Аннулирован', 'Отказ'].includes(status_admin)) {
              setActiveTab('rejected');
          } else {
              setActiveTab('processing');
          }

          setSearchQuery(orderId);
          setScrollToId(orderId);
          addLog(`Переход к заказу #${orderId}`);
          
          setTimeout(() => setScrollToId(null), 1000);
      } catch (e) {
          setSearchQuery(orderId);
      }
  };

  const handleImportEmail = (text: string) => {
      setToast({ message: 'Текст письма передан в ассистент', type: 'info' });
      addLog('Импорт текста из почты...');
      const event = new CustomEvent('importEmailText', { detail: text });
      window.dispatchEvent(event);
  };

  if (isAuthChecking) {
      return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-black uppercase text-xs tracking-widest">Загрузка профиля...</div>;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden relative">
      {!currentUser && <OperatorAuthModal onLogin={handleLogin} />}
      
      {/* Toast Notification: Top Right */}
      {toast && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
              <Toast message={toast.message} onClose={() => setToast(null)} type={toast.type as any} duration={2000} />
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
        onLogout={handleLogout} 
        onOpenChat={() => setIsGlobalChatOpen(true)}
        unreadCount={unreadChatCount}
      />

      <div className={`flex flex-1 overflow-hidden transition-opacity duration-300 ${!currentUser ? 'opacity-30 pointer-events-none blur-sm' : 'opacity-100'}`}>
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            
            {/* Form Section */}
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10">
                <OrderInfoForm orderInfo={orderInfo} setOrderInfo={setOrderInfo} />
                
                <PartsList 
                    parts={parts} 
                    setParts={setParts} 
                    onAddBrand={handleAddBrand}
                    onValidationChange={setIsBrandsValid}
                />
                
                <AiAssistant 
                    onImport={(newParts) => {
                        if (parts.length === 1 && !parts[0].name) {
                            setParts(newParts);
                        }
                        else {
                            setParts([...parts, ...newParts]);
                        }
                    }}
                    onUpdateOrderInfo={(info) => setOrderInfo(prev => ({ ...prev, ...info }))}
                    onLog={addLog}
                    onStats={(tokens) => {
                        setRequestHistory(prev => [...prev, { timestamp: Date.now(), tokens }]);
                        setDisplayStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
                    }}
                    onCreateOrder={handleCreateOrder}
                    isSaving={isSaving}
                    isFormValid={isFormValid} // Pass validity
                />

                <SystemStatusHorizontal displayStats={displayStats} />
            </div>

            {/* Orders List Section */}
            <div className="space-y-4">
                <div className="relative group flex items-center">
                    <Search className="absolute left-6 text-slate-400" size={20}/>
                    <input 
                        value={searchQuery} 
                        onChange={e => setSearchQuery(e.target.value)} 
                        placeholder="Поиск по ID, клиенту или телефону..." 
                        className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" 
                    />
                </div>
                <OperatorOrdersList 
                    refreshTrigger={refreshTrigger} 
                    ownerId={currentUser?.id} 
                    searchQuery={searchQuery} 
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    scrollToId={scrollToId}
                />
            </div>

          </div>
        </main>

        {/* Right Sidebar: Now focusing on Mail */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden h-full">
            <div className="flex-1 overflow-hidden p-4">
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