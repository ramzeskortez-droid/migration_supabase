import React from 'react';
import { InfoTooltip } from './InfoTooltip';

interface TotalKpiCardProps {
  title: string;
  value: string;
  description: string;
  tooltip?: string;
}

export function TotalKpiCard({ title, value, description, tooltip }: TotalKpiCardProps) {
  return (
    <div className="p-2">
      <div className="flex items-center mb-1">
        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold">{title}</div>
        {tooltip && <InfoTooltip text={tooltip} />}
      </div>
      <div className="text-3xl font-black mb-1 text-slate-900">{value}</div>
      <div className="text-[11px] text-gray-400 leading-tight">{description}</div>
    </div>
  );
}