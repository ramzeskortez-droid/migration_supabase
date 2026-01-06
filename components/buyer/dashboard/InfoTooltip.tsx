import React from 'react';
import { HelpCircle } from 'lucide-react';

export const InfoTooltip = ({ text }: { text: string }) => {
  return (
    <div className="group relative inline-block ml-1.5 align-middle z-[100]">
      <HelpCircle className="w-3.5 h-3.5 text-amber-400 hover:text-amber-500 cursor-help" />
      <div className="pointer-events-none absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 opacity-0 transition-opacity group-hover:opacity-100 bg-slate-800 text-white text-[10px] rounded p-2 shadow-xl leading-tight font-normal normal-case tracking-normal border border-slate-700">
        {text}
        {/* Стрелочка влево */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-slate-800"></div>
      </div>
    </div>
  );
};
