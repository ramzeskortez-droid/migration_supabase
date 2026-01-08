import React, { useState } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order } from '../types';
import { ClientAuthModal } from './client/ClientAuthModal';
import { ClientProfileHeader } from './client/ClientProfileHeader';
import { NewOrderForm } from './client/NewOrderForm';
import { ClientOrdersList } from './client/ClientOrdersList';
import { Toast } from './shared/Toast';
import { ConfirmationModal } from './shared/ConfirmationModal';
import { useClientOrders } from '../hooks/useClientOrders';

export const ClientInterface: React.FC = () => {
  // --- Auth State ---
  const [clientAuth, setClientAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('client_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (e) { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(() => !localStorage.getItem('client_auth'));

  // --- Data & Logic Hook ---
  const { 
    orders, totalOrders, isSyncing, refresh,
    activeTab, setActiveTab,
    searchQuery, setSearchQuery,
    currentPage, setCurrentPage,
    itemsPerPage, setItemsPerPage,
    sortConfig, setSortConfig
  } = useClientOrders(clientAuth);

  // --- UI State ---
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [refuseModalOrder, setRefuseModalOrder] = useState<Order | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false); 

  // --- Handlers ---
  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
  };

  const handleLogout = () => {
    localStorage.removeItem('client_auth');
    setClientAuth(null);
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
        const newOrderId = await SupabaseService.createOrder(vin || 'N/A', items, clientAuth.name, car, clientAuth.phone);
        showToast(`Заказ №${newOrderId} создан`);
        refresh();
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
      refresh();
    } catch (e) { alert('Ошибка'); }
    finally { setIsConfirming(null); }
  };

  const confirmRefusal = async () => {
    if (!refuseModalOrder) return;
    try { 
        await SupabaseService.refuseOrder(refuseModalOrder.id, "Отмена клиентом", 'CLIENT'); 
        showToast(`Заказ аннулирован`); 
        refresh(); 
    } catch (e) { alert('Ошибка'); } 
    finally { setRefuseModalOrder(null); }
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 relative">
      {/* Notifications */}
      {successToast && (
        <Toast 
          message={successToast.message} 
          onClose={() => setSuccessToast(null)} 
        />
      )}

      {/* Shared Modals */}
      <ConfirmationModal 
        isOpen={!!refuseModalOrder}
        title="Отказаться?"
        message="Это действие отменит заказ навсегда."
        confirmLabel="Да, отказаться"
        cancelLabel="Нет, оставить"
        variant="danger"
        onConfirm={confirmRefusal}
        onCancel={() => setRefuseModalOrder(null)}
      />

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
                onRefresh={refresh}
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