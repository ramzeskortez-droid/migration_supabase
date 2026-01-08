import React from 'react';
import { LucideIcon } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface KpiCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  period?: string;
  iconColor?: string;
  tooltip?: string;
}

export function KpiCard({ icon: Icon, value, label, period, iconColor = "text-purple-500", tooltip }: KpiCardProps) {
  return (
    <div className="p-3 relative">
      {period && (
        <div className="absolute top-2 right-2 text-[8px] text-gray-300 uppercase font-bold">
          {period}
        </div>
      )}
      <div className="flex items-center mb-1">
        <Icon className={`w-3.5 h-3.5 ${iconColor} mr-2`} />
        <div className="text-[9px] text-gray-400 uppercase tracking-tight font-bold">{label}</div>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="text-xl font-black text-slate-900 leading-none">{value}</div>
    </div>
  );
}