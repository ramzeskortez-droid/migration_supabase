import React from 'react';
import { History, Ban, CheckCircle2, MessageCircle } from 'lucide-react';
import { ActionLog } from '../../types';

interface AdminHeaderProps {
  showLogs: boolean;
  setShowLogs: (show: boolean) => void;
  loading: boolean;
  logs: ActionLog[];
  onClearDB: () => void;
  onSeed: (count: number) => void;
  seedProgress: number | null;
  unreadCount?: number;
  onOpenGlobalChat?: () => void;
  debugMode?: boolean;
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  showLogs, setShowLogs, loading, logs, onClearDB, onSeed, seedProgress, unreadCount = 0, onOpenGlobalChat, debugMode = false
}) => {
  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black uppercase text-slate-800">Панель Менеджера</h1>
        
        {/* Кнопка Чата */}
        {onOpenGlobalChat && (
            <button 
                onClick={onOpenGlobalChat}
                className="relative p-2.5 rounded-xl bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 transition-colors border border-slate-100 group"
                title="Глобальный чат"
            >
                <MessageCircle size={20} className="text-slate-600 group-hover:text-indigo-600"/>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>
        )}

        <div className="flex items-center gap-2">
            <button onClick={() => setShowLogs(!showLogs)} className={`p-2 rounded-lg ${showLogs ? 'bg-slate-200' : 'bg-slate-50'} hover:bg-slate-200 transition-colors`}>
                <History size={18} className="text-slate-600"/>
            </button>
        </div>
      </div>
      
      {debugMode && (
        <div className="flex gap-2 animate-in fade-in slide-in-from-right-4">
           <button onClick={onClearDB} className="px-3 py-2 bg-red-50 text-red-600 border border-red-100 rounded-lg text-[10px] font-black uppercase flex items-center gap-2">
              <Ban size={14}/> Очистить БД
           </button>
           <div className="flex bg-indigo-50 rounded-lg p-1 border border-indigo-100 items-center">
              {[100, 1000].map(count => (
                  <button key={count} disabled={loading} onClick={() => onSeed(count)} className="px-3 py-1.5 hover:bg-white rounded-md text-[10px] font-black uppercase text-indigo-600">
                      {count}
                  </button>
              ))}
           </div>
        </div>
      )}
    </div>
  );
};
