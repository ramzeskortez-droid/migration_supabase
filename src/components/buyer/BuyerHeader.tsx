import React from 'react';
import { User, LogOut, MessageCircle } from 'lucide-react';

interface BuyerHeaderProps {
  buyerName: string;
  buyerPhone: string;
  onLogout: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export const BuyerHeader: React.FC<BuyerHeaderProps> = ({ buyerName, buyerPhone, onLogout, onOpenChat, unreadCount = 0 }) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-[100] -mx-4 -mt-4 px-4 mb-6">
        <div className="max-w-6xl mx-auto h-16 flex items-center justify-between">
            {/* Left Side: Logo */}
            <div className="flex items-center gap-2 shrink-0">
                <img src="https://i.vgy.me/0lR7Mt.png" alt="logo" className="w-8 h-8 object-contain" />
                <span className="font-black tracking-tighter uppercase text-base text-slate-900">
                CHINA-<span className="text-emerald-600">NAI</span>
                </span>
            </div>

            {/* Right Side: Actions & Profile */}
            <div className="flex items-center gap-6">
                <button 
                    onClick={onOpenChat}
                    className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all relative"
                    title="Все сообщения"
                >
                    <MessageCircle size={20} />
                    {unreadCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                            {unreadCount}
                        </span>
                    )}
                </button>

                <div className="flex items-center gap-3 pl-6 border-l border-slate-100 h-8">
                    <div className="text-right hidden sm:block">
                        <div className="text-xs font-bold text-slate-900">{buyerName}</div>
                        <div className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">Закупщик</div>
                    </div>
                    <div className="h-9 w-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600 border border-emerald-100 shadow-sm">
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
            </div>
        </div>
    </header>
  );
};