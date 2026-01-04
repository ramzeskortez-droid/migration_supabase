import React, { useState } from 'react';
import { ShieldCheck, UserCircle2, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { AppUser } from '../../types';

interface BuyerAuthModalProps {
  isOpen: boolean;
  onLogin: (user: AppUser) => void;
}

export const BuyerAuthModal: React.FC<BuyerAuthModalProps> = ({ isOpen, onLogin }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  
  // Login State
  const [token, setToken] = useState('');
  
  // Register State
  const [regData, setRegData] = useState({ invite: '', name: '', phone: '', token: '' });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (!token) return;
      setLoading(true);
      setError(null);
      
      try {
          const user = await SupabaseService.loginWithToken(token);
          if (user && user.role === 'buyer') {
              onLogin(user);
          } else {
              setError('Неверный токен или нет прав доступа');
          }
      } catch (err: any) {
          setError(err.message || 'Ошибка входа');
      } finally {
          setLoading(false);
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (regData.invite.toLowerCase() !== 'china-nai') {
          setError('Неверный инвайт-код');
          return;
      }
      if (!regData.name || !regData.token || !regData.phone) {
          setError('Заполните все поля');
          return;
      }
      if (regData.phone.length !== 11) {
          setError('Номер телефона должен содержать ровно 11 цифр (для РФ)');
          return;
      }

      setLoading(true);
      setError(null);

      try {
          const user = await SupabaseService.registerUser(regData.name, regData.token, regData.phone, 'buyer');
          onLogin(user);
      } catch (err: any) {
          if (err.code === '23505') setError('Такой токен уже занят, придумайте другой');
          else setError(err.message || 'Ошибка регистрации');
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 animate-in zoom-in-95">
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-[420px] shadow-2xl flex flex-col items-center gap-6 overflow-hidden relative">
         
         <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-2">
            <ShieldCheck size={32} />
         </div>

         {/* Tabs */}
         <div className="flex p-1 bg-slate-100 rounded-xl w-full">
             <button 
                onClick={() => { setMode('login'); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${mode === 'login' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                 Вход
             </button>
             <button 
                onClick={() => { setMode('register'); setError(null); }}
                className={`flex-1 py-2 rounded-lg text-xs font-black uppercase transition-all ${mode === 'register' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
                 Регистрация
             </button>
         </div>

         {error && (
             <div className="w-full bg-red-50 text-red-600 px-4 py-3 rounded-xl text-[10px] font-bold text-center border border-red-100 animate-in slide-in-from-top-2">
                 {error}
             </div>
         )}

         {mode === 'login' ? (
             <div className="w-full space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                 <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setToken('buy1')} className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1 group">
                        <UserCircle2 size={16} className="text-slate-400 group-hover:text-indigo-500"/> Демо 1
                    </button>
                    <button onClick={() => setToken('buy2')} className="py-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 transition-all flex flex-col items-center gap-1 group">
                        <UserCircle2 size={16} className="text-slate-400 group-hover:text-indigo-500"/> Демо 2
                    </button>
                 </div>

                 <form onSubmit={handleLogin} className="space-y-4">
                     <div className="space-y-1">
                        <label className="text-[9px] font-black uppercase text-slate-400 ml-1">Ваш секретный токен</label>
                        <div className="relative">
                            <KeyRound size={16} className="absolute left-4 top-3.5 text-slate-400"/>
                            <input 
                                value={token} 
                                onChange={e => setToken(e.target.value)} 
                                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                                placeholder="Введите токен..." 
                                type="password"
                            />
                        </div>
                     </div>
                     <button type="submit" disabled={!token || loading} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? 'Вход...' : <><LogIn size={16}/> Войти в систему</>}
                     </button>
                 </form>
             </div>
         ) : (
             <form onSubmit={handleRegister} className="w-full space-y-3 animate-in fade-in slide-in-from-left-4 duration-300">
                 <input 
                    value={regData.invite} 
                    onChange={e => setRegData({...regData, invite: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    placeholder="Инвайт-код (от менеджера)" 
                 />
                 <input 
                    value={regData.name} 
                    maxLength={20}
                    onChange={e => setRegData({...regData, name: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all uppercase" 
                    placeholder="Название компании / Имя" 
                 />
                 <input 
                    value={regData.phone} 
                    maxLength={11}
                    onChange={e => {
                        const val = e.target.value.replace(/\D/g, '');
                        setRegData({...regData, phone: val});
                    }} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    placeholder="Телефон (11 цифр)" 
                 />
                 <input 
                    value={regData.token} 
                    maxLength={20}
                    onChange={e => setRegData({...regData, token: e.target.value})} 
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-500 focus:bg-white transition-all" 
                    placeholder="Придумайте секретный токен" 
                 />
                 <button type="submit" disabled={loading} className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2">
                    {loading ? 'Регистрация...' : <><UserPlus size={16}/> Зарегистрироваться</>}
                 </button>
             </form>
         )}
      </div>
    </div>
  );
};