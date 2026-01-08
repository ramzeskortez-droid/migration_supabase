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
        <div className="max-w-6xl mx-auto px-2 sm:px-4 h-12 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 shrink-0">
             <img src="https://i.vgy.me/0lR7Mt.png" alt="logo" className="w-5 h-5 sm:w-6 sm:h-6 object-contain" />
             <span className="font-black tracking-tighter uppercase text-[14px] text-slate-900">
               CHINA-<span className="text-indigo-600">NAI</span>
             </span>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
               <button 
                  onClick={() => setIsMenuOpen(!isMenuOpen)}
                  className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase text-slate-700 hover:bg-slate-200 transition-all shadow-sm border border-slate-200"
               >
                  <Menu size={12} className="text-indigo-600" />
                  <span>{getActiveLabel()}</span>
                  <ChevronDown size={12} className={`text-slate-400 transition-transform ${isMenuOpen ? 'rotate-180' : ''}`} />
               </button>

               {isMenuOpen && (
                   <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                      <div className="absolute top-full left-0 mt-1 w-40 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 py-1 animate-in slide-in-from-top-1 fade-in duration-200">
                          {[
                              { path: '/operator', label: 'Оператор', icon: Users },
                              { path: '/buyer', label: 'Закупщик', icon: ShoppingBag },
                              { path: '/admin', label: 'Менеджер', icon: ShieldCheck }
                          ].map(item => (
                              <button 
                                  key={item.path}
                                  onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[10px] font-black uppercase transition-colors ${isActive(item.path) ? 'bg-indigo-50 text-indigo-600' : 'text-slate-600 hover:bg-slate-50'}`}
                              >
                                  <item.icon size={14} />
                                  <span>{item.label}</span>
                              </button>
                          ))}
                      </div>
                   </>
               )}
            </div>

            {rates && (
                <div className="hidden md:flex items-center gap-2.5 px-2.5 py-1 bg-slate-50 border border-slate-100 rounded-lg text-[10px] font-black text-slate-400 whitespace-nowrap shrink-0">
                    <div className="flex items-center gap-1 text-indigo-400 opacity-70">
                        <TrendingUp size={10} />
                        <span className="text-[8px]">{new Date(rates.date).toLocaleDateString('ru-RU')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="opacity-50">¥/₽:</span>
                        <span className="text-slate-700 tracking-tighter">{rates.cny_rub}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="opacity-50">$/₽:</span>
                        <span className="text-slate-700 tracking-tighter">{rates.usd_rub}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <span className="opacity-50">$/¥:</span>
                        <span className="text-slate-700 tracking-tighter">{rates.cny_usd}</span>
                    </div>
                </div>
            )}
          </div>
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
