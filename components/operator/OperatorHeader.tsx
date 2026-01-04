import React from 'react';
import { Database, User, Bell } from 'lucide-react';

export const OperatorHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 shrink-0 z-20 px-6 flex items-center justify-between">
      <div className="flex items-center gap-8">
         <div className="flex items-center gap-2">
           <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
             <Database size={20} strokeWidth={2.5} />
           </div>
           <div className="leading-none">
             <h1 className="font-bold text-lg text-slate-900 tracking-tight">AutoParts</h1>
             <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Order Management</span>
           </div>
         </div>
         <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
           <span className="text-slate-900">Оформление заявки</span>
         </nav>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex flex-col items-end mr-2">
          <span className="text-sm font-bold text-slate-900">Оператор</span>
          <span className="text-xs text-slate-500">Отдел обработки</span>
        </div>
        <div className="h-10 w-10 bg-gradient-to-br from-indigo-100 to-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-indigo-700">
           <User size={20} />
        </div>
        <button className="text-slate-400 hover:text-slate-600">
          <Bell size={20} />
        </button>
      </div>
    </header>
  );
};
