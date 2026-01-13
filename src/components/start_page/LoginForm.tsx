import React, { useState } from "react";
import { ArrowLeft, Lock, Key, AlertCircle, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Role } from "./StartPage";
import { SupabaseService } from "../../services/supabaseService";
import { useNavigate } from "react-router-dom";

interface LoginFormProps {
  role: Role;
  onBack: () => void;
}

const roleLabels: Record<string, string> = {
  operator: "Оператор",
  buyer: "Закупщик",
  admin: "Менеджер",
};

// Styles configuration based on role
const roleStyles: Record<string, { bg: string, text: string, button: string, ring: string, iconBg: string }> = {
  operator: { 
    bg: "bg-blue-50", 
    text: "text-blue-600", 
    button: "bg-blue-600 hover:bg-blue-700",
    ring: "focus:ring-blue-500",
    iconBg: "bg-blue-100"
  },
  buyer: { 
    bg: "bg-emerald-50", 
    text: "text-emerald-600", 
    button: "bg-emerald-600 hover:bg-emerald-700",
    ring: "focus:ring-emerald-500",
    iconBg: "bg-emerald-100"
  },
  admin: { 
    bg: "bg-violet-50", 
    text: "text-violet-600", 
    button: "bg-violet-600 hover:bg-violet-700",
    ring: "focus:ring-violet-500",
    iconBg: "bg-violet-100"
  }
};

// Demo users configuration
const demoUsers: Record<string, { name: string, token: string }[]> = {
  operator: [
    { name: "Женя", token: "op1" },
    { name: "Ваня", token: "op2" }
  ],
  buyer: [
    { name: "Демо 1", token: "buy1" },
    { name: "Демо 2", token: "buy2" }
  ]
};

export const LoginForm: React.FC<LoginFormProps> = ({ role, onBack }) => {
  const navigate = useNavigate();
  const [selectedUserToken, setSelectedUserToken] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState((demoUsers[role]?.length || 0) === 0);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!role) return null;
  const styles = roleStyles[role] || roleStyles.operator;
  const users = demoUsers[role] || [];

  const handleLogin = async (tokenOverride?: string) => {
    const loginToken = tokenOverride || selectedUserToken || token;
    if (!loginToken) return;

    setLoading(true);
    setError(null);

    try {
      const user = await SupabaseService.loginWithToken(loginToken);
      
      if (user) {
        if (user.role !== role && !(role === 'operator' && user.role === 'admin')) { 
             if (role === 'admin' && user.role !== 'admin') throw new Error('Нет прав менеджера');
             if (role === 'operator' && user.role !== 'operator' && user.role !== 'admin') throw new Error('Нет прав оператора');
             if (role === 'buyer' && user.role !== 'buyer') throw new Error('Нет прав закупщика');
        }

        if (role === 'operator') {
            localStorage.setItem('operatorToken', user.token);
            navigate('/operator');
        } else if (role === 'buyer') {
            localStorage.setItem('buyer_auth_token', JSON.stringify(user));
            navigate('/buyer');
        } else if (role === 'admin') {
            localStorage.setItem('adminToken', user.token);
            navigate('/admin');
        }
      } else {
        throw new Error('Неверный токен');
      }
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (userToken: string) => {
    setSelectedUserToken(userToken);
    handleLogin(userToken);
  };

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-slate-200 max-w-md w-full mx-4">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center mb-8 mt-2">
        <div
          className={`w-16 h-16 rounded-full ${styles.iconBg} flex items-center justify-center mb-4`}
        >
          <Lock className={`w-8 h-8 ${styles.text}`} />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Вход в систему</h1>
        <p className="text-slate-500 font-medium">{roleLabels[role]}</p>
      </div>

      {error && (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-600 text-sm font-medium"
        >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
        </motion.div>
      )}

      {/* User Selection (Demo Users) */}
      {users.length > 0 && (
        <div className="mb-6">
            <p className="text-slate-400 text-xs uppercase tracking-wider font-bold mb-3 text-center">Быстрый вход</p>
            <div className="grid grid-cols-2 gap-3 justify-center">
            {users.map((user, index) => (
                <button
                key={user.token}
                onClick={() => handleUserSelect(user.token)}
                className={`flex flex-col items-center p-3 rounded-xl border transition-all duration-200 ${
                    selectedUserToken === user.token
                    ? `bg-slate-50 border-slate-300 ring-2 ring-offset-1 ${styles.ring.replace('focus:', '')}`
                    : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                }`}
                >
                <div
                    className={`w-10 h-10 rounded-full ${styles.bg} flex items-center justify-center ${styles.text} font-bold text-lg mb-2`}
                >
                    {getUserInitial(user.name)}
                </div>
                <span className="text-sm font-medium text-slate-700 w-full text-center truncate">{user.name}</span>
                </button>
            ))}
            </div>
        </div>
      )}

      {/* Divider */}
      {users.length > 0 && (
        <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center text-sm">
            <button
                onClick={() => {
                setShowTokenInput(!showTokenInput);
                setSelectedUserToken(null);
                setError(null);
                }}
                className="px-4 py-1 bg-white text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 rounded-full text-xs font-medium"
            >
                или используйте токен
            </button>
            </div>
        </div>
      )}

      {/* Token Input */}
      <AnimatePresence>
        {showTokenInput && (
            <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden"
            >
            <div className="relative">
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(null); }}
                placeholder="Введите ваш токен..."
                className={`w-full pl-12 pr-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 ${styles.ring} focus:border-transparent transition-all`}
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                autoFocus
                />
            </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Login Button */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
        onClick={() => handleLogin()}
        disabled={(!selectedUserToken && !token) || loading}
        className={`w-full ${styles.button} disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-md hover:shadow-lg`}
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Lock className="w-5 h-5" />}
        Войти
      </motion.button>
    </div>
  );
};
