import React from 'react';

interface TotalKpiCardProps {
  title: string;
  value: string;
  description: string;
}

export function TotalKpiCard({ title, value, description }: TotalKpiCardProps) {
  return (
    <div className="bg-white rounded-lg shadow-md p-8">
      <div className="text-sm text-gray-500 uppercase tracking-wide mb-3 font-bold">{title}</div>
      <div className="text-5xl font-black mb-3">{value}</div>
      <div className="text-sm text-gray-500">{description}</div>
    </div>
  );
}