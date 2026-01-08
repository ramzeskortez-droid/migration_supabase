import React, { useEffect } from 'react';
import { MessageCircle, X } from 'lucide-react';

interface ChatNotificationProps {
  message: any;
  onClose: () => void;
  onClick: () => void;
  index?: number;
}

export const ChatNotification: React.FC<ChatNotificationProps> = ({ message, onClose, onClick, index = 0 }) => {
  useEffect(() => {
      const timer = setTimeout(onClose, 5000);
      return () => clearTimeout(timer);
  }, []);

  const bottomOffset = 24 + (index * 90); // 24px base + 90px per notification

  return (
    <div 
        onClick={onClick}
        style={{ bottom: `${bottomOffset}px` }}
        className="fixed right-6 z-[250] bg-white border border-indigo-100 p-4 rounded-2xl shadow-2xl flex items-start gap-3 cursor-pointer hover:bg-indigo-50 transition-all animate-in slide-in-from-right-10 w-80"
    >
        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-full shrink-0">
            <MessageCircle size={20} />
        </div>
        <div className="flex-grow overflow-hidden">
            <div className="flex justify-between items-start">
                <h4 className="font-black text-xs uppercase text-indigo-900 truncate pr-2">
                    {message.sender_name || 'Новое сообщение'}
                </h4>
                <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-slate-300 hover:text-slate-500 shrink-0"><X size={14}/></button>
            </div>
            <p className="text-[10px] font-bold text-slate-500 mt-1">Заказ #{message.order_id}</p>
            <p className="text-xs text-slate-700 mt-1 truncate font-medium">{message.message}</p>
        </div>
    </div>
  );
};