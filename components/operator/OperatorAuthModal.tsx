import React, { useState } from 'react';
import { User, LogIn } from 'lucide-react';

interface OperatorAuthModalProps {
  onLogin: (name: string) => void;
}

export const OperatorAuthModal: React.FC<OperatorAuthModalProps> = ({ onLogin }) => {
  const [customName, setCustomName] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
        <div className="text-center mb-8">
          <div className="bg-indigo-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-indigo-600">
            <User size={32} />
          </div>
          <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Вход в систему</h2>
          <p className="text-slate-500 text-sm font-medium mt-2">Выберите профиль оператора или представьтесь</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <button 
            onClick={() => onLogin('Женя')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">Ж</div>
            <span className="font-bold text-slate-700">Женя</span>
          </button>
          <button 
            onClick={() => onLogin('Ваня')}
            className="flex flex-col items-center justify-center p-4 rounded-xl border-2 border-slate-100 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
          >
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold mb-2 group-hover:scale-110 transition-transform">В</div>
            <span className="font-bold text-slate-700">Ваня</span>
          </button>
        </div>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-slate-400 font-bold tracking-wider">Или</span>
          </div>
        </div>

        <form 
          onSubmit={(e) => { e.preventDefault(); if (customName.trim()) onLogin(customName); }}
          className="flex gap-2"
        >
          <input 
            type="text" 
            placeholder="Ваше имя..." 
            className="flex-grow bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
          />
          <button 
            type="submit"
            disabled={!customName.trim()}
            className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg shadow-indigo-200"
          >
            <LogIn size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
