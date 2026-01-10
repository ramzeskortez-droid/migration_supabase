import React, { useState, useEffect, useCallback } from 'react';
import { OperatorHeader } from './OperatorHeader';
import { SystemStatusSidebar } from './SystemStatusSidebar';
import { OrderInfoForm } from './OrderInfoForm';
import { OrderFilesUpload } from './OrderFilesUpload';
import { PartsList } from './PartsList';
import { AiAssistant } from './AiAssistant';
import { SystemStatusHorizontal } from './SystemStatusHorizontal';
import { OperatorAuthModal } from './OperatorAuthModal';
import { OperatorOrdersList } from './OperatorOrdersList';
import { GlobalChatWindow } from '../shared/GlobalChatWindow';
import { EmailWidget } from './EmailWidget';
import { OrderInfo, Part, LogHistory, DisplayStats } from './types';
import { SupabaseService } from '../../services/supabaseService';
import { Toast } from '../shared/Toast';
import { ChatNotification } from '../shared/ChatNotification';
import { AppUser } from '../../types';
import { Search, Mail, ChevronRight } from 'lucide-react';

export const OperatorInterface: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [isEmailOpen, setIsEmailOpen] = useState(false); // Почта свернута по умолчанию

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

  const [orderFiles, setOrderFiles] = useState<{name: string, url: string, size?: number, type?: string}[]>([]);

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
  
  const listRef = React.useRef<HTMLDivElement>(null);

  const handleMessageRead = useCallback((count: number) => {
      setUnreadChatCount(prev => Math.max(0, prev - count));
  }, []);

  const handleCloseToast = useCallback(() => setToast(null), []);

  // Realtime Notifications
  useEffect(() => {
      if (!currentUser) return;

      const channel = SupabaseService.subscribeToUserChats((payload) => {
          const msg = payload.new;
          
          if (msg.recipient_name === 'ADMIN' && msg.sender_role === 'SUPPLIER') {
              setUnreadChatCount(prev => prev + 1);
              if (!isGlobalChatOpen) {
                  setChatNotifications(prev => [...prev, msg].slice(-3));
              }
          }
      }, `operator-notifications-${currentUser.id}`);

      return () => { SupabaseService.unsubscribeFromChat(channel); };
  }, [currentUser, isGlobalChatOpen]);

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
                      localStorage.removeItem('operatorToken');
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
          await SupabaseService.addBrand(name, currentUser?.name || 'Operator');
          addLog(`Бренд "${name}" добавлен в базу.`);
          setToast({ message: `Бренд ${name} добавлен`, type: 'success' });
      } catch (e: any) {
          if (e.code === '23505') {
             setToast({ message: `Бренд ${name} уже существует`, type: 'info' });
          } else {
             console.error(e);
             setToast({ message: 'Ошибка добавления бренда: ' + e.message, type: 'error' });
          }
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

  // Валидация: проверяем заполненность основных полей и валидность брендов.
  const isFormValid = parts.length > 0 && 
                     parts.every(p => p.name?.trim() && p.brand?.trim()) && 
                     isBrandsValid;

  const handleCreateOrder = async () => {
    if (!currentUser) return;

    if (orderInfo.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderInfo.clientEmail)) {
        setToast({ message: 'Некорректный формат почты клиента (требуется @ и .)', type: 'error' });
        return;
    }

    if (!isFormValid) {
        setToast({ message: 'Заполните обязательные поля: Бренд (должен быть зеленым) и Наименование', type: 'error' });
        return;
    }
    
    setIsSaving(true);
    try {
        const newBrands = parts
            .filter(p => p.isNewBrand && p.brand?.trim())
            .map(p => p.brand.trim());

        if (newBrands.length > 0) {
            for (const bName of newBrands) {
                try {
                    await SupabaseService.addBrand(bName, currentUser.name);
                } catch (e) {}
            }
        }

        const itemsForDb = parts.map((p, index) => {
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
            orderInfo.deadline || (() => {
                const date = new Date();
                date.setDate(date.getDate() + 3);
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            })(),
            orderInfo.clientEmail,
            orderInfo.city,
            orderFiles
        );

        setToast({ message: `Заказ №${orderId} создан успешно`, type: 'success' });
        addLog(`Заказ №${orderId} создан.`);
        setRefreshTrigger(prev => prev + 1);
        
        // Reset form
        setParts([{ id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
        setOrderFiles([]);
        setOrderInfo({
            deadline: '',
            region: '', city: '', email: '', clientEmail: '', emailSubject: '', clientName: '', clientPhone: ''
        });

    } catch (e: any) {
        console.error(e);
        setToast({ message: 'Ошибка создания: ' + e.message, type: 'error' });
        addLog(`Ошибка создания заявки: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  const handleNavigateToOrder = async (orderId: string) => {
      try {
          const { status_admin } = await SupabaseService.getOrderStatus(orderId);
          
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
          
          setTimeout(() => {
              setScrollToId(null);
              listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 500);
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

  const handleRemoveItemFile = (fileUrl: string) => {
      setParts(prevParts => prevParts.map(part => {
          const newFiles = (part.itemFiles || []).filter(f => f.url !== fileUrl);
          // Если удалили файл, который был превью, обновляем photoUrl
          const newPhotoUrl = newFiles.length > 0 ? newFiles[0].url : (part.photoUrl === fileUrl ? '' : part.photoUrl);
          
          return {
              ...part,
              itemFiles: newFiles,
              photoUrl: newPhotoUrl
          };
      }));
      addLog(`Файл позиции удален.`);
  };

  const handleQuickFill = async () => {
      const names = ['Иван', 'Петр', 'Алексей', 'Сергей', 'Максим'];
      const cities = ['Москва', 'СПб', 'Екб', 'Казань'];
      const subjects = ['Запчасти на ТО', 'Срочный заказ', 'Детали подвески', 'Расходники'];
      
      const randomName = names[Math.floor(Math.random() * names.length)];
      const randomCity = cities[Math.floor(Math.random() * cities.length)];
      const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
      const randomPhone = `+7 (9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-${Math.floor(10 + Math.random() * 90)}`;
      
      setOrderInfo({
          deadline: new Date().toISOString().split('T')[0],
          region: 'РФ',
          city: randomCity,
          email: '',
          clientEmail: `client${Math.floor(Math.random() * 1000)}@mail.ru`,
          emailSubject: randomSubject,
          clientName: randomName,
          clientPhone: randomPhone
      });

      // Fetch real brands from DB
      const dbBrands = await SupabaseService.getBrandsList();
      const safeBrands = dbBrands.length > 0 ? dbBrands : ['Toyota', 'BMW', 'Mercedes'];

      // Add exactly 2 random parts
      const partsPool = [
          'Фильтр масляный', 'Колодки тормозные', 'Свеча зажигания', 'Амортизатор', 
          'Рычаг подвески', 'Подшипник ступицы', 'Фара правая', 'Бампер передний'
      ];
      
      const newParts: Part[] = [];
      for(let i=0; i<2; i++) {
          const partName = partsPool[Math.floor(Math.random() * partsPool.length)];
          const brandName = safeBrands[Math.floor(Math.random() * safeBrands.length)];
          const randomArticle = Math.random().toString(36).substring(2, 10).toUpperCase();

          newParts.push({
              id: Date.now() + i,
              name: partName,
              brand: brandName,
              article: randomArticle,
              uom: 'шт',
              quantity: Math.floor(Math.random() * 4) + 1
          });
      }
      
      setParts(newParts);
      setIsBrandsValid(true); // Since they are from DB, they are valid
      setToast({ message: 'Данные заполнены (2 позиции)', type: 'success' });
  };

  if (isAuthChecking) {
      return <div className="h-screen bg-slate-50 flex items-center justify-center text-slate-400 font-black uppercase text-xs tracking-widest">Загрузка профиля...</div>;
  }

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden relative">
      {!currentUser && <OperatorAuthModal onLogin={handleLogin} />}
      
      {toast && (
          <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
              <Toast message={toast.message} onClose={handleCloseToast} type={toast.type as any} duration={1000} />
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
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10">
                <OrderInfoForm orderInfo={orderInfo} setOrderInfo={setOrderInfo} onQuickFill={handleQuickFill} />
                <OrderFilesUpload 
                    files={orderFiles} 
                    setFiles={setOrderFiles} 
                    onLog={addLog} 
                    itemFiles={parts.flatMap((p, idx) => {
                        const files = p.itemFiles || (p.photoUrl ? [{name: 'Фото', url: p.photoUrl, type: 'image/jpeg'}] : []);
                        return files.map(f => ({ file: f, label: `Поз. ${idx + 1}` }));
                    })}
                    onRemoveItemFile={handleRemoveItemFile}
                />
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
                    isFormValid={isFormValid} 
                />
                <SystemStatusHorizontal displayStats={displayStats} />
            </div>

            <div className="space-y-4" ref={listRef}>
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
