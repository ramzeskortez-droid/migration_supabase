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
}

export const AdminHeader: React.FC<AdminHeaderProps> = ({ 
  showLogs, setShowLogs, loading, logs, onClearDB, onSeed, seedProgress, unreadCount = 0, onOpenGlobalChat
}) => {
  return (
    <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-black uppercase text-slate-800">Панель Администратора</h1>
        
        <div className="flex items-center gap-2">
            <button onClick={() => setShowLogs(!showLogs)} className={`p-2 rounded-lg ${showLogs ? 'bg-slate-200' : 'bg-slate-50'} hover:bg-slate-200 transition-colors`}>
                <History size={18} className="text-slate-600"/>
            </button>

            <button 
                onClick={onOpenGlobalChat}
                className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100 transition-all relative"
                title="Все сообщения от поставщиков"
            >
                <MessageCircle size={18} />
                {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[8px] font-black w-4 h-4 flex items-center justify-center rounded-full border-2 border-white animate-bounce">
                        {unreadCount}
                    </span>
                )}
            </button>
        </div>
      </div>
      
      <div className="flex gap-2">
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
    </div>
  );
};