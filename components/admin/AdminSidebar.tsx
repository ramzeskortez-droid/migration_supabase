import React from 'react';
import { LayoutDashboard, ClipboardList, Settings, Banknote, Tag } from 'lucide-react';

interface AdminSidebarProps {
  currentView: 'listing' | 'statuses' | 'finance' | 'brands';
  setCurrentView: (view: 'listing' | 'statuses' | 'finance' | 'brands') => void;
}

export const AdminSidebar: React.FC<AdminSidebarProps> = ({ currentView, setCurrentView }) => {
  return (
    <aside className="group w-20 hover:w-64 bg-white border-r border-slate-200 p-4 flex flex-col gap-2 shrink-0 transition-all duration-300 ease-in-out overflow-hidden z-30">
      <div className="px-2 py-6 mb-4 flex items-center overflow-hidden whitespace-nowrap">
        <div className="flex items-center gap-3 text-indigo-600">
          <div className="shrink-0"><LayoutDashboard size={24} /></div>
          <span className="font-black uppercase text-lg tracking-tighter text-slate-900 opacity-0 group-hover:opacity-100 transition-opacity duration-300">Manager<span className="text-indigo-600">Panel</span></span>
        </div>
      </div>
      
      <button 
        onClick={() => setCurrentView('listing')}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${currentView === 'listing' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <div className="shrink-0"><ClipboardList size={18} /></div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Листинг</span>
      </button>

      <button 
        onClick={() => setCurrentView('brands')}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${currentView === 'brands' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <div className="shrink-0"><Tag size={18} /></div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Бренды</span>
      </button>

      <button 
        onClick={() => setCurrentView('finance')}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${currentView === 'finance' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <div className="shrink-0"><Banknote size={18} /></div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Финансы</span>
      </button>
      
      <button 
        onClick={() => setCurrentView('statuses')}
        className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs font-black uppercase transition-all whitespace-nowrap ${currentView === 'statuses' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-50'}`}
      >
        <div className="shrink-0"><Settings size={18} /></div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity duration-300">Статусы</span>
      </button>
    </aside>
  );
};