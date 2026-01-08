import React, { useState } from 'react';
import { ChevronDown, FileText, X, Check, AlertCircle, Package, CheckCircle, CreditCard, Truck } from 'lucide-react';

type OrderStatus = 
  | 'new'
  | 'quote_sent'
  | 'ready_to_buy'
  | 'supplier_confirmation'
  | 'awaiting_payment'
  | 'in_transit'
  | 'completed'
  | 'cancelled'
  | 'rejected';

interface StatusConfig {
  id: OrderStatus;
  label: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  isFinal?: boolean;
}

interface SupplierRow {
  id: number;
  name: string;
  isWinner?: boolean;
  price: string;
  quantity: string;
  weight: string;
  period: string;
  delivery: string;
  sale: string;
  currency: string;
  comment: string;
}

export default function OrderDetails() {
  const [currentStatus, setCurrentStatus] = useState<OrderStatus>('quote_sent');
  const [showNotification, setShowNotification] = useState(false);
  const [notificationText, setNotificationText] = useState('');

  const statuses: StatusConfig[] = [
    {
      id: 'new',
      label: 'Новый / В обработке',
      icon: <AlertCircle size={16} />,
      color: '#3b82f6',
      bgColor: '#dbeafe'
    },
    {
      id: 'quote_sent',
      label: 'КП отправлено',
      icon: <Package size={16} />,
      color: '#8b5cf6',
      bgColor: '#ede9fe'
    },
    {
      id: 'ready_to_buy',
      label: 'Готов купить',
      icon: <CheckCircle size={16} />,
      color: '#10b981',
      bgColor: '#d1fae5'
    },
    {
      id: 'supplier_confirmation',
      label: 'Подтверждение от поставщика',
      icon: <Check size={16} />,
      color: '#f59e0b',
      bgColor: '#fef3c7'
    },
    {
      id: 'awaiting_payment',
      label: 'Ожидает оплаты',
      icon: <CreditCard size={16} />,
      color: '#ec4899',
      bgColor: '#fce7f3'
    },
    {
      id: 'in_transit',
      label: 'В пути',
      icon: <Truck size={16} />,
      color: '#14b8a6',
      bgColor: '#ccfbf1'
    },
    {
      id: 'completed',
      label: 'Выполнен',
      icon: <Check size={16} />,
      color: '#10b981',
      bgColor: '#d1fae5',
      isFinal: true
    }
  ];

  const finalStatuses: StatusConfig[] = [
    {
      id: 'cancelled',
      label: 'Аннулирован',
      icon: <X size={16} />,
      color: '#6b7280',
      bgColor: '#f3f4f6',
      isFinal: true
    },
    {
      id: 'rejected',
      label: 'Отказ',
      icon: <X size={16} />,
      color: '#ef4444',
      bgColor: '#fee2e2',
      isFinal: true
    }
  ];

  const allStatuses = [...statuses, ...finalStatuses];

  const suppliers: SupplierRow[] = [
    {
      id: 2,
      name: 'ПОСТАВЩИК 2',
      isWinner: true,
      price: '1 CNY',
      quantity: '1 шт',
      weight: '11 кг',
      period: '1 н.',
      delivery: '1000 ₽',
      sale: '1',
      currency: 'CNY',
      comment: 'Комментарий (feedback)...'
    },
    {
      id: 1,
      name: 'ПОСТАВЩИК 1',
      price: '1 CNY',
      quantity: '1 шт',
      weight: '1 кг',
      period: '1 н.',
      delivery: '---',
      sale: '1',
      currency: 'CNY',
      comment: 'Комментарий (feedback)...'
    },
    {
      id: 333333,
      name: '333333',
      price: '1 CNY',
      quantity: '1 шт',
      weight: '1 кг',
      period: '1 н.',
      delivery: '---',
      sale: '1',
      currency: 'CNY',
      comment: 'Комментарий (feedback)...'
    }
  ];

  const getCurrentStatusIndex = (): number => {
    return statuses.findIndex(s => s.id === currentStatus);
  };

  const getCurrentStatusConfig = (): StatusConfig | undefined => {
    return allStatuses.find(s => s.id === currentStatus);
  };

  const isStatusCompleted = (statusId: OrderStatus): boolean => {
    const currentIndex = getCurrentStatusIndex();
    const statusIndex = statuses.findIndex(s => s.id === statusId);
    return statusIndex !== -1 && statusIndex < currentIndex;
  };

  const isStatusActive = (statusId: OrderStatus): boolean => {
    return statusId === currentStatus;
  };

  const showNotificationMessage = (text: string) => {
    setNotificationText(text);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  const handleStatusChange = (newStatus: OrderStatus) => {
    const statusConfig = allStatuses.find(s => s.id === newStatus);
    setCurrentStatus(newStatus);
    showNotificationMessage(`Статус изменен на: ${statusConfig?.label}`);
  };

  const handleNextStep = () => {
    const currentIndex = getCurrentStatusIndex();
    
    if (currentIndex === -1) return;
    
    if (currentIndex < statuses.length - 1) {
      const nextStatus = statuses[currentIndex + 1];
      setCurrentStatus(nextStatus.id);
      showNotificationMessage(`Статус изменен на: ${nextStatus.label}`);
    } else {
      showNotificationMessage('Заказ уже выполнен');
    }
  };

  const handleFinalStatus = (statusId: OrderStatus) => {
    const statusConfig = finalStatuses.find(s => s.id === statusId);
    if (statusConfig) {
      setCurrentStatus(statusId);
      showNotificationMessage(`Заказ переведен в статус: ${statusConfig.label}`);
    }
  };

  const getProgressPercentage = (): number => {
    const currentIndex = getCurrentStatusIndex();
    if (currentIndex === -1) return 0;
    return (currentIndex / (statuses.length - 1)) * 100;
  };

  const currentStatusConfig = getCurrentStatusConfig();
  const isFinalStatus = currentStatusConfig?.isFinal;

  return (
    <div className="max-w-[1200px] mx-auto bg-white rounded-2xl border-2 border-indigo-300 shadow-lg overflow-hidden">
      {/* Notification */}
      {showNotification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          background: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          zIndex: 1000,
          animation: 'slideIn 0.3s ease'
        }}>
          <div style={{
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            background: '#10b981',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            ✓
          </div>
          <div style={{ fontSize: '14px', color: '#374151' }}>
            {notificationText}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-white px-6 py-4 flex items-center justify-between border-b border-gray-200">
        <div className="flex items-center gap-6">
          <div className="text-gray-400">1</div>
          <div className="font-semibold">SKODA</div>
          <div className="text-gray-600">OCTAVIA A7</div>
          <div className="text-gray-400">2003</div>
          <div className="text-gray-400 text-sm">TH62CTE4F5C1HRF3</div>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="text-blue-600 font-semibold">КЛИЕНТ № 1</div>
          
          {/* Текущий статус бейдж */}
          {currentStatusConfig && (
            <div 
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full font-semibold text-sm transition-all"
              style={{
                background: currentStatusConfig.bgColor,
                color: currentStatusConfig.color
              }}
            >
              {currentStatusConfig.icon}
              <span>{currentStatusConfig.label}</span>
            </div>
          )}
          
          <div className="text-gray-500">28.12.2025</div>
          <button className="text-gray-400 hover:text-gray-600">
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Order Details Section */}
      <div className="px-6 py-6 bg-gray-50">
        <div className="flex items-center gap-2 mb-4 text-gray-500">
          <FileText className="w-4 h-4" />
          <span className="uppercase tracking-wide text-sm">Детали заказа</span>
        </div>
        
        <div className="grid grid-cols-6 gap-4 text-sm">
          <div>
            <div className="text-gray-500 text-xs mb-1 uppercase">Клиент</div>
            <div className="text-blue-600 font-semibold">КЛИЕНТ № 1</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1 uppercase">Телефон</div>
            <div className="text-gray-900">+7 (999) 111-22-33</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1 uppercase">VIN</div>
            <div className="text-gray-900">TH62CTE4F5C1HRF3</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1 uppercase">Модель</div>
            <div className="text-gray-900 font-semibold">SKODA OCTAVIA A7</div>
          </div>
          <div>
            <div className="text-gray-500 text-xs mb-1 uppercase">Марка</div>
            <div className="text-gray-900 font-semibold">SKODA</div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-500 text-xs mb-1 uppercase">Год</div>
              <div className="text-gray-900 font-semibold">2003</div>
            </div>
            <div>
              <div className="text-gray-500 text-xs mb-1 uppercase">Кузов</div>
              <div className="text-gray-900 font-semibold">СЕДАН</div>
            </div>
          </div>
        </div>
      </div>

      {/* Шкала статусов */}
      {(currentStatus !== 'cancelled' && currentStatus !== 'rejected') && (
        <div className="px-6 py-6 bg-gradient-to-b from-gray-50 to-white border-y border-gray-100">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-6">
            Процесс выполнения заказа
          </div>

          <div className="relative mb-6" style={{ padding: '8px 0' }}>
            {/* Progress Line */}
            <div style={{
              position: 'absolute',
              top: '50%',
              left: '20px',
              right: '20px',
              height: '3px',
              background: '#e5e7eb',
              transform: 'translateY(-50%)',
              zIndex: 0
            }}>
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                height: '100%',
                width: `${getProgressPercentage()}%`,
                background: 'linear-gradient(90deg, #10b981, #059669)',
                transition: 'width 0.4s ease',
                borderRadius: '3px'
              }} />
            </div>

            {/* Status Items */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              position: 'relative',
              zIndex: 1
            }}>
              {statuses.map((status) => {
                const isCompleted = isStatusCompleted(status.id);
                const isActive = isStatusActive(status.id);

                return (
                  <div
                    key={status.id}
                    onClick={() => handleStatusChange(status.id)}
                    className="hover:scale-105"
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <div 
                      className="transition-all"
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '600',
                        fontSize: '14px',
                        border: '3px solid white',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        background: isCompleted ? '#10b981' : isActive ? status.color : '#e5e7eb',
                        color: isCompleted || isActive ? 'white' : '#9ca3af',
                        transform: isActive ? 'scale(1.15)' : 'scale(1)'
                      }}
                    >
                      {isCompleted ? <Check size={18} /> : status.icon}
                    </div>
                    <div 
                      className="transition-all"
                      style={{
                        marginTop: '12px',
                        fontSize: '11px',
                        fontWeight: isActive ? '600' : '500',
                        color: isActive ? status.color : isCompleted ? '#059669' : '#6b7280',
                        textAlign: 'center',
                        maxWidth: '100px',
                        lineHeight: '1.3'
                      }}
                    >
                      {status.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Кнопка перехода к следующему шагу */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleNextStep}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-semibold text-sm uppercase hover:bg-blue-700 transition-all flex items-center gap-2 shadow-sm hover:shadow-md"
            >
              Перейти к следующему этапу
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* Кнопки финальных статусов */}
            <div className="flex gap-2 ml-auto">
              {finalStatuses.map(status => (
                <button
                  key={status.id}
                  onClick={() => handleFinalStatus(status.id)}
                  disabled={isStatusActive(status.id)}
                  className="px-4 py-2 rounded-lg flex items-center gap-2 transition-all text-sm font-semibold disabled:opacity-50 border-2"
                  style={{
                    background: isStatusActive(status.id) ? status.bgColor : 'white',
                    color: status.color,
                    borderColor: status.color + '40',
                    cursor: isStatusActive(status.id) ? 'default' : 'pointer'
                  }}
                  onMouseEnter={(e) => {
                    if (!isStatusActive(status.id)) {
                      e.currentTarget.style.background = status.bgColor;
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isStatusActive(status.id)) {
                      e.currentTarget.style.background = 'white';
                    }
                  }}
                >
                  {status.icon}
                  {status.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Part Section */}
      <div className="mt-0">
        <div className="bg-gray-900 text-white px-6 py-3 flex items-center gap-4">
          <span className="font-semibold uppercase">Стойка стабилизатора</span>
          <button className="bg-blue-600 px-4 py-1 rounded text-sm hover:bg-blue-700 transition-colors">
            ОРИГИНАЛ
          </button>
          <span className="text-gray-300 text-sm">(1 ШТ)</span>
        </div>

        {/* Table Header */}
        <div className="bg-gray-100 px-6 py-2 grid grid-cols-[200px_100px_80px_80px_80px_80px_120px_100px_100px_50px] gap-2 text-xs text-gray-500 uppercase">
          <div>Поставщик</div>
          <div>Цена</div>
          <div>Шт</div>
          <div>Вес</div>
          <div>Срок</div>
          <div>Фото</div>
          <div>Доставка</div>
          <div>Продажа</div>
          <div>Валюта</div>
          <div></div>
        </div>

        {/* Supplier Rows */}
        {suppliers.map((supplier) => (
          <div
            key={supplier.id}
            className={`px-6 py-4 border-b border-gray-200 ${
              supplier.isWinner ? 'bg-green-50' : 'bg-white'
            }`}
          >
            <div className="grid grid-cols-[200px_100px_80px_80px_80px_80px_120px_100px_100px_50px] gap-2 items-center mb-2">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900">{supplier.name}</span>
                {supplier.isWinner && (
                  <span className="bg-teal-500 text-white px-2 py-0.5 rounded text-xs font-semibold">
                    WINNER
                  </span>
                )}
              </div>
              <div className="text-gray-900">{supplier.price}</div>
              <div className="text-gray-900">{supplier.quantity}</div>
              <div>
                <span className="text-green-600">{supplier.weight.split(' ')[0]}</span>
                <span className="text-gray-500"> {supplier.weight.split(' ')[1]}</span>
              </div>
              <div>
                <span className="text-orange-500">{supplier.period.split(' ')[0]}</span>
                <span className="text-gray-500"> {supplier.period.split(' ')[1]}</span>
              </div>
              <div className="text-gray-900">{/* Photo placeholder */}</div>
              <div>
                <select 
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900"
                  defaultValue={supplier.delivery}
                >
                  <option>{supplier.delivery}</option>
                </select>
              </div>
              <div>
                <input
                  type="text"
                  className="w-full border border-gray-300 rounded px-2 py-1 text-sm text-center text-gray-900"
                  defaultValue={supplier.sale}
                />
              </div>
              <div>
                <select className="w-full border border-gray-300 rounded px-2 py-1 text-sm bg-white text-gray-900">
                  <option>{supplier.currency}</option>
                </select>
              </div>
              <div className="flex justify-center">
                {supplier.isWinner && (
                  <Check className="w-5 h-5 text-green-600" />
                )}
              </div>
            </div>
            <div className="text-gray-400 text-sm pl-2">
              {supplier.comment}
            </div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}