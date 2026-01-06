import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  icon: LucideIcon;
  value: string | number;
  label: string;
  period?: string;
  iconColor?: string;
}

export function KpiCard({ icon: Icon, value, label, period, iconColor = "text-purple-500" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 relative">
      {period && (
        <div className="absolute top-4 right-4 text-xs text-gray-400 uppercase font-bold">
          {period}
        </div>
      )}
      <div className="mb-4">
        <Icon className={`w-8 h-8 ${iconColor}`} />
      </div>
      <div className="mt-4">
        <div className="text-4xl font-black mb-2">{value}</div>
        <div className="text-sm text-gray-500 uppercase tracking-wide font-bold">{label}</div>
      </div>
    </div>
  );
}