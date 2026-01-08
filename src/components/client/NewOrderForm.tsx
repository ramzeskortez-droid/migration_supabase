import React, { useState } from 'react';
import { Plus, Trash2, Package, Save } from 'lucide-react';

interface NewOrderFormProps {
  onSubmit: (items: any[]) => Promise<void>;
}

export const NewOrderForm: React.FC<NewOrderFormProps> = ({ onSubmit }) => {
  const [items, setItems] = useState([{ name: '', quantity: 1, brand: '', article: '' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const addItem = () => {
    setItems([...items, { name: '', quantity: 1, brand: '', article: '' }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    try {
      await onSubmit(items);
      setItems([{ name: '', quantity: 1, brand: '', article: '' }]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
      <div className="flex items-center gap-2 pb-4 border-b border-slate-100">
        <Package className="text-indigo-600" size={20} />
        <h2 className="text-lg font-black uppercase text-slate-800 tracking-tight">Новая заявка</h2>
      </div>

      <div className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end bg-slate-50/50 p-4 rounded-xl border border-slate-100">
            <div className="md:col-span-4 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Наименование</label>
              <input 
                required
                value={item.name}
                onChange={e => updateItem(index, 'name', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                placeholder="Что закупаем?"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Бренд</label>
              <input 
                value={item.brand}
                onChange={e => updateItem(index, 'brand', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                placeholder="Марка"
              />
            </div>
            <div className="md:col-span-3 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1">Артикул</label>
              <input 
                value={item.article}
                onChange={e => updateItem(index, 'article', e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold outline-none focus:border-indigo-500"
                placeholder="Код товара"
              />
            </div>
            <div className="md:col-span-1 space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase ml-1 text-center block">Кол-во</label>
              <input 
                type="number"
                min="1"
                value={item.quantity}
                onChange={e => updateItem(index, 'quantity', parseInt(e.target.value))}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center outline-none focus:border-indigo-500"
              />
            </div>
            <div className="md:col-span-1 pb-1 flex justify-center">
              <button 
                type="button"
                onClick={() => removeItem(index)}
                disabled={items.length === 1}
                className="p-2 text-slate-300 hover:text-red-500 transition-colors disabled:opacity-0"
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
        <button 
          type="button"
          onClick={addItem}
          className="flex items-center justify-center gap-2 px-6 py-3 border-2 border-dashed border-slate-200 text-slate-400 hover:border-indigo-300 hover:text-indigo-500 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest"
        >
          <Plus size={16} /> Добавить позицию
        </button>

        <button 
          type="submit"
          disabled={isSubmitting}
          className="flex items-center justify-center gap-2 px-10 py-3 bg-indigo-600 text-white hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all font-black uppercase text-[10px] tracking-widest disabled:opacity-50"
        >
          {isSubmitting ? 'Создание...' : 'Создать заказ'} <Save size={16} />
        </button>
      </div>
    </form>
  );
};
