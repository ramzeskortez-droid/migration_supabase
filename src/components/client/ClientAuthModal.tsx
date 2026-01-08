import React, { useState } from 'react';
import { ShieldCheck, UserCircle2 } from 'lucide-react';

interface ClientAuthModalProps {
  isOpen: boolean;
  onLogin: (name: string, phone: string) => void;
}

export const ClientAuthModal: React.FC<ClientAuthModalProps> = ({ isOpen, onLogin }) => {
  const [tempAuth, setTempAuth] = useState({ name: '', phone: '' });

  const formatPhoneNumber = (value: string) => {
    let digits = value.replace(/\D/g, '').slice(0, 11);
    if (!digits) return '';
    if (digits[0] === '8') digits = '7' + digits.slice(1);
    else if (digits[0] !== '7') digits = '7' + digits;
    const match = digits.match(/^(\d{1})(\d{0,3})(\d{0,3})(\d{0,2})(\d{0,2})$/);
    if (!match) return '+7'; 
    let formatted = `+${match[1]}`;
    if (match[2]) formatted += ` (${match[2]}`;
    if (match[3]) formatted += `) ${match[3]}`;
    if (match[4]) formatted += `-${match[4]}`;
    if (match[5]) formatted += `-${match[5]}`;
    return formatted;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(tempAuth.name, tempAuth.phone);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4">
      <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-[400px] shadow-2xl flex flex-col items-center gap-6 animate-in zoom-in-95">
         <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-100"><ShieldCheck size={40} /></div>
         <div className="text-center space-y-1"><h2 className="text-xl font-black uppercase text-slate-900 tracking-tight">Вход клиента</h2></div>
         <div className="grid grid-cols-2 gap-3 w-full">
            <button onClick={() => { setTempAuth({ name: 'КЛИЕНТ № 1', phone: '+7 (999) 111-22-33' }); }} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 1</button>
            <button onClick={() => { setTempAuth({ name: 'КЛИЕНТ № 2', phone: '+7 (999) 444-55-66' }); }} className="py-3 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-600 hover:bg-indigo-50 transition-all flex flex-col items-center gap-1"><UserCircle2 size={16}/> Демо 2</button>
         </div>
         <form onSubmit={handleSubmit} className="w-full space-y-3">
             <input value={tempAuth.name} onChange={e => setTempAuth({...tempAuth, name: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:border-indigo-600 uppercase" placeholder="ИМЯ" />
             <input value={tempAuth.phone} onChange={e => setTempAuth({...tempAuth, phone: formatPhoneNumber(e.target.value)})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl font-bold text-sm border-slate-200 outline-none" placeholder="+7 (XXX) XXX-XX-XX" />
             <button type="submit" disabled={!tempAuth.name} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl hover:bg-indigo-700 mt-4 disabled:opacity-50">Войти</button>
         </form>
      </div>
    </div>
  );
};