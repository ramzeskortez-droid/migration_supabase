import React from 'react';
import { createPortal } from 'react-dom';
import { X, Copy } from 'lucide-react';

interface DebugCopyModalProps {
  isOpen: boolean;
  title: string;
  content: string;
  onClose: () => void;
  onConfirm: () => void;
}

export const DebugCopyModal: React.FC<DebugCopyModalProps> = ({ isOpen, title, content, onClose, onConfirm }) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100">
        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h3 className="font-black uppercase text-slate-800 text-sm tracking-tight">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} className="text-slate-400"/></button>
        </div>
        
        <div className="p-8">
          <div className="bg-slate-900 text-emerald-400 p-5 rounded-2xl font-mono text-[11px] whitespace-pre-wrap max-h-[40vh] overflow-y-auto mb-8 border border-slate-800 shadow-inner custom-scrollbar">
            {content}
          </div>
          
          <div className="flex gap-4">
            <button 
              onClick={onClose}
              className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-xs uppercase hover:bg-slate-200 transition-colors"
            >
              Закрыть
            </button>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(content);
                onConfirm();
              }}
              className="flex-1 py-4 rounded-2xl bg-indigo-600 text-white font-black text-xs uppercase shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
            >
              <Copy size={18}/> Скопировать
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};