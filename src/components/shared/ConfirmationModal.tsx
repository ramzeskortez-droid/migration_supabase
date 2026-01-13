import React from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, HelpCircle } from 'lucide-react';

type Variant = 'danger' | 'primary' | 'neutral';

interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string; // Mapped from confirmLabel
  cancelText?: string;  // Mapped from cancelLabel
  variant?: Variant;
  onConfirm: () => void;
  onClose: () => void; // Mapped from onCancel
  // Legacy props support
  confirmLabel?: string;
  cancelLabel?: string;
  onCancel?: () => void;
  isDangerous?: boolean; // Legacy
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ 
  isOpen, title, message, variant = 'primary', 
  onConfirm, onClose, onCancel,
  confirmText, cancelText, confirmLabel, cancelLabel, isDangerous 
}) => {
  if (!isOpen) return null;

  // Normalize props (support both new and legacy API)
  const finalVariant = isDangerous ? 'danger' : variant;
  const handleClose = onClose || onCancel || (() => {});
  const finalConfirmText = confirmText || confirmLabel || 'Подтвердить';
  const finalCancelText = cancelText || cancelLabel || 'Отмена';

  const variantStyles = {
    danger: { iconBg: 'bg-red-50', iconColor: 'text-red-500', btnBg: 'bg-red-600 hover:bg-red-700', btnText: 'text-white' },
    primary: { iconBg: 'bg-indigo-50', iconColor: 'text-indigo-600', btnBg: 'bg-indigo-600 hover:bg-indigo-700', btnText: 'text-white' },
    neutral: { iconBg: 'bg-slate-50', iconColor: 'text-slate-500', btnBg: 'bg-slate-900 hover:bg-slate-800', btnText: 'text-white' }
  };

  const style = variantStyles[finalVariant];

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200" onClick={handleClose}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200 border border-slate-100" onClick={e => e.stopPropagation()}>
        <div className="flex flex-col items-center gap-4 text-center">
          <div className={`w-12 h-12 rounded-full ${style.iconBg} ${style.iconColor} flex items-center justify-center`}>
            {finalVariant === 'danger' ? <AlertCircle size={24}/> : <HelpCircle size={24}/>}
          </div>
          <div>
            <h3 className="text-lg font-black uppercase text-slate-900">{title}</h3>
            <p className="text-xs text-slate-500 font-bold mt-1">{message}</p>
          </div>
          <div className="grid grid-cols-2 gap-3 w-full mt-2">
            <button onClick={handleClose} className="py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs uppercase transition-colors">
              {finalCancelText}
            </button>
            <button onClick={onConfirm} className={`py-3 rounded-xl ${style.btnBg} ${style.btnText} font-black text-xs uppercase shadow-lg transition-all active:scale-95`}>
              {finalConfirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};