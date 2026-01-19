import React, { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface CopyButtonProps {
  text: string;
  className?: string;
  iconSize?: number;
}

export const CopyButton: React.FC<CopyButtonProps> = ({ text, className, iconSize = 12 }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row click or accordion toggle
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <button 
      onClick={handleCopy}
      className={`hover:bg-slate-200 p-1 rounded transition-colors text-slate-400 hover:text-indigo-600 shrink-0 flex items-center justify-center ${className || ''}`}
      title="Скопировать"
    >
      {copied ? <Check size={iconSize} className="text-emerald-500" /> : <Copy size={iconSize} />}
    </button>
  );
};
