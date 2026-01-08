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

  // ... (keeping previous logic)

  // Валидация: проверяем заполненность основных полей и валидность брендов.
  const isFormValid = parts.length > 0 && 
                     parts.every(p => p.name?.trim() && p.brand?.trim()) && 
                     isBrandsValid &&
                     orderInfo.clientPhone?.trim();

  const handleCreateOrder = async () => {
    if (!currentUser) return;

    if (!isFormValid) {
        setToast({ message: 'Заполните обязательные поля и проверьте бренды (должны быть зелеными)', type: 'error' });
        return;
    }
    
    if (!orderInfo.clientPhone) {
        setToast({ message: 'Укажите телефон клиента', type: 'error' });
        return;
    }

    setIsSaving(true);
    try {
        // Собираем бренды, помеченные как "новые", чтобы добавить их в базу
        const newBrands = parts
            .filter(p => p.isNewBrand && p.brand?.trim())
            .map(p => p.brand.trim());

        if (newBrands.length > 0) {
            for (const bName of newBrands) {
                try {
                    await SupabaseService.addBrand(bName, currentUser.name);
                } catch (e) {
                    // Игнорируем ошибки дублей при массовом добавлении
                }
            }
        }

        const itemsForDb = parts.map((p, index) => {
            // Тему письма сохраняем в комментарий только первой позиции для отображения в списках
            // Остальные комментарии оставляем пустыми
            let comment = '';
            if (index === 0 && orderInfo.emailSubject) {
                comment = `[Тема: ${orderInfo.emailSubject}]`;
            }

            return {
                name: p.name,
                quantity: p.quantity,
                comment: comment, 
                category: 'Оригинал',
                brand: p.brand,
                article: p.article,
                uom: p.uom,
                photoUrl: p.photoUrl
            };
        });

        const orderId = await SupabaseService.createOrder(
            itemsForDb,
            orderInfo.clientName || 'Не указано',
            orderInfo.clientPhone,
            currentUser.id, 
            orderInfo.deadline,
            orderInfo.clientEmail // Pass clientEmail
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

  const handleImportEmail = (text: string) => {
      // Ищем текстовое поле ассистента через DOM или через стейт (если бы он был поднят)
      // В данном случае, самый простой способ для интеграции — передать текст в AiAssistant
      // Мы можем просто добавить лог и уведомление, а текст передать через пропс, если AiAssistant поддерживает
      // Но у нас AiAssistant — отдельный компонент со своим внутренним стейтом.
      // Чтобы не переписывать ассистента, мы можем использовать событие или прокинуть стейт.
      // Пока просто выведем в лог и тост, и я обновлю AiAssistant, чтобы он умел принимать внешний текст.
      setToast({ message: 'Текст письма передан в ассистент', type: 'info' });
      addLog('Импорт текста из почты...');
      
      // Чтобы это заработало мгновенно, я создам кастомное событие
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
            <OperatorOrdersList refreshTrigger={refreshTrigger} ownerId={currentUser?.id} />

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
