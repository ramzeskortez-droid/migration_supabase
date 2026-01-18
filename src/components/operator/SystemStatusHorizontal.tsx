import React from 'react';
import { Cpu, Clock, Database, Activity } from 'lucide-react';
import { DisplayStats } from './types';

interface SystemStatusHorizontalProps {
  displayStats: DisplayStats;
}

const LIMITS = {
  rpm: 30,
  tpm: 6000
};

export const SystemStatusHorizontal: React.FC<SystemStatusHorizontalProps> = ({ displayStats }) => {

  return (

    <div className="bg-slate-900 text-white rounded-3xl p-6 shadow-xl flex flex-col md:flex-row md:items-center gap-6 md:gap-8 border border-slate-800">

      <div className="flex items-center gap-3 md:pr-6 md:border-r border-slate-800 shrink-0">

        <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">

            <Activity size={20} />

        </div>

        <div>

            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Статус</div>

            <div className="text-xs font-bold text-emerald-400 flex items-center gap-1 mt-1">

                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>

                СИСТЕМА АКТИВНА

            </div>

        </div>

      </div>



      <div className="grid grid-cols-1 sm:grid-cols-2 flex-grow gap-6 md:gap-8 items-center">

          {/* Лимит токенов (AI) */}

          <div className="space-y-2">

            <div className="flex justify-between items-end">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">

                    <Cpu size={12} className="text-purple-400"/> Лимит токенов (AI)

                </span>

                <div className="text-right">

                    {displayStats.resetIn > 0 && (

                        <span className="text-[9px] text-orange-400 font-bold block leading-none mb-1 uppercase tracking-tighter">Сброс {displayStats.resetIn}с</span>

                    )}

                    <span className="font-mono text-xs font-bold text-slate-300">{displayStats.tpm} / {LIMITS.tpm}</span>

                </div>

            </div>

            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">

                <div 

                    className={`h-full rounded-full transition-all duration-500 ${displayStats.tpm > LIMITS.tpm * 0.8 ? 'bg-red-500' : 'bg-purple-500'}`}

                    style={{ width: `${Math.min(100, (displayStats.tpm / LIMITS.tpm) * 100)}%` }}

                />

            </div>

          </div>



          {/* Лимит запросов */}

          <div className="space-y-2">

            <div className="flex justify-between items-end">

                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider flex items-center gap-1.5">

                    <Clock size={12} className="text-indigo-400"/> Лимит запросов

                </span>

                <div className="text-right">

                    {displayStats.resetIn > 0 && (

                        <span className="text-[9px] text-orange-400 font-bold block leading-none mb-1 uppercase tracking-tighter">Сброс {displayStats.resetIn}с</span>

                    )}

                    <span className="font-mono text-xs font-bold text-slate-300">{displayStats.rpm} / {LIMITS.rpm}</span>

                </div>

            </div>

            <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">

                <div 

                    className={`h-full rounded-full transition-all duration-500 ${displayStats.rpm > LIMITS.rpm * 0.8 ? 'bg-red-500' : 'bg-indigo-50'}`}

                    style={{ width: `${Math.min(100, (displayStats.rpm / LIMITS.rpm) * 100)}%` }}

                />

            </div>

          </div>

      </div>



      {/* Всего запросов */}

      <div className="md:pl-6 md:border-l border-slate-800 flex flex-col justify-center shrink-0">

        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Всего запросов</div>

        <div className="text-xl font-black font-mono text-white leading-none">

            {displayStats.totalRequests}

        </div>

      </div>

    </div>

  );

};
