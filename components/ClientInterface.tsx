import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetService } from '../services/sheetService';
import { Order, OrderStatus, PartCategory } from '../types';
import { Pagination } from './Pagination';
import { POPULAR_BRANDS, ALL_BRANDS } from '../constants/cars';
import { 
  Send, Plus, Trash2, Zap, CheckCircle2, Car, MoreHorizontal, Calculator, Search, Loader2, ChevronDown, ShoppingCart, Archive, UserCircle2, LogOut, ShieldCheck, Phone, X, Calendar, Clock, Hash, Package, Ban, RefreshCw, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown, FileText,
  Receipt,
  Truck,
  CreditCard,
  ChevronUp,
  ClipboardList
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
  'КП отправлено', 
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

  // --- NEW TABS STATE ---
  const [activeTab, setActiveTab] = useState<'active' | 'history'>('active');

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // DEBUG & HYBRID SYSTEM STATE
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

  // Helper to save local IDs
  const trackLocalOrder = (id: string) => {
      setLocalOrderIds(prev => {
          const next = new Set(prev).add(String(id));
          localStorage.setItem('my_created_order_ids', JSON.stringify(Array.from(next)));
          return next;
      });
  };

  // Helper for Toast
  const showToast = (msg: string) => {
      setSuccessToast({ message: msg, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);
  };

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const fetchOrders = React.useCallback(async () => {
    setIsSyncing(true);
    try {
      const data = await SheetService.getOrders(true);
      setDebugRawData(data); // STORE RAW
      
      const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
      const authPhoneNorm = normalizePhone(clientAuth?.phone || '');

      const myOrders = data.filter(o => {
          // STRICT AUTH CHECK
          if (clientAuth?.name) {
              const nameMatch = String(o.clientName || '').trim().toUpperCase() === clientAuth.name.trim().toUpperCase();
              const phoneMatch = authPhoneNorm && normalizePhone(o.clientPhone || '') === authPhoneNorm;
              return nameMatch && phoneMatch;
          }
          
          // GUEST MODE: Show locally created orders
          return localOrderIds.has(String(o.id));
      });

      setOrders(prev => {
         const optimisticPending = prev.filter(o => o.id.startsWith('temp-'));
         const missingLocals = prev.filter(o => (o as any)._recentlyCreated && !myOrders.some(mo => mo.id === o.id));
         return [...optimisticPending, ...missingLocals, ...myOrders];
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

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/\D/g, '');
    if (digitsOnly.length > 11) {
        setPhoneFlash(true);
        setTimeout(() => setPhoneFlash(false), 300); 
        return; 
    }
    setTempAuth({...tempAuth, phone: formatPhoneNumber(val)});
  };

  const isPhoneValid = (phone: string) => phone.length === 18;

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempAuth.name.trim()) return;
    if (!isPhoneValid(tempAuth.phone)) return;
    const authData = { name: tempAuth.name.trim().toUpperCase(), phone: tempAuth.phone.trim() };
    setClientAuth(authData);
    localStorage.setItem('client_auth', JSON.stringify(authData));
    setShowAuthModal(false);
  };

  const handleDemoLogin = (num: 1 | 2) => {
    const demo = num === 1 
      ? { name: 'КЛИЕНТ № 1', phone: '+7 (999) 111-22-33' }
      : { name: 'КЛИЕНТ № 2', phone: '+7 (999) 444-55-66' };
    setClientAuth(demo);
    localStorage.setItem('client_auth', JSON.stringify(demo));
    setShowAuthModal(false);
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

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    if (field === 'quantity') value = Math.min(1000, Math.max(1, value));
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const isValidBrand = useMemo(() => {
      return !!car.brand && FULL_BRAND_SET.has(car.brand);
  }, [car.brand]);

  const showBrandError = (validationAttempted || showValidationHighlight) && !car.brand;
  const showItemNameError = (validationAttempted || showValidationHighlight) && items.some(i => !i.name.trim());

  const isFormValid = useMemo(() => {
      const hasItems = items.length > 0 && items.every(i => i.name.trim().length > 0);
      return isValidBrand && hasItems;
  }, [isValidBrand, items]);

  const handleButtonHover = () => {
    if (!isFormValid) {
      setShowValidationHighlight(true);
    }
  };

  const handleButtonLeave = () => {
    setShowValidationHighlight(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!isFormValid) {
      setValidationAttempted(true);
      return;
    }

    setIsSubmitting(true);

    const finalCar = { ...car, model: `${car.brand} ${car.model}`.trim() };
    const tempId = `temp-${Date.now()}`;
    const finalVin = vin || 'N/A'; 

    const optimisticOrder: any = {
        id: tempId,
        vin: finalVin,
        clientName: clientAuth.name,
        car: finalCar,
        items,
        status: OrderStatus.OPEN,
        createdAt: new Date().toLocaleString('ru-RU'),
        offers: [],
        readyToBuy: false
    };

    setOrders(prev => [optimisticOrder, ...prev]);
    setVin('');
    setCar({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' });
    setItems([{ name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }]);

    try {
        const realId = await SheetService.createOrder(finalVin, items, clientAuth.name, finalCar, clientAuth.phone);
        trackLocalOrder(realId); // TRACK LOCALLY
        setOrders(prev => prev.map(o => o.id === tempId ? { ...o, id: realId, _recentlyCreated: true } : o));
        setHighlightedId(realId); 
        setSuccessToast({ message: `Заказ ${realId} успешно создан`, id: Date.now().toString() });
        setTimeout(() => setHighlightedId(null), 2000); 
        setTimeout(() => setSuccessToast(null), 3000);
    } catch (err) {
        console.error("Order creation failed FULL ERROR:", err);
        setOrders(prev => prev.filter(o => o.id !== tempId));
        alert("Ошибка при создании заказа. Проверьте интернет или консоль (F12).");
    } finally {
        setIsSubmitting(false);
    }
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
    if (!refuseModalOrder) return;
    const orderId = refuseModalOrder.id;
    
    setIsConfirming(orderId);
    setRefuseModalOrder(null);
    
    try {
      await SheetService.refuseOrder(orderId, "Отмена клиентом", 'CLIENT'); 
      setVanishingIds(prev => new Set(prev).add(orderId));
      setSuccessToast({ message: `Заказ ${orderId} аннулирован`, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);

      setTimeout(() => {
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isRefused: true, refusalReason: "Отмена клиентом", workflowStatus: 'Отказ' } : o));
          setVanishingIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
          fetchOrders();
      }, 700);
    } catch (e) {
      console.error(e);
      alert('Ошибка при отказе.');
    } finally {
        setIsConfirming(null);
    }
  };

  const handleDemoForm = () => {
    const randomCar = DEMO_CARS[Math.floor(Math.random() * DEMO_CARS.length)];
    const randomVin = generateVin(randomCar.prefix);
    const randomYear = Math.floor(Math.random() * (2026 - 2000 + 1) + 2000).toString();
    
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const shuffledItems = [...DEMO_ITEMS_POOL].sort(() => 0.5 - Math.random());
    const selectedItems = shuffledItems.slice(0, itemCount).map(i => ({
        ...i,
        quantity: Math.floor(Math.random() * 2) + 1,
        color: '',
        refImage: ''
    }));

    setVin(randomVin);
    setCar({
        brand: randomCar.brand, 
        model: randomCar.model, 
        bodyType: 'Седан', 
        year: randomYear, 
        engine: '2.0L', 
        transmission: 'Auto' 
    });
    setItems(selectedItems);
  };

  const handleSort = (key: string) => {
      setSortConfig(current => {
          if (current?.key === key) {
              return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          }
          return { key, direction: 'asc' };
      });
  };

  const filteredOrders = useMemo(() => {
    if (!Array.isArray(orders)) return [];
    let result = orders.filter(o => {
        if (forceShowAll) return true;
        
        // TAB FILTERING LOGIC
        const status = o.workflowStatus || 'В обработке';
        const isProcessing = status === 'В обработке';
        
        if (activeTab === 'active' && !isProcessing) return false;
        if (activeTab === 'history' && isProcessing) return false;

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if (String(o.id).toLowerCase().includes(q)) return true;
        if (o.vin.toLowerCase().includes(q)) return true;
        if (o.car?.model?.toLowerCase().includes(q)) return true;
        if (o.items.some(i => i.name.toLowerCase().includes(q))) return true;
        return false;
    });

    result.sort((a, b) => {
        const isArchivedA = a.status === OrderStatus.CLOSED || a.readyToBuy || a.isRefused;
        const isArchivedB = b.status === OrderStatus.CLOSED || b.readyToBuy || b.isRefused;
        if (isArchivedA && !isArchivedB) return 1; 
        if (!isArchivedA && isArchivedB) return -1; 
        return 0;
    });

    if (sortConfig) {
        result = [...result].sort((a, b) => {
            let aVal: any = '';
            let bVal: any = '';
            switch (sortConfig.key) {
                case 'id': aVal = Number(a.id); bVal = Number(b.id); break;
                case 'model': aVal = a.car?.model || ''; bVal = b.car?.model || ''; break;
                case 'items': aVal = a.items.length; bVal = b.items.length; break;
                case 'date': 
                    const parseD = (d: string) => {
                        const [day, month, year] = d.split(/[\.\,]/);
                        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
                    };
                    aVal = parseD(a.createdAt); bVal = parseD(b.createdAt);
                    break;
                case 'status':
                    const getStatusWeight = (o: Order) => {
                        if (o.readyToBuy) return 3;
                        const hasWinner = o.offers?.some(off => off.items.some(i => i.rank === 'ЛИДЕР'));
                        if (hasWinner) return 2;
                        if (o.isRefused) return 0;
                        return 1;
                    };
                    aVal = getStatusWeight(a); bVal = getStatusWeight(b);
                    break;
                default: return 0;
            }
            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }
    return result;
  }, [orders, searchQuery, sortConfig, activeTab]);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredOrders.slice(start, start + itemsPerPage);
  }, [filteredOrders, currentPage, itemsPerPage]);

  const getCurrencySymbol = (curr: string = 'RUB') => {
      switch(curr) {
          case 'USD': return '$';
          case 'CNY': return '¥';
          default: return '₽';
      }
  };

  const filteredBrands = useMemo(() => {
      const q = car.brand.toLowerCase();
      if (!q) return POPULAR_BRANDS;
      return ALL_BRANDS.filter(b => b.toLowerCase().includes(q));
  }, [car.brand]);

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 relative">
      {successToast && (
          <div className="fixed top-6 right-6 z-[250] animate-in slide-in-from-top-4 fade-in duration-300">
              <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
                  <CheckCircle2 className="text-emerald-400" size={20} />
                  <div><p className="text-[10px] font-black uppercase tracking-widest text-emerald-400">Успешно</p><p className="text-xs font-bold">{successToast.message}</p></div>
              </div>
          </div>
      )}

      {refuseModalOrder && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={() => setRefuseModalOrder(null)}>
              <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                  <div className="flex flex-col items-center gap-4 text-center">
                      <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center">
                          <AlertCircle size={24}/>
                      </div>
                      <div>
                          <h3 className="text-lg font-black uppercase text-slate-900">Отказаться от заказа?</h3>
                          <p className="text-xs text-slate-500 font-bold mt-1">Это действие отменит заказ {refuseModalOrder.id}. Восстановить его будет нельзя.</p>
                      </div>
                      <div className="grid grid-cols-2 gap-3 w-full mt-2">
                          <button onClick={() => setRefuseModalOrder(null)} className="py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-colors">Нет, вернуться</button>
                          <button onClick={confirmRefusal} className="py-3 rounded-xl bg-red-600 text-white font-black text-xs uppercase hover:bg-red-700 transition-colors shadow-lg shadow-red-200">Да, отказаться</button>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {showAuthModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-[400px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
             <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck size={40} /></div>
             <div className="text-center space-y-1"><h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Вход клиента</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Авторизуйтесь для работы с заказами</p></div>
             <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => handleDemoLogin(1)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо Клиент 1</button>
                <button onClick={() => handleDemoLogin(2)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо Клиент 2</button>
             </div>
             <div className="w-full flex items-center gap-4 py-2"><div className="flex-grow h-px bg-slate-100"></div><span className="text-[9px] font-bold text-slate-300 uppercase">или создайте новый</span><div className="flex-grow h-px bg-slate-100"></div></div>
             <form onSubmit={handleLogin} className="w-full space-y-3">
                 <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Имя</label><input autoFocus value={tempAuth.name} onChange={e => setTempAuth({...tempAuth, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 uppercase" placeholder="ИМЯ" /></div>
                 <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Номер телефона</label><input value={tempAuth.phone} onChange={handlePhoneChange} className={`w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none transition-all duration-300 ${phoneFlash ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-indigo-600'}`} placeholder="+7 (XXX) XXX-XX-XX" /></div>
                 <button type="submit" disabled={!tempAuth.name || !isPhoneValid(tempAuth.phone)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:active:scale-100">Создать аккаунт</button>
             </form>
          </div>
        </div>
      )}

      <div className="bg-white p-3 md:p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-row justify-between items-center gap-3">
         <div className="flex items-center gap-3 md:gap-4 overflow-hidden">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-inner shrink-0"><UserCircle2 size={20} className="md:w-6 md:h-6"/></div>
            <div className="flex flex-col truncate">
                <span className="text-[8px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 truncate">Личный кабинет</span>
                <div className="flex flex-col md:flex-row md:items-center md:gap-2">
                    <h3 className="text-xs md:text-sm font-black text-slate-900 uppercase tracking-tight truncate">{clientAuth?.name || 'Гость'}</h3>
                    <div className="flex items-center gap-1 text-slate-400 truncate"><Phone size={10}/> <span className="text-[9px] md:text-[10px] font-bold">{clientAuth?.phone || '...'}</span></div>
                </div>
            </div>
         </div>
         <button onClick={handleLogout} className="p-2 md:p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all border border-transparent hover:border-red-100 flex items-center gap-2 group shrink-0">
            <span className="hidden md:inline text-[10px] font-black uppercase opacity-0 group-hover:opacity-100 transition-all">Выход</span>
            <LogOut size={16} className="md:w-[18px] md:h-[18px]"/>
         </button>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-2"><Car size={14} className="text-slate-500"/><h2 className="text-[11px] font-bold uppercase tracking-tight">Новая заявка</h2></div>
           <button onClick={handleDemoForm} className="flex items-center gap-1.5 px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-[9px] font-bold hover:bg-indigo-100 transition-all border border-indigo-100 uppercase"><Zap size={10}/> Демо заказ</button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">VIN / Шасси</label><input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-[10px] outline-none focus:border-indigo-500 transition-colors" placeholder="WBA..." /></div>
              <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Имя Клиента</label><input value={clientAuth?.name || ''} readOnly className="w-full px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-md text-[10px] font-bold uppercase text-slate-400 outline-none cursor-not-allowed" /></div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 relative">
                      <label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Марка (Бренд)</label>
                      <div className="relative">
                          <input ref={brandInputRef} value={car.brand} onChange={(e) => { setCar({...car, brand: e.target.value}); setIsBrandOpen(true); }} onFocus={() => setIsBrandOpen(true)} className={`w-full px-3 py-1.5 bg-white border rounded-md text-[10px] font-bold uppercase outline-none focus:border-indigo-500 transition-colors ${showBrandError ? 'border-red-400 bg-red-50/30 ring-1 ring-red-100' : 'border-slate-300'}`} placeholder="Введите марку..." />
                          <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                      </div>
                      {isBrandOpen && (<div ref={brandListRef} className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl divide-y divide-slate-50 animate-in fade-in zoom-in-95 duration-100">{filteredBrands.length > 0 ? (filteredBrands.map((brand, idx) => (<div key={brand} onClick={() => { setCar({...car, brand}); setIsBrandOpen(false); }} className="px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 cursor-pointer uppercase">{brand}</div>))) : (<div className="px-3 py-2 text-[10px] text-slate-400 italic">Ничего не найдено</div>)}</div>)}
                      {!isValidBrand && car.brand.length > 0 && !isBrandOpen && (<div className="text-[8px] font-bold text-red-500 mt-1 absolute -bottom-4 left-0">Выберите марку из списка</div>)}
                  </div>
                  <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Модель</label><input value={car.model} onChange={e => setCar({...car, model: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold outline-none uppercase focus:border-indigo-500" placeholder="Напишите модель (X5, Camry...)" /></div>
                  <div className="space-y-1"><label className="text-[8px] font-bold text-slate-400 uppercase ml-1">Год выпуска</label><input value={car.year} onChange={e => setCar({...car, year: e.target.value})} className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold text-center focus:border-indigo-500" placeholder="202X" /></div>
              </div>
          </div>
          <div className="space-y-3">
            <label className="text-[9px] font-black uppercase tracking-widest text-slate-950 ml-1">Позиции заказа</label>
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start group">
                <div className="flex-grow bg-white p-3 rounded-xl border border-slate-200 shadow-sm space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2"><input value={item.name} maxLength={90} onChange={e => updateItem(idx, 'name', e.target.value)} className={`w-full px-2 py-1 bg-slate-50 border rounded text-[10px] font-bold outline-none focus:border-indigo-300 transition-colors ${showItemNameError && !item.name.trim() ? 'border-red-300 bg-red-50' : 'border-slate-100'}`} placeholder="Название детали (макс. 90 симв.)" /></div>
                    <div className="relative"><select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value as PartCategory)} className="w-full appearance-none px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-black uppercase pr-8 outline-none"><option>Оригинал</option><option>Б/У</option><option>Аналог</option></select><ChevronDown size={14} className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" /></div>
                    <div className="flex items-center gap-1"><input type="number" value={item.quantity} onChange={e => updateItem(idx, 'quantity', parseInt(e.target.value))} className="w-full px-1 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-center font-black" /></div>
                  </div>
                </div>
                <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="mt-4 p-2 text-slate-300 hover:text-red-500 rounded-lg"><Trash2 size={14}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }])} className="text-[9px] font-bold text-indigo-600 uppercase hover:underline flex items-center gap-1"><Plus size={10}/> Добавить деталь</button>
          </div>
          <div onMouseEnter={handleButtonHover} onMouseLeave={handleButtonLeave}>
            <button type="submit" disabled={!isFormValid || isSubmitting} className={`w-full py-3 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${isFormValid && !isSubmitting ? 'bg-slate-900 text-white hover:bg-slate-800 active:scale-95' : 'bg-slate-300 text-slate-500'}`}>
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4" />} 
              {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-4">
        <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors"/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по VIN, номеру заказа или названию детали..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all shadow-sm" /></div>
        
        {/* --- TABS --- */}
        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('active')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-400'}`}>
                    В обработке <span className="ml-1 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => (o.workflowStatus || 'В обработке') === 'В обработке').length}</span>
                    {activeTab === 'active' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}
                </button>
                <button onClick={() => setActiveTab('history')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>
                    Обработанные <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => (o.workflowStatus || 'В обработке') !== 'В обработке').length}</span>
                    {activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}
                </button>
            </div>
            <button onClick={() => fetchOrders()} className="mb-2 p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 relative group hidden md:block">
            <div className="grid grid-cols-[80px_1fr_130px_50px_80px_110px_20px] gap-3 text-[9px] font-black uppercase text-slate-400 tracking-wider select-none">
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('model')}>Модель <SortIcon column="model"/></div>
               <div>VIN</div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('items')}>Поз. <SortIcon column="items"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('date')}>Дата <SortIcon column="date"/></div>
               <div className="text-right cursor-pointer flex items-center justify-end group" onClick={() => handleSort('status')}>Статус <SortIcon column="status"/></div>
               <div></div>
            </div>
          </div>
          
          {filteredOrders.length === 0 && <div className="p-8 text-center text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Список пуст</div>}
          {paginatedOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const isVanishing = vanishingIds.has(order.id);
            const isOptimistic = order.id.startsWith('temp-');
            const isHighlighted = highlightedId === order.id;
            
            // Winning items logic
            let winningItems: any[] = [];
            const isCPReady = order.statusClient === 'КП готово' || order.statusClient === 'КП ГОТОВО' || order.workflowStatus === 'КП отправлено' || order.workflowStatus === 'Готов купить' || order.readyToBuy;
            
            if (isCPReady) {
                // Collect items that have AdminCHOOSErankLeader in their JSON
                winningItems = order.items.filter(i => i.AdminCHOOSErankLeader).map(i => ({
                    ...i,
                    ...i.AdminCHOOSErankLeader, // Spread winner details (price, currency, etc)
                    AdminName: i.AdminName || i.name
                }));
                
                // Fallback: If no AdminCHOOSErankLeader found (old orders), look at Offers
                if (winningItems.length === 0 && order.offers) {
                    const visibleOffers = order.offers.filter(off => off.visibleToClient === 'Y' || isCPReady);
                    winningItems = visibleOffers.flatMap(off => off.items.filter(i => i.rank === 'ЛИДЕР' || i.rank === 'LEADER'));
                }
            }

            const hasWinning = winningItems.length > 0;
            const totalSum = winningItems.reduce((acc, item) => acc + ((item.price || item.adminPrice || item.sellerPrice || 0) * (item.quantity || item.AdminQuantity || 1)), 0);
            const totalDelivery = winningItems.reduce((acc, item) => acc + ((item.deliveryRate || 0) * (item.quantity || item.AdminQuantity || 1)), 0);
            const maxDeliveryWeeks = Math.max(...winningItems.map(i => i.deliveryWeeks || 0), 0);
            const symbol = getCurrencySymbol(winningItems[0]?.currency || winningItems[0]?.adminCurrency || winningItems[0]?.sellerCurrency || 'RUB');

            const orderDate = order.createdAt ? order.createdAt.split(/[\n,]/)[0] : '';
            const itemsCount = order.items.length;
            const displayModel = order.car?.AdminModel || order.car?.model || 'БЕЗ МОДЕЛИ';
            
            const currentStatus = order.workflowStatus || 'В обработке';
            const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
            const statusIndex = isCancelled ? -1 : STATUS_STEPS.indexOf(currentStatus);
            
            const statusStyle = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['В обработке'];

            const containerStyle = isVanishing ? "opacity-0 max-h-0 py-0 overflow-hidden" 
                : isHighlighted ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" 
                : isExpanded ? 'border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-3' 
                : `border-l-transparent hover:bg-slate-50/30 border-b-4 md:border-b border-slate-100 last:border-0`;

            return (
              <div key={order.id} className={`transition-all duration-700 border-l-4 ${containerStyle}`}>
                 <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 md:gap-3 cursor-pointer min-h-[56px]" onClick={() => !isVanishing && !isOptimistic && setExpandedId(isExpanded ? null : order.id)}>
                    <div className="flex items-center justify-between md:justify-start">
                        {isOptimistic ? (<div className="flex items-center gap-1.5 text-indigo-500"><Loader2 size={12} className="animate-spin"/><span className="text-[9px] font-bold uppercase tracking-wider">Создание</span></div>) : (<span className="font-mono font-bold text-[10px] text-slate-900 truncate block">{order.id}</span>)}
                        <div className="md:hidden flex items-center gap-2 max-w-[60%] justify-end">
                             <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase md:whitespace-nowrap text-center leading-tight shadow-sm border ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border}`}>{currentStatus}</span>
                             <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-slate-300 shrink-0"/></div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 md:block">
                        <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">Модель:</span>
                        <span className="font-bold text-[10px] text-slate-700 uppercase leading-none truncate block">{displayModel}</span>
                    </div>
                    <div className="flex items-center gap-2 md:block">
                        <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">VIN:</span>
                        <span className="font-mono font-bold text-[10px] text-slate-500 uppercase leading-none tracking-tight truncate block">{order.vin}</span>
                    </div>
                    <div className="flex items-center justify-between md:contents">
                        <div className="flex items-center gap-2 md:gap-1 text-left">
                             <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">Поз.:</span>
                             <div className="flex items-center gap-1"><Package size={12} className="text-slate-300"/><span className="text-[9px] font-bold text-slate-500">{itemsCount}</span></div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-1 text-left md:hidden"><span className="text-[9px] font-bold text-slate-400 uppercase">Дата:</span><span className="text-[9px] font-bold text-slate-500">{orderDate}</span></div>
                    </div>
                    <div className="hidden md:flex items-center gap-1 text-left"><Calendar size={12} className="text-slate-300"/><span className="text-[9px] font-bold text-slate-500">{orderDate}</span></div>
                    <div className="hidden md:flex justify-end text-right"><span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase whitespace-nowrap shadow-sm border ${statusStyle.bg} ${statusStyle.color} ${statusStyle.border}`}>{currentStatus}</span></div>
                    <div className="hidden md:flex justify-end">{isOptimistic ? null : <MoreHorizontal size={14} className="text-slate-300" />}</div>
                 </div>

                 {isExpanded && !isVanishing && !isOptimistic && (
                   <div className="bg-white border-t border-slate-100 animate-in fade-in duration-200 rounded-b-lg overflow-hidden" onClick={e => e.stopPropagation()}>
                      
                      {/* --- PROGRESS BAR --- */}
                      <div className="p-6 pb-2">
                          <div className="relative">
                              <div className="absolute top-2.5 left-0 right-0 h-0.5 bg-slate-100 rounded">
                                  <div className={`h-full transition-all duration-700 rounded ${isCancelled ? 'bg-red-500' : 'bg-emerald-500'}`} style={{ width: isCancelled ? '100%' : `${(statusIndex / (STATUS_STEPS.length - 1)) * 100}%` }}></div>
                              </div>
                              <div className="relative flex justify-between">
                                  {STATUS_STEPS.map((step, idx) => {
                                      const isPassed = idx <= statusIndex;
                                      const isCurrent = idx === statusIndex;
                                      const stepConfig = STATUS_CONFIG[step] || STATUS_CONFIG['В обработке'];
                                      const circleColor = isCancelled ? 'bg-red-500 border-red-500' : isPassed ? stepConfig.bg.replace('bg-', 'bg-').replace('100', '500') + ' border-transparent' : 'bg-white border-slate-200';
                                      
                                      // Simplify color mapping for progress dots
                                      let dotClass = 'bg-white border-slate-200';
                                      let textClass = 'text-slate-300';
                                      
                                      if (isCancelled) {
                                          if (isPassed) { dotClass = 'bg-red-500 border-red-500 text-white'; textClass = 'text-red-500'; }
                                      } else {
                                          if (isCurrent) { dotClass = `bg-white border-2 ${stepConfig.border.replace('200','500')} ${stepConfig.color}`; textClass = 'text-slate-900'; }
                                          else if (isPassed) { dotClass = `${stepConfig.bg.replace('100','500')} border-transparent text-white`; textClass = 'text-slate-500'; }
                                      }

                                      return (
                                          <div key={step} className="flex flex-col items-center group">
                                              <div className={`w-5 h-5 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${dotClass}`}>
                                                  <div className={`w-2 h-2 rounded-full ${isCurrent ? stepConfig.bg.replace('100','500') : ''}`}></div>
                                              </div>
                                              <span className={`mt-2 text-[8px] font-bold uppercase text-center max-w-[60px] leading-tight transition-colors ${textClass}`}>{step}</span>
                                          </div>
                                      );
                                  })}
                              </div>
                          </div>
                      </div>

                      {/* --- CONTENT --- */}
                      <div className="p-6 pt-2">
                          {!hasWinning ? (
                              <div className="space-y-3">
                                 <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2"><Search size={12}/> Запрашиваемые позиции</h4>
                                 <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                     {order.items.map((item, idx) => (
                                         <div key={idx} className="bg-white p-3 flex justify-between items-center">
                                             <div className="flex items-center gap-3">
                                                 <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{idx + 1}</div>
                                                 <div><span className="text-[10px] font-black text-slate-900 block uppercase">{item.name}</span><span className="text-[8px] font-bold text-slate-400 uppercase">{item.category} | {item.quantity} шт</span></div>
                                             </div>
                                             <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded text-[9px] font-bold text-slate-400 uppercase"><Clock size={10} className="text-slate-300"/> В очереди</div>
                                         </div>
                                     ))}
                                 </div>
                              </div>
                          ) : (
                              <div className="space-y-4">
                                 <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2"><CheckCircle2 size={14} className="text-emerald-500"/> Согласованные позиции</h4>
                                 
                                 {/* TILE GRID LAYOUT */}
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {winningItems.map((item, idx) => {
                                         const finalPrice = item.price || item.adminPrice || item.sellerPrice || 0;
                                         const curSymbol = getCurrencySymbol(item.currency || item.adminCurrency || item.sellerCurrency || 'RUB');
                                         const displayName = item.AdminName || item.name;
                                         const displayQty = item.quantity || item.AdminQuantity || 1;
                                         
                                         return (
                                            <div key={idx} className="border-2 border-emerald-500/20 rounded-xl p-4 bg-gradient-to-br from-emerald-50/30 to-white hover:border-emerald-500/40 transition-all hover:shadow-md flex flex-col justify-between">
                                                <div className="flex items-start gap-3 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-[10px] shrink-0">{idx + 1}</div>
                                                    <div className="min-w-0">
                                                        <div className="text-[11px] font-black text-slate-900 uppercase leading-tight">{displayName}</div>
                                                        <div className="text-[9px] text-slate-500 font-bold mt-0.5">{item.category} × {displayQty} шт</div>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-end justify-between mt-2 pt-2 border-t border-emerald-100/50">
                                                    <div className="space-y-0.5">
                                                        <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase"><Truck size={8}/> {item.deliveryWeeks || '-'} нед.</div>
                                                        {item.deliveryRate > 0 && <div className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase"><Package size={8}/> +{item.deliveryRate * displayQty}₽</div>}
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm font-black text-slate-900">{(finalPrice * displayQty).toLocaleString()} {curSymbol}</div>
                                                        <div className="text-[8px] text-slate-400 font-bold">{finalPrice.toLocaleString()} {curSymbol}/шт</div>
                                                    </div>
                                                </div>
                                            </div>
                                         );
                                    })}
                                 </div>

                                 {/* FOOTER */}
                                 <div className="bg-slate-900 text-white p-4 rounded-xl flex flex-wrap md:flex-nowrap justify-between items-center gap-4 shadow-lg mt-4">
                                      <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 w-full md:w-auto">
                                          <div className="flex flex-col gap-0.5">
                                              <div className="flex items-center gap-2 text-emerald-400">
                                                  <Calculator size={14}/>
                                                  <span className="font-black text-[9px] uppercase tracking-widest">Итого к оплате</span>
                                              </div>
                                              <div className="text-xl font-black tracking-tight leading-none">{totalSum.toLocaleString()} {symbol}</div>
                                          </div>
                                          <div className="h-8 w-px bg-slate-700 hidden md:block"></div>
                                          <div className="flex gap-4">
                                              <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase">Доставка</span>
                                                  <span className="text-[10px] font-black text-slate-200">{totalDelivery.toLocaleString()} ₽</span>
                                              </div>
                                              <div className="flex flex-col gap-0.5">
                                                  <span className="text-[8px] font-bold text-slate-400 uppercase">Срок (макс)</span>
                                                  <span className="text-[10px] font-black text-slate-200">{maxDeliveryWeeks} нед.</span>
                                              </div>
                                          </div>
                                      </div>
                                      
                                      <div className="flex gap-2 w-full md:w-auto shrink-0">
                                          {!order.readyToBuy && !order.isRefused && (
                                              <>
                                                <button onClick={(e) => openRefuseModal(e, order)} className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-[9px] uppercase tracking-widest bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95"><X size={12}/> Отказаться</button>
                                                <button onClick={() => handleConfirmPurchase(order.id)} disabled={!!isConfirming} className="flex-[2] md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[9px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50">{isConfirming === order.id ? <Loader2 size={14} className="animate-spin"/> : <ShoppingCart size={14}/>} Готов купить</button>
                                              </>
                                          )}
                                          {order.readyToBuy && (
                                              <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400 w-full md:w-auto justify-center"><Archive size={14}/><span className="text-[9px] font-black uppercase">В Архиве (Оплачено)</span></div>
                                          )}
                                          {order.isRefused && (
                                              <div className="text-[10px] text-red-300 font-bold uppercase flex items-center gap-2 bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-900/50 w-full justify-center"><AlertCircle size={12}/> Причина: {order.refusalReason || "Не указана"}</div>
                                          )}
                                      </div>
                                 </div>
                              </div>
                          )}
                      </div>
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
