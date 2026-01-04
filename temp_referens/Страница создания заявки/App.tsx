import React, { useState, useEffect, useRef } from 'react';
import { 
  Bell, 
  Trash2,
  Plus,
  Send,
  Zap,
  Sparkles,
  Loader2,
  Activity,
  Cpu,
  Clock,
  Database,
  Search,
  Settings,
  User,
  Menu,
  CheckCircle,
  XCircle
} from 'lucide-react';

// Интерфейс для детали
interface Part {
  id: number;
  name: string;
  article: string;
  brand: string;
  uom: string;
  type: string;
  quantity: number;
}

interface LogHistory {
  timestamp: number;
  tokens: number;
}

// Новая структура для информации о заявке
interface OrderInfo {
  deadline: string;
  region: string;
  city: string;
  email: string;
  clientName: string;
}

const API_KEY = 'YOUR_API_KEY';

const App = () => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Состояние для списка деталей
  const [parts, setParts] = useState<Part[]>([
    { id: 1, name: '', article: '', brand: '', uom: 'шт', type: 'Оригинал', quantity: 1 }
  ]);
  
  // Состояние информации о заявке
  const [orderInfo, setOrderInfo] = useState<OrderInfo>({
    deadline: '',
    region: '',
    city: '',
    email: '',
    clientName: ''
  });

  // Состояние для превью AI (2-шаговая обработка)
  const [aiPreviewParts, setAiPreviewParts] = useState<Part[] | null>(null);

  // История запросов для подсчета Sliding Window (RPM/TPM)
  const [requestHistory, setRequestHistory] = useState<LogHistory[]>([]);

  // Статистика для отображения
  const [displayStats, setDisplayStats] = useState({
    rpm: 0,
    tpm: 0,
    totalRequests: 0,
    resetIn: 0,
    logs: [] as string[]
  });

  // Лимиты (China_nai_bot free tier limits are generous but different, keeping similar logic for demo)
  const LIMITS = {
    rpm: 30,
    tpm: 6000
  };

  const addLog = (message: string) => {
    const time = new Date().toLocaleTimeString('ru-RU', { hour12: false });
    setDisplayStats(prev => ({
      ...prev,
      logs: [`[${time}] ${message}`, ...prev.logs].slice(0, 50)
    }));
  };

  // Эффект для обновления счетчиков
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      setRequestHistory(currentHistory => {
        const recentHistory = currentHistory.filter(item => item.timestamp > oneMinuteAgo);
        
        const currentRpm = recentHistory.length;
        const currentTpm = recentHistory.reduce((sum, item) => sum + item.tokens, 0);
        
        // Find oldest request to calculate reset time
        const oldest = recentHistory[0];
        const resetIn = oldest ? Math.ceil((oldest.timestamp + 60000 - now) / 1000) : 0;

        setDisplayStats(prev => ({
          ...prev,
          rpm: currentRpm,
          tpm: currentTpm,
          resetIn: Math.max(0, resetIn)
        }));

        return recentHistory;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', type: 'Оригинал', quantity: 1 }]);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePart = (id: number, field: keyof Part, value: string | number) => {
    setParts(parts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  const updatePreviewPart = (id: number, field: keyof Part, value: string | number) => {
    if (!aiPreviewParts) return;
    setAiPreviewParts(aiPreviewParts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  // Обработка текста через API
  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    addLog(`Запуск обработки AI (China_nai_bot)...`);

    try {
      const estimatedInputTokens = Math.ceil(inputText.length / 4);
      const currentYear = new Date().getFullYear();

      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "system",
              content: "You are a specialized assistant for extracting auto parts data and order details. You always return valid JSON."
            },
            {
              role: "user",
              content: `Проанализируй текст заявки на автозапчасти.
        Текст: "${inputText}"
        
        Задача 1: Извлечь список позиций с максимальной точностью.
        Примеры разбора:
        "Комплект кабелей 3 м Danfoss 027H0438 4 шт" -> Name: "Комплект кабелей 3 м", Brand: "Danfoss", Article: "027H0438", Qty: 4, UoM: "шт"
        "Кабель медный 3 м Danfoss 02sd41438 4 м" -> Name: "Кабель медный 3 м", Brand: "Danfoss", Article: "02sd41438", Qty: 4, UoM: "м"

        Задача 2: Извлечь метаданные заявки, если они есть в тексте:
        - Дедлайн (deadline): Ищи фразы вроде "до 14.11", "срок 20.10". Верни дату в формате YYYY-MM-DD. Если год не указан, используй текущий ${currentYear}.
        - Регион (region): Например, "РФ, Московская обл.", "Тульская область".
        - Город (city): Например, "Москва", "Тула".
        - Email клиента (email): Ищи email адрес в тексте или подписи.
        - Имя клиента (client_name): Ищи имя в подписи или обращении.

        Верни JSON объект со структурой:
        {
          "order_info": {
            "deadline": "YYYY-MM-DD",
            "region": "строка",
            "city": "строка",
            "email": "строка",
            "client_name": "строка"
          },
          "parts": [
            { "name": "...", "brand": "...", "article": "...", "quantity": 0, "uom": "..." }
          ]
        }
        
        Если поле не найдено, верни пустую строку "".
        Если бренд не указан, оставь пустую строку. Если артикул не указан, оставь пустую строку. Ед. измерения (uom) определи из контекста или по умолчанию 'шт'.`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`China_nai_bot API Error: ${response.status} ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const jsonText = data.choices?.[0]?.message?.content;
      
      if (jsonText) {
        const parsedData = JSON.parse(jsonText);
        
        // Обновляем информацию о заявке
        if (parsedData.order_info) {
             setOrderInfo(prev => ({
                ...prev,
                deadline: parsedData.order_info.deadline || prev.deadline,
                region: parsedData.order_info.region || prev.region,
                city: parsedData.order_info.city || prev.city,
                email: parsedData.order_info.email || prev.email,
                clientName: parsedData.order_info.client_name || prev.clientName
             }));
             addLog(`AI: Данные заголовка извлечены.`);
        }

        if (parsedData.parts && Array.isArray(parsedData.parts)) {
          const previewParts = parsedData.parts.map((p: any, index: number) => ({
            id: Date.now() + index,
            name: p.name || '',
            article: p.article || '',
            brand: p.brand || '',
            uom: p.uom || 'шт',
            type: 'Оригинал', // Default for preview
            quantity: p.quantity || 1
          }));
          
          setAiPreviewParts(previewParts);
          addLog(`AI: Найдено ${previewParts.length} позиций. Ожидание подтверждения.`);
        } else {
          addLog(`Обработано: детали не найдены`);
        }
        
        const outputTokens = data.usage?.total_tokens || Math.ceil(jsonText.length / 4) + estimatedInputTokens;
        
        setRequestHistory(prev => [...prev, { timestamp: Date.now(), tokens: outputTokens }]);
        setDisplayStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
      }

    } catch (error) {
      console.error("Error processing request:", error);
      addLog(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAiImport = () => {
    if (aiPreviewParts) {
      // Если основной список пустой (одна пустая строка), заменяем его
      if (parts.length === 1 && !parts[0].name) {
        setParts(aiPreviewParts);
      } else {
        setParts(prev => [...prev, ...aiPreviewParts]);
      }
      setAiPreviewParts(null);
      setInputText('');
      addLog(`Позиции добавлены в таблицу.`);
    }
  };

  const cancelAiImport = () => {
    setAiPreviewParts(null);
    addLog(`Импорт отменен.`);
  };

  // Shared classes for inputs to ensure consistency
  const inputClass = "w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 placeholder:text-xs text-slate-700 shadow-sm";
  const headerClass = "col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <div className="h-screen bg-slate-50 flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* Top Navigation */}
      <header className="bg-white border-b border-slate-200 h-16 shrink-0 z-20 px-6 flex items-center justify-between">
        <div className="flex items-center gap-8">
           <div className="flex items-center gap-2">
             <div className="bg-indigo-600 p-1.5 rounded-lg text-white">
               <Database size={20} strokeWidth={2.5} />
             </div>
             <div className="leading-none">
               <h1 className="font-bold text-lg text-slate-900 tracking-tight">AutoParts</h1>
               <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase">Order Management</span>
             </div>
           </div>
           <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-500">
             <span className="text-slate-900">Оформление заявки</span>
           </nav>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end mr-2">
            <span className="text-sm font-bold text-slate-900">Менеджер</span>
            <span className="text-xs text-slate-500">Отдел закупок</span>
          </div>
          <div className="h-10 w-10 bg-gradient-to-br from-indigo-100 to-slate-100 rounded-full border border-slate-200 flex items-center justify-center text-indigo-700">
             <User size={20} />
          </div>
          <button className="text-slate-400 hover:text-slate-600">
            <Bell size={20} />
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10">
            
            {/* 1. Basic Order Information */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <h2 className="font-bold text-slate-800">Основная информация по заявке</h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Дедлайн</label>
                  <input 
                    type="date"
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700"
                    value={orderInfo.deadline}
                    onChange={(e) => setOrderInfo({...orderInfo, deadline: e.target.value})}
                  />
                </div>
                <div className="md:col-span-3">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Область / Регион</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Например: Московская обл."
                    value={orderInfo.region}
                    onChange={(e) => setOrderInfo({...orderInfo, region: e.target.value})}
                  />
                </div>
                <div className="md:col-span-3">
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Город</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Город доставки"
                    value={orderInfo.city}
                    onChange={(e) => setOrderInfo({...orderInfo, city: e.target.value})}
                  />
                </div>
                <div className="md:col-span-2">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Почта клиента</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="email@example.com"
                    value={orderInfo.email}
                    onChange={(e) => setOrderInfo({...orderInfo, email: e.target.value})}
                  />
                </div>
                 <div className="md:col-span-2">
                   <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Имя клиента</label>
                  <input 
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium"
                    placeholder="Иван И."
                    value={orderInfo.clientName}
                    onChange={(e) => setOrderInfo({...orderInfo, clientName: e.target.value})}
                  />
                </div>
              </div>
            </section>

            {/* 2. Parts List */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <h2 className="font-bold text-slate-800">Список позиций</h2>
              </div>
              
              <div className="space-y-3">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 px-2">
                  <div className={`${headerClass} text-center`}>#</div>
                  <div className={`${headerClass} col-span-3`}>Наименование</div>
                  <div className={`${headerClass} col-span-2`}>Бренд</div>
                  <div className={`${headerClass} col-span-2`}>Артикул</div>
                  <div className={`${headerClass} col-span-2`}>Тип</div>
                  <div className={`${headerClass} col-span-1 text-center`}>Ед.</div>
                  <div className={`${headerClass} col-span-1 text-center`}>Кол-во</div>
                </div>

                {parts.map((part, idx) => (
                  <div key={part.id} className="group relative grid grid-cols-12 gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2 hover:border-indigo-300 transition-colors">
                     <div className="col-span-1 text-center text-slate-400 text-xs font-medium">{idx + 1}</div>
                     <div className="col-span-3">
                       <input 
                          value={part.name}
                          onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                          placeholder="Наименование"
                          className={inputClass}
                       />
                     </div>
                     <div className="col-span-2">
                       <input 
                          value={part.brand}
                          onChange={(e) => updatePart(part.id, 'brand', e.target.value)}
                          placeholder="Бренд"
                          className={inputClass}
                       />
                     </div>
                     <div className="col-span-2">
                       <input 
                          value={part.article}
                          onChange={(e) => updatePart(part.id, 'article', e.target.value)}
                          placeholder="Артикул"
                          className={inputClass}
                       />
                     </div>
                     <div className="col-span-2">
                       <select 
                          value={part.type}
                          onChange={(e) => updatePart(part.id, 'type', e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer shadow-sm"
                        >
                         <option>Оригинал</option>
                         <option>Аналог</option>
                       </select>
                     </div>
                     <div className="col-span-1">
                        <input 
                          value={part.uom}
                          onChange={(e) => updatePart(part.id, 'uom', e.target.value)}
                          className={`${inputClass} text-center`}
                        />
                     </div>
                     <div className="col-span-1 flex justify-center">
                        <input 
                          type="number"
                          min="0"
                          step="0.1"
                          value={part.quantity}
                          onChange={(e) => updatePart(part.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className={`${inputClass} text-center font-bold`}
                        />
                     </div>
                     
                     <button 
                        onClick={() => removePart(part.id)}
                        className="absolute -right-8 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
                     >
                       <Trash2 size={16} />
                     </button>
                  </div>
                ))}

                <button 
                  onClick={addPart}
                  className="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2"
                >
                  <Plus size={14} /> ДОБАВИТЬ ПОЗИЦИЮ
                </button>
              </div>
            </section>

            {/* 3. AI Assistant */}
            <section>
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
                <h2 className="font-bold text-slate-800">ИИ Ассистент</h2>
              </div>
              
              {!aiPreviewParts ? (
                // STEP 1: Input
                <div className="space-y-4">
                  <div className="relative">
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder="Вставьте текст из письма или опишите заказ... (можно изменять размер поля)"
                      className="w-full min-h-[100px] h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y transition-all placeholder:text-slate-400 overflow-auto"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleProcess();
                        }
                      }}
                    />
                  </div>

                  <div>
                     <button
                        onClick={handleProcess}
                        disabled={isProcessing || !inputText.trim()}
                        className={`
                          px-6 py-2.5 rounded-lg text-sm font-bold text-white shadow-lg shadow-indigo-200
                          flex items-center gap-2 transition-all duration-200
                          ${isProcessing || !inputText.trim()
                            ? 'bg-slate-300 shadow-none cursor-not-allowed'
                            : 'bg-indigo-500 hover:bg-indigo-600 hover:-translate-y-0.5'
                          }
                        `}
                     >
                       {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                       РАСПОЗНАТЬ ЧЕРЕЗ AI
                     </button>
                  </div>
                </div>
              ) : (
                // STEP 3: Preview Result (Editable)
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 animate-fadeIn">
                  <div className="flex items-center justify-between mb-4">
                     <h3 className="font-bold text-slate-700">Предварительный просмотр результата</h3>
                     <span className="text-xs text-orange-500 font-medium bg-orange-50 px-2 py-1 rounded-full border border-orange-100">
                       Проверьте и отредактируйте данные перед добавлением
                     </span>
                  </div>
                  
                  <div className="border rounded-lg bg-white overflow-hidden mb-6 shadow-sm">
                    {/* Reuse grid layout for consistency, but table headers */}
                     <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-slate-100 border-b border-slate-200">
                        <div className={`${headerClass} text-center`}>#</div>
                        <div className={`${headerClass} col-span-3`}>Наименование</div>
                        <div className={`${headerClass} col-span-2`}>Бренд</div>
                        <div className={`${headerClass} col-span-2`}>Артикул</div>
                        <div className={`${headerClass} col-span-2`}>Тип</div>
                        <div className={`${headerClass} col-span-1 text-center`}>Ед.</div>
                        <div className={`${headerClass} col-span-1 text-center`}>Кол-во</div>
                    </div>
                    
                    <div className="p-2 space-y-2 max-h-[400px] overflow-y-auto">
                      {aiPreviewParts.map((part, i) => (
                        <div key={part.id} className="grid grid-cols-12 gap-2 items-center p-1">
                             <div className="col-span-1 text-center text-slate-400 text-xs font-medium">{i + 1}</div>
                             <div className="col-span-3">
                               <input 
                                  value={part.name}
                                  onChange={(e) => updatePreviewPart(part.id, 'name', e.target.value)}
                                  placeholder="Наименование"
                                  className={inputClass}
                               />
                             </div>
                             <div className="col-span-2">
                               <input 
                                  value={part.brand}
                                  onChange={(e) => updatePreviewPart(part.id, 'brand', e.target.value)}
                                  placeholder="Бренд"
                                  className={inputClass}
                               />
                             </div>
                             <div className="col-span-2">
                               <input 
                                  value={part.article}
                                  onChange={(e) => updatePreviewPart(part.id, 'article', e.target.value)}
                                  placeholder="Артикул"
                                  className={inputClass}
                               />
                             </div>
                             <div className="col-span-2">
                               <select 
                                  value={part.type}
                                  onChange={(e) => updatePreviewPart(part.id, 'type', e.target.value)}
                                  className="w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none cursor-pointer shadow-sm"
                                >
                                 <option>Оригинал</option>
                                 <option>Аналог</option>
                               </select>
                             </div>
                             <div className="col-span-1">
                                <input 
                                  value={part.uom}
                                  onChange={(e) => updatePreviewPart(part.id, 'uom', e.target.value)}
                                  className={`${inputClass} text-center`}
                                />
                             </div>
                             <div className="col-span-1 flex justify-center">
                                <input 
                                  type="number"
                                  min="0"
                                  step="0.1"
                                  value={part.quantity}
                                  onChange={(e) => updatePreviewPart(part.id, 'quantity', parseFloat(e.target.value) || 0)}
                                  className={`${inputClass} text-center font-bold`}
                                />
                             </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                     <p className="text-[10px] text-slate-400 italic">
                       *Ответ сгенерирован China_nai_bot и может быть не всегда точным
                     </p>
                     <div className="flex gap-3">
                       <button 
                         onClick={cancelAiImport}
                         className="px-4 py-2 text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-2"
                       >
                         <XCircle size={16} /> Отмена
                       </button>
                       <button 
                         onClick={confirmAiImport}
                         className="px-6 py-2 text-sm font-bold text-white bg-green-500 hover:bg-green-600 rounded-lg shadow-md transition-colors flex items-center gap-2"
                       >
                         <CheckCircle size={16} /> ОК - Создать позиции
                       </button>
                     </div>
                  </div>
                </div>
              )}
            </section>

          </div>
        </main>

        {/* Right Sidebar - System Status */}
        <aside className="w-80 bg-white border-l border-slate-200 flex flex-col shrink-0 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <h3 className="flex items-center gap-2 font-bold text-slate-800 mb-6">
              <Activity size={18} className="text-indigo-600" />
              Статус системы
            </h3>

            <div className="space-y-6">
               <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                 <span>Лимиты China_nai_bot</span>
                 <span className="bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded text-[10px]">LOCAL EST.</span>
               </div>
               
               {/* TPM */}
               <div className="space-y-1">
                 <div className="flex justify-between items-baseline text-sm">
                   <span className="text-slate-600 flex items-center gap-2"><Cpu size={14} /> Токенов / мин</span>
                   {displayStats.resetIn > 0 && (
                      <span className="text-[10px] text-orange-500 font-medium">
                        до обновления {displayStats.resetIn} сек
                      </span>
                   )}
                 </div>
                 <div className="flex justify-between items-end mb-1">
                   <span className="font-mono font-bold text-lg text-slate-700">{displayStats.tpm}</span>
                   <span className="text-xs text-slate-400 mb-1">/ {LIMITS.tpm}</span>
                 </div>
                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-500 ${displayStats.tpm > LIMITS.tpm * 0.8 ? 'bg-red-500' : 'bg-purple-500'}`}
                      style={{ width: `${Math.min(100, (displayStats.tpm / LIMITS.tpm) * 100)}%` }}
                   />
                 </div>
               </div>

               {/* RPM */}
               <div className="space-y-1">
                 <div className="flex justify-between items-baseline text-sm">
                   <span className="text-slate-600 flex items-center gap-2"><Clock size={14} /> Запросов / мин</span>
                   {displayStats.resetIn > 0 && (
                      <span className="text-[10px] text-orange-500 font-medium">
                        до обновления {displayStats.resetIn} сек
                      </span>
                   )}
                 </div>
                 <div className="flex justify-between items-end mb-1">
                    <span className="font-mono font-bold text-lg text-slate-700">{displayStats.rpm}</span>
                    <span className="text-xs text-slate-400 mb-1">/ {LIMITS.rpm}</span>
                 </div>
                 <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                   <div 
                      className={`h-full rounded-full transition-all duration-500 ${displayStats.rpm > LIMITS.rpm * 0.8 ? 'bg-red-500' : 'bg-indigo-500'}`}
                      style={{ width: `${Math.min(100, (displayStats.rpm / LIMITS.rpm) * 100)}%` }}
                   />
                 </div>
               </div>

               {/* Total */}
               <div className="pt-2 border-t border-slate-100 flex justify-between text-sm">
                  <span className="text-slate-600 flex items-center gap-2"><Database size={14} /> Всего запросов</span>
                  <span className="font-mono font-medium">{displayStats.totalRequests}</span>
               </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-0 p-6 bg-slate-50/50">
            <div className="flex items-center justify-between mb-2">
               <span className="font-bold text-slate-400 text-xs uppercase tracking-wider">Лог событий</span>
               <span className="bg-green-100 text-green-700 px-1.5 py-0.5 rounded text-[10px] font-bold">LIVE</span>
            </div>
            
            <div className="h-40 overflow-y-auto bg-white border border-slate-200 rounded-lg p-3 shadow-sm font-mono text-[10px] leading-relaxed text-slate-600 space-y-1.5 custom-scrollbar">
              {displayStats.logs.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
                   <Activity size={20} />
                   <span>Ожидание действий...</span>
                </div>
              ) : (
                displayStats.logs.map((log, i) => (
                  <div key={i} className="border-b border-slate-50 last:border-0 pb-1 break-words">
                    <span className="text-slate-400 mr-1.5 font-bold">{log.substring(1, 9)}</span>
                    <span>{log.substring(11)}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

      </div>
    </div>
  );
};

export default App;
