import React from 'react';
import { UserCircle2, Phone, LogOut } from 'lucide-react';

interface ClientProfileHeaderProps {
  clientName: string;
  clientPhone: string;
  onLogout: () => void;
}

export const ClientProfileHeader: React.FC<ClientProfileHeaderProps> = ({ clientName, clientPhone, onLogout }) => {
  return (
    <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex justify-between items-center">
       <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 border border-indigo-100 shrink-0"><UserCircle2 size={24}/></div>
          <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">Личный кабинет</span>
              <div className="flex items-center gap-2">
                  <h3 className="text-sm font-black text-slate-900 uppercase">{clientName || 'Гость'}</h3>
                  <span className="text-[10px] font-bold text-slate-400"><Phone size={10} className="inline mr-1"/>{clientPhone}</span>
              </div>
          </div>
       </div>
       <button onClick={onLogout} className="p-2.5 bg-slate-50 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-all"><LogOut size={18}/></button>
    </div>
  );
};