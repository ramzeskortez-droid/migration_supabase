import React from 'react';
import { TrendingUp, Clock, Calendar, ShieldCheck, Car, Loader2 } from 'lucide-react';

interface BuyerStatsProps {
  stats: {
    today: number;
    week: number;
    month: number;
    total: number;
    leader: string;
  };
  loading?: boolean;
}

const StatCard = ({ icon, label, value, subLabel, loading }: { icon: React.ReactNode, label: string, value: number, subLabel: string, loading?: boolean }) => (
    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between h-24">
        <div className="flex justify-between items-start"><div className="p-1.5 bg-indigo-50 rounded-lg">{icon}</div><span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{label}</span></div>
        <div>{loading ? <Loader2 className="animate-spin text-slate-200" size={16} /> : <h3 className="text-xl font-black text-slate-900">{value}</h3>}<p className="text-[7px] font-bold text-slate-500 uppercase">{subLabel}</p></div>
    </div>
);

export const BuyerStats: React.FC<BuyerStatsProps> = ({ stats, loading }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Clock size={16} className="text-indigo-600"/>} label="СЕГОДНЯ" value={stats.today} subLabel="ЗАКАЗОВ" loading={loading} />
        <StatCard icon={<Calendar size={16} className="text-indigo-600"/>} label="НЕДЕЛЯ" value={stats.week} subLabel="ЗАКАЗОВ" loading={loading} />
        <StatCard icon={<TrendingUp size={16} className="text-indigo-600"/>} label="МЕСЯЦ" value={stats.month} subLabel="ЗАКАЗОВ" loading={loading} />
        <StatCard icon={<ShieldCheck size={16} className="text-indigo-600"/>} label="ВСЕГО" value={stats.total} subLabel="ЗАКАЗОВ" loading={loading} />          
        
        <div className="col-span-full bg-slate-900 rounded-2xl p-4 flex items-center justify-between border border-slate-800 shadow-xl overflow-hidden relative min-h-[80px]">
            <div className="z-10">
                <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest block mb-1">Лидер спроса на рынке</span>
                <h3 className="text-2xl font-black text-white uppercase italic tracking-tight">{stats.leader}</h3>
            </div>
            <Car size={64} className="text-white/10 absolute -right-4 -bottom-4 rotate-[-12deg]" />
        </div>
    </div>
  );
};
