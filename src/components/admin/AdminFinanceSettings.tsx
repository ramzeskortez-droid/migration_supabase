import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { ExchangeRates } from '../../types';
import { Banknote, Save, Calendar, Percent, Truck, RefreshCw, AlertCircle, HelpCircle } from 'lucide-react';

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

        // Calculator State

        const [calcPrice, setCalcPrice] = useState('100');

        const [calcWeight, setCalcWeight] = useState('2');

        const [calcQty, setCalcQty] = useState('3');

    

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

    

        // Расчеты для примера

        const price = Number(calcPrice || 0);

        const weight = Number(calcWeight || 0);

        const qty = Number(calcQty || 1);

        

        // 1. Unit Cost (Rub)

        const unitCost = (price * rates.cny_rub) + (weight * rates.delivery_kg_usd * rates.cny_usd * rates.cny_rub);

        // 2. Unit Price with Markup

        const unitPrice = unitCost * (1 + rates.markup_percent/100);

                // 3. Final Unit Price

                const totalPrice = Math.round(unitPrice);

            

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

    

                            <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">

    

                                {/* КАЛЬКУЛЯТОР */}

    

                                <div className="p-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white">

    

                                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest mb-6">

    

                                        <div className="p-1.5 bg-indigo-50 rounded text-indigo-600"><RefreshCw size={16}/></div>

    

                                        Проверка расчета

    

                                    </h4>

    

                                    

    

                                                                        <div className="grid grid-cols-2 gap-4 mb-6">

    

                                    

    

                                        

    

                                    

    

                                                                            <div>

    

                                    

    

                                        

    

                                    

    

                                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Цена (¥/шт)</label>

    

                                    

    

                                        

    

                                    

    

                                                                                <input 

    

                                    

    

                                        

    

                                    

    

                                                                                    type="number" 

    

                                    

    

                                        

    

                                    

    

                                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"

    

                                    

    

                                        

    

                                    

    

                                                                                    value={calcPrice}

    

                                    

    

                                        

    

                                    

    

                                                                                    onChange={(e) => setCalcPrice(e.target.value)}

    

                                    

    

                                        

    

                                    

    

                                                                                />

    

                                    

    

                                        

    

                                    

    

                                                                            </div>

    

                                    

    

                                        

    

                                    

    

                                                                            <div>

    

                                    

    

                                        

    

                                    

    

                                                                                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Вес (кг/шт)</label>

    

                                    

    

                                        

    

                                    

    

                                                                                <input 

    

                                    

    

                                        

    

                                    

    

                                                                                    type="number" 

    

                                    

    

                                        

    

                                    

    

                                                                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none focus:border-indigo-500 bg-slate-50 focus:bg-white transition-colors"

    

                                    

    

                                        

    

                                    

    

                                                                                    value={calcWeight}

    

                                    

    

                                        

    

                                    

    

                                                                                    onChange={(e) => setCalcWeight(e.target.value)}

    

                                    

    

                                        

    

                                    

    

                                                                                />

    

                                    

    

                                        

    

                                    

    

                                                                            </div>

    

                                    

    

                                        

    

                                    

    

                                                                        </div>

    

                

    

                                    <div className="space-y-3">

    

                                        {/* ШАГ 1: ТОВАР */}

    

                                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">

    

                                            <span className="text-slate-500 font-medium">1. Товар в рублях</span>

    

                                            <div className="text-right">

    

                                                <span className="font-mono text-slate-400 text-[10px] mr-2">

    

                                                    {price} ¥ × {rates.cny_rub} ₽

    

                                                </span>

    

                                                <span className="font-bold text-slate-700">

    

                                                    {Math.round(price * rates.cny_rub).toLocaleString()} ₽

    

                                                </span>

    

                                            </div>

    

                                        </div>

    

                

    

                                        {/* ШАГ 2: ЛОГИСТИКА */}

    

                                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">

    

                                            <span className="text-slate-500 font-medium">2. Логистика (за шт)</span>

    

                                            <div className="text-right flex flex-col">

    

                                                <span className="font-mono text-slate-400 text-[10px]">

    

                                                    {weight} кг × {rates.delivery_kg_usd}$ × {rates.cny_usd} (¥/$) × {rates.cny_rub} ₽

    

                                                </span>

    

                                                <span className="font-bold text-slate-700">

    

                                                    +{Math.round(weight * rates.delivery_kg_usd * rates.cny_usd * rates.cny_rub).toLocaleString()} ₽

    

                                                </span>

    

                                            </div>

    

                                        </div>

    

                

    

                                        {/* ШАГ 3: СЕБЕСТОИМОСТЬ */}

    

                                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100 bg-slate-50/50 p-2 rounded">

    

                                            <span className="text-slate-600 font-bold uppercase text-[10px]">Себестоимость (Unit)</span>

    

                                            <span className="font-bold text-slate-800">

    

                                                {Math.round(unitCost).toLocaleString()} ₽

    

                                            </span>

    

                                        </div>

    

                

    

                                        {/* ШАГ 4: НАЦЕНКА */}

    

                                        <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-100">

    

                                            <span className="text-amber-600 font-medium">3. Наценка ({rates.markup_percent}%)</span>

    

                                            <span className="font-bold text-amber-600">

    

                                                +{Math.round(unitCost * (rates.markup_percent / 100)).toLocaleString()} ₽

    

                                            </span>

    

                                        </div>

    

                

    

                                                                                {/* ИТОГО ЗА ЕДИНИЦУ */}

    

                

    

                                            

    

                

    

                                                                                <div className="mt-4 pt-4 border-t-2 border-indigo-100 bg-indigo-50/50 -mx-6 -mb-6 px-6 py-4 flex justify-between items-center">

    

                

    

                                            

    

                

    

                                                                                    <span className="text-indigo-900 font-black text-sm uppercase tracking-wide">ИТОГО КЛИЕНТУ (за шт)</span>

    

                

    

                                            

    

                

    

                                                                                    <span className="font-black text-2xl text-indigo-600">

    

                

    

                                            

    

                

    

                                                                                        {totalPrice.toLocaleString()} ₽

    

                

    

                                            

    

                

    

                                                                                    </span>

    

                

    

                                            

    

                

    

                                                                                </div>

    

                

    

                                            

    

                

    

                                                                            </div>

    

                                </div>

    

                

    

                                {/* СПРАВКА */}

    

                                <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200">

    

                                    <h4 className="flex items-center gap-2 text-sm font-black text-slate-700 uppercase tracking-widest mb-4">

    

                                        <div className="p-1.5 bg-slate-200 rounded text-slate-600"><HelpCircle size={16}/></div>

    

                                        Логика расчета

    

                                    </h4>

    

                                    

    

                                    <div className="space-y-4 text-xs text-slate-600 leading-relaxed">

    

                                        <p>

    

                                            <strong className="text-slate-900">1. Конвертация валют:</strong><br/>

    

                                            Все расчеты внутри системы ведутся через кросс-курс Юаня. Доллар переводится в Юань, затем в Рубль.

    

                                        </p>

    

                                        <p>

    

                                            <strong className="text-slate-900">2. Логистика:</strong><br/>

    

                                            Стоимость доставки рассчитывается на каждую единицу товара исходя из её веса. Тариф в долларах конвертируется по цепочке <span className="font-mono bg-white px-1 border rounded">$ → ¥ → ₽</span>.

    

                                        </p>

    

                                        <p>

    

                                            <strong className="text-slate-900">3. Наценка:</strong><br/>

    

                                            Применяется к полной себестоимости (Цена товара + Логистика). Это гарантирует маржинальность всей сделки.

    

                                        </p>

    

                                        <p>

    

                                            <strong className="text-slate-900">4. Округление:</strong><br/>

    

                                            Финальная цена округляется до целого рубля по математическим правилам (Math.round).

    

                                        </p>

    

                                        

    

                                        <div className="mt-6 pt-4 border-t border-slate-200">

    

                                            <div className="text-[10px] font-black text-slate-400 uppercase mb-2">Переменные:</div>

    

                                            <ul className="space-y-1 font-mono text-[10px]">

    

                                                <li className="flex justify-between"><span>CNY_RUB:</span> <span>{rates.cny_rub}</span></li>

    

                                                <li className="flex justify-between"><span>CNY_USD:</span> <span>{rates.cny_usd}</span></li>

    

                                                <li className="flex justify-between"><span>DELIVERY:</span> <span>{rates.delivery_kg_usd} $/kg</span></li>

    

                                                <li className="flex justify-between"><span>MARKUP:</span> <span>{rates.markup_percent}%</span></li>

    

                                            </ul>

    

                                        </div>

    

                                    </div>

    

                                </div>

    

                            </div>

    

                        </div>

    

                    );

    

                };

    

                

    