import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetService } from '../services/sheetService';
import { Order, OrderStatus, PartCategory } from '../types';
import { Pagination } from './Pagination';
import { POPULAR_BRANDS, ALL_BRANDS } from '../constants/cars';
import { 
  Send, Plus, Trash2, Zap, CheckCircle2, Car, MoreHorizontal, Calculator, Search, Loader2, ChevronDown, ShoppingCart, Archive, UserCircle2, LogOut, ShieldCheck, Phone, X, Calendar, Clock, Hash, Package, Ban, RefreshCw, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown, FileText,
  Receipt,
  Truck,
  CreditCard
} from 'lucide-react';

// --- DATA CONSTANTS ---

const FULL_BRAND_SET = new Set([...POPULAR_BRANDS, ...ALL_BRANDS]);

// Demo Data
const DEMO_ITEMS_POOL = [
    { name: "Фильтр масляный", category: "Оригинал" },
    { name: "Колодки передние", category: "Аналог" },
    { name: "Бампер передний", category: "Б/У" },
    { name: "Свеча зажигания", category: "Оригинал" },
    { name: "Рычаг подвески", category: "Аналог" },
    { name: "Фара левая LED", category: "Б/У" },
    { name: "Масло 5W30 5л", category: "Оригинал" },
    { name: "Диск тормозной", category: "Аналог" },
    { name: "Радиатор охлаждения", category: "Аналог" },
    { name: "Стойка стабилизатора", category: "Оригинал" }
];

// Helper to generate full VIN
const generateVin = (prefix: string) => {
    const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    let result = prefix;
    while (result.length < 17) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
};

const DEMO_CARS = [
    { brand: "BMW", model: "X5 G05", prefix: "WBA" },
    { brand: "Toyota", model: "Camry V70", prefix: "JT1" },
    { brand: "Kia", model: "Rio 4", prefix: "Z94" },
    { brand: "Mercedes-Benz", model: "E-Class W213", prefix: "WDB" },
    { brand: "Volkswagen", model: "Tiguan II", prefix: "XW8" },
    { brand: "Hyundai", model: "Solaris", prefix: "X7M" },
    { brand: "Lexus", model: "RX 350", prefix: "JTJ" },
    { brand: "Skoda", model: "Octavia A7", prefix: "TMB" }
];

const STATUS_STEPS = [
  'В обработке',
  'КП готово', 
  'Готов купить',
  'Подтверждение от поставщика',
  'Ожидает оплаты',
  'В пути',
  'Выполнен'
];

const STATUS_CONFIG: Record<string, { color: string, bg: string, border: string }> = {
  'В обработке': { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  'КП отправлено': { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  'КП готово': { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
  'Готов купить': { color: 'text-emerald-600', bg: 'bg-emerald-100', border: 'border-emerald-200' },
  'Подтверждение от поставщика': { color: 'text-indigo-600', bg: 'bg-indigo-100', border: 'border-indigo-200' },
  'Ожидает оплаты': { color: 'text-purple-600', bg: 'bg-purple-100', border: 'border-purple-200' },
  'В пути': { color: 'text-blue-600', bg: 'bg-blue-100', border: 'border-blue-200' },
  'Выполнен': { color: 'text-teal-600', bg: 'bg-teal-100', border: 'border-teal-200' },
  'Аннулирован': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' },
  'Отказ': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-200' }
};

export const ClientInterface: React.FC = () => {
  const [clientAuth, setClientAuth] = useState(() => {
    try {
      const saved = localStorage.getItem('client_auth');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      console.error("Auth parse error", e);
      return null;
    }
  });
  const [showAuthModal, setShowAuthModal] = useState(() => {
    try {
       return !localStorage.getItem('client_auth');
    } catch { return true; }
  });
  const [tempAuth, setTempAuth] = useState({ name: '', phone: '' });
  const [phoneFlash, setPhoneFlash] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [vin, setVin] = useState('');
  const [car, setCar] = useState({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' });
  const [items, setItems] = useState([{ name: '', quantity: 1, color: '', category: 'Оригинал' as PartCategory, refImage: '' }]);
  
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const brandListRef = useRef<HTMLDivElement>(null);
  const brandInputRef = useRef<HTMLInputElement>(null);

  const [orders, setOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);
  const [isConfirming, setIsConfirming] = useState<string | null>(null);

  const [refuseModalOrder, setRefuseModalOrder] = useState<Order | null>(null);
  
  const [vanishingIds, setVanishingIds] = useState<Set<string>>(new Set());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [validationAttempted, setValidationAttempted] = useState(false);
  const [showValidationHighlight, setShowValidationHighlight] = useState(false); 
  const [isSubmitting, setIsSubmitting] = useState(false); 

  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const [debugRawData, setDebugRawData] = useState<any[]>([]);
  const [forceShowAll, setForceShowAll] = useState(false);
  const [localOrderIds, setLocalOrderIds] = useState<Set<string>>(() => {
      try {
        const saved = localStorage.getItem('my_created_order_ids');
        return saved ? new Set(JSON.parse(saved)) : new Set();
      } catch (e) {
        return new Set();
      }
  });

  const trackLocalOrder = (id: string) => {
      setLocalOrderIds(prev => {
          const next = new Set(prev).add(String(id));
          localStorage.setItem('my_created_order_ids', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);
  };

  const handleLogout = () => {
    localStorage.removeItem('client_auth');
    setClientAuth(null);
    setOrders([]); 
    setShowAuthModal(true);
    setVin('');
    setCar({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' });
    setItems([{ name: '', quantity: 1, color: '', category: 'Оригинал' as PartCategory, refImage: '' }]);
  };

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempAuth.name.trim()) return;
    if (!isPhoneValid(tempAuth.phone)) return;
    const authData = { name: tempAuth.name.trim().toUpperCase(), phone: tempAuth.phone.trim() };
    setClientAuth(authData);
    localStorage.setItem('client_auth', JSON.stringify(authData));
    setShowAuthModal(false);
  };

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const fetchOrders = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await SheetService.getOrders(true);
      setDebugRawData(data);
      const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
      const authPhoneNorm = normalizePhone(clientAuth?.phone || '');
      const myOrders = data.filter(o => {
          if (clientAuth?.name) {
              const nameMatch = String(o.clientName || '').trim().toUpperCase() === clientAuth.name.trim().toUpperCase();
              const phoneMatch = authPhoneNorm && normalizePhone(o.clientPhone || '') === authPhoneNorm;
              return nameMatch && phoneMatch;
          }
          return localOrderIds.has(String(o.id));
      });
      setOrders(prev => {
         const optimisticPending = prev.filter(o => o.id.startsWith('temp-'));
         return [...optimisticPending, ...myOrders];
      });
    } catch (e) { console.error(e); }
    finally { setIsSyncing(false); }
  }, [clientAuth, localOrderIds]);

  useEffect(() => { 
    if (clientAuth) {
        fetchOrders(); 
        const interval = setInterval(() => fetchOrders(), 15000);
        return () => clearInterval(interval);
    }
  }, [clientAuth, fetchOrders]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortConfig, activeTab]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (brandListRef.current && !brandListRef.current.contains(event.target as Node) && 
            brandInputRef.current && !brandInputRef.current.contains(event.target as Node)) {
            setIsBrandOpen(false);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatPhoneNumber = (value: string) => {
    let digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    else if (digits[0] !== '7') digits = '7' + digits;
    const match = digits.match(/^(\d{1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!match) return '+7'; 
    let formatted = `+${match[1]}`;
    if (match[2]) formatted += ` (${match[2]}`;
    if (match[3]) formatted += `) ${match[3]}`;
    if (match[4]) formatted += `-${match[4]}`;
    if (match[5]) formatted += `-${match[5]}`;
    return formatted;
  };

  const handleDemoLogin = (num: 1 | 2) => {
    const demo = num === 1 ? { name: 'КЛИЕНТ № 1', phone: '+7 (999) 111-22-33' } : { name: 'КЛИЕНТ № 2', phone: '+7 (999) 444-55-66' };
    setClientAuth(demo); localStorage.setItem('client_auth', JSON.stringify(demo)); setShowAuthModal(false);
  };

  const handleDemoForm = () => {
    const randomCar = DEMO_CARS[Math.floor(Math.random() * DEMO_CARS.length)];
    const randomVin = generateVin(randomCar.prefix);
    const randomYear = Math.floor(Math.random() * (2026 - 2000 + 1) + 2000).toString();
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const shuffledItems = [...DEMO_ITEMS_POOL].sort(() => 0.5 - Math.random());
    const selectedItems = shuffledItems.slice(0, itemCount).map(i => ({ ...i, quantity: Math.floor(Math.random() * 2) + 1, color: '', refImage: '' }));
    setVin(randomVin); setCar({ brand: randomCar.brand, model: randomCar.model, bodyType: 'Седан', year: randomYear, engine: '2.0L', transmission: 'Auto' }); setItems(selectedItems);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'quantity') value = Math.min(1000, Math.max(1, value));
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (isSubmitting) return; if (!isFormValid) { setValidationAttempted(true); return; }
    setIsSubmitting(true);
    const finalCar = { ...car, model: `${car.brand} ${car.model}`.trim() };
    const tempId = `temp-${Date.now()}`;
    const optimisticOrder: any = { id: tempId, vin: vin || 'N/A', clientName: clientAuth.name, car: finalCar, items, status: OrderStatus.OPEN, createdAt: new Date().toLocaleString('ru-RU'), offers: [], readyToBuy: false };
    setOrders(prev => [optimisticOrder, ...prev]);
    setVin(''); setCar({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' }); setItems([{ name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }]);
    try {
        const realId = await SheetService.createOrder(optimisticOrder.vin, items, clientAuth.name, finalCar, clientAuth.phone);
        trackLocalOrder(realId);
        setOrders(prev => prev.map(o => o.id === tempId ? { ...o, id: realId, _recentlyCreated: true } : o));
        setHighlightedId(realId); showToast(`Заказ ${realId} создан`); setTimeout(() => setHighlightedId(null), 2000); 
    } catch (err) { setOrders(prev => prev.filter(o => o.id !== tempId)); alert("Ошибка при создании заказа."); }
    finally { setIsSubmitting(false); }
  };

  const handleConfirmPurchase = async (orderId: string) => {
    if (isConfirming) return;
    setIsConfirming(orderId);
    
    // 1. Optimistic Status Change (Show progress bar update immediately)
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, workflowStatus: 'Готов купить' } : o));
    showToast("🎉 Отличный выбор! Оформляем покупку...");

    // 2. Animation delay (2 seconds) - User sees the green status
    setTimeout(async () => {
        try {
          // 3. Collapse and Highlight
          setExpandedId(null); 
          setHighlightedId(orderId); 
          
          // Switch tab to History to follow the order
          setActiveTab('history');
          
          // 4. API Call in background
          await SheetService.confirmPurchase(orderId);
          
          // 5. Remove highlight after transition
          setTimeout(() => {
            setHighlightedId(null);
            setIsConfirming(null);
            setOrders(prev => prev.map(o => o.id === orderId ? { ...o, readyToBuy: true } : o));
            fetchOrders();
          }, 2000); 
          
        } catch (e) {
          console.error(e);
          alert('Ошибка при подтверждении покупки.');
          setIsConfirming(null);
          fetchOrders(); // Revert
        }
    }, 2000); 
  };

  const openRefuseModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setRefuseModalOrder(order);
  };

  const confirmRefusal = async () => {
    if (!refuseModalOrder) return; const orderId = refuseModalOrder.id; setIsConfirming(orderId); setRefuseModalOrder(null);
    try { await SheetService.refuseOrder(orderId, "Отмена клиентом", 'CLIENT'); showToast(`Заказ ${orderId} аннулирован`); setActiveTab('history'); fetchOrders(); }
    catch (e) { alert('Ошибка при отказе.'); } finally { setIsConfirming(null); }
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let result = orders.filter(o => {
        const status = o.workflowStatus || 'В обработке';
        const isProcessing = status === 'В обработке';
        if (activeTab === 'active' && !isProcessing) return false;
        if (activeTab === 'history' && isProcessing) return false;
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            return String(o.id).toLowerCase().includes(q) || o.vin.toLowerCase().includes(q) || o.car?.model?.toLowerCase().includes(q) || o.items.some(i => i.name.toLowerCase().includes(q));
        }
        return true;
    });
    result.sort((a, b) => {
        const parseD = (d: string) => {
            const [day, month, year] = d.split(/[\.\,]/);
            return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
        };
        return parseD(b.createdAt) - parseD(a.createdAt);
    });
    return result;
  }, [orders, searchQuery, activeTab]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const handleSort = (key: string) => {
      setSortConfig(current => {
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          return { key, direction: 'asc' };
      });
  };

  const getCurrencySymbol = (curr: string = 'RUB') => {
      switch(curr) { case 'USD': return '$'; case 'CNY': return '¥'; default: return '₽'; }
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const isFormValid = useMemo(() => car.brand && FULL_BRAND_SET.has(car.brand) && items.every(i => i.name.trim().length > 0), [car.brand, items]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 relative">
      {successToast && (
          <div className="fixed top-6 right-6 z-[250] animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <div><p className="text-[10px] font-black uppercase text-emerald-400">Успешно</p><p className="text-xs font-bold">{successToast.message}</p></div>
              </div>
          </div>
      )}

      {refuseModalOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setRefuseModalOrder(null)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center"><AlertCircle size={24}/></div>
                      <div><h3 className="text-lg font-black uppercase text-slate-900">Отказаться?</h3><p className="text-xs text-slate-500 font-bold mt-1">Это отменит заказ {refuseModalOrder.id}.</p></div>
                      <div className="grid grid-cols-2 gap-3 w-full mt-2">
                          <button onClick={() => setRefuseModalOrder(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Нет</button>
                          <button onClick={confirmRefusal} className="py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Да</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-[400px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck size={40} /></div>
             <div className="text-center space-y-1"><h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Вход клиента</h2></div>
             <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => handleDemoLogin(1)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 1</button>
                <button onClick={() => handleDemoLogin(2)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 2</button>
             </div>
             <form onSubmit={handleLogin} className="w-full space-y-3">
                 <input value={tempAuth.name} onChange={e => setTempAuth({...tempAuth, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 uppercase" placeholder="ИМЯ" />
                 <input value={tempAuth.phone} onChange={e => setTempAuth({...tempAuth, phone: formatPhoneNumber(e.target.value)})} className={`w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none ${phoneFlash ? 'border-red-500 bg-red-50' : 'border-slate-200'}`} placeholder="+7 (XXX) XXX-XX-XX" />
                 <button type="submit" disabled={!tempAuth.name || !isPhoneValid(tempAuth.phone)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 mt-4 disabled:opacity-50">Создать аккаунт</button>
             </form>
          </div>
        </div>
      )}

      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-row justify-between items-center gap-3">
         <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0"><UserCircle2 size={20} className="md:w-6 md:h-6"/></div>
            <div className="flex flex-col truncate">
                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase truncate">Личный кабинет</span>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase truncate">{clientAuth?.name || 'Гость'}</h3>
                    <div className="flex items-center gap-1 text-slate-400 truncate"><Phone size={10}/> <span className="text-[9px] md:text-[10px] font-bold">{clientAuth?.phone || '...'}</span></div>
                </div>
            </div>
         </div>
         <button onClick={handleLogout} className="p-2 md:p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><LogOut size={16}/></button>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-2"><Car size={14} className="text-slate-500"/><h2 className="text-[11px] font-bold uppercase">Новая заявка</h2></div>
           <button onClick={handleDemoForm} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold border border-indigo-100 uppercase"><Zap size={10}/> Демо заказ</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-[10px] outline-none" placeholder="VIN / Шасси" />
              <input value={clientAuth?.name || ''} readOnly className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold uppercase text-slate-400 outline-none cursor-not-allowed" />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 relative">
                      <input ref={brandInputRef} value={car.brand} onChange={(e) => { setCar({...car, brand: e.target.value}); setIsBrandOpen(true); }} onFocus={() => setIsBrandOpen(true)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold uppercase outline-none" placeholder="Марка..." />
                      {isBrandOpen && (<div ref={brandListRef} className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl">{ALL_BRANDS.filter(b => b.toLowerCase().includes(car.brand.toLowerCase())).map(brand => (<div key={brand} onClick={() => { setCar({...car, brand}); setIsBrandOpen(false); }} className="px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 cursor-pointer uppercase">{brand}</div>))}</div>)}
                  </div>
                  <input value={car.model} onChange={e => setCar({...car, model: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold outline-none uppercase" placeholder="Модель" />
                  <input value={car.year} onChange={e => setCar({...car, year: e.target.value})} className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold text-center" placeholder="Год" />
              </div>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-grow bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2"><input value={item.name} onChange={e => updateItem(idx, 'name', e.target.value)} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none" placeholder="Деталь" /></div>
                    <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value as PartCategory)} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-black uppercase outline-none"><option>Оригинал</option><option>Б/У</option><option>Аналог</option></select>
                    <input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))} className="w-full px-1 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-center font-black" />
                </div>
                <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="mt-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }])} className="text-[9px] font-bold text-indigo-600 uppercase flex items-center gap-1"><Plus size={10}/> Добавить</button>
          </div>
          <button type="submit" disabled={!isFormValid || isSubmitting} className={`w-full py-3 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 ${isFormValid && !isSubmitting ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-300 text-slate-500'}`}>
            {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4" />} {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
          </button>
        </form>
      </section>

      <div className="space-y-4">
        <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm" /></div>
        
        {/* TABS */}
        <div className="flex justify-between items-end border-b border-slate-200">
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('active')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-400'}`}>В обработке <span className="ml-1 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => (o.workflowStatus || 'В обработке') === 'В обработке').length}</span>{activeTab === 'active' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}</button>
                <button onClick={() => setActiveTab('history')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>Обработанные <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => (o.workflowStatus || 'В обработке') !== 'В обработке').length}</span>{activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}</button>
            </div>
            <button onClick={() => fetchOrders()} className="mb-2 p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 relative group hidden md:block text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <div className="grid grid-cols-[80px_1fr_130px_50px_80px_110px_20px] gap-3 items-center">
               <div className="cursor-pointer" onClick={() => handleSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div className="cursor-pointer" onClick={() => handleSort('model')}>Модель</div>
               <div>VIN</div>
               <div>Поз.</div>
               <div>Дата</div>
               <div className="text-right">Статус</div>
               <div></div>
            </div>
          </div>
          
          {filteredOrders.length === 0 && <div className="p-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Список пуст</div>}
          
          {paginatedOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const currentStatus = order.workflowStatus || 'В обработке';
            const displayStatus = currentStatus === 'КП отправлено' ? 'КП готово' : currentStatus;
            const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
            const statusIndex = isCancelled ? -1 : STATUS_STEPS.indexOf(displayStatus);
            
            const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['В обработке'];
            const winningItems = order.items.filter(i => i.AdminCHOOSErankLeader).map(i => ({ ...i, ...i.AdminCHOOSErankLeader }));
            const totalSum = winningItems.reduce((acc, item) => acc + ((item.price || 0) * (item.quantity || 1)), 0);
            
            return (
              <div key={order.id} className={`transition-all duration-500 border-l-4 border-b border-slate-200 ${isExpanded ? 'border-l-indigo-600' : 'border-l-transparent'} ${highlightedId === order.id ? "bg-emerald-50" : ""}`}>
                 <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="flex items-center justify-between md:justify-start">
                        {order.id.startsWith('temp-') ? (
                            <div className="flex items-center gap-1.5 text-indigo-500">
                                <Loader2 size={12} className="animate-spin"/>
                                <span className="text-[9px] font-bold uppercase tracking-wider">Создание</span>
                            </div>
                        ) : (
                            <span className="font-mono font-bold text-[10px]">{order.id}</span>
                        )}
                        <div className="md:hidden flex items-center gap-2 max-w-[60%] justify-end">
                             <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span>
                             <ChevronDown size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`}/>
                        </div>
                    </div>
                    <div className="font-bold text-[10px] uppercase truncate break-words leading-tight">{order.car?.AdminModel || order.car?.model || 'N/A'}</div>
                    <div className="font-mono text-[10px] text-slate-500 hidden md:block truncate break-words leading-tight">{order.vin}</div>
                    <div className="text-[9px] font-bold text-slate-500 flex items-center gap-1"><Package size={10}/> {order.items.length}</div>
                    <div className="text-[9px] font-bold text-slate-400 hidden md:block">{order.createdAt.split(',')[0]}</div>
                    <div className="hidden md:flex justify-end"><span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase border whitespace-normal text-center leading-tight ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>{displayStatus}</span></div>
                    <div className="hidden md:flex justify-end"><MoreHorizontal size={14} className="text-slate-300" /></div>
                 </div>

                 {isExpanded && (
                   <div className="bg-white border-t border-slate-100 p-4">
                      {/* --- PROGRESS BAR / TIMELINE --- */}
                      {currentStatus !== 'В обработке' && (
                          <div className="mb-6">
                              {/* Desktop Horizontal */}
                              <div className="hidden md:block relative px-2 mb-8">
                                  <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-slate-100">
                                      <div className={`h-full bg-emerald-500 transition-all`} style={{ width: `${(STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus) / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
                                  </div>
                                  <div className="relative flex justify-between">
                                      {STATUS_STEPS.map((step, idx) => {
                                          const isPassed = idx <= STATUS_STEPS.indexOf(currentStatus === 'КП готово' ? 'КП отправлено' : currentStatus);
                                          return (
                                              <div key={step} className="flex flex-col items-center">
                                                  <div className={`w-5 h-5 rounded-full border-2 bg-white flex items-center justify-center ${isPassed ? 'border-emerald-500 text-emerald-500' : 'border-slate-200'}`}>
                                                      {isPassed && <div className="w-2 h-2 rounded-full bg-emerald-500"></div>}
                                                  </div>
                                                  <span className="mt-2 text-[7px] font-black uppercase text-slate-400 text-center max-w-[60px]">{step}</span>
                                              </div>
                                          );
                                      })}
                                  </div>
                              </div>
                              {/* Mobile Vertical Timeline */}
                              <div className="md:hidden pl-4 border-l-2 border-slate-100 space-y-4">
                                  {STATUS_STEPS.map((step, idx) => {
                                      const isPassed = idx <= STATUS_STEPS.indexOf(currentStatus === 'КП отправлено' ? 'КП готово' : currentStatus);
                                      const isCurrent = idx === STATUS_STEPS.indexOf(currentStatus === 'КП отправлено' ? 'КП готово' : currentStatus);
                                      const stepConfig = STATUS_CONFIG[step] || STATUS_CONFIG['В обработке'];
                                      
                                      let dotClass = 'bg-white border-slate-200';
                                      let textClass = 'text-slate-300';
                                      
                                      if (isCancelled) {
                                          if (isPassed) { dotClass = 'bg-red-500 border-red-500'; textClass = 'text-red-600 font-bold'; }
                                      } else {
                                          if (isCurrent) { dotClass = `${stepConfig.bg.replace('100','500')} border-transparent shadow-[0_0_8px_rgba(0,0,0,0.1)] scale-110`; textClass = 'text-slate-900 font-black'; }
                                          else if (isPassed) { dotClass = `${stepConfig.bg.replace('100','500')} border-transparent opacity-60`; textClass = 'text-slate-500 font-bold'; }
                                      }

                                      return (
                                          <div key={step} className="relative flex items-center gap-3">
                                              <div className={`absolute -left-[21px] w-3.5 h-3.5 rounded-full border-2 bg-white transition-all duration-500 z-10 ${dotClass}`}></div>
                                              <span className={`text-[9px] uppercase transition-all duration-300 ${textClass}`}>{step}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      )}

                      {/* --- ITEM LIST --- */}
                      <div className="space-y-3">
                          {winningItems.length > 0 ? (
                              <div className="space-y-3">
                                  {winningItems.map((item, idx) => (
                                      <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                          <div>
                                              <div className="text-[10px] font-black uppercase text-slate-900">{item.AdminName || item.name}</div>
                                              <div className="text-[8px] text-slate-400 font-bold uppercase">{item.category} × {item.quantity || 1} шт</div>
                                          </div>
                                          <div className="text-right">
                                              <div className="text-sm font-black text-slate-900">{(item.price * (item.quantity || 1)).toLocaleString()} {getCurrencySymbol(item.currency)}</div>
                                              <div className="text-[8px] text-slate-400 uppercase font-bold">{item.deliveryWeeks || '-'} нед.</div>
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          ) : (
                              <div className="space-y-2">
                                  {order.items.map((item, i) => (
                                      <div key={i} className="p-3 bg-slate-50 rounded-lg flex justify-between items-center"><span className="text-[10px] font-bold uppercase">{item.name}</span><span className="text-[8px] text-slate-400">В обработке</span></div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {/* FOOTER */}
                      {!order.readyToBuy && !order.isRefused && (
                          <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap justify-between items-center gap-4 mt-4 shadow-lg">
                              <div className="flex flex-col gap-0.5">
                                  <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                      {currentStatus === 'В обработке' ? 'Статус заявки' : 'Итого к оплате'}
                                  </span>
                                  <div className="text-xl font-black leading-none">
                                      {currentStatus === 'В обработке' ? 'В ОБРАБОТКЕ' : `${totalSum.toLocaleString()} ${getCurrencySymbol(winningItems[0]?.currency)}`}
                                  </div>
                              </div>
                              <div className="flex gap-2 w-full sm:w-auto">
                                  <button 
                                      onClick={(e) => openRefuseModal(e, order)} 
                                      className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2"
                                  >
                                      <X size={12}/> Отказаться
                                  </button>
                                  
                                  {winningItems.length > 0 && (
                                      <button 
                                          onClick={() => handleConfirmPurchase(order.id)} 
                                          disabled={!!isConfirming} 
                                          className="flex-[2] sm:flex-none px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg"
                                      >
                                          {isConfirming === order.id ? <Loader2 size={14} className="animate-spin"/> : <ShoppingCart size={14}/>} Готов купить
                                      </button>
                                  )}
                              </div>
                          </div>
                      )}

                      {order.isRefused && (
                          <div className="bg-slate-900 text-white p-4 rounded-xl flex justify-center items-center mt-4 shadow-lg">
                               <div className="text-[10px] text-red-300 font-bold uppercase flex items-center gap-2">
                                   <AlertCircle size={12}/> Причина отказа: {order.refusalReason || "Не указана"}
                               </div>
                          </div>
                      )}
                   </div>
                 )}
              </div>
            );
          })}
          <Pagination totalItems={filteredOrders.length} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      </div>
    </div>
  );
};