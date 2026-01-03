import React from 'react';
import { createPortal } from 'react-dom';
import { X, User, ShieldCheck, MessageCircle } from 'lucide-react';
import { ChatWindow } from './ChatWindow';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId: string;
  offerId?: string | null;
  supplierName: string; 
  currentUserRole: 'ADMIN' | 'SUPPLIER';
  itemName?: string;
}

export const ChatModal: React.FC<ChatModalProps> = ({
  isOpen, onClose, orderId, offerId, supplierName, currentUserRole, itemName
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden h-[600px] animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-900 p-4 flex justify-between items-center text-white shrink-0">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-full"><MessageCircle size={20}/></div>
                    <div>
                        <h3 className="font-black uppercase text-sm tracking-wide">Чат по заказу #{orderId}</h3>
                        <div className="text-[10px] font-bold opacity-70 flex items-center gap-1">
                            {currentUserRole === 'ADMIN' ? <User size={10}/> : <ShieldCheck size={10}/>}
                            {currentUserRole === 'ADMIN' ? `Поставщик: ${supplierName}` : 'Чат с менеджером'}
                        </div>
                    </div>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
            </div>

            <ChatWindow 
                orderId={orderId} 
                offerId={offerId} 
                supplierName={supplierName} 
                currentUserRole={currentUserRole}
                itemName={itemName}
            />
        </div>
    </div>,
    document.body
  );
};