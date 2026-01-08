import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Car, Send, Zap, Plus, Trash2, Loader2 } from 'lucide-react';
import { PartCategory } from '../../types';
import { SupabaseService } from '../../services/supabaseService';

interface NewOrderFormProps {
  clientName: string;
  clientPhone: string;
  onSubmit: (vin: string, car: any, items: any[]) => Promise<void>;
  isSubmitting: boolean;
}

const DEMO_ITEMS_POOL = [
    { name: "Фильтр масляный", category: "Оригинал" },
    { name: "Колодки передние", category: "Аналог" },
    { name: "Бампер передний", category: "Б/У" },
    { name: "Свеча зажигания", category: "Оригинал" }
];

const DEMO_CARS = [
    { brand: "BMW", model: "X5 G05", prefix: "WBA" },
    { brand: "Toyota", model: "Camry V70", prefix: "JT1" },
    { brand: "Kia", model: "Rio 4", prefix: "Z94" }
];

const generateVin = (prefix: string) => {
    const chars = "ABCDEFGHJKLMNPRSTUVWXYZ0123456789";
    let result = prefix;
    while (result.length < 17) { result += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return result;
};

export const NewOrderForm: React.FC<NewOrderFormProps> = ({ clientName, clientPhone, onSubmit, isSubmitting }) => {
  const [vin, setVin] = useState('');
  const [car, setCar] = useState({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' });
  const [items, setItems] = useState([{ name: '', quantity: 1, color: '', category: 'Оригинал' as PartCategory, refImage: '' }]);
  
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const brandListRef = useRef<HTMLDivElement>(null);
  const [brandsList, setBrandsList] = useState<string[]>([]);

  useEffect(() => {
      SupabaseService.getBrandsList().then(setBrandsList).catch(console.error);
  }, []);

  const isFormValid = useMemo(() => car.brand && brandsList.includes(car.brand) && items.every(i => i.name.trim().length > 0), [car.brand, items, brandsList]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || isSubmitting) return;

    const finalCar = { ...car, model: `${car.brand} ${car.model}`.trim() };
    await onSubmit(vin, finalCar, items);
    
    // Reset form on success
    setVin(''); 
    setCar({ brand: '', model: '', bodyType: '', year: '', engine: '', transmission: '' }); 
    setItems([{ name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }]);
  };

  const handleDemoOrder = () => {
    const randomCarInfo = DEMO_CARS[Math.floor(Math.random() * DEMO_CARS.length)];
    setVin(generateVin(randomCarInfo.prefix));
    setCar({
        brand: randomCarInfo.brand,
        model: randomCarInfo.model,
        year: String(new Date().getFullYear() - Math.floor(Math.random() * 5)),
        bodyType: '',
        engine: '',
        transmission: ''
    });

    const numItems = Math.floor(Math.random() * 3) + 1;
    const shuffledItems = [...DEMO_ITEMS_POOL].sort(() => 0.5 - Math.random());
    const newItems = shuffledItems.slice(0, numItems).map(item => ({
        ...item,
        quantity: Math.floor(Math.random() * 2) + 1,
        color: '',
        refImage: ''
    }));
    setItems(newItems);
  };

  return (
      <section className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-4 py-2 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
           <div className="flex items-center gap-2"><Car size={14} className="text-slate-500"/><h2 className="text-[11px] font-bold uppercase">Новая заявка</h2></div>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-6">
          <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <input value={vin} onChange={e => setVin(e.target.value.toUpperCase())} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md font-mono text-[10px] outline-none" placeholder="VIN / Шасси" />
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1 relative">
                      <input value={car.brand} onChange={(e) => { setCar({...car, brand: e.target.value}); setIsBrandOpen(true); }} onFocus={() => setIsBrandOpen(true)} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold uppercase outline-none" placeholder="Марка..." />
                      {isBrandOpen && (<div ref={brandListRef} className="absolute z-50 left-0 right-0 top-full mt-1 max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-xl">{brandsList.filter(b => b.toLowerCase().includes(car.brand.toLowerCase())).map(brand => (<div key={brand} onClick={() => { setCar({...car, brand}); setIsBrandOpen(false); }} className="px-3 py-2 text-[10px] font-bold text-slate-700 hover:bg-indigo-50 cursor-pointer uppercase">{brand}</div>))}</div>)}
                  </div>
                  <input value={car.model} onChange={e => setCar({...car, model: e.target.value})} className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold outline-none uppercase" placeholder="Модель" />
                  <input value={car.year} onChange={e => setCar({...car, year: e.target.value})} className="w-full px-2 py-1.5 bg-white border border-slate-300 rounded-md text-[10px] font-bold text-center" placeholder="Год" />
              </div>
          </div>
          <div className="space-y-3">
            {items.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <div className="flex-grow bg-white p-3 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-2">
                    <div className="md:col-span-2"><input value={item.name} onChange={e => { const ni = [...items]; ni[idx].name = e.target.value; setItems(ni); }} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] font-bold outline-none" placeholder="Деталь" /></div>
                    <select value={item.category} onChange={e => { const ni = [...items]; ni[idx].category = e.target.value as PartCategory; setItems(ni); }} className="w-full px-2 py-1 bg-slate-50 border border-slate-100 rounded text-[9px] font-black uppercase outline-none"><option>Оригинал</option><option>Б/У</option><option>Аналог</option></select>
                    <input type="number" value={item.quantity} onChange={e => { const ni = [...items]; ni[idx].quantity = parseInt(e.target.value); setItems(ni); }} className="w-full px-1 py-1 bg-slate-50 border border-slate-100 rounded text-[10px] text-center font-black" />
                </div>
                <button type="button" onClick={() => items.length > 1 && setItems(items.filter((_, i) => i !== idx))} className="mt-4 p-2 text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
              </div>
            ))}
            <button type="button" onClick={() => setItems([...items, { name: '', quantity: 1, color: '', category: 'Оригинал', refImage: '' }])} className="text-[9px] font-bold text-indigo-600 uppercase flex items-center gap-1"><Plus size={10}/> Добавить</button>
          </div>
          <div className="flex w-full items-center gap-3">
            <button type="submit" disabled={!isFormValid || isSubmitting} className={`w-full py-3 rounded-xl font-black uppercase text-[11px] tracking-widest shadow-xl flex items-center justify-center gap-3 ${isFormValid && !isSubmitting ? 'bg-slate-900 text-white hover:bg-slate-800' : 'bg-slate-300 text-slate-500'}`}>
              {isSubmitting ? <Loader2 className="animate-spin w-4 h-4"/> : <Send className="w-4 h-4" />} {isSubmitting ? 'Отправка...' : 'Отправить запрос'}
            </button>
            <button type="button" onClick={handleDemoOrder} title="Демо-заказ" className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-all border border-indigo-100">
              <Zap size={16}/>
            </button>
          </div>
        </form>
      </section>
  );
};