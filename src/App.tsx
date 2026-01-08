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
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left Side: Logo + Menu */}
          <div className="flex items-center gap-6">
             <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
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
                                { path: '/operator', label: 'Оператор', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
                                { path: '/buyer', label: 'Закупщик', icon: ShoppingBag, color: 'text-emerald-600', bg: 'bg-emerald-50' },
                                { path: '/admin', label: 'Менеджер', icon: ShieldCheck, color: 'text-rose-600', bg: 'bg-rose-50' }
                            ].map(item => (
                                <button 
                                    key={item.path}
                                    onClick={() => { navigate(item.path); setIsMenuOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${isActive(item.path) ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                                >
                                    <div className={`p-1.5 rounded-lg ${isActive(item.path) ? 'bg-white shadow-sm' : item.bg} ${isActive(item.path) ? 'text-indigo-600' : item.color}`}>
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
              <div className="hidden md:flex items-center gap-4">
                  <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-right leading-tight">
                      <div>Курс ЦБ</div>
                      <div>{new Date(rates.date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}</div>
                  </div>
                  
                  <div className="flex items-center bg-slate-50 rounded-full p-1 border border-slate-100 shadow-sm">
                      <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white shadow-sm border border-slate-100">
                          <span className="text-[10px] font-black text-slate-400">¥</span>
                          <span className="text-xs font-black text-slate-800">{rates.cny_rub}</span>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-1">
                          <span className="text-[10px] font-black text-slate-400">$</span>
                          <span className="text-xs font-black text-slate-800">{rates.usd_rub}</span>
                      </div>
                      <div className="w-px h-4 bg-slate-200 mx-1"></div>
                      <div className="flex items-center gap-1.5 px-2">
                          <span className="text-[9px] font-bold text-slate-400">$/¥</span>
                          <span className="text-[10px] font-black text-indigo-500">{rates.cny_usd}</span>
                      </div>
                  </div>
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
