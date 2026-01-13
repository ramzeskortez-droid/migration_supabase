import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ClientInterface } from './components/client/ClientInterface';
import { BuyerInterface } from './components/buyer/BuyerInterface';
import { AdminInterface } from './components/admin/AdminInterface';
import { OperatorInterface } from './components/operator/OperatorInterface';
import { DebugInterface } from './components/debug/DebugInterface';
import { StartPage } from './components/start_page/StartPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { Users, ShoppingBag, ShieldCheck, TrendingUp, Menu, ChevronDown, Home } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { ExchangeRates } from './types';
import { useHeaderStore } from './store/headerStore';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [rates, setRates] = React.useState<ExchangeRates | null>(null);
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const customRightContent = useHeaderStore((state) => state.customRightContent);
  
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
            </div>

            {/* Right Side: Currency Rates & Custom Actions */}
            <div className="hidden md:flex items-center gap-6">
                {rates && (
                    <div className="flex items-center gap-3">
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

                {customRightContent}
            </div>
            </div>
        </header>
      )}

      <main>
        <Routes>
          <Route path="/" element={<StartPage />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/operator" element={
            <ProtectedRoute role="operator">
              <OperatorInterface />
            </ProtectedRoute>
          } />
          <Route path="/client" element={<ClientInterface />} />
          <Route path="/buyer" element={
            <ProtectedRoute role="buyer">
              <BuyerInterface />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute role="admin">
              <AdminInterface />
            </ProtectedRoute>
          } />
          <Route path="/debug" element={<DebugInterface />} /> 
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;