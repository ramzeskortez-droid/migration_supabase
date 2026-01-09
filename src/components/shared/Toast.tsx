import React, { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, Info, AlertTriangle, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  duration?: number;
  onClose: () => void;
}

export const Toast: React.FC<ToastProps> = ({ message, type = 'success', duration = 1000, onClose }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for exit animation
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const styles = {
    success: { bg: 'bg-slate-900', icon: <CheckCircle2 className="text-emerald-400" size={20} />, title: 'Успешно', titleColor: 'text-emerald-400' },
    error: { bg: 'bg-red-50', icon: <XCircle className="text-red-500" size={20} />, title: 'Ошибка', titleColor: 'text-red-500' },
    warning: { bg: 'bg-amber-50', icon: <AlertTriangle className="text-amber-500" size={20} />, title: 'Внимание', titleColor: 'text-amber-500' },
    info: { bg: 'bg-blue-50', icon: <Info className="text-blue-500" size={20} />, title: 'Информация', titleColor: 'text-blue-500' }
  };

  const style = styles[type];
  const isDark = type === 'success';

  return (
    <div className={`fixed top-6 right-6 z-[250] ${style.bg} ${isDark ? 'text-white border-slate-700' : 'text-slate-800 border-slate-200'} border px-5 py-3 rounded-xl shadow-2xl flex items-center gap-3 transition-all duration-300 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-4 opacity-0 pointer-events-none'}`}>
      {style.icon}
      <div>
        <p className={`text-[10px] font-black uppercase ${style.titleColor}`}>{style.title}</p>
        <p className="text-xs font-bold">{message}</p>
      </div>
      <button onClick={() => setIsVisible(false)} className={`ml-4 p-1 rounded-full hover:bg-white/10 ${isDark ? 'text-slate-500 hover:text-white' : 'text-slate-400 hover:text-slate-600'}`}>
        <X size={14}/>
      </button>
    </div>
  );
};