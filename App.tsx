import React, { useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { ClientInterface } from './components/ClientInterface';
import { SellerInterface } from './components/SellerInterface';
import { AdminInterface } from './components/AdminInterface';
import { Users, ShoppingBag, ShieldCheck, Phone, Send } from 'lucide-react';

// Хардкодим URL по умолчанию
const DEFAULT_API_URL = 'https://script.google.com/macros/s/AKfycbxooqVnUce3SIllt2RUtG-KJ5EzNswyHqrTpdsTGhc6XOKW6qaUdlr6ld77LR2KQz0-/exec';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Инициализация URL API при первом запуске
  useEffect(() => {
     if (!localStorage.getItem('GAS_API_URL')) {
         localStorage.setItem('GAS_API_URL', DEFAULT_API_URL);
     }
  }, []);

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      {/* Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-2 sm:px-4 h-14 flex items-center justify-between gap-2 sm:gap-4">
          <div className="flex items-center gap-2 shrink-0">
             <img src="https://i.vgy.me/0lR7Mt.png" alt="logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
             <span className="font-black tracking-tight uppercase hidden sm:inline text-[11px]">
               autoparts market | <span className="text-indigo-600">china-nai</span>
             </span>
          </div>

          <div className="flex-grow flex justify-center overflow-x-auto no-scrollbar">
             <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
                <button 
                  onClick={() => navigate('/client')} 
                  className={`px-2 py-1.5 sm:px-3 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${isActive('/client') ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Users size={14}/> <span>Клиент</span>
                </button>
                <button 
                  onClick={() => navigate('/supplier')} 
                  className={`px-2 py-1.5 sm:px-3 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${isActive('/supplier') ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <ShoppingBag size={14}/> <span>Поставщик</span>
                </button>
                <button 
                  onClick={() => navigate('/admin')} 
                  className={`px-2 py-1.5 sm:px-3 rounded-md text-[9px] sm:text-[10px] font-black uppercase transition-all flex items-center gap-1.5 sm:gap-2 ${isActive('/admin') ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <ShieldCheck size={14}/> <span>Админ</span>
                </button>
             </div>
          </div>

          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-slate-500">
             <div className="flex items-center gap-1.5 hover:text-indigo-600 cursor-pointer transition-colors">
                <Phone size={12} className="text-indigo-500"/>
                <span>+7 (999) 000-00-00</span>
             </div>
             <div className="flex items-center gap-1.5 hover:text-blue-500 cursor-pointer transition-colors">
                <Send size={12} className="text-blue-400"/>
                <span>Telegram Support</span>
             </div>
          </div>
        </div>
      </header>

      <main>
        <Routes>
          <Route path="/client" element={<ClientInterface />} />
          <Route path="/supplier" element={<SellerInterface />} />
          <Route path="/admin" element={<AdminInterface />} />
          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/client" replace />} />
          {/* Catch all redirect */}
          <Route path="*" element={<Navigate to="/client" replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default App;