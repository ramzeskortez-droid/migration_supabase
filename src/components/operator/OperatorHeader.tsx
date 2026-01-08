import React from 'react';
import { Database, User, Bell, LogOut, MessageCircle } from 'lucide-react';

interface OperatorHeaderProps {
  operatorName: string | null;
  onLogout: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export const OperatorHeader: React.FC<OperatorHeaderProps> = ({ operatorName, onLogout, onOpenChat, unreadCount = 0 }) => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 shrink-0 z-20 px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
         <div className="flex items-center gap-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
             <Database size={20} strokeWidth={2.5} />
           </div>
           <div className="leading-none">
             <h1 className="font-bold text-lg text-slate-900 tracking-tight">AutoParts</h1>
             <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Operator Panel</span>
           </div>
         </div>
      </div>

      <div className="flex items-center gap-6">
        <button 
            onClick={onOpenChat}
            className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all relative"
            title="Все сообщения от закупщиков"
        >
            <MessageCircle size={20} />
            {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                    {unreadCount}
                </span>
            )}
        </button>

        {operatorName && (
            <div className="flex items-center gap-3 pl-6 border-l border-slate-100">
                <div className="text-right hidden sm:block">
                    <div className="text-xs font-bold text-slate-900">{operatorName}</div>
                    <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Оператор</div>
                </div>
                <div className="h-9 w-9 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 border border-indigo-100 shadow-sm">
                    <User size={16} strokeWidth={2.5} />
                </div>
                <button 
                    onClick={onLogout}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ml-2"
                    title="Выйти"
                >
                    <LogOut size={18} />
                </button>
            </div>
        )}
      </div>
    </header>
  );
};