import React, { useState } from 'react';
import { Loader2, Sparkles, XCircle, CheckCircle } from 'lucide-react';
import { Part, OrderInfo } from './types';

interface AiAssistantProps {
  onImport: (newParts: Part[]) => void;
  onUpdateOrderInfo: (info: Partial<OrderInfo>) => void;
  onLog: (message: string) => void;
  onStats: (tokens: number) => void;
}

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const AiAssistant: React.FC<AiAssistantProps> = ({ onImport, onUpdateOrderInfo, onLog, onStats }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiPreviewParts, setAiPreviewParts] = useState<Part[] | null>(null);

  const inputClass = "w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 placeholder:text-xs text-slate-700 shadow-sm";
  const headerClass = "col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  const updatePreviewPart = (id: number, field: keyof Part, value: string | number) => {
    if (!aiPreviewParts) return;
    setAiPreviewParts(aiPreviewParts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    onLog(`Запуск обработки AI (China_nai_bot)...`);

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
        - Телефон (client_phone): Ищи телефонный номер.

        Верни JSON объект со структурой:
        {
          "order_info": {
            "deadline": "YYYY-MM-DD",
            "region": "строка",
            "city": "строка",
            "email": "строка",
            "client_name": "строка",
            "client_phone": "строка"
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
             const updates: Partial<OrderInfo> = {};
             if (parsedData.order_info.deadline) updates.deadline = parsedData.order_info.deadline;
             if (parsedData.order_info.region) updates.region = parsedData.order_info.region;
             if (parsedData.order_info.city) updates.city = parsedData.order_info.city;
             if (parsedData.order_info.email) updates.email = parsedData.order_info.email;
             if (parsedData.order_info.client_name) updates.clientName = parsedData.order_info.client_name;
             if (parsedData.order_info.client_phone) updates.clientPhone = parsedData.order_info.client_phone;
             
             onUpdateOrderInfo(updates);
             onLog(`AI: Данные заголовка извлечены.`);
        }

        if (parsedData.parts && Array.isArray(parsedData.parts)) {
          const previewParts = parsedData.parts.map((p: any, index: number) => ({
            id: Date.now() + index,
            name: p.name || '',
            article: p.article || '',
            brand: p.brand || '',
            uom: p.uom || 'шт',
            type: 'Оригинал', 
            quantity: p.quantity || 1
          }));
          
          setAiPreviewParts(previewParts);
          onLog(`AI: Найдено ${previewParts.length} позиций. Ожидание подтверждения.`);
        } else {
          onLog(`Обработано: детали не найдены`);
        }
        
        const outputTokens = data.usage?.total_tokens || Math.ceil(jsonText.length / 4) + estimatedInputTokens;
        onStats(outputTokens);
      }

    } catch (error) {
      console.error("Error processing request:", error);
      onLog(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const confirmAiImport = () => {
    if (aiPreviewParts) {
      onImport(aiPreviewParts);
      setAiPreviewParts(null);
      setInputText('');
      onLog(`Позиции добавлены в таблицу.`);
    }
  };

  const cancelAiImport = () => {
    setAiPreviewParts(null);
    onLog(`Импорт отменен.`);
  };

  return (
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
  );
};
