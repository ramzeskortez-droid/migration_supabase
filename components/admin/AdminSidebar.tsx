import React from 'react';
import { LayoutDashboard, ClipboardList, Settings } from 'lucide-react';

interface AdminSidebarProps {
  currentView: 'listing' | 'statuses';
  setCurrentView: (view: 'listing' | 'statuses') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0">
      <div className="px-4 py-6 mb-4">
        <div className="flex items-center gap-3 text-indigo-600 mb-1">
          <LayoutDashboard size={24} />
          <span className="font-black uppercase text-lg tracking-tighter text-slate-900">Admin<span className="text-indigo-600">Panel</span></span>
        </div>
      </div>
      
      <button 
        onClick={() => setCurrentView('listing')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentView === 'listing' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <ClipboardList size={18} /> Листинг
      </button>
      
      <button 
        onClick={() => setCurrentView('statuses')}
        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase transition-all ${currentView === 'statuses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <Settings size={18} /> Статусы
      </button>
    </aside>
  );
};