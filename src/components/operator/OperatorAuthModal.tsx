import React, { useState } from 'react';
import { User, LogIn, KeyRound, AlertCircle, PlusCircle, ArrowLeft, ShieldCheck, UserPlus } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';
import { AppUser } from '../../types';

interface OperatorAuthModalProps {
  onLogin: (user: AppUser) => void;
}

type AuthMode = 'login' | 'master_check' | 'register';

export const OperatorAuthModal: React.FC<OperatorAuthModalProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('login');
  
  // Login State
  const [token, setToken] = useState('');
  
  // Register State
  const [masterPassword, setMasterPassword] = useState('');
  const [newName, setNewName] = useState('');
  const [newToken, setNewToken] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState(false); // Флаг успешной регистрации

  const handleDemoLogin = (demoToken: string) => {
      setToken(demoToken);
      performLogin(demoToken);
  };

  const performLogin = async (loginToken: string) => {
    setLoading(true);
    setError(null);

    try {
      const user = await SupabaseService.loginWithToken(loginToken.trim());
      if (user) {
        if (user.role !== 'operator' && user.role !== 'admin') {
           setError('У этого токена нет прав оператора');
        } else {
           onLogin(user);
        }
      } else {
        setError('Неверный токен доступа');
      }
    } catch (err: any) {
      setError(err.message); // Используем сообщение из сервиса (там уже есть "на проверке")
    } finally {
      setLoading(false);
    }
  };

  const handleMasterCheck = (e: React.FormEvent) => {
      e.preventDefault();
      if (masterPassword === 'china-nai') {
          setMode('register');
          setError(null);
      } else {
          setError('Неверный мастер-пароль');
      }
  };

  const handleRegister = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newName.trim() || !newToken.trim()) return;
      
      setLoading(true);
      try {
          await SupabaseService.registerUser(newName, newToken, 'operator');
          setRegSuccess(true); // Показываем сообщение об ожидании
      } catch (err: any) {
          setError('Ошибка регистрации: ' + (err.message.includes('unique constraint') ? 'Такой токен уже занят' : err.message));
      } finally {
          setLoading(false);
      }
  };

  const renderContent = () => {
      if (regSuccess) {
          return (
              <div className="text-center space-y-4 animate-in fade-in duration-500">
                  <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-500 ring-4 ring-amber-50">
                      <ShieldCheck size={32} />
                  </div>
                  <h3 className="font-black text-slate-800 uppercase tracking-tight">Заявка отправлена</h3>
                  <p className="text-sm text-slate-500 font-bold leading-relaxed">Ваш аккаунт создан и ожидает проверки менеджером. <br/> Пожалуйста, попробуйте войти позже.</p>
                  <button 
                    onClick={() => { setMode('login'); setRegSuccess(false); setError(null); }}
                    className="w-full bg-slate-900 text-white p-3.5 rounded-xl font-bold uppercase text-xs tracking-widest hover:bg-slate-800 transition-all"
                  >
                    Вернуться ко входу
                  </button>
              </div>
          );
      }

      if (mode === 'login') {
          return (
            <>
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <button 
                        onClick={() => handleDemoLogin('op1')}
                        disabled={loading}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">Ж</div>
                        <span className="font-bold text-slate-700">Женя</span>
                    </button>
                    <button 
                        onClick={() => handleDemoLogin('op2')}
                        disabled={loading}
                        className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                        <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">В</div>
                        <span className="font-bold text-slate-700">Ваня</span>
                    </button>
                </div>

                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-200"></div></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Или вход по токену</span></div>
                </div>

                <form onSubmit={(e) => { e.preventDefault(); performLogin(token); }} className="flex flex-col gap-4">
                    <input 
                        type="password" 
                        placeholder="Ваш токен..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-center text-lg tracking-widest text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={token}
                        onChange={(e) => { setToken(e.target.value); setError(null); }}
                    />
                    <button 
                        type="submit"
                        disabled={!token.trim() || loading}
                        className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 disabled:opacity-70 disabled:cursor-not-allowed transition-all font-bold flex items-center justify-center gap-2"
                    >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <><LogIn size={20} /><span>Войти</span></>}
                    </button>
                </form>

                <button 
                    onClick={() => { setMode('master_check'); setError(null); setMasterPassword(''); }}
                    className="mt-6 w-full py-2 flex items-center justify-center gap-2 text-slate-400 hover:text-indigo-600 text-sm font-bold transition-colors"
                >
                    <PlusCircle size={16} />
                    <span>Создать оператора</span>
                </button>
            </>
          );
      }

      if (mode === 'master_check') {
          return (
              <form onSubmit={handleMasterCheck} className="flex flex-col gap-4 animate-in slide-in-from-right-8 fade-in duration-300">
                  <div className="text-center mb-2">
                      <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                      <h3 className="font-bold text-slate-700">Проверка прав</h3>
                      <p className="text-xs text-slate-500">Введите мастер-пароль администратора</p>
                  </div>
                  
                  <input 
                        type="password" 
                        placeholder="Мастер-пароль..." 
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-center text-lg tracking-widest text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 transition-all"
                        value={masterPassword}
                        onChange={(e) => { setMasterPassword(e.target.value); setError(null); }}
                        autoFocus
                  />

                  <button 
                        type="submit"
                        className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 font-bold"
                  >
                        Продолжить
                  </button>

                  <button 
                        type="button"
                        onClick={() => { setMode('login'); setError(null); }}
                        className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center justify-center gap-1"
                  >
                        <ArrowLeft size={14} /> Отмена
                  </button>
              </form>
          );
      }

      if (mode === 'register') {
          return (
              <form onSubmit={handleRegister} className="flex flex-col gap-4 animate-in slide-in-from-right-8 fade-in duration-300">
                  <div className="text-center mb-2">
                      <UserPlus className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
                      <h3 className="font-bold text-slate-700">Новый оператор</h3>
                  </div>

                  <div className="space-y-3">
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Имя</label>
                          <input 
                                type="text" 
                                placeholder="Например: Алексей" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                          />
                      </div>
                      <div>
                          <label className="text-xs font-bold text-slate-500 uppercase ml-1">Придумайте токен</label>
                          <input 
                                type="text" 
                                placeholder="Например: alex_secret" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-50 transition-all"
                                value={newToken}
                                onChange={(e) => setNewToken(e.target.value)}
                          />
                      </div>
                  </div>

                  <button 
                        type="submit"
                        disabled={loading || !newName || !newToken}
                        className="bg-indigo-600 text-white p-3.5 rounded-xl hover:bg-indigo-700 font-bold mt-2 flex items-center justify-center gap-2"
                  >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full" /> : <span>Подать заявку</span>}
                  </button>

                  <button 
                        type="button"
                        onClick={() => { setMode('login'); setError(null); }}
                        className="text-slate-400 hover:text-slate-600 text-sm font-bold flex items-center justify-center gap-1"
                  >
                        <ArrowLeft size={14} /> Отмена
                  </button>
              </form>
          );
      }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="text-center mb-6">
          <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600 ring-4 ring-indigo-50">
            <KeyRound size={28} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Вход в систему</h2>
        </div>

        {error && (
          <div className="mb-6 p-3 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-bold animate-in slide-in-from-top-2">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {renderContent()}
      </div>
    </div>
  );
};
