import React, { useEffect, useState } from 'react';
import { Activity, Cpu, Clock, Database } from 'lucide-react';
import { DisplayStats, LogHistory } from './types';

interface SystemStatusSidebarProps {
  logs: string[];
  requestHistory: LogHistory[];
  displayStats: DisplayStats;
}

const LIMITS = {
  rpm: 30,
  tpm: 6000
};

export const SystemStatusSidebar: React.FC<SystemStatusSidebarProps> = ({ displayStats }) => {
  return (
    <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden h-full">
      <div className="p-6 border-b border-slate-100">
        <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-6">
          <Activity size={18} className="text-indigo-600" />
          Статус системы
        </h3>

        <div className="space-y-6">
           <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
             <span>Лимиты AI Bot</span>
             <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">LOCAL EST.</span>
           </div>
           
           {/* TPM */}
           <div className="space-y-1">
             <div className="flex justify-between items-baseline text-sm">
               <span className="text-slate-600 flex items-center gap-2"><Cpu size={14} /> Токенов / мин</span>
               {displayStats.resetIn > 0 && (
                  <span className="text-[10px] text-orange-500 font-medium">
                    до обновления {displayStats.resetIn} сек
                  </span>
               )}
             </div>
             <div className="flex justify-between items-end mb-1">
               <span className="font-mono font-bold text-lg text-slate-700">{displayStats.tpm}</span>
               <span className="text-xs text-slate-400 mb-1">/ {LIMITS.tpm}</span>
             </div>
             <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                  className={`h-full rounded-full transition-all duration-500 ${displayStats.tpm > LIMITS.tpm * 0.8 ? 'bg-red-500' : 'bg-purple-500'}`}
                  style={{ width: `${Math.min(100, (displayStats.tpm / LIMITS.tpm) * 100)}%` }}
               />
             </div>
           </div>

           {/* RPM */}
           <div className="space-y-1">
             <div className="flex justify-between items-baseline text-sm">
               <span className="text-slate-600 flex items-center gap-2"><Clock size={14} /> Запросов / мин</span>
               {displayStats.resetIn > 0 && (
                  <span className="text-[10px] text-orange-500 font-medium">
                    до обновления {displayStats.resetIn} сек
                  </span>
               )}
             </div>
             <div className="flex justify-between items-end mb-1">
                <span className="font-mono font-bold text-lg text-slate-700">{displayStats.rpm}</span>
                <span className="text-xs text-slate-400 mb-1">/ {LIMITS.rpm}</span>
             </div>
             <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
               <div 
                  className={`h-full rounded-full transition-all duration-500 ${displayStats.rpm > LIMITS.rpm * 0.8 ? 'bg-red-500' : 'bg-indigo-500'}`}
                  style={{ width: `${Math.min(100, (displayStats.rpm / LIMITS.rpm) * 100)}%` }}
               />
             </div>
           </div>

           {/* Total */}
           <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
              <span className="text-slate-600 flex items-center gap-2"><Database size={14} /> Всего запросов</span>
              <span className="font-mono font-medium">{displayStats.totalRequests}</span>
           </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col min-h-0 p-6 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
           <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Лог событий</span>
           <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">LIVE</span>
        </div>
        
        <div className="flex-1 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 shadow-sm font-mono text-[10px] leading-relaxed text-slate-600 space-y-1.5 custom-scrollbar">
          {displayStats.logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
               <Activity size={20} />
               <span>Ожидание действий...</span>
            </div>
          ) : (
            displayStats.logs.map((log, i) => (
              <div key={i} className="border-b border-slate-50 last:border-0 pb-1 break-words">
                <span className="text-slate-400 mr-1.5 font-bold">{log.substring(1, 9)}</span>
                <span>{log.substring(11)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
};
