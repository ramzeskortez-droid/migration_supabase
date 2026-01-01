import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order, OrderStatus } from '../types';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { ClientAuthModal } from './client/ClientAuthModal';
import { ClientProfileHeader } from './client/ClientProfileHeader';
import { NewOrderForm } from './client/NewOrderForm';
import { ClientOrdersList } from './client/ClientOrdersList';

export const ClientInterface: React.FC = () => {
  const [clientAuth, setClientAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('client_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(() => !localStorage.getItem('client_auth'));
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [refuseModalOrder, setRefuseModalOrder] = useState<Order | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);
  };

  const fetchOrders = React.useCallback(async () => {
    if (!clientAuth) return;
    setIsSyncing(true);
    try {
      const { data, count } = await SupabaseService.getOrders(
          currentPage,
          itemsPerPage,
          sortConfig?.key || 'id',
          sortConfig?.direction || 'desc',
          searchQuery,
          undefined,
          clientAuth.phone
      );
      setOrders(data);
      setTotalOrders(count);
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  }, [clientAuth, currentPage, itemsPerPage, sortConfig, searchQuery]);

  useEffect(() => { 
    if (clientAuth) {
        fetchOrders(); 
        const interval = setInterval(() => fetchOrders(), 15000);
        return () => clearInterval(interval);
    }
  }, [clientAuth, fetchOrders]);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('client_auth');
    setClientAuth(null);
    setOrders([]); 
    setShowAuthModal(true);
  };

  const handleLogin = (name: string, phone: string) => {
    const authData = { name: name.trim().toUpperCase(), phone: phone.trim() };
    setClientAuth(authData);
    localStorage.setItem('client_auth', JSON.stringify(authData));
    setShowAuthModal(false);
  };

  const handleCreateOrder = async (vin: string, car: any, items: any[]) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
        await SupabaseService.createOrder(vin || 'N/A', items, clientAuth.name, car, clientAuth.phone);
        showToast(`Заказ создан`);
        fetchOrders();
    } catch (err) { 
        alert("Ошибка при создании заказа."); 
    } finally { 
        setIsSubmitting(false); 
    }
  };

  const handleConfirmPurchase = async (orderId: string) => {
    if (isConfirming) return;
    setIsConfirming(orderId);
    try {
      await SupabaseService.confirmPurchase(orderId);
      showToast("🎉 Выбор подтвержден!");
      fetchOrders();
    } catch (e) { alert('Ошибка'); }
    finally { setIsConfirming(null); }
  };

  const confirmRefusal = async () => {
    if (!refuseModalOrder) return;
    try { 
        await SupabaseService.refuseOrder(refuseModalOrder.id, "Отмена клиентом", 'CLIENT'); 
        showToast(`Заказ аннулирован`); 
        fetchOrders(); 
    } catch (e) { alert('Ошибка'); } 
    finally { setRefuseModalOrder(null); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 relative">
      {successToast && (
          <div className="fixed top-6 right-6 z-[250] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700 animate-in slide-in-from-top-4">
              <CheckCircle2 className="text-emerald-400" size={20} />
              <div><p className="text-[10px] font-black uppercase text-emerald-400">Успешно</p><p className="text-xs font-bold">{successToast.message}</p></div>
          </div>
      )}

      {refuseModalOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4" onClick={() => setRefuseModalOrder(null)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={24}/></div>
                      <div><h3 className="text-lg font-black uppercase text-slate-900">Отказаться?</h3><p className="text-xs text-slate-500 font-bold mt-1">Это отменит заказ.</p></div>
                      <div className="grid grid-cols-2 gap-3 w-full mt-2">
                          <button onClick={() => setRefuseModalOrder(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase">Нет</button>
                          <button onClick={confirmRefusal} className="py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase shadow-lg hover:bg-red-700">Да</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      <ClientAuthModal isOpen={showAuthModal} onLogin={handleLogin} />

      {clientAuth && (
        <>
            <ClientProfileHeader 
                clientName={clientAuth.name} 
                clientPhone={clientAuth.phone} 
                onLogout={handleLogout} 
            />

            <NewOrderForm 
                clientName={clientAuth.name}
                clientPhone={clientAuth.phone}
                onSubmit={handleCreateOrder}
                isSubmitting={isSubmitting}
            />

            <ClientOrdersList 
                orders={orders}
                totalOrders={totalOrders}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                isSyncing={isSyncing}
                onRefresh={fetchOrders}
                expandedId={expandedId}
                setExpandedId={setExpandedId}
                currentPage={currentPage}
                itemsPerPage={itemsPerPage}
                setCurrentPage={setCurrentPage}
                setItemsPerPage={setItemsPerPage}
                sortConfig={sortConfig}
                setSortConfig={setSortConfig}
                onConfirmPurchase={handleConfirmPurchase}
                onRefuse={(e, order) => setRefuseModalOrder(order)}
                isConfirming={isConfirming}
            />
        </>
      )}
    </div>
  );
};