import React, { useState, useEffect, useMemo } from 'react';
import { SupabaseService } from '../services/supabaseService';
import { Order, OrderStatus, Currency, RowType } from '../types';
import { Pagination } from './Pagination';
import {
  User, CheckCircle, Search, RefreshCw, Edit2, LogOut, ShieldCheck, AlertCircle,
  BarChart3, Calendar, TrendingUp, Clock, Car, ChevronDown, ChevronRight, Loader2, CheckCircle2, UserCircle2, AlertTriangle, XCircle, FileText, Ban, Copy, ArrowUp, ArrowDown, ArrowUpDown
} from 'lucide-react';

export const SellerInterface: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [totalOrders, setTotalOrders] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeBrandFilter, setActiveBrandFilter] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flashFields, setFlashFields] = useState<Set<string>>(new Set());
  
  // Auth State
  const [sellerAuth, setSellerAuth] = useState(() => {
    try {
        const saved = localStorage.getItem('seller_auth_data');
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showAuthModal, setShowAuthModal] = useState(!localStorage.getItem('seller_auth_data'));
  const [tempAuth, setTempAuth] = useState({ name: '', phone: '' });
  const [phoneFlash, setPhoneFlash] = useState(false);

  // Editing State
  const [editingItems, setEditingItems] = useState<Record<string, { 
    price: number; 
    currency: Currency; 
    offeredQty: number; 
    refImage: string;
    weight: number;
    deliveryWeeks: number;
    photoUrl: string;
  }>>({});
  
  const [loading, setLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'new' | 'processed'>('new'); 
  
  const [stats, setStats] = useState({ today: 0, week: 0, month: 0, total: 0, leader: 'N/A' });
  const [optimisticSentIds, setOptimisticSentIds] = useState<Set<string>>(new Set());
  const [vanishingIds, setVanishingIds] = useState<Set<string>>(new Set());
  const [successToast, setSuccessToast] = useState<{message: string, id: string} | null>(null);

  // Pagination & Sort
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({ key: 'id', direction: 'desc' });

  const fetchData = async (silent = false) => {
    if (!sellerAuth?.name) return;
    if (!silent) setLoading(true);
    setIsSyncing(true);
    try {
      const { data, count } = await SupabaseService.getOrders(
          currentPage,
          itemsPerPage,
          sortConfig?.key || 'id',
          sortConfig?.direction || 'desc',
          searchQuery
      );
      setOrders(data);
      setTotalOrders(count);
    } catch (e) { console.error(e); }
    finally {
      if (!silent) setLoading(false);
      setIsSyncing(false);
    }
  };

    const fetchStats = async () => {
        try {
            const s = await SupabaseService.getMarketStats();
            setStats({ today: s.today, week: s.week, month: s.month, total: s.total, leader: s.leader });
        } catch (e) { console.error("Stats error:", e); }
    };
  
      useEffect(() => {
        if (sellerAuth) {
            fetchData();
        }
        const interval = setInterval(() => {
            if (sellerAuth) {
                fetchData(true);
            }
        }, 20000);
        return () => clearInterval(interval);
      }, [sellerAuth, currentPage, itemsPerPage, sortConfig, searchQuery]);
    
      useEffect(() => {
        if(sellerAuth) {
            fetchStats();
            const interval = setInterval(() => {
                if (sellerAuth) {
                    fetchStats();
                }
            }, 20000);
            return () => clearInterval(interval);
        }
      }, [sellerAuth]);  
    // ... (Auth helpers and login logic - COPIED FROM ORIGINAL)
    const formatChinesePhoneNumber = (value: string) => {
      let digits = value.replace(/\D/g, '');
      if (!digits.startsWith('86')) {
          if (digits.length > 0) digits = '86' + digits;
      }
      digits = digits.slice(0, 13);
      const match = digits.match(/^(\d{2})(\d{0,3})(\d{0,4})(\d{0,4})$/);
      if (!match) return '+86';
      let formatted = `+${match[1]}`;
      if (match[2]) formatted += ` ${match[2]}`;
      if (match[3]) formatted += ` ${match[3]}`;
      if (match[4]) formatted += ` ${match[4]}`;
      return formatted;
    };
  
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      const digitsOnly = val.replace(/\D/g, '');
      if (digitsOnly.length > 13) { setPhoneFlash(true); setTimeout(() => setPhoneFlash(false), 300); return; }
      setTempAuth({...tempAuth, phone: formatChinesePhoneNumber(val)});
    };
  
    const isPhoneValid = (phone: string) => phone.length >= 15; 
  
    const handleLogin = (e?: React.FormEvent) => {
      if (e) e.preventDefault();
      if (!tempAuth.name.trim()) return;
      if (!isPhoneValid(tempAuth.phone)) return;
      const authData = { name: tempAuth.name.trim().toUpperCase(), phone: tempAuth.phone.trim() };
      setSellerAuth(authData);
      localStorage.setItem('seller_auth_data', JSON.stringify(authData));
      setShowAuthModal(false);
      fetchData(false);
    };
  
    const handleDemoLogin = (num: 1 | 2) => {
      const demo = num === 1 ? { name: 'ПОСТАВЩИК 1', phone: '+86 138 0013 8000' } : { name: 'ПОСТАВЩИК 2', phone: '+86 139 8888 2222' };
      setSellerAuth(demo);
      localStorage.setItem('seller_auth_data', JSON.stringify(demo));
      setShowAuthModal(false);
      fetchData(false);
    };
  
    const handleLogout = () => {
      localStorage.removeItem('seller_auth_data');
      setSellerAuth(null);
      setShowAuthModal(true);
      setOrders([]);
      setOptimisticSentIds(new Set());
      setEditingItems({});
      setActiveBrandFilter(null);
      setSearchQuery('');
    };
  
    const getMyOffer = (order: Order) => {
      if (!sellerAuth?.name) return null;
      const nameToMatch = sellerAuth.name.trim().toUpperCase();
      return order.offers?.find(off => 
        String(off.clientName || '').trim().toUpperCase() === nameToMatch
      ) || null;
    };
  
    const hasSentOfferByMe = (order: Order) => {
      if (!sellerAuth) return false;
      return optimisticSentIds.has(order.id) || !!getMyOffer(order);
    };
  
        const getOfferStatus = (order: Order) => {
        const myOffer = getMyOffer(order);
        if (!myOffer) return { label: 'Сбор офферов', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock size={10}/> };
    
        const isRefusal = myOffer.items.every(item => (item.offeredQuantity || 0) === 0);
        if (isRefusal) {
            return { label: 'ОТКАЗ', color: 'bg-slate-200 text-slate-500 border-slate-300', icon: <Ban size={10}/> };
        }
    
        // Если статус админа все еще "В обработке" или "ОТКРЫТ", значит торги идут
        const isBiddingActive = order.statusAdmin === 'В обработке' || order.statusAdmin === 'ОТКРЫТ';
    
        if (isBiddingActive && !order.isProcessed) {
            return { label: 'Идут торги', color: 'bg-blue-50 text-blue-600 border-blue-100', icon: <Loader2 size={10} className="animate-spin"/> };
        }
    
        const winningItems = myOffer.items.filter(i => i.rank === 'ЛИДЕР' || i.rank === 'LEADER');
        const totalItems = myOffer.items.length;
    
        if (winningItems.length === totalItems) {
            return { label: 'ВЫИГРАЛ', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 size={10}/> };
        } else if (winningItems.length === 0) {
            return { label: 'ПРОИГРАЛ', color: 'bg-red-50 text-red-600 border-red-100', icon: <XCircle size={10}/> };
        } else {
            return { label: 'ЧАСТИЧНО', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <AlertTriangle size={10}/> };
        }
      };  
    // ... (Stats Logic - Simplified for Supabase)
    const parseRuDate = (dateStr: any): Date => {
      if (!dateStr) return new Date(0);
      if (dateStr instanceof Date) return dateStr;
      const s = String(dateStr).trim().replace(/[\n\r]/g, ' ');
      const nativeDate = new Date(s);
      if (!isNaN(nativeDate.getTime())) return nativeDate;
      const match = s.match(/(\d{2})\.(\d{2})\.(\d{4})/);
      if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
      return new Date(0);
    };
  
    const handleSort = (key: string) => {
        setSortConfig(current => {
            if (current?.key === key) {
                return { key, direction: current.direction === 'asc' ? 'desc' : 'asc' };
            }
            return { key, direction: 'asc' };
        });
    };
  
    // Client-side filtering of the Server Page (IMPERFECT but preserves UI logic)
    const displayOrders = useMemo(() => {
      if (!sellerAuth) return [];
      return orders.filter(o => {
        const isSentByMe = hasSentOfferByMe(o);
        const isRelevant = activeTab === 'new' 
          ? ((o.statusAdmin === 'ОТКРЫТ' || o.statusAdmin === 'В обработке') && !o.isProcessed && !isSentByMe && !o.isRefused)
          : isSentByMe;
        
        if (!isRelevant) return false;
        
        if (activeBrandFilter) {
            const brand = o.car?.model?.split(' ')[0].toUpperCase() || '';
            if (brand !== activeBrandFilter) return false;
        }
        return true;
      });
    }, [orders, activeTab, sellerAuth, optimisticSentIds, activeBrandFilter]);
  
    const availableBrands = useMemo(() => {
        const brands = new Set<string>();
        orders.forEach(o => {
            if (o.status === OrderStatus.OPEN && !o.isProcessed && !hasSentOfferByMe(o) && !o.isRefused) {
                const brand = o.car?.model?.split(' ')[0].toUpperCase();
                if (brand) brands.add(brand);
            }
        });
        return Array.from(brands).sort();
    }, [orders, sellerAuth, optimisticSentIds]);
  
    const isOrderValid = (order: Order) => {
        return order.items.every(item => {
            const stateKey = `${order.id}-${item.name}`;
            const state = editingItems[stateKey];
            const currentPrice = state ? state.price : 0;
            const currentQty = state ? state.offeredQty : item.quantity;
            const currentWeight = state ? state.weight : 0;
            const currentDelivery = state ? state.deliveryWeeks : 0;
            
            if (currentQty === 0) return true; // Declined item is valid
            return currentPrice > 0 && currentWeight > 0 && currentDelivery > 0;
        });
    };
  
    const handleSubmitOffer = async (order: Order, isRefusal: boolean) => {
      if (order.isProcessed || !sellerAuth) return;
  
      if (!isOrderValid(order)) {
          alert("Пожалуйста, заполните Цену, Вес и Срок доставки для всех позиций.");
          return;
      }
  
      setVanishingIds(prev => new Set(prev).add(order.id));
      setSuccessToast({ message: isRefusal ? `Отказ от заказа ${order.id} отправлен` : `Предложение к заказу ${order.id} отправлено`, id: Date.now().toString() });
      setTimeout(() => setSuccessToast(null), 3000);
  
      setTimeout(async () => {
          setOptimisticSentIds(prev => new Set(prev).add(order.id));
          setExpandedId(null);
          setVanishingIds(prev => { const n = new Set(prev); n.delete(order.id); return n; });
          
          // Маппинг данных из стейта формы
          const finalItems = order.items.map(item => {
            const stateKey = `${order.id}-${item.name}`;
            const state = editingItems[stateKey] || { 
              price: 0, 
              currency: 'CNY' as Currency, 
              offeredQty: item.quantity, 
              refImage: '',
              weight: 0,
              deliveryWeeks: 0,
              photoUrl: ''
            };
            return { 
              ...item, 
              sellerPrice: state.price, 
              sellerCurrency: 'CNY' as Currency, 
              offeredQuantity: state.offeredQty, 
              refImage: state.refImage, 
              weight: state.weight,
              deliveryWeeks: state.deliveryWeeks,
              photoUrl: state.photoUrl,
              available: state.offeredQty > 0 
            };
          });
  
          try {
            await SupabaseService.createOffer(order.id, sellerAuth.name, finalItems, order.vin, sellerAuth.phone);
            fetchData(true);
          } catch (err) {
            setOptimisticSentIds(prev => { const n = new Set(prev); n.delete(order.id); return n; });
          }
      }, 600);
    };
  
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        setSuccessToast({ message: "Скопировано", id: Date.now().toString() });
        setTimeout(() => setSuccessToast(null), 1000);
    };
  
    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <ArrowUpDown size={10} className="text-slate-300 ml-1 opacity-50 group-hover:opacity-100 transition-opacity" />;
        return sortConfig.direction === 'asc' ? <ArrowUp size={10} className="text-indigo-600 ml-1" /> : <ArrowDown size={10} className="text-indigo-600 ml-1" />;
    };
  
    // ... (RENDER - COPIED FROM ORIGINAL, ADAPTED for 'orders')
    return (
      <div className="max-w-6xl mx-auto p-4 space-y-6 relative">
        {successToast && (
            <div className="fixed top-6 right-6 z-[250] animate-in slide-in-from-top-4 fade-in duration-300">
                <div className="bg-slate-900 text-white px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 border border-slate-700">
                    <CheckCircle2 className="text-emerald-400" size={20} />
                    <div><p className="text-[10px] font-black uppercase text-emerald-400">Успешно</p><p className="text-xs font-bold">{successToast.message}</p></div>
                </div>
            </div>
        )}
  
        {showAuthModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-[400px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95 duration-300">
               <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck size={40} /></div>
               <div className="text-center space-y-1"><h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Вход поставщика</h2><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Авторизуйтесь для работы</p></div>
               <div className="grid grid-cols-2 gap-3 w-full">
                  <button onClick={() => handleDemoLogin(1)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо Поставщик 1</button>
                  <button onClick={() => handleDemoLogin(2)} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо Поставщик 2</button>
               </div>
               <div className="w-full flex items-center gap-4 py-2"><div className="flex-grow h-px bg-slate-100"></div><span className="text-[9px] font-bold text-slate-300 uppercase">или</span><div className="flex-grow h-px bg-slate-100"></div></div>
               <form onSubmit={handleLogin} className="w-full space-y-3">
                   <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Название Компании</label><input autoFocus value={tempAuth.name} onChange={e => setTempAuth({...tempAuth, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 uppercase" placeholder="ООО АВТО" /></div>
                   <div className="space-y-1"><label className="text-[9px] font-bold text-slate-400 uppercase ml-1">Номер телефона</label><input value={tempAuth.phone} onChange={handlePhoneChange} className={`w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm outline-none transition-all duration-300 ${phoneFlash ? 'border-red-500 bg-red-50' : 'border-slate-200 focus:border-indigo-600'}`} placeholder="+86 1XX XXXX XXXX" /></div>
                   <button type="submit" disabled={!tempAuth.name || !isPhoneValid(tempAuth.phone)} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 active:scale-95 transition-all mt-4 disabled:opacity-50 disabled:active:scale-100">Войти</button>
               </form>
            </div>
          </div>
        )}
  
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
           <div className="flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MARKET DASHBOARD</span>
              <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Личный кабинет</span>
           </div>
           <div className="flex items-center gap-3 w-full sm:w-auto">
               {sellerAuth?.name && (
                   <div className="flex flex-col items-end gap-0.5">
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                          <UserCircle2 size={16} className="text-indigo-600"/>
                          <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">{sellerAuth.name}</span>
                      </div>
                      <span className="text-[9px] font-bold text-slate-400">{sellerAuth.phone}</span>
                   </div>
               )}
               <button onClick={handleLogout} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100 ml-auto sm:ml-0">
                  <LogOut size={18}/>
               </button>
           </div>
        </div>
  
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard icon={<Clock size={16} className="text-indigo-600"/>} label="СЕГОДНЯ" value={stats.today} subLabel="ЗАКАЗОВ" loading={loading} />
            <StatCard icon={<Calendar size={16} className="text-indigo-600"/>} label="НЕДЕЛЯ" value={stats.week} subLabel="ЗАКАЗОВ" loading={loading} />
            <StatCard icon={<TrendingUp size={16} className="text-indigo-600"/>} label="МЕСЯЦ" value={stats.month} subLabel="ЗАКАЗОВ" loading={loading} />
            <StatCard icon={<ShieldCheck size={16} className="text-indigo-600"/>} label="ВСЕГО" value={stats.total} subLabel="ЗАКАЗОВ" loading={loading} />          
          <div className="col-span-full bg-slate-900 rounded-2xl p-4 flex items-center justify-between border border-slate-800 shadow-xl overflow-hidden relative min-h-[80px]">
              <div className="z-10">
                  <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Лидер спроса на рынке</span>
                  <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{stats.leader}</h3>
              </div>
              <Car size={64} className="text-white/10 absolute -right-4 -bottom-4 rotate-[-12deg]" />
          </div>
      </div>

      <div className="space-y-4">
         <div className="relative group flex items-center">
            <Search className="absolute left-6 text-slate-400" size={20}/>
            <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="Поиск по VIN или модели..." className="w-full pl-14 pr-4 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold outline-none focus:border-indigo-300 shadow-sm" />
         </div>
         <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setActiveBrandFilter(null)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${!activeBrandFilter ? 'bg-slate-900 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}>Все марки</button>
            {availableBrands.map(brand => (
                <button key={brand} onClick={() => setActiveBrandFilter(activeBrandFilter === brand ? null : brand)} className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeBrandFilter === brand ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500'}`}>{brand}</button>
            ))}
         </div>
      </div>

      <div className="flex justify-between items-end border-b border-slate-200">
         <div className="flex gap-4">
            <button onClick={() => setActiveTab('new')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'new' ? 'text-slate-900' : 'text-slate-400'}`}>Новые <span className="ml-1 bg-slate-900 text-white px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => !hasSentOfferByMe(o) && (o.statusAdmin === 'ОТКРЫТ' || o.statusAdmin === 'В обработке') && !o.isProcessed && !o.isRefused).length}</span>{activeTab === 'new' && <span className="absolute bottom-[-2px] left-0 right-0 h-1 bg-slate-900 rounded-full"></span>}</button>
            <button onClick={() => setActiveTab('processed')} className={`pb-2 text-[11px] font-black uppercase transition-all relative ${activeTab === 'processed' ? 'text-indigo-600' : 'text-slate-400'}`}>Отправленные <span className="ml-1 bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">{orders.filter(o => hasSentOfferByMe(o)).length}</span>{activeTab === 'processed' && <span className="absolute bottom-[-2px] left-0 right-0 h-1 bg-indigo-600 rounded-full"></span>}</button>
         </div>
         <button onClick={() => fetchData(false)} className="mb-2 p-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 transition-all flex items-center gap-2"><RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''}/></button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {/* HEADER ROW */}
        <div className="hidden md:block border-b border-slate-50 border-l-4 border-transparent">
            <div className="p-3 grid grid-cols-[70px_100px_2fr_1.5fr_60px_90px_140px_20px] gap-4 text-[9px] font-black uppercase text-slate-400 tracking-wider text-left select-none">
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('id')}>№ заказа <SortIcon column="id"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('brand')}>Марка <SortIcon column="brand"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('model')}>Модель <SortIcon column="model"/></div>
               <div>VIN</div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('year')}>Год <SortIcon column="year"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('date')}>Дата <SortIcon column="date"/></div>
               <div className="cursor-pointer flex items-center group" onClick={() => handleSort('status')}>Статус <SortIcon column="status"/></div>
               <div></div>
            </div>
        </div>

        {displayOrders.length === 0 && <div className="p-12 text-center text-[10px] font-black text-slate-300 uppercase italic tracking-widest">Список пуст</div>}
        {displayOrders.map(order => {
          const isExpanded = expandedId === order.id;
          const statusInfo = getOfferStatus(order);
          const isVanishing = vanishingIds.has(order.id);
          const myOffer = getMyOffer(order);
          const isDisabled = order.isProcessed === true;
          const canSubmit = isOrderValid(order);
          
          const isAllDeclined = order.items.every(item => {
              const stateKey = `${order.id}-${item.name}`;
              const state = editingItems[stateKey];
              const qty = state ? state.offeredQty : item.quantity;
              return qty === 0;
          });
          
          const fullModel = order.car?.AdminModel || order.car?.model || 'N/A';
          const brandPart = fullModel.split(' ')[0] || '-';
          const modelPart = fullModel.split(' ').slice(1).join(' ') || '-';
          const displayYear = order.car?.AdminYear || order.car?.year;

          const containerStyle = isVanishing ? "opacity-0 scale-95 h-0 overflow-hidden" : isExpanded ? "border-l-indigo-600 ring-1 ring-indigo-600 shadow-xl bg-white relative z-10 rounded-xl my-3" : "hover:bg-slate-50 border-l-transparent border-b-4 md:border-b border-slate-200 last:border-0";

          return (
            <div key={order.id} className={`transition-all duration-500 border-l-4 ${containerStyle}`}>
              {/* ROW CONTENT */}
              <div onClick={() => !isVanishing && setExpandedId(isExpanded ? null : order.id)} className="p-3 cursor-pointer select-none grid grid-cols-1 md:grid-cols-[70px_100px_2fr_1.5fr_60px_90px_140px_20px] gap-2 md:gap-4 items-center text-[10px] text-left">
                  <div className="flex items-center justify-between md:justify-start">
                     <div className="font-mono font-bold truncate flex items-center gap-2">
                        <span className="md:hidden text-slate-400 w-12 shrink-0">ID:</span>
                        {order.id}
                     </div>
                     <div className="md:hidden flex items-center gap-2">
                        <div className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                            {statusInfo.icon}
                            {statusInfo.label}
                        </div>
                        <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/>
                     </div>
                  </div>
                  <div className="font-black uppercase truncate text-slate-800 flex items-center gap-2">
                     <span className="md:hidden text-slate-400 w-12 shrink-0">Марка:</span>
                     {brandPart}
                  </div>
                  <div className="font-black uppercase truncate text-slate-600 flex items-center gap-2">
                     <span className="md:hidden text-slate-400 w-12 shrink-0">Модель:</span>
                     {modelPart}
                  </div>
                  <div className="font-mono font-bold text-slate-500 flex items-center gap-2">
                     <span className="md:hidden text-slate-400 w-12 shrink-0">VIN:</span>
                     {order.vin}
                  </div>
                  <div className="font-bold text-slate-500 flex items-center gap-2">
                     <span className="md:hidden text-slate-400 w-12 shrink-0">Год:</span>
                     {displayYear}
                  </div>
                  <div className="font-bold text-slate-400 flex items-center gap-1">
                     <span className="md:hidden text-slate-400 w-12 shrink-0">Дата:</span>
                                          {order.createdAt.split(/[\n,]/)[0]}                  </div>
                  <div className="hidden md:flex justify-start">
                    <div className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                    </div>
                  </div>
                  <div className="hidden md:flex justify-end items-center">
                    <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/>
                  </div>
              </div>

              {isExpanded && !isVanishing && (
                <div className="p-4 bg-white border-t border-slate-100 animate-in fade-in duration-200" onClick={e => e.stopPropagation()}>
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 text-[10px] shadow-sm">
                      <div className="flex items-center gap-2 mb-3">
                         <FileText size={12} className="text-slate-400"/> 
                         <span className="font-black uppercase text-slate-500">Характеристики автомобиля</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                         <div className="group relative cursor-pointer" onClick={() => copyToClipboard(order.vin)}>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">VIN</span>
                            <span className="font-mono font-black text-slate-800 bg-white px-2 py-1 rounded border border-slate-200 inline-flex items-center gap-2 group-hover:border-indigo-300 group-hover:text-indigo-600 transition-all">
                                {order.vin} <Copy size={10} className="opacity-0 group-hover:opacity-100 transition-opacity"/>
                            </span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Марка</span>
                            <span className="font-black text-slate-700 uppercase">{brandPart}</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Модель</span>
                            <span className="font-black text-slate-700 uppercase">{modelPart}</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Кузов</span>
                            <span className="font-black text-slate-700 uppercase">{order.car?.bodyType || '-'}</span>
                         </div>
                         <div>
                            <span className="block text-[8px] font-bold text-slate-400 uppercase mb-0.5">Год</span>
                            <span className="font-black text-slate-700 uppercase">{displayYear || '-'}</span>
                         </div>
                      </div>
                  </div>

                  <div className="space-y-3">
                      {order.items.map(item => {
                        const stateKey = `${order.id}-${item.name}`;
                        const offerItem = myOffer?.items.find(i => i.name === item.name);
                        
                        const state = editingItems[stateKey] || { 
                          price: offerItem?.sellerPrice || 0, 
                          currency: 'CNY' as Currency, 
                          offeredQty: offerItem?.offeredQuantity || item.quantity, 
                          refImage: offerItem?.refImage || '',
                          weight: offerItem?.weight || 0,
                          deliveryWeeks: offerItem?.deliveryWeeks || 0,
                          photoUrl: offerItem?.photoUrl || ''
                        };

                        // Находим лучшую цену и лучший срок конкурента
                        const competitors = order.offers?.filter(off => String(off.clientName || '').trim().toUpperCase() !== sellerAuth.name.trim().toUpperCase()) || [];
                        
                        const competitorPrices = competitors.map(off => off.items.find(i => i.name === item.name)?.sellerPrice).filter((p): p is number => !!p && p > 0);
                        const minCompetitorPrice = competitorPrices.length > 0 ? Math.min(...competitorPrices) : null;

                        const competitorDeliveries = competitors.map(off => off.items.find(i => i.name === item.name)?.deliveryWeeks).filter((d): d is number => !!d && d > 0);
                        const minCompetitorDelivery = competitorDeliveries.length > 0 ? Math.min(...competitorDeliveries) : null;
                        
                        const isWinner = offerItem?.rank === 'ЛИДЕР' || offerItem?.rank === 'LEADER';
                        const isUnavailable = state.offeredQty === 0;
                        const isPriceMissing = !isUnavailable && state.price === 0;
                        const isWeightMissing = !isUnavailable && (state.weight || 0) === 0;
                        const isDeliveryMissing = !isUnavailable && (state.deliveryWeeks || 0) === 0;

                        const displayName = item.AdminName || item.name;
                        const displayQty = item.AdminQuantity || item.quantity;

                        const handleNumInput = (raw: string, field: 'price' | 'offeredQty' | 'weight' | 'deliveryWeeks', max?: number) => {
                            if (isDisabled || !!myOffer) return;
                            const digits = raw.replace(/[^\d.]/g, ''); 
                            let val = parseFloat(digits) || 0;
                            
                            // Validation Limits
                            let limit = max;
                            if (field === 'price') limit = 1000000;
                            if (field === 'weight') limit = 1000;
                            if (field === 'deliveryWeeks') limit = 52;

                            if (limit && val > limit) {
                                val = limit;
                                setFlashFields(prev => new Set(prev).add(`${stateKey}-${field}`));
                                setTimeout(() => setFlashFields(prev => { const n = new Set(prev); n.delete(`${stateKey}-${field}`); return n; }), 500);
                            }

                            setEditingItems(prev => ({ ...prev, [stateKey]: { ...(prev[stateKey] || state), [field]: val } }));
                        };

                        const handleTextInput = (val: string, field: 'photoUrl') => {
                            if (isDisabled || !!myOffer) return;
                            setEditingItems(prev => ({ ...prev, [stateKey]: { ...(prev[stateKey] || state), [field]: val } }));
                        };

                        const toggleUnavailable = () => {
                           if (isDisabled || !!myOffer) return;
                           const newVal = state.offeredQty === 0 ? displayQty : 0;
                           setEditingItems(prev => ({ ...prev, [stateKey]: { ...(prev[stateKey] || state), offeredQty: newVal } }));
                        };

                        return (
                          <div key={item.name} className={`flex flex-col gap-3 border rounded-xl p-3 transition-all ${isWinner ? 'bg-emerald-50 border-emerald-200 ring-1 ring-emerald-100' : 'bg-slate-50/30'} ${isPriceMissing || isWeightMissing || isDeliveryMissing ? 'border-red-200' : 'border-slate-100'}`}>
                             <div className="flex flex-col md:flex-row justify-between gap-2">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                                        <h4 className={`font-black text-[11px] uppercase transition-all ${isUnavailable ? 'line-through text-red-400' : 'text-slate-900'}`}>{displayName}</h4>
                                        {isWinner && <span className="bg-emerald-600 text-white px-1.5 py-0.5 rounded text-[7px] font-black uppercase shadow-sm">Выбрано</span>}
                                        {isUnavailable && <span className="bg-red-100 text-red-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase">Нет в наличии</span>}
                                        {minCompetitorPrice && (
                                            <span className="bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase border border-amber-100 animate-pulse">
                                                Лучшая цена сейчас: {minCompetitorPrice} ¥
                                            </span>
                                        )}
                                        {minCompetitorDelivery && (
                                            <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded text-[7px] font-black uppercase border border-blue-100 animate-pulse">
                                                Лучший срок: {minCompetitorDelivery} нед.
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[8px] font-bold text-slate-400 uppercase">{item.category}</span>
                                        <span className="text-[9px] font-black bg-white/80 px-2 rounded border border-slate-100">Нужно: {displayQty} шт</span>
                                    </div>
                                </div>
                                {offerItem?.adminComment && (
                                    <div className="md:max-w-[250px] bg-amber-50 border border-amber-100 p-2.5 rounded-xl text-[9px] text-amber-800 flex items-start gap-2 shadow-sm animate-in zoom-in-95 duration-300">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5 text-amber-500" />
                                        <div><span className="font-black uppercase text-[7px] block mb-0.5 opacity-70">Комментарий менеджера:</span>{offerItem.adminComment}</div>
                                    </div>
                                )}
                             </div>

                             <div className="grid grid-cols-2 md:grid-cols-5 gap-3 items-end">
                                <div className="flex items-end gap-2">
                                    <button onClick={toggleUnavailable} disabled={isDisabled || !!myOffer} className={`mb-[1px] p-2 rounded-lg border transition-all ${isUnavailable ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-slate-200 text-slate-400 hover:text-red-500 hover:border-red-200'}`}><Ban size={14} /></button>
                                    <div className="flex-grow space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Кол-во</label><input type="text" disabled={isDisabled || !!myOffer} value={state.offeredQty || 0} onChange={e => handleNumInput(e.target.value, 'offeredQty', displayQty)} className={`w-full text-center font-bold text-[10px] border border-slate-200 rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none ${flashFields.has(`${stateKey}-offeredQty`) ? 'bg-red-100 border-red-400 transition-colors duration-100' : ''}`} /></div>
                                </div>
                                <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Цена (¥)</label><input type="text" disabled={isDisabled || !!myOffer || isUnavailable} value={isUnavailable ? 0 : state.price || ''} onChange={e => handleNumInput(e.target.value, 'price')} className={`w-full text-center font-black text-[10px] border rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500 ${isPriceMissing ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} ${flashFields.has(`${stateKey}-price`) ? 'bg-red-100 border-red-400 text-red-600 transition-colors duration-100' : ''}`} placeholder="0" /></div>
                                <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Вес (кг)</label><input type="text" disabled={isDisabled || !!myOffer || isUnavailable} value={isUnavailable ? 0 : state.weight || ''} onChange={e => handleNumInput(e.target.value, 'weight')} className={`w-full text-center font-bold text-[10px] border rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500 ${isWeightMissing ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} ${flashFields.has(`${stateKey}-weight`) ? 'bg-red-100 border-red-400 text-red-600 transition-colors duration-100' : ''}`} placeholder="0.0" /></div>
                                <div className="space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Срок (нед)</label><input type="text" disabled={isDisabled || !!myOffer || isUnavailable} value={isUnavailable ? 0 : state.deliveryWeeks || ''} onChange={e => handleNumInput(e.target.value, 'deliveryWeeks')} className={`w-full text-center font-bold text-[10px] border rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500 ${isDeliveryMissing ? 'border-red-300 bg-red-50/30' : 'border-slate-200'} ${flashFields.has(`${stateKey}-deliveryWeeks`) ? 'bg-red-100 border-red-400 text-red-600 transition-colors duration-100' : ''}`} placeholder="1" /></div>
                                <div className="col-span-2 md:col-span-1 space-y-1"><label className="text-[7px] font-bold text-slate-400 uppercase block">Ссылка на фото (URL)</label><div className="relative"><input type="text" disabled={isDisabled || !!myOffer || isUnavailable} value={isUnavailable ? '' : state.photoUrl || ''} onChange={e => handleTextInput(e.target.value, 'photoUrl')} className="w-full pl-7 pr-2 font-bold text-[10px] border border-slate-200 rounded-lg py-1.5 bg-white disabled:bg-slate-50 outline-none focus:border-indigo-500" placeholder="http..." /><Copy size={10} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-300" /></div></div>
                             </div>
                          </div>
                        );
                      })}
                      {!myOffer && !isDisabled && (
                        <div className="flex justify-end pt-3 border-t border-slate-100">
                          <button disabled={!canSubmit} onClick={() => handleSubmitOffer(order, isAllDeclined)} className={`px-8 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg transition-all flex items-center gap-2 ${canSubmit ? (isAllDeclined ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-slate-900 text-white hover:bg-slate-800') : 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'}`}>{canSubmit ? (isAllDeclined ? 'Отказаться' : 'Отправить предложение') : 'Заполните цены'} {isAllDeclined ? <XCircle size={14}/> : <CheckCircle size={14}/>}</button>
                        </div>
                      )}
                      {isDisabled && (
                        <div className="flex items-center gap-2 justify-center py-3 bg-slate-50 rounded-lg border border-slate-200 border-dashed text-center"><ShieldCheck size={14} className="text-slate-400"/><span className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-relaxed">
                               {statusInfo.label === 'ЧАСТИЧНО' ? 'ЗАКАЗ ОБРАБОТАН. ЕСТЬ ПОЗИЦИИ, КОТОРЫЕ УТВЕРЖДЕНЫ К ПОКУПКЕ.' :
                                statusInfo.label === 'ВЫИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВЫ ВЫИГРАЛИ ПО ВСЕМ ПОЗИЦИЯМ.' :
                                statusInfo.label === 'ПРОИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВАШЕ ПРЕДЛОЖЕНИЕ НЕ ПОДХОДИТ.' :
                                'ЗАКАЗ ОБРАБОТАН АДМИНОМ. РЕДАКТИРОВАНИЕ ЗАКРЫТО.'}
                        </span></div>
                      )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
        <Pagination totalItems={totalOrders} itemsPerPage={itemsPerPage} currentPage={currentPage} onPageChange={setCurrentPage} onItemsPerPageChange={setItemsPerPage} />
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, subLabel, loading }: { icon: React.ReactNode, label: string, value: number, subLabel: string, loading?: boolean }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-24">
        <div className="flex justify-between items-start"><div className="p-1.5 bg-indigo-50 rounded-lg">{icon}</div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
        <div>{loading ? <Loader2 className="animate-spin text-slate-200" size={16} /> : <h3 className="text-xl font-black text-slate-900">{value}</h3>}<p className="text-[7px] font-bold text-slate-500 uppercase">{subLabel}</p></div>
    </div>
);
