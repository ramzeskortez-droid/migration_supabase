import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ClientInterface } from './components/ClientInterface';
import { BuyerInterface } from './components/BuyerInterface';
import { AdminInterface } from './components/AdminInterface';
import { OperatorInterface } from './components/OperatorInterface';
import { DebugInterface } from './components/DebugInterface';
import { Users, ShoppingBag, ShieldCheck, TrendingUp, Menu, ChevronDown } from 'lucide-react';
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

  const getActiveLabel = () => {
      if (isActive('/operator')) return 'Оператор';
      if (isActive('/buyer')) return 'Закупщик';
      if (isActive('/admin')) return 'Менеджер';
      return 'Меню';
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100]">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
             <img src="https://i.vgy.me/0lR7Mt.png" alt="logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
             <span className="font-black tracking-tight uppercase hidden sm:inline text-[11px]">
               autoparts market | <span className="text-indigo-600">china-nai</span>
             </span>
          </div>

          <div className="relative">
             <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-slate-700 hover:bg-slate-200 transition-all shadow-sm border border-slate-200"
             >
                <Menu size={14} className="text-indigo-600" />
                <span>{getActiveLabel()}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
             </button>

             {isMenuOpen && (
                 <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                    <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        {[
                            { path: '/operator', label: 'Оператор', icon: Users },
                            { path: '/buyer', label: 'Закупщик', icon: ShoppingBag },
                            { path: '/admin', label: 'Менеджер', icon: ShieldCheck }
                        ].map(item => (
                            <button 
                                key={item.path}
                                onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                className={`w-full flex items-center gap-3 px-4 py-2.5 text-xs font-bold transition-colors ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                            >
                                <item.icon size={16} />
                                <span>{item.label}</span>
                            </button>
                        ))}
                    </div>
                 </>
             )}
          </div>

          {rates && (
              <div className="hidden md:flex items-center gap-3 px-3 py-1 bg-slate-50/50 border border-slate-100 rounded-lg text-[9px] font-bold text-slate-500 whitespace-nowrap shrink-0">
                  <div className="flex items-center gap-1.5 text-indigo-400">
                      <TrendingUp size={10} />
                      <span>{new Date(rates.date).toLocaleDateString('ru-RU')}</span>
                  </div>
                  <div className="w-px h-2.5 bg-slate-200"></div>
                  <div>¥/₽: <span className="text-slate-800">{rates.cny_rub}</span></div>
                  <div className="w-px h-2.5 bg-slate-200"></div>
                  <div>$/₽: <span className="text-slate-800">{rates.usd_rub}</span></div>
                  <div className="w-px h-2.5 bg-slate-200"></div>
                  <div>$/¥: <span className="text-slate-800">{rates.cny_usd}</span></div>
              </div>
          )}
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/operator" element={<OperatorInterface />} />
          <Route path="/client" element={<ClientInterface />} />
          <Route path="/buyer" element={<BuyerInterface />} />
          <Route path="/admin" element={<AdminInterface />} />
          <Route path="/debug" element={<DebugInterface />} /> 
          <Route path="/" element={<Navigate to="/operator" replace />} />
          <Route path="*" element={<Navigate to="/operator" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;
