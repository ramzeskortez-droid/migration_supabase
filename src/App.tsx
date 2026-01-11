import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ClientInterface } from './components/client/ClientInterface';
import { BuyerInterface } from './components/buyer/BuyerInterface';
import { AdminInterface } from './components/admin/AdminInterface';
import { OperatorInterface } from './components/operator/OperatorInterface';
import { DebugInterface } from './components/debug/DebugInterface';
import { StartPage } from './components/start_page/StartPage';
import { Users, ShoppingBag, ShieldCheck, TrendingUp, Menu, ChevronDown, Home } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { ExchangeRates } from './types';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rates, setRates] = React.useState<ExchangeRates | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  
  useEffect(() => {
     SupabaseService.getExchangeRates().then(setRates).catch(console.error);
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);
  const isStartPage = location.pathname === '/' || location.pathname === '/start';

  const getActiveLabel = () => {
      if (isActive('/operator')) return 'Оператор';
      if (isActive('/buyer')) return 'Закупщик';
      if (isActive('/admin')) return 'Менеджер';
      return 'Меню';
  };

  const formatRate = (val: number | undefined) => {
      if (val === undefined || val === null) return '0,00';
      return val.toFixed(2).replace('.', ',');
  };

  const handleNavigation = (path: string) => {
      // При смене интерфейса или переходе на главную — сбрасываем авторизацию
      localStorage.removeItem('operatorToken');
      localStorage.removeItem('buyer_auth_token');
      localStorage.removeItem('adminToken');
      
      navigate('/');
      setIsMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation Header - Hide on Start Page */}
      {!isStartPage && (
        <header className="bg-white border-b border-slate-200 sticky top-0 z-[100]">
            <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
            {/* Left Side: Logo + Menu */}
            <div className="flex items-center gap-6">
                <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => handleNavigation('/')}>
                    <img src="https://i.vgy.me/0lR7Mt.png" alt="logo" className="w-7 h-7 object-contain" />
                    <span className="font-black tracking-tighter uppercase text-sm text-slate-900">
                    CHINA-<span className="text-indigo-600">NAI</span>
                    </span>
                </div>

                <div className="relative">
                    <button 
                        onClick={() => setIsMenuOpen(!isMenuOpen)}
                        className="flex items-center gap-2 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-full text-[11px] font-black uppercase text-slate-600 transition-all border border-slate-200 hover:border-slate-300 hover:shadow-sm"
                    >
                        <span className="text-indigo-600">{getActiveLabel()}</span>
                        <ChevronDown size={12} className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
                    </button>

                    {isMenuOpen && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                            <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-1 animate-in slide-in-from-top-2 fade-in duration-200">
                                {[
                                    { path: '/', label: 'Главная', icon: Home, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                                    { path: '/operator', label: 'Оператор', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                    { path: '/buyer', label: 'Закупщик', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                    { path: '/admin', label: 'Менеджер', icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-50' }
                                ].map(item => (
                                    <button 
                                        key={item.path}
                                        onClick={() => handleNavigation(item.path)}
                                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isActive(item.path) && item.path !== '/' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                    >
                                        <div className={`p-1.5 rounded-lg ${isActive(item.path) && item.path !== '/' ? 'bg-white shadow-sm' : item.bg} ${isActive(item.path) && item.path !== '/' ? 'text-indigo-600' : item.color}`}>
                                            <item.icon size={14} />
                                        </div>
                                        <span>{item.label}</span>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Right Side: Currency Rates */}
            {rates && (
                <div className="hidden md:flex items-center gap-3">
                    <div className="flex flex-col items-end leading-none mr-1">
                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Курс CHINA-NAI</span>
                        <span className="text-[9px] font-black text-slate-400">{new Date(rates.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                    </div>
                    
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm gap-4">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">¥/₽</span>
                            <span className="text-xs font-black text-slate-900">{formatRate(rates.cny_rub)}</span>
                        </div>
                        <div className="w-px h-3 bg-slate-200"></div>
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-400">$/¥</span>
                            <span className="text-xs font-black text-slate-900">{formatRate(rates.cny_usd)}</span>
                        </div>
                    </div>
                </div>
            )}
            </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/operator" element={<OperatorInterface />} />
          <Route path="/client" element={<ClientInterface />} />
          <Route path="/buyer" element={<BuyerInterface />} />
          <Route path="/admin" element={<AdminInterface />} />
          <Route path="/debug" element={<DebugInterface />} /> 
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;