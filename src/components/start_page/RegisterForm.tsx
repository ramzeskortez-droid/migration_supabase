import React, { useState } from "react";
import { ArrowLeft, UserPlus, AlertCircle, Loader2, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Role } from "./StartPage";
import { SupabaseService } from "../../services/supabaseService";

interface RegisterFormProps {
  role: Role;
  onBack: () => void;
  onSwitchToLogin: () => void;
}

const roleLabels: Record<string, string> = {
  operator: "Оператор",
  buyer: "Закупщик",
  admin: "Менеджер",
};

export const RegisterForm: React.FC<RegisterFormProps> = ({ role, onBack, onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    token: "",
    inviteCode: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!role) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError(null);
  };

  const validatePhone = (phone: string) => {
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 10;
  };

  const handleRegister = async () => {
    if (!formData.name || !formData.token || !formData.inviteCode) {
      setError("Заполните обязательные поля");
      return;
    }

    if (!validatePhone(formData.phone)) {
        setError("Введите корректный номер телефона (минимум 10 цифр)");
        return;
    }

    setLoading(true);
    setError(null);

    try {
      await SupabaseService.registerUser(
        formData.name,
        formData.token,
        formData.phone,
        role as 'operator' | 'buyer' | 'admin', 
        formData.inviteCode
      );
      setSuccess(true);
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-slate-200 max-w-md w-full mx-4 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Заявка отправлена!</h2>
        <p className="text-slate-500 mb-6">
          Ваш аккаунт создан и ожидает активации. <br/>
          Сообщите ваш токен (<b>{formData.token}</b>) администратору.
        </p>
        <button
          onClick={onSwitchToLogin}
          className="w-full bg-slate-900 text-white font-semibold py-3 rounded-xl hover:bg-slate-800 transition-colors"
        >
          Вернуться ко входу
        </button>
      </div>
    );
  }

  return (
    <div className="relative bg-white rounded-2xl p-8 shadow-xl border border-slate-200 max-w-md w-full mx-4">
      <button
        onClick={onBack}
        className="absolute top-6 left-6 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="flex flex-col items-center mb-6 mt-2">
        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
          <UserPlus className="w-6 h-6 text-slate-600" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Регистрация</h1>
        <p className="text-slate-500 text-sm font-medium">{roleLabels[role]}</p>
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

      <div className="space-y-4">
        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Инвайт-код</label>
            <input
                name="inviteCode"
                value={formData.inviteCode}
                onChange={handleChange}
                placeholder="XXXXXX"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:bg-white transition-all font-mono uppercase tracking-widest text-center"
            />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Имя</label>
            <input
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Иван Иванов"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Телефон</label>
            <input
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+7 (999) 000-00-00"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
        </div>

        <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Придумайте токен</label>
            <input
                name="token"
                value={formData.token}
                onChange={handleChange}
                placeholder="secret-word-123"
                className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
            />
            <p className="text-[10px] text-slate-400 mt-1 ml-1">Используйте его как пароль для входа</p>
        </div>
      </div>

      <button
        onClick={handleRegister}
        disabled={loading}
        className="w-full mt-8 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
      >
        {loading ? <Loader2 className="animate-spin w-5 h-5" /> : "Создать аккаунт"}
      </button>

      <div className="mt-6 text-center">
        <button
            onClick={onSwitchToLogin}
            className="text-sm font-medium text-slate-500 hover:text-slate-800 transition-colors"
        >
            Уже есть аккаунт? <span className="underline">Войти</span>
        </button>
      </div>
    </div>
  );
};
