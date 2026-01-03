import React from 'react';
import { UserCircle2, Phone, LogOut, MessageCircle } from 'lucide-react';

interface SellerHeaderProps {
  sellerName: string;
  sellerPhone: string;
  onLogout: () => void;
  onOpenChat: () => void;
  unreadCount?: number;
}

export const SellerHeader: React.FC<SellerHeaderProps> = ({ sellerName, sellerPhone, onLogout, onOpenChat, unreadCount = 0 }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
       <div className="flex flex-col">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">MARKET DASHBOARD</span>
          <div className="flex items-center gap-3">
            <span className="text-lg font-black text-slate-900 uppercase tracking-tight">Личный кабинет</span>
            <button 
                onClick={onOpenChat}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-all relative"
                title="Ваши сообщения"
            >
                <MessageCircle size={20} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>
          </div>
       </div>
       <div className="flex items-center gap-3 w-full sm:w-auto">
           {sellerName && (
               <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg shadow-sm">
                      <UserCircle2 size={16} className="text-indigo-600"/>
                      <span className="text-[10px] font-black uppercase text-slate-700 tracking-tight">{sellerName}</span>
                  </div>
                  <span className="text-[9px] font-bold text-slate-400">{sellerPhone}</span>
               </div>
           )}
           <button onClick={onLogout} className="p-2 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-lg transition-colors border border-transparent hover:border-red-100 ml-auto sm:ml-0">
              <LogOut size={18}/>
           </button>
       </div>
    </div>
  );
};