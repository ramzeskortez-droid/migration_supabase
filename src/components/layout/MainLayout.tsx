import React, { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useHeaderStore } from '../../store/headerStore';
import { SupabaseService } from '../../services/supabaseService';
import { ExchangeRates } from '../../types';

export const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const [rates, setRates] = useState<ExchangeRates | null>(null);
  const customRightContent = useHeaderStore((state) => state.customRightContent);
  
  useEffect(() => {
     SupabaseService.getExchangeRates().then(setRates).catch(console.error);
  }, []);

  const formatRate = (val: number | undefined) => {
      if (val === undefined || val === null) return '0,00';
      return val.toFixed(2).replace('.', ',');
  };

  const handleLogoClick = () => {
      // Clear tokens on logo click (Reset) - consistent with previous App.tsx behavior
      localStorage.removeItem('operatorToken');
      localStorage.removeItem('buyer_auth_token');
      localStorage.removeItem('adminToken');
      navigate('/');
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-[100]">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          {/* Left Side: Logo */}
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 shrink-0 cursor-pointer" onClick={handleLogoClick}>
              <img src="/header-logo.jpg" alt="logo" className="w-7 h-7 object-cover rounded-full" />
              <span className="font-black tracking-tighter uppercase text-sm text-slate-900">
                CHINA-<span className="text-indigo-600">NAI</span>
              </span>
            </div>
          </div>

          {/* Right Side: Currency Rates & Custom Actions */}
          <div className="flex items-center gap-2 md:gap-6">
            {rates && (
              <div className="hidden md:flex items-center gap-3">
                <div className="flex flex-col items-end leading-none mr-1">
                  <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter">Курс CHINA-NAI</span>
                  <span className="text-[9px] font-black text-slate-400">{new Date(rates.date).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' })}</span>
                </div>
                
                <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 shadow-sm gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">¥/₽</span>
                    <span className="text-xs font-black text-slate-900">{formatRate(rates.cny_rub)}</span>
                  </div>
                  <div className="w-px h-3 bg-slate-200"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black text-slate-400">$/¥</span>
                    <span className="text-xs font-black text-slate-900">{formatRate(rates.cny_usd)}</span>
                  </div>
                </div>
              </div>
            )}

            {customRightContent}
          </div>
        </div>
      </header>

      <main>
        <Outlet />
      </main>
    </div>
  );
};
