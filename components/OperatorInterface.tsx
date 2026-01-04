import React, { useState, useEffect, useCallback } from 'react';
import { OperatorHeader } from './operator/OperatorHeader';
import { SystemStatusSidebar } from './operator/SystemStatusSidebar';
import { OrderInfoForm } from './operator/OrderInfoForm';
import { PartsList } from './operator/PartsList';
import { AiAssistant } from './operator/AiAssistant';
import { OperatorAuthModal } from './operator/OperatorAuthModal';
import { OperatorOrdersList } from './operator/OperatorOrdersList';
import { GlobalChatWindow } from './shared/GlobalChatWindow';
import { OrderInfo, Part, LogHistory, DisplayStats } from './operator/types';
import { SupabaseService } from '../services/supabaseService';
import { Toast } from './shared/Toast';
import { AppUser } from '../types';

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
    emailSubject: '',
    clientName: '',
    clientPhone: ''
  });

  const [brandsList, setBrandsList] = useState<string[]>([]);
  const [requestHistory, setRequestHistory] = useState<LogHistory[]>([]);
  const [displayStats, setDisplayStats] = useState<DisplayStats>({
    rpm: 0,
    tpm: 0,
    totalRequests: 0,
    resetIn: 0,
    logs: []
  });

  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{message: string, type?: 'success' | 'error'} | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  
  const [isGlobalChatOpen, setIsGlobalChatOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  // Load User from LocalStorage
  useEffect(() => {
      const checkAuth = async () => {
          const token = localStorage.getItem('operatorToken');
          if (token) {
              try {
                  const user = await SupabaseService.loginWithToken(token);
                  if (user && (user.role === 'operator' || user.role === 'admin')) {
                      setCurrentUser(user);
                      addLog(`Восстановлена сессия оператора: ${user.name}`);
                  } else {
                      localStorage.removeItem('operatorToken'); // Invalid token
                  }
              } catch (e) {
                  console.error('Auth Check Error:', e);
              }
          }
          setIsAuthChecking(false);
      };
      checkAuth();
  }, []);

  // Чат: получение количества непрочитанных
  const fetchUnreadCount = useCallback(async () => {
      try {
          const count = await SupabaseService.getUnreadChatCount();
          setUnreadChatCount(count);
      } catch (e) {}
  }, []);

  useEffect(() => {
      if (currentUser) {
          fetchUnreadCount();
          const interval = setInterval(fetchUnreadCount, 30000);
          return () => clearInterval(interval);
      }
  }, [currentUser, fetchUnreadCount]);

  // Load Brands
  useEffect(() => {
      if (!currentUser) return; // Don't load if not auth

      const loadBrands = async () => {
          try {
              const list = await SupabaseService.getBrandsList();
              setBrandsList(list);
          } catch (e) {
              console.error('Ошибка загрузки брендов:', e);
          }
      };
      loadBrands();
  }, [currentUser]);

  const handleLogin = (user: AppUser) => {
      setCurrentUser(user);
      localStorage.setItem('operatorToken', user.token);
      addLog(`Оператор ${user.name} вошел в систему.`);
  };

  const handleLogout = () => {
      setCurrentUser(null);
      localStorage.removeItem('operatorToken');
  };

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    setDisplayStats(prev => ({
      ...prev,
      logs: [`[${time}] ${message}`, ...prev.logs].slice(0, 50)
    }));
  };

  const handleAddBrand = async (name: string) => {
      if (!name) return;
      try {
          await SupabaseService.addBrand(name);
          setBrandsList(prev => [...prev, name].sort());
          addLog(`Бренд "${name}" добавлен в базу.`);
          setToast({ message: `Бренд ${name} добавлен`, type: 'success' });
      } catch (e: any) {
          console.error(e);
          setToast({ message: 'Ошибка добавления бренда: ' + e.message, type: 'error' });
      }
  };

  // Stats Logic (Sliding Window)
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      setRequestHistory(currentHistory => {
        const recentHistory = currentHistory.filter(item => item.timestamp > oneMinuteAgo);
        
        const currentRpm = recentHistory.length;
        const currentTpm = recentHistory.reduce((sum, item) => sum + item.tokens, 0);
        
        const oldest = recentHistory[0];
        const resetIn = oldest ? Math.ceil((oldest.timestamp + 60000 - now) / 1000) : 0;

        setDisplayStats(prev => ({
          ...prev,
          rpm: currentRpm,
          tpm: currentTpm,
          resetIn: Math.max(0, resetIn)
        }));

        return recentHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // Валидация: бренд должен быть в списке (если список загружен)
  // Если бренда нет в списке, оператор должен его добавить через PartsList
  const isFormValid = parts.length > 0 && parts.every(p => 
      p.name && 
      p.brand && 
      p.brand.trim() !== '' && 
      (brandsList.length === 0 || brandsList.some(b => b.toLowerCase() === p.brand?.trim().toLowerCase()))
  );

  const handleCreateOrder = async () => {
    if (!currentUser) return;

    if (!isFormValid) {
        setToast({ message: 'Заполните все обязательные поля (Бренд, Наименование)', type: 'error' });
        return;
    }
    
    if (!orderInfo.clientPhone) {
        setToast({ message: 'Укажите телефон клиента (хотя бы примерно)', type: 'error' });
        return;
    }

    setIsSaving(true);
    try {
        const itemsForDb = parts.map(p => ({
            name: p.name,
            quantity: p.quantity,
            comment: `${orderInfo.emailSubject ? `[Тема: ${orderInfo.emailSubject}] ` : ''}Бренд: ${p.brand || '-'}, Арт: ${p.article || '-'}`,
            category: 'Оригинал'
        }));

        const orderId = await SupabaseService.createOrder(
            'VIN-UNKNOWN',
            itemsForDb,
            orderInfo.clientName || 'Не указано',
            { 
                brand: 'Не указано', 
                model: 'Не указано', 
                year: '' 
            },
            orderInfo.clientPhone,
            currentUser.token 
        );

        setToast({ message: `Заказ №${orderId} создан успешно`, type: 'success' });
        addLog(`Заказ №${orderId} создан.`);
        setRefreshTrigger(prev => prev + 1);
        
        // Reset form
        setParts([{ id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
        setOrderInfo({
            deadline: '', region: '', city: '', email: '', emailSubject: '', clientName: '', clientPhone: ''
        });

    } catch (e: any) {
        console.error(e);
        setToast({ message: 'Ошибка создания: ' + e.message, type: 'error' });
        addLog(`Ошибка создания заявки: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleNavigateToOrder = (orderId: string) => {
      // Logic to find and scroll to order in archive if needed
      // For now just logging
      addLog(`Переход к чату заказа #${orderId}`);
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
              <Toast message={toast.message} onClose={() => setToast(null)} type={toast.type} duration={2000} />
          </div>
      )}
      
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
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10">
                <OrderInfoForm orderInfo={orderInfo} setOrderInfo={setOrderInfo} />
                
                <PartsList 
                    parts={parts} 
                    setParts={setParts} 
                    brandsList={brandsList}
                    onAddBrand={handleAddBrand}
                />
                
                <AiAssistant 
                    onImport={(newParts) => {
                        if (parts.length === 1 && !parts[0].name) {
                            setParts(newParts);
                        } else {
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
                    brandsList={brandsList}
                    isFormValid={isFormValid} // Pass validity
                />
            </div>

            {/* Orders List Section */}
            <OperatorOrdersList refreshTrigger={refreshTrigger} ownerToken={currentUser?.token} />

          </div>
        </main>

        <SystemStatusSidebar 
            logs={displayStats.logs} 
            requestHistory={requestHistory} 
            displayStats={displayStats} 
        />
      </div>

      <GlobalChatWindow 
        isOpen={isGlobalChatOpen}
        onClose={() => setIsGlobalChatOpen(false)}
        currentUserRole="OPERATOR"
        currentUserName={currentUser?.name}
        onNavigateToOrder={handleNavigateToOrder}
      />
    </div>
  );
};