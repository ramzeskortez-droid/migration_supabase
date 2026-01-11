import React, { useState } from "react";
import { ArrowLeft, Lock, Key, AlertCircle, Loader2 } from "lucide-react";
import { motion } from "motion/react";
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

// Demo users configuration
const demoUsers: Record<string, { name: string, token: string }[]> = {
  operator: [
    { name: "Женя", token: "op1" },
    { name: "Ваня", token: "op2" }
  ],
  buyer: [
    { name: "Демо 1", token: "buy1" },
    { name: "Демо 2", token: "buy2" }
  ],
  admin: [
    { name: "Admin", token: "admin1" }
  ],
};

const colors = [
  "from-pink-400 to-rose-500",
  "from-blue-400 to-indigo-500",
  "from-emerald-400 to-green-500",
  "from-amber-400 to-orange-500",
  "from-purple-400 to-violet-500",
];

export const LoginForm: React.FC<LoginFormProps> = ({ role, onBack }) => {
  const navigate = useNavigate();
  const [selectedUserToken, setSelectedUserToken] = useState<string | null>(null);
  const [showTokenInput, setShowTokenInput] = useState(false);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!role) return null;

  const users = demoUsers[role] || [];

  const handleUserSelect = (userToken: string) => {
    setSelectedUserToken(userToken);
    setShowTokenInput(false);
    setToken("");
    setError(null);
  };

  const handleLogin = async () => {
    const loginToken = selectedUserToken || token;
    if (!loginToken) return;

    setLoading(true);
    setError(null);

    try {
      const user = await SupabaseService.loginWithToken(loginToken);
      
      if (user) {
        if (user.role !== role && !(role === 'operator' && user.role === 'admin')) { // Admin can login as operator too ideally, but let's be strict or strict-ish
             // Allow admin to login as manager (role=admin)
             // Allow operator to login as operator
             // Allow buyer as buyer
             // Special case: admin token might be used in operator interface? Let's restrict for now based on requested role.
             if (role === 'admin' && user.role !== 'admin') throw new Error('Нет прав менеджера');
             if (role === 'operator' && user.role !== 'operator' && user.role !== 'admin') throw new Error('Нет прав оператора');
             if (role === 'buyer' && user.role !== 'buyer') throw new Error('Нет прав закупщика');
        }

        // Redirect based on role
        if (role === 'admin') navigate('/admin');
        else if (role === 'operator') navigate('/operator');
        else if (role === 'buyer') navigate('/buyer');
      } else {
        throw new Error('Неверный токен');
      }
    } catch (err: any) {
      setError(err.message || "Ошибка входа");
    } finally {
      setLoading(false);
    }
  };

  const getUserInitial = (name: string) => {
    return name.charAt(0).toUpperCase();
  };

  return (
    <div className="relative z-10 backdrop-blur-xl bg-white/10 rounded-3xl p-10 shadow-2xl border border-white/20 max-w-md w-full mx-4">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-white/60 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center mb-8 mt-4">
        <motion.div
          initial={{ rotate: -180, scale: 0 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ type: "spring", stiffness: 200 }}
          className="w-20 h-20 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/30"
        >
          <Lock className="w-10 h-10 text-white" />
        </motion.div>
        <h1 className="text-3xl font-bold text-white mb-2">Вход в систему</h1>
        <p className="text-white/70">{roleLabels[role]}</p>
      </div>

      {error && (
        <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-xl flex items-center gap-3 text-red-100 text-sm font-bold"
        >
            <AlertCircle size={18} className="shrink-0" />
            <span>{error}</span>
        </motion.div>
      )}

      {/* User Selection (Demo Users) */}
      <div className="mb-6">
        <p className="text-white/80 text-sm mb-3 font-medium text-center">Быстрый вход (Демо)</p>
        <div className="grid grid-cols-3 gap-3 justify-center">
          {users.map((user, index) => (
            <motion.button
              key={user.token}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 * index }}
              onClick={() => handleUserSelect(user.token)}
              className={`flex flex-col items-center p-4 rounded-2xl transition-all duration-200 ${
                selectedUserToken === user.token
                  ? "bg-white/30 backdrop-blur-sm border-2 border-white shadow-lg scale-105"
                  : "bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:bg-white/20"
              }`}
            >
              <div
                className={`w-12 h-12 rounded-full bg-gradient-to-br ${colors[index % colors.length]} flex items-center justify-center text-white font-bold text-lg mb-2 shadow-lg`}
              >
                {getUserInitial(user.name)}
              </div>
              <span className="text-sm font-medium text-white truncate w-full text-center">{user.name}</span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="relative my-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/20"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <button
            onClick={() => {
              setShowTokenInput(!showTokenInput);
              setSelectedUserToken(null);
              setError(null);
            }}
            className="px-4 py-1 bg-white/10 backdrop-blur-sm text-white/70 rounded-full hover:bg-white/20 hover:text-white transition-all border border-white/20"
          >
            или используйте токен
          </button>
        </div>
      </div>

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
                <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/50" />
                <input
                type="password"
                value={token}
                onChange={(e) => { setToken(e.target.value); setError(null); }}
                placeholder="Введите ваш токен..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 text-white placeholder-white/50 focus:border-white/50 focus:outline-none focus:ring-2 focus:ring-white/20 transition-all"
                onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
            </div>
            </motion.div>
        )}
      </AnimatePresence>

      {/* Login Button */}
      <motion.button
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleLogin}
        disabled={(!selectedUserToken && !token) || loading}
        className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:from-white/10 disabled:to-white/10 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-2xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {loading ? <Loader2 className="animate-spin" /> : <Lock className="w-5 h-5" />}
        Войти в систему
      </motion.button>
    </div>
  );
};
