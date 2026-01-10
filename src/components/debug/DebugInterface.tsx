import React, { useState } from 'react';
import { supabase } from '../../lib/supabaseClient';

export const DebugInterface: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);
  const [data, setData] = useState<any>(null);

  const addLog = (msg: string) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);

  const testSimpleSelect = async () => {
      addLog('Запуск: Простой SELECT * FROM orders LIMIT 5');
      const { data, error } = await supabase.from('orders').select('*').limit(5);
      if (error) {
          addLog('ОШИБКА: ' + JSON.stringify(error));
      } else {
          addLog(`УСПЕХ: Получено ${data?.length} записей`);
          setData(data);
      }
  };

  const testSelectWithItems = async () => {
      addLog('Запуск: SELECT orders + order_items');
      // Проверяем тот запрос, который сейчас в getOrders (упрощенный)
      const { data, error } = await supabase.from('orders').select(`
        id, 
        order_items (id, name)
      `).limit(5);
      
      if (error) {
          addLog('ОШИБКА (With Items): ' + JSON.stringify(error));
      } else {
          addLog(`УСПЕХ (With Items): Получено ${data?.length} записей`);
          setData(data);
      }
  };

  const testSelectWithBrand = async () => {
      addLog('Запуск: SELECT orders + order_items (brand)');
      const { data, error } = await supabase.from('orders').select(`
        id, 
        order_items (id, brand)
      `).limit(5);
      
      if (error) {
          addLog('ОШИБКА (Brand): ' + JSON.stringify(error));
      } else {
          addLog(`УСПЕХ (Brand): Получено ${data?.length} записей`);
          setData(data);
      }
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Debug Panel</h1>
        
        <div className="flex gap-4 mb-6">
            <button onClick={testSimpleSelect} className="px-4 py-2 bg-blue-600 text-white rounded">1. Test Simple Select</button>
            <button onClick={testSelectWithItems} className="px-4 py-2 bg-indigo-600 text-white rounded">2. Test Join Items</button>
            <button onClick={testSelectWithBrand} className="px-4 py-2 bg-purple-600 text-white rounded">3. Test Brand Column</button>
            <button onClick={() => { setLogs([]); setData(null); }} className="px-4 py-2 bg-slate-200 rounded">Clear</button>
        </div>

        <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-4 rounded shadow font-mono text-xs h-[500px] overflow-auto">
                <h3 className="font-bold mb-2">Logs:</h3>
                {logs.map((l, i) => <div key={i}>{l}</div>)}
            </div>
            <div className="bg-white p-4 rounded shadow font-mono text-xs h-[500px] overflow-auto">
                <h3 className="font-bold mb-2">Data Output:</h3>
                <pre>{JSON.stringify(data, null, 2)}</pre>
            </div>
        </div>
    </div>
  );
};
