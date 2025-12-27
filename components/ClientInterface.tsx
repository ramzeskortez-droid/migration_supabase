
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SheetService } from '../services/sheetService';
import { Order, OrderStatus, PartCategory } from '../types';
import { Pagination } from './Pagination';
import { POPULAR_BRANDS, ALL_BRANDS } from '../constants/cars';
import { 
  Send, Plus, Trash2, Zap, CheckCircle2, Car, MoreHorizontal, Calculator, Search, Loader2, ChevronDown, ShoppingCart, Archive, UserCircle2, LogOut, ShieldCheck, Phone, X, Calendar, Clock, Hash, Package, Ban, RefreshCw, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown, FileText
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

export const ClientInterface: React.FC = () => {
  const [clientAuth, setClientAuth] = useState(() => {
    const saved = localStorage.getItem('client_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [showAuthModal, setShowAuthModal] = useState(!localStorage.getItem('client_auth'));
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

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // DEBUG & HYBRID SYSTEM STATE
  const [debugRawData, setDebugRawData] = useState<any[]>([]);
  const [forceShowAll, setForceShowAll] = useState(false);
  const [localOrderIds, setLocalOrderIds] = useState<Set<string>>(() => {
      const saved = localStorage.getItem('my_created_order_ids');
      return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  // Helper to save local IDs
  const trackLocalOrder = (id: string) => {
      setLocalOrderIds(prev => {
          const next = new Set(prev).add(String(id));
          localStorage.setItem('my_created_order_ids', JSON.stringify(Array.from(next)));
          return next;
      });
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

      const myOrders = clientAuth?.name
        ? data.filter(o => {
            // HYBRID FILTER: Match Phone/Name OR Match Local ID
            const nameMatch = String(o.clientName || '').trim().toUpperCase() === clientAuth.name.trim().toUpperCase();
            const phoneMatch = authPhoneNorm && normalizePhone(o.clientPhone || '') === authPhoneNorm;
            const isLocal = localOrderIds.has(String(o.id));
            
            return (nameMatch && phoneMatch) || isLocal;
          })
        : [];

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
  }, [searchQuery, sortConfig]);

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
        console.error("Order creation failed", err);
        setOrders(prev => prev.filter(o => o.id !== tempId));
        alert("Ошибка при создании заказа. Проверьте интернет.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleConfirmPurchase = async (orderId: string) => {
    setIsConfirming(orderId);
    try {
      await SheetService.confirmPurchase(orderId);
      setVanishingIds(prev => new Set(prev).add(orderId));
      setSuccessToast({ message: `Заявка на покупку отправлена! Перемещено в архив.`, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 4000);
      setTimeout(() => {
        setOrders(prev => prev.map(o => o.id === orderId ? { ...o, readyToBuy: true } : o));
        setVanishingIds(prev => { const n = new Set(prev); n.delete(orderId); return n; });
        fetchOrders();
      }, 700);
    } catch (e) {
      console.error(e);
      alert('Ошибка при подтверждении покупки.');
    } finally {
      setIsConfirming(null);
    }
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
          setOrders(prev => prev.map(o => o.id === orderId ? { ...o, isRefused: true, refusalReason: "Отмена клиентом" } : o));
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
    // Random Car
    const randomCar = DEMO_CARS[Math.floor(Math.random() * DEMO_CARS.length)];
    // GENERATE FULL VIN
    const randomVin = generateVin(randomCar.prefix);
    const randomYear = Math.floor(Math.random() * (2026 - 2000 + 1) + 2000).toString();
    
    // Random Items (1 to 4)
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

        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        if (String(o.id).toLowerCase().includes(q)) return true;
        if (o.vin.toLowerCase().includes(q)) return true;
        if (o.car?.model?.toLowerCase().includes(q)) return true;
        if (o.items.some(i => i.name.toLowerCase().includes(q))) return true;
        return false;
    });

    // DEFAULT SORT: Active First, Then Date
    result.sort((a, b) => {
        const isArchivedA = a.status === OrderStatus.CLOSED || a.readyToBuy || a.isRefused;
        const isArchivedB = b.status === OrderStatus.CLOSED || b.readyToBuy || b.isRefused;
        
        if (isArchivedA && !isArchivedB) return 1; // B goes first
        if (!isArchivedA && isArchivedB) return -1; // A goes first
        
        // If same status, sort by sortConfig or Date
        if (sortConfig) {
             // ... keep existing sort logic below if needed, or simplified date sort
             return 0; // Let the next block handle specific sorts
        }
        return 0;
    });

    if (sortConfig) {
        result = [...result].sort((a, b) => {
            let aVal: any = '';
            let bVal: any = '';

            switch (sortConfig.key) {
                case 'id':
                    aVal = Number(a.id); bVal = Number(b.id);
                    break;
                case 'model':
                    aVal = a.car?.model || ''; bVal = b.car?.model || '';
                    break;
                case 'items':
                    aVal = a.items.length; bVal = b.items.length;
                    break;
                case 'date':
                    // Date parsing
                    const parseD = (d: string) => {
                        const [day, month, year] = d.split(/[\.\,]/);
                        return new Date(Number(year), Number(month) - 1, Number(day)).getTime();
                    };
                    aVal = parseD(a.createdAt); bVal = parseD(b.createdAt);
                    break;
                case 'status':
                    // Logic: Ready -> Processed -> New
                    const getStatusWeight = (o: Order) => {
                        if (o.readyToBuy) return 3;
                        const hasWinner = o.offers?.some(off => off.items.some(i => i.rank === 'ЛИДЕР'));
                        if (hasWinner) return 2;
                        if (o.isRefused) return 0;
                        return 1;
                    };
                    aVal = getStatusWeight(a); bVal = getStatusWeight(b);
                    break;
                default:
                    return 0;
            }

            if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });
    }

    return result;
  }, [orders, searchQuery, sortConfig]);

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

  // Helper for Sort Icons
  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  // RENDER-SIDE FILTER CHECK
  const renderFilteredCount = useMemo(() => {
     if (!clientAuth || !debugRawData.length) return 0;
     const normalizePhone = (p: string) => p ? p.replace(/\D/g, '') : '';
     const authPhoneNorm = normalizePhone(clientAuth.phone || '');
     return debugRawData.filter(o => {
        const nameMatch = String(o.clientName || '').trim().toUpperCase() === clientAuth.name.trim().toUpperCase();
        const phoneMatch = authPhoneNorm && normalizePhone(o.clientPhone || '') === authPhoneNorm;
        const isLocal = localOrderIds.has(String(o.id));
        return (nameMatch && phoneMatch) || isLocal;
     }).length;
  }, [debugRawData, clientAuth, localOrderIds]);

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
                      {/* Only show explicit error text if dropdown isn't open and brand is NOT valid but present (invalid input) */}
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
        <div className="flex justify-between items-end border-b border-slate-200 pb-2">
            <h2 className="text-sm font-black uppercase text-slate-900 tracking-tight flex items-center gap-2">
                <Package size={18}/> Мои заявки <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded text-[10px]">{filteredOrders.length}</span>
            </h2>
            <button onClick={() => fetchOrders()} className="p-1.5 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 relative group hidden md:block">
            {/* UPDATED HEADER GRID: Added Sort Headers */}
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
            
            const visibleOffers = (order.offers || []).filter(off => off.visibleToClient === 'Y');
            const winningItems = visibleOffers.flatMap(off => off.items.filter(i => i.rank === 'ЛИДЕР' || i.rank === 'LEADER'));
            
            // НОВАЯ ЛОГИКА: КП готово, если статус клиента соответствующий
            const isCPReady = order.statusClient === 'КП готово' || order.statusClient === 'КП ГОТОВО';
            const hasWinning = isCPReady && winningItems.length > 0;

            const totalSum = winningItems.reduce((acc, item) => acc + ((item.adminPrice ?? item.sellerPrice ?? 0) * (item.offeredQuantity || item.quantity)), 0);
            const totalDelivery = winningItems.reduce((acc, item) => acc + ((item.deliveryRate || 0) * (item.offeredQuantity || item.quantity)), 0);
            const maxDeliveryWeeks = Math.max(...winningItems.map(i => i.deliveryWeeks || 0), 0);
            const symbol = getCurrencySymbol(winningItems[0]?.adminCurrency || winningItems[0]?.sellerCurrency || 'RUB');

            const orderDate = order.createdAt ? order.createdAt.split(/[\n,]/)[0] : '';
            const itemsCount = order.items.length;
            const displayModel = order.car?.AdminModel || order.car?.model || 'БЕЗ МОДЕЛИ';
            
            // Color Coding Logic
            const status = order.workflowStatus || 'В обработке';
            let statusBorderColor = 'border-l-transparent';
            let statusBgColor = 'hover:bg-slate-50/30';

            if (status === 'Готов купить' || status === 'Выполнен') {
               statusBorderColor = 'border-l-emerald-500';
               statusBgColor = 'bg-emerald-50/30 hover:bg-emerald-50/50';
            } else if (status === 'Аннулирован' || status === 'Отказ' || order.isRefused) {
               statusBorderColor = 'border-l-red-500';
               statusBgColor = 'bg-red-50/30 hover:bg-red-50/50 grayscale-[0.5]';
            } else if (status === 'Подтверждение от поставщика' || status === 'КП отправлено') {
               statusBorderColor = 'border-l-amber-400';
               statusBgColor = 'bg-amber-50/30 hover:bg-amber-50/50';
            } else if (status === 'В пути' || status === 'Ожидает оплаты') {
               statusBorderColor = 'border-l-blue-500';
               statusBgColor = 'bg-blue-50/30 hover:bg-blue-50/50';
            }

            const containerStyle = isVanishing ? "opacity-0 max-h-0 py-0 overflow-hidden" 
                : isHighlighted ? "bg-emerald-50 border-emerald-200 ring-1 ring-emerald-200" 
                : isExpanded ? 'border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-3' 
                : `${statusBorderColor} ${statusBgColor} border-b-4 md:border-b border-slate-100 last:border-0`;

            return (
              <div key={order.id} className={`transition-all duration-700 border-l-4 ${containerStyle}`}>
                 {/* UPDATED ROW GRID: Matching Header - Responsive */}
                 <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 md:gap-3 cursor-pointer min-h-[56px]" onClick={() => !isVanishing && !isOptimistic && setExpandedId(isExpanded ? null : order.id)}>
                    
                    {/* ID */}
                    <div className="flex items-center justify-between md:justify-start">
                        {isOptimistic ? (<div className="flex items-center gap-1.5 text-indigo-500"><Loader2 size={12} className="animate-spin"/><span className="text-[9px] font-bold uppercase tracking-wider">Создание</span></div>) : (<span className="font-mono font-bold text-[10px] text-slate-900 truncate block">{order.id}</span>)}
                        <div className="md:hidden flex items-center gap-2">
                             {/* Mobile Status */}
                             {(() => {
                                const ws = order.workflowStatus || 'В обработке';
                                if (ws === 'Аннулирован' || ws === 'Отказ') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-red-100 text-red-600 whitespace-nowrap shadow-sm flex items-center gap-1"><Ban size={10}/></span>;
                                if (ws === 'Выполнен') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-emerald-600 text-white whitespace-nowrap shadow-sm">ВЫПОЛНЕН</span>;
                                if (ws === 'КП отправлено') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap shadow-sm">КП ГОТОВО</span>;
                                if (ws === 'В пути') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-blue-600 text-white whitespace-nowrap shadow-sm">В ПУТИ</span>;
                                return (
                                    <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase whitespace-nowrap shadow-sm border ${ws === 'В обработке' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                        {ws.toUpperCase()}
                                    </span>
                                );
                             })()}
                             <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}><ChevronDown size={14} className="text-slate-300"/></div>
                        </div>
                    </div>

                    {/* MODEL */}
                    <div className="flex items-center gap-2 md:block">
                        <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">Модель:</span>
                        <span className="font-bold text-[10px] text-slate-700 uppercase leading-none truncate block">{displayModel}</span>
                    </div>

                    {/* VIN */}
                    <div className="flex items-center gap-2 md:block">
                        <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">VIN:</span>
                        <span className="font-mono font-bold text-[10px] text-slate-500 uppercase leading-none tracking-tight truncate block">{order.vin}</span>
                    </div>

                    {/* ITEMS & DATE - Mobile Row */}
                    <div className="flex items-center justify-between md:contents">
                        <div className="flex items-center gap-2 md:gap-1 text-left">
                             <span className="md:hidden text-[9px] font-bold text-slate-400 uppercase w-12 shrink-0">Поз.:</span>
                             <div className="flex items-center gap-1">
                                <Package size={12} className="text-slate-300"/>
                                <span className="text-[9px] font-bold text-slate-500">{itemsCount}</span>
                             </div>
                        </div>
                        <div className="flex items-center gap-2 md:gap-1 text-left md:hidden">
                            <span className="text-[9px] font-bold text-slate-400 uppercase">Дата:</span>
                            <span className="text-[9px] font-bold text-slate-500">{orderDate}</span>
                        </div>
                    </div>

                    {/* DATE (Desktop) */}
                    <div className="hidden md:flex items-center gap-1 text-left"><Calendar size={12} className="text-slate-300"/><span className="text-[9px] font-bold text-slate-500">{orderDate}</span></div>
                    
                    {/* STATUS (Desktop) */}
                    <div className="hidden md:flex justify-end text-right">
                        {(() => {
                            const ws = order.workflowStatus || 'В обработке';
                            if (ws === 'Аннулирован' || ws === 'Отказ') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-red-100 text-red-600 whitespace-nowrap shadow-sm flex items-center gap-1"><Ban size={10}/> АННУЛИРОВАН</span>;
                            if (ws === 'Выполнен') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-emerald-600 text-white whitespace-nowrap shadow-sm">ВЫПОЛНЕН</span>;
                            if (ws === 'КП отправлено') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-emerald-50 text-emerald-700 border border-emerald-100 whitespace-nowrap shadow-sm">КП ГОТОВО</span>;
                            if (ws === 'В пути') return <span className="px-2 py-1 rounded-md font-black text-[8px] uppercase bg-blue-600 text-white whitespace-nowrap shadow-sm">В ПУТИ</span>;
                            return (
                                <span className={`px-2 py-1 rounded-md font-bold text-[8px] uppercase whitespace-nowrap shadow-sm border ${ws === 'В обработке' ? 'bg-amber-100 text-amber-800 border-amber-200' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                    {ws.toUpperCase()}
                                </span>
                            );
                        })()}
                    </div>

                    <div className="hidden md:flex justify-end">{isOptimistic ? null : <MoreHorizontal size={14} className="text-slate-300" />}</div>
                 </div>

                 {isExpanded && !isVanishing && !isOptimistic && (
                   <div className="p-4 bg-white border-t border-slate-100 animate-in fade-in duration-200 rounded-b-lg" onClick={e => e.stopPropagation()}>
                      {!hasWinning && (
                          <div className="space-y-3">
                             <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 mb-2"><Search size={12}/> Запрашиваемые позиции</h4>
                             <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden shadow-sm">{order.items.map((item, idx) => (<div key={idx} className="bg-white p-3 flex justify-between items-center"><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-[10px] font-bold">{idx + 1}</div><div><span className="text-[10px] font-black text-slate-900 block uppercase">{item.AdminName || item.name}</span><span className="text-[8px] font-bold text-slate-400 uppercase">{item.category} | {item.AdminQuantity || item.quantity} шт</span></div></div><div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded text-[9px] font-bold text-slate-400 uppercase"><Clock size={10} className="text-slate-300"/> В очереди</div></div>))}</div>
                          </div>
                      )}
                      
                      {(hasWinning || order.isRefused) && (
                        <div className="space-y-3">
                           {hasWinning && <h4 className="text-[9px] font-black uppercase tracking-widest text-slate-950 flex items-center gap-2 mb-2"><CheckCircle2 size={12} className="text-emerald-500"/> Согласованные позиции</h4>}
                           <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                              {hasWinning && (
                                  <div className="divide-y divide-slate-100">
                                    {winningItems.map((item, idx) => {
                                         const finalPrice = item.adminPrice ?? item.sellerPrice ?? 0;
                                         const curSymbol = getCurrencySymbol(item.adminCurrency ?? item.sellerCurrency ?? 'RUB');
                                         const displayName = item.AdminName || item.name;
                                         const displayQty = item.AdminQuantity || item.offeredQuantity || item.quantity;
                                         const deliveryCost = (item.deliveryRate || 0) * displayQty;
                                         
                                         return (
                                            <div key={idx} className="bg-white border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                                {/* TOP ROW: Name & Photo */}
                                                <div className="p-4 pb-2 flex justify-between items-start">
                                                    <div className="flex items-start gap-3">
                                                        <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-[10px] font-black shrink-0">{idx + 1}</div>
                                                        <div>
                                                            <span className="text-sm font-black text-slate-900 block uppercase tracking-tight leading-tight">{displayName}</span>
                                                            <div className="mt-1 flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">{item.category}</span>
                                                                <span className="text-[10px] font-black text-slate-700 uppercase bg-slate-100 px-2 py-0.5 rounded">{displayQty} шт</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-col items-end gap-2">
                                                        {item.photoUrl && (
                                                            <a href={item.photoUrl} target="_blank" rel="noreferrer" className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-[9px] font-black uppercase hover:bg-blue-100 transition-colors flex items-center gap-1">
                                                                <FileText size={10}/> Фото
                                                            </a>
                                                        )}
                                                        <div className="text-right">
                                                            <div className="text-sm font-black text-slate-900">{(finalPrice * displayQty).toLocaleString()} {curSymbol}</div>
                                                            <div className="text-[9px] text-slate-400 font-bold">{finalPrice} {curSymbol}/шт</div>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* BOTTOM ROW: Delivery & Terms */}
                                                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-4">
                                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Доставка (Тариф)</span>
                                                        <div className="flex justify-between items-baseline">
                                                            <span className="text-[10px] font-black text-slate-700 uppercase">
                                                                {item.deliveryRate === 10 ? 'Стандарт' : item.deliveryRate === 100 ? 'Экспресс' : item.deliveryRate === 1000 ? 'VIP' : 'Базовый'}
                                                            </span>
                                                            <span className="text-[10px] font-black text-slate-900">{deliveryCost} ₽</span>
                                                        </div>
                                                    </div>
                                                    <div className="bg-slate-50 rounded-lg p-2 border border-slate-100">
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase block mb-0.5">Срок поставки</span>
                                                        <span className="text-[10px] font-black text-slate-900 uppercase">{item.deliveryWeeks || '-'} недель</span>
                                                    </div>
                                                </div>

                                                {item.adminComment && (
                                                    <div className="mx-4 mb-4 p-3 bg-amber-50 border border-amber-100 rounded-xl text-[10px] text-amber-800 flex items-start gap-2 italic">
                                                        <AlertCircle size={14} className="mt-0.5 shrink-0" />
                                                        <span><span className="font-black not-italic block mb-0.5">Комментарий менеджера:</span>{item.adminComment}</span>
                                                    </div>
                                                )}
                                            </div>
                                         );
                                    })}
                                  </div>
                              )}
                              
                              <div className="bg-slate-900 text-white p-4 flex flex-wrap md:flex-nowrap justify-between items-center gap-4">
                                  <div className="flex flex-col md:flex-row items-start md:items-center gap-2 md:gap-6 w-full md:w-auto">
                                      {hasWinning && (
                                          <>
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2 text-emerald-400">
                                                    <Calculator size={14}/>
                                                    <span className="font-black text-[10px] uppercase tracking-widest">Итого к оплате</span>
                                                </div>
                                                <div className="text-xl font-black tracking-tight leading-none">{totalSum.toLocaleString()} {symbol}</div>
                                            </div>

                                            <div className="h-8 w-px bg-slate-700 hidden md:block"></div>

                                            <div className="grid grid-cols-2 md:flex gap-4 md:gap-6">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Доставка</span>
                                                    <span className="text-xs font-black text-slate-200">{totalDelivery.toLocaleString()} ₽</span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[8px] font-bold text-slate-400 uppercase">Срок (макс)</span>
                                                    <span className="text-xs font-black text-slate-200">{maxDeliveryWeeks} нед.</span>
                                                </div>
                                            </div>
                                          </>
                                      )}
                                      
                                      {order.isRefused && (
                                          <div className="flex items-center gap-2 w-full md:w-auto max-w-full">
                                              <div className="text-[10px] text-red-300 font-bold uppercase flex items-center gap-2 bg-red-950/50 px-3 py-1.5 rounded-lg border border-red-900/50 w-full truncate">
                                                  <AlertCircle size={12} className="shrink-0"/> 
                                                  <span className="truncate">Причина: {order.refusalReason || "Не указана"}</span>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                                  
                                  {!order.readyToBuy && !order.isRefused ? (
                                    <div className="flex gap-2 w-full md:w-auto shrink-0">
                                        <button 
                                            type="button" 
                                            onClick={(e) => openRefuseModal(e, order)} 
                                            className="flex-1 md:flex-none px-4 py-2.5 rounded-xl font-bold text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 bg-slate-700 text-slate-300 hover:bg-red-600 hover:text-white whitespace-nowrap"
                                        >
                                            <X size={14}/> Отказаться
                                        </button>
                                        <button onClick={() => handleConfirmPurchase(order.id)} disabled={!!isConfirming} className="flex-[2] md:flex-none px-6 py-2.5 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg active:scale-95 disabled:opacity-50 whitespace-nowrap">{isConfirming === order.id ? <Loader2 size={14} className="animate-spin"/> : <ShoppingCart size={14}/>} Готов купить</button>
                                    </div>
                                  ) : (
                                      !order.isRefused && (
                                        <div className="flex items-center gap-2 px-4 py-2 rounded-lg border bg-emerald-500/20 border-emerald-500/30 text-emerald-400 w-full md:w-auto justify-center md:justify-start">
                                            <Archive size={14}/>
                                            <span className="text-[9px] font-black uppercase whitespace-nowrap">
                                                {order.statusClient === 'Подтверждение от поставщика' ? 'Ожидание подтверждения' : 'В Архиве (Оплачено)'}
                                            </span>
                                        </div>
                                      )
                                  )}
                              </div>
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
