import React, { useState, useEffect } from 'react';
import { OperatorHeader } from './operator/OperatorHeader';
import { SystemStatusSidebar } from './operator/SystemStatusSidebar';
import { OrderInfoForm } from './operator/OrderInfoForm';
import { PartsList } from './operator/PartsList';
import { AiAssistant } from './operator/AiAssistant';
import { OrderInfo, Part, LogHistory, DisplayStats } from './operator/types';
import { SupabaseService } from '../services/supabaseService';
import { Loader2, Save } from 'lucide-react';
import { Toast } from './shared/Toast'; // Assuming Toast exists in shared

export const OperatorInterface: React.FC = () => {
  // State
  const [parts, setParts] = useState<Part[]>([
    { id: 1, name: '', article: '', brand: '', uom: 'шт', type: 'Оригинал', quantity: 1 }
  ]);
  
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    deadline: '',
    region: '',
    city: '',
    email: '',
    clientName: '',
    clientPhone: '',
    carBrand: '',
    carModel: '',
    carYear: '',
    vin: ''
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
  const [toast, setToast] = useState<{message: string, type?: 'success' | 'error'} | null>(null);

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    setDisplayStats(prev => ({
      ...prev,
      logs: [`[${time}] ${message}`, ...prev.logs].slice(0, 50)
    }));
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

  const handleCreateOrder = async () => {
    if (parts.length === 0 || !parts[0].name) {
        setToast({ message: 'Добавьте хотя бы одну позицию', type: 'error' });
        return;
    }
    if (!orderInfo.clientPhone) {
        setToast({ message: 'Укажите телефон клиента', type: 'error' });
        return;
    }

    setIsSaving(true);
    try {
        const itemsForDb = parts.map(p => ({
            name: p.name,
            quantity: p.quantity,
            comment: `Бренд: ${p.brand || '-'}, Арт: ${p.article || '-'}`,
            category: p.type
        }));

        await SupabaseService.createOrder(
            orderInfo.vin || 'VIN-UNKNOWN',
            itemsForDb,
            orderInfo.clientName || 'Не указано',
            { 
                brand: orderInfo.carBrand || 'Не указано', 
                model: orderInfo.carModel || 'Не указано', 
                year: orderInfo.carYear || '' 
            },
            orderInfo.clientPhone
        );

        setToast({ message: 'Заявка успешно создана!', type: 'success' });
        addLog(`Заявка создана успешно.`);
        
        // Reset form
        setParts([{ id: Date.now(), name: '', article: '', brand: '', uom: 'шт', type: 'Оригинал', quantity: 1 }]);
        setOrderInfo({
            deadline: '', region: '', city: '', email: '', clientName: '', clientPhone: '',
            carBrand: '', carModel: '', carYear: '', vin: ''
        });

    } catch (e: any) {
        console.error(e);
        setToast({ message: 'Ошибка создания: ' + e.message, type: 'error' });
        addLog(`Ошибка создания заявки: ${e.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {toast && <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[100]"><Toast message={toast.message} onClose={() => setToast(null)} /></div>}
      
      <OperatorHeader />

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10">
            
            <OrderInfoForm orderInfo={orderInfo} setOrderInfo={setOrderInfo} />
            
            <PartsList parts={parts} setParts={setParts} />
            
            <AiAssistant 
                onImport={(newParts) => {
                    // If current list is empty/initial, replace it
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
            />

            {/* Save Button */}
            <div className="pt-6 border-t border-slate-100 flex justify-end">
                <button 
                    onClick={handleCreateOrder}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-8 rounded-xl shadow-lg shadow-indigo-200 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5"
                >
                    {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                    СОЗДАТЬ ЗАЯВКУ
                </button>
            </div>

          </div>
        </main>

        <SystemStatusSidebar 
            logs={displayStats.logs} 
            requestHistory={requestHistory} 
            displayStats={displayStats} 
        />
      </div>
    </div>
  );
};
