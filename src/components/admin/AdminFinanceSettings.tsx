import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { ExchangeRates } from '../../types';
import { Banknote, Save, Calendar, Percent, Truck, RefreshCw, AlertCircle } from 'lucide-react';

export const AdminFinanceSettings: React.FC = () => {
    // Используем локальную дату (YYYY-MM-DD)
    const todayStr = new Date().toLocaleDateString('sv-SE');
    
    const [rates, setRates] = useState<ExchangeRates>({
        date: todayStr,
        cny_rub: 0,
        usd_rub: 0,
        cny_usd: 0,
        delivery_kg_usd: 0,
        markup_percent: 0
    });

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    useEffect(() => {
        const loadRates = async () => {
            setLoading(true);
            try {
                const data = await SupabaseService.getExchangeRates();
                if (data) {
                    setRates({
                        ...data,
                        date: todayStr // Всегда ставим сегодняшнюю дату для формы
                    });
                }
            } catch (e) {
                console.error('Ошибка загрузки курсов:', e);
            } finally {
                setLoading(false);
            }
        };
        loadRates();
    }, []);

    const handleChange = (field: keyof ExchangeRates, value: string) => {
        // Разрешаем ввод цифр, точек и запятых
        const rawValue = value.replace(/[^0-9.,]/g, '');
        
        // Для хранения в стейте конвертируем в число (заменяя запятую на точку)
        // Но чтобы пользователь мог вводить "13,", нам нужно хитрое состояние или
        // просто парсить при рендере?
        // Проще всего: 
        // 1. Стейт rates хранит числа (для отправки).
        // 2. Локальный стейт инпутов хранит строки (для ввода).
        // Но чтобы не усложнять, попробуем так:
        // Будем хранить число в rates, а в инпуте показывать строку с запятой, если надо?
        // Нет, инпут контролируемый. Если мы парсим сразу, мы не сможем ввести "13,".
        
        // Решение:
        // Переделаем компонент, чтобы инпуты были неконтролируемыми или имели локальный стейт строки.
        // Или просто дадим возможность вводить запятую, а парсить будем перед отправкой/расчетом.
        // Но rates используется в примере расчета сразу.
        
        // Давайте сделаем `localRates` строковым стейтом.
        
        setLocalRates(prev => ({ ...prev, [field]: rawValue }));
        
        // Обновляем числовое представление для расчетов "на лету"
        const numVal = parseFloat(rawValue.replace(',', '.')) || 0;
        setRates(prev => ({ ...prev, [field]: numVal }));
    };

    // Строковый стейт для инпутов, чтобы поддерживать ввод запятой
    const [localRates, setLocalRates] = useState<Record<keyof ExchangeRates, string>>({
        date: todayStr,
        cny_rub: '0',
        usd_rub: '0',
        cny_usd: '0',
        delivery_kg_usd: '0',
        markup_percent: '0',
        delivery_weeks_add: '0'
    });

    useEffect(() => {
        const loadRates = async () => {
            setLoading(true);
            try {
                const data = await SupabaseService.getExchangeRates();
                if (data) {
                    const loaded = {
                        ...data,
                        date: todayStr
                    };
                    setRates(loaded);
                    // Инициализируем локальный стейт строками (можно с запятыми или точками)
                    setLocalRates({
                        date: todayStr,
                        cny_rub: String(data.cny_rub),
                        usd_rub: String(data.usd_rub || 0),
                        cny_usd: String(data.cny_usd),
                        delivery_kg_usd: String(data.delivery_kg_usd),
                        markup_percent: String(data.markup_percent),
                        delivery_weeks_add: String(data.delivery_weeks_add || 0)
                    });
                }
            } catch (e) {
                console.error('Ошибка загрузки курсов:', e);
            } finally {
                setLoading(false);
            }
        };
        loadRates();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setStatus(null);
        try {
            // rates уже содержит актуальные числа (обновляются в handleChange)
            await SupabaseService.upsertExchangeRates(rates);
            setStatus({ message: 'Курсы на сегодня успешно сохранены. Перезагрузка...', type: 'success' });
            setTimeout(() => {
                window.location.reload();
            }, 800);
        } catch (e: any) {
            setStatus({ message: 'Ошибка сохранения: ' + e.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-20 text-slate-400 font-black uppercase text-xs tracking-widest animate-pulse">
                <RefreshCw size={24} className="animate-spin mb-4" />
                Загрузка финансовых настроек...
            </div>
        );
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 animate-in fade-in slide-in-from-left-4 duration-500 max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600"><Banknote size={20}/></div>
                    <h2 className="text-xl font-black uppercase text-slate-800 tracking-tight">Курсы и расчеты</h2>
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 rounded-lg text-[10px] font-black text-slate-500 uppercase">
                    <Calendar size={14} /> {new Date().toLocaleDateString('ru-RU')}
                </div>
            </div>

            {status && (
                <div className={`mb-6 p-4 rounded-xl flex items-center gap-3 font-bold text-sm animate-in slide-in-from-top-2 ${status.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                    {status.type === 'success' ? <RefreshCw size={18} /> : <AlertCircle size={18} />}
                    {status.message}
                </div>
            )}

            <form onSubmit={handleSave} className="space-y-8">
                {/* Валютные курсы */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Юань → Рубль (¥/₽)</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 font-black text-xl text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
                            value={localRates.cny_rub}
                            onChange={(e) => handleChange('cny_rub', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Доллар → Юань ($/¥)</label>
                        <input 
                            type="text" 
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 font-black text-xl text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all"
                            value={localRates.cny_usd}
                            onChange={(e) => handleChange('cny_usd', e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">+ к сроку закупщика</label>
                        <div className="relative">
                            <input 
                                type="text" 
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-4 font-black text-xl text-slate-700 outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 transition-all pr-12"
                                value={localRates.delivery_weeks_add}
                                onChange={(e) => handleChange('delivery_weeks_add', e.target.value)}
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold text-[10px] uppercase">Нед.</span>
                        </div>
                    </div>
                </div>

                {/* Логистика и Наценка */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-6 bg-slate-50 rounded-2xl border border-slate-100">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-indigo-600">
                            <Truck size={18} />
                            <h3 className="text-xs font-black uppercase tracking-wider">Логистика</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Доставка за кг ($/кг)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-indigo-500 transition-all pr-12"
                                    value={localRates.delivery_kg_usd}
                                    onChange={(e) => handleChange('delivery_kg_usd', e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">$</span>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center gap-2 text-amber-500">
                            <Percent size={18} />
                            <h3 className="text-xs font-black uppercase tracking-wider">Прибыль</h3>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Наценка на товар (%)</label>
                            <div className="relative">
                                <input 
                                    type="text" 
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 font-black text-slate-700 outline-none focus:border-amber-500 transition-all pr-12"
                                    value={localRates.markup_percent}
                                    onChange={(e) => handleChange('markup_percent', e.target.value)}
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 font-bold">%</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="pt-4 flex justify-end">
                    <button 
                        type="submit"
                        disabled={saving}
                        className="bg-slate-900 text-white px-10 py-4 rounded-xl hover:bg-slate-800 transition-all font-black uppercase text-xs tracking-widest flex items-center gap-3 shadow-xl shadow-slate-200"
                    >
                        {saving ? <RefreshCw className="animate-spin" size={18} /> : <Save size={18} />}
                        Зафиксировать курсы
                    </button>
                </div>
            </form>

            <div className="mt-12 p-6 rounded-2xl border-2 border-dashed border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Пример расчета для менеджера:</h4>
                <div className="space-y-2 text-[11px] font-bold text-slate-600">
                    <p>Формула: <span className="text-slate-900">(Цена Закуп. * Курс ¥) + (((Вес * Тариф $) * Курс $/¥) * Курс ¥) + Наценка %</span></p>
                    <div className="p-3 bg-white rounded-lg border border-slate-100 flex justify-between items-center">
                        <span>Если цена 100 ¥, вес 2кг:</span>
                        <span className="text-indigo-600">
                            (100 * {rates.cny_rub}) + (((2 * {rates.delivery_kg_usd}) * {rates.cny_usd}) * {rates.cny_rub}) + {rates.markup_percent}% 
                            = <span className="text-lg font-black ml-2">
                                {Math.round(((100 * rates.cny_rub) + (2 * rates.delivery_kg_usd * rates.cny_usd * rates.cny_rub)) * (1 + rates.markup_percent/100))} ₽
                            </span>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};