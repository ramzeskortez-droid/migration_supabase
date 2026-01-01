import React, { useState, useEffect, useMemo, useRef } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order, OrderStatus, PartCategory, WorkflowStatus } from '../types';
import { Pagination } from './Pagination';
import { POPULAR_BRANDS, ALL_BRANDS } from '../constants/cars';
import { 
  Send, Plus, Trash2, Zap, CheckCircle2, Car, MoreHorizontal, Search, Loader2, ChevronDown, ShoppingCart, LogOut, ShieldCheck, Phone, X, Package, RefreshCw, AlertCircle, ArrowUp, ArrowDown, ArrowUpDown, FileText, UserCircle2, Clock
} from 'lucide-react';

const FULL_BRAND_SET = new Set([...POPULAR_BRANDS, ...ALL_BRANDS]);

const DEMO_ITEMS_POOL = [
    { name: "Фильтр масляный", category: "Оригинал" },
    { name: "Колодки передние", category: "Аналог" },
    { name: "Бампер передний", category: "Б/У" },
    { name: "Свеча зажигания", category: "Оригинал" }
];

const generateVin = (prefix: string) => {
    const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    let result = prefix;
    while (result.length < 17) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return result;
};

const DEMO_CARS = [
    { brand: "BMW", model: "X5 G05", prefix: "WBA" },
    { brand: "Toyota", model: "Camry V70", prefix: "JT1" },
    { brand: "Kia", model: "Rio 4", prefix: "Z94" }
];

const STATUS_STEPS = ['В обработке', 'КП отправлено', 'Подтверждение от поставщика', 'Ожидает оплаты', 'В пути', 'Выполнен'];

const STATUS_CONFIG: Record<string, { color: string, bg: string, border: string }> = {
  'В обработке': { color: 'text-slate-600', bg: 'bg-slate-100', border: 'border-slate-200' },
  'КП отправлено': { color: 'text-amber-600', bg: 'bg-amber-100', border: 'border-amber-200' },
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
    } catch (e) { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(() => !localStorage.getItem('client_auth'));
  const [tempAuth, setTempAuth] = useState({ name: '', phone: '' });
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [vin, setVin] = useState('');
  const [car, setCar] = useState({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' });
  const [items, setItems] = useState([{ name: '', quantity: 1, color: '', category: 'Оригинал' as PartCategory, refImage: '' }]);
  
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const brandListRef = useRef<HTMLDivElement>(null);

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

  const handleLogin = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tempAuth.name.trim()) return;
    const authData = { name: tempAuth.name.trim().toUpperCase(), phone: tempAuth.phone.trim() };
    setClientAuth(authData);
    localStorage.setItem('client_auth', JSON.stringify(authData));
    setShowAuthModal(false);
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault(); if (isSubmitting) return;
    setIsSubmitting(true);
    const finalCar = { ...car, model: `${car.brand} ${car.model}`.trim() };
    try {
        await SupabaseService.createOrder(vin || 'N/A', items, clientAuth.name, finalCar, clientAuth.phone);
        setVin(''); setCar({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' }); setItems([{ name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }]);
        showToast(`Заказ создан`);
        fetchOrders();
    } catch (err) { alert("Ошибка при создании заказа."); }
    finally { setIsSubmitting(false); }
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

  const openRefuseModal = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation(); setRefuseModalOrder(order);
  };

  const confirmRefusal = async () => {
    if (!refuseModalOrder) return;
    try { await SupabaseService.refuseOrder(refuseModalOrder.id, "Отмена клиентом", 'CLIENT'); showToast(`Заказ аннулирован`); fetchOrders(); }
    catch (e) { alert('Ошибка'); } finally { setRefuseModalOrder(null); }
  };

  const getCurrencySymbol = (curr: string = 'RUB') => {
      switch(curr) { case 'USD': return '$'; case 'CNY': return '¥'; default: return '₽'; }
  };

  const handleSort = (key: string) => {
      setSortConfig(current => {
          if (current?.key === key) return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
          return { key, direction: 'asc' };
      });
  };

  const SortIcon = ({ column }: { column: string }) => {
      if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50" />;
      return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
  };

  const isFormValid = useMemo(() => car.brand && FULL_BRAND_SET.has(car.brand) && items.every(i => i.name.trim().length > 0), [car.brand, items]);

  const handleDemoOrder = () => {
    const randomCarInfo = DEMO_CARS[Math.floor(Math.random() * DEMO_CARS.length)];
    setVin(generateVin(randomCarInfo.prefix));
    setCar({
        brand: randomCarInfo.brand,
        model: randomCarInfo.model,
        year: String(new Date().getFullYear() - Math.floor(Math.random() * 5)),
        bodyType: '',
        engine: '',
        transmission: ''
    });

    const numItems = Math.floor(Math.random() * 3) + 1;
    const shuffledItems = [...DEMO_ITEMS_POOL].sort(() => 0.5 - Math.random());
    const newItems = shuffledItems.slice(0, numItems).map(item => ({
        ...item,
        quantity: Math.floor(Math.random() * 2) + 1,
        color: '',
        refImage: ''
    }));
    setItems(newItems);
  };

  const displayOrders = useMemo(() => {
      return orders.filter(o => {
        const status = o.workflowStatus || 'В обработке';
        const isProcessing = status === 'В обработке';
        if (activeTab === 'active' && !isProcessing) return false;
        if (activeTab === 'history' && isProcessing) return false;
        return true;
      });
  }, [orders, activeTab]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4 relative">
      {successToast && (
          <div className="fixed top-6 right-6 z-[250] bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
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

      {showAuthModal && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-[400px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
             <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck size={40} /></div>
             <div className="text-center space-y-1"><h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Вход клиента</h2></div>
             <div className="grid grid-cols-2 gap-3 w-full">
                <button onClick={() => { setTempAuth({ name: 'КЛИЕНТ № 1', phone: '+7 (999) 111-22-33' }); }} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 1</button>
                <button onClick={() => { setTempAuth({ name: 'КЛИЕНТ № 2', phone: '+7 (999) 444-55-66' }); }} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 2</button>
             </div>
             <form onSubmit={handleLogin} className="w-full space-y-3">
                 <input value={tempAuth.name} onChange={e => setTempAuth({...tempAuth, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 uppercase" placeholder="ИМЯ" />
                 <input value={tempAuth.phone} onChange={e => setTempAuth({...tempAuth, phone: formatPhoneNumber(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm border-slate-200 outline-none" placeholder="+7 (XXX) XXX-XX-XX" />
                 <button type="submit" disabled={!tempAuth.name} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 mt-4 disabled:opacity-50">Войти</button>
             </form>
          </div>
        </div>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
         <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0"><UserCircle2 size={24}/></div>
            <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Личный кабинет</span>
                <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-slate-900 uppercase">{clientAuth?.name || 'Гость'}</h3>
                    <span className="text-[10px] font-bold text-slate-400"><Phone size={10} className="inline mr-1"/>{clientAuth?.phone}</span>
                </div>
            </div>
         </div>
         <button onClick={handleLogout} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><LogOut size={18}/></button>
      </div>

      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-2"><Car size={14} className="text-slate-500"/><h2 className="text-[11px] font-bold uppercase">Новая заявка</h2></div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-[10px] outline-none" placeholder="VIN / Шасси" />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 relative">
                      <input value={car.brand} onChange={(e) => { setCar({...car, brand: e.target.value}); setIsBrandOpen(true); }} onFocus={() => setIsBrandOpen(true)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold uppercase outline-none" placeholder="Марка..." />
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
                    <div className="md:col-span-2"><input value={item.name} onChange={e => { const ni = [...items]; ni[idx].name = e.target.value; setItems(ni); }} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none" placeholder="Деталь" /></div>
                    <select value={item.category} onChange={e => { const ni = [...items]; ni[idx].category = e.target.value as PartCategory; setItems(ni); }} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-black uppercase outline-none"><option>Оригинал</option><option>Б/У</option><option>Аналог</option></select>
                    <input type="number" value={item.quantity} onChange={e => { const ni = [...items]; ni[idx].quantity = parseInt(e.target.value); setItems(ni); }} className="w-full px-1 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-center font-black" />
                </div>
                <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="mt-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }])} className="text-[9px] font-bold text-indigo-600 uppercase flex items-center gap-1"><Plus size={10}/> Добавить</button>
          </div>
          <div className="flex w-full items-center gap-3">
            <button type="submit" disabled={!isFormValid || isSubmitting} className={`w-full py-3 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 ${isFormValid && !isSubmitting ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-300 text-slate-500'}`}>
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4" />} {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
            </button>
            <button type="button" onClick={handleDemoOrder} title="Демо-заказ" className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100">
              <Zap size={16}/>
            </button>
          </div>
        </form>
      </section>

      <div className="space-y-4">
        <div className="relative group"><Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/><input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск..." className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-[10px] font-bold outline-none shadow-sm" /></div>
        
        <div className="flex justify-between items-end border-b border-slate-200">
            <div className="flex gap-4">
                <button onClick={() => setActiveTab('active')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'active' ? 'text-slate-900' : 'text-slate-400'}`}>В обработке {activeTab === 'active' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}</button>
                <button onClick={() => setActiveTab('history')} className={`pb-2 text-[11px] font-black uppercase relative ${activeTab === 'history' ? 'text-indigo-600' : 'text-slate-400'}`}>Обработанные {activeTab === 'history' && <span className="absolute bottom-[-1px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}</button>
            </div>
            <button onClick={() => fetchOrders()} className="mb-2 p-1.5 bg-slate-100 rounded-lg hover:bg-slate-200 transition-all"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-50 hidden md:block text-[9px] font-black uppercase text-slate-400 tracking-wider">
            <div className="grid grid-cols-[80px_1fr_130px_50px_80px_110px_20px] gap-3 items-center">
               <div className="cursor-pointer" onClick={() => handleSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div>Модель</div>
               <div>VIN</div>
               <div>Поз.</div>
               <div className="cursor-pointer" onClick={() => handleSort('date')}>Дата <SortIcon column="date"/></div>
               <div className="text-right">Статус</div>
               <div></div>
            </div>
          </div>
          
          {displayOrders.length === 0 && <div className="p-8 text-center text-[10px] text-slate-400 font-bold uppercase tracking-widest">Список пуст</div>}
          
          {displayOrders.map(order => {
            const isExpanded = expandedId === order.id;
            const currentStatus = order.workflowStatus || 'В обработке';
            const displayStatus = currentStatus;
            const isCancelled = currentStatus === 'Аннулирован' || currentStatus === 'Отказ';
            const statusConfig = STATUS_CONFIG[currentStatus] || STATUS_CONFIG['В обработке'];
            
            // Winning items helper
            const winningItems: any[] = [];
            order.offers?.forEach(offer => {
                offer.items.forEach(item => {
                    if (item.rank === 'ЛИДЕР' || item.rank === 'LEADER') {
                        winningItems.push({
                            ...item,
                            supplierName: offer.clientName
                        });
                    }
                });
            });

            // Расчет сумм
            const goodsTotal = winningItems.reduce((acc, item) => acc + ((item.adminPrice || item.sellerPrice || 0) * (item.quantity || 1)), 0);
            const deliveryTotal = winningItems.reduce((acc, item) => acc + ((item.deliveryRate || 0) * (item.quantity || 1)), 0);
            const totalSum = goodsTotal + deliveryTotal;
            
            const showReadyToBuy = (currentStatus === 'КП отправлено') && winningItems.length > 0;
            
            return (
              <div key={order.id} className={`transition-all duration-500 border-l-4 border-b border-slate-200 ${isExpanded ? 'border-l-indigo-600' : 'border-l-transparent'}`}>
                 <div className="p-3 grid grid-cols-1 md:grid-cols-[80px_1fr_130px_50px_80px_110px_20px] items-center gap-2 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : order.id)}>
                    <div className="flex items-center justify-between md:justify-start">
                        <span className="font-mono font-bold text-[10px]">{order.id}</span>
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
                   <div className="bg-white border-t border-slate-100 p-4 animate-in slide-in-from-top-2">
                      {currentStatus !== 'В обработке' && (
                          <div className="mb-6">
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
                          </div>
                      )}

                      <div className="space-y-3">
                          {winningItems.length > 0 ? (
                              <div className="space-y-3">
                                  {winningItems.map((item, idx) => {
                                      const price = item.adminPrice || item.sellerPrice || 0;
                                      const rate = item.deliveryRate || 0;
                                      const currency = getCurrencySymbol(item.adminCurrency);
                                      
                                      return (
                                          <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                                              <div className="flex-grow">
                                                  <div className="text-xs font-black uppercase text-slate-900 mb-1">{item.AdminName || item.name}</div>
                                                  <div className="flex flex-wrap gap-3 items-center mb-2">
                                                      <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category} &bull; {item.quantity || 1} шт.</span>
                                                      {item.photoUrl && (
                                                          <a href={item.photoUrl} target="_blank" rel="noreferrer" className="text-[9px] font-black text-indigo-600 border-b border-indigo-200 uppercase leading-none pb-0.5">Посмотреть фото</a>
                                                      )}
                                                  </div>
                                                  <div className="flex flex-wrap gap-2 items-center">
                                                      {item.deliveryWeeks && (
                                                          <span className="text-[10px] bg-slate-100 text-slate-600 px-3 py-1 rounded-lg border border-slate-200 font-black uppercase shadow-sm flex items-center gap-1">
                                                              <Clock size={12}/> Срок: {item.deliveryWeeks} нед.
                                                          </span>
                                                      )}
                                                      <span className="text-[9px] font-bold text-slate-500">
                                                          Цена: {price} {currency} {rate > 0 && <span className="text-indigo-600 ml-1">+ Доставка {rate} {currency}</span>}
                                                      </span>
                                                  </div>
                                              </div>
                                              <div className="text-right w-full md:w-auto pt-2 md:pt-0 border-t md:border-t-0 border-slate-100">
                                                  <div className="text-lg font-black text-slate-900">{( (price + rate) * (item.quantity || 1)).toLocaleString()} {currency}</div>
                                                  <div className="text-[8px] font-bold text-slate-400 uppercase">Итого за позицию</div>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="space-y-2">
                                  {order.items.map((item, i) => (
                                    <div key={i} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center">
                                        <div>
                                            <p className="text-[11px] font-black uppercase text-slate-800">{item.AdminName || item.name}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase">{item.category} &bull; {item.quantity} шт.</p>
                                        </div>
                                        <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg shadow-sm">
                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Обработка</span>
                                        </div>
                                    </div>
                                  ))}
                              </div>
                          )}
                      </div>

                      {!order.readyToBuy && !isCancelled && (
                          <div className="bg-slate-900 text-white p-5 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6 mt-4 shadow-xl border border-white/10">
                              <div className="w-full md:w-auto space-y-2">
                                  {currentStatus === 'В обработке' ? (
                                      <div className="flex flex-col gap-1">
                                          <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Статус заявки</span>
                                          <div className="text-xl font-black leading-none uppercase">В ОБРАБОТКЕ</div>
                                      </div>
                                  ) : (
                                      <div className="grid grid-cols-1 gap-1">
                                          <div className="flex justify-between md:justify-start md:gap-4 items-center border-b border-white/5 pb-1">
                                              <span className="text-[9px] font-bold text-slate-400 uppercase">Итого по позициям:</span>
                                              <span className="text-xs font-black">{goodsTotal.toLocaleString()} {getCurrencySymbol(winningItems[0]?.adminCurrency)}</span>
                                          </div>
                                          <div className="flex justify-between md:justify-start md:gap-4 items-center border-b border-white/5 pb-1">
                                              <span className="text-[9px] font-bold text-slate-400 uppercase">Итого доставка:</span>
                                              <span className="text-xs font-black text-indigo-400">{deliveryTotal.toLocaleString()} {getCurrencySymbol(winningItems[0]?.adminCurrency)}</span>
                                          </div>
                                          <div className="flex justify-between md:justify-start md:gap-4 items-center pt-1">
                                              <span className="text-[10px] font-black text-white uppercase tracking-wider">Итого к оплате:</span>
                                              <span className="text-2xl font-black text-emerald-400 leading-none">{totalSum.toLocaleString()} {getCurrencySymbol(winningItems[0]?.adminCurrency)}</span>
                                          </div>
                                      </div>
                                  )}
                              </div>
                              <div className="flex gap-3 w-full md:w-auto">
                                  <button onClick={(e) => openRefuseModal(e, order)} className="flex-1 md:flex-none px-6 py-3 rounded-xl font-black text-[10px] uppercase bg-slate-800 text-slate-400 hover:bg-red-600 hover:text-white transition-all border border-white/5">Отказаться</button>
                                  {showReadyToBuy && (
                                      <button onClick={() => handleConfirmPurchase(order.id)} disabled={!!isConfirming} className="flex-[2] md:flex-none px-10 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20">
                                          {isConfirming === order.id ? <Loader2 size={16} className="animate-spin"/> : <ShoppingCart size={16}/>} Готов купить
                                      </button>
                                  )}
                              </div>
                          </div>
                      )}
                   </div>
                 )}
              </div>
            );
          })}
          <Pagination totalItems={totalOrders} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
        </div>
      </div>
    </div>
  );
};