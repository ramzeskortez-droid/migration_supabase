import React, { useState } from 'react';
import { Loader2, Sparkles, Save } from 'lucide-react';
import { Part, OrderInfo } from './types';

interface AiAssistantProps {
  onImport: (newParts: Part[]) => void;
  onUpdateOrderInfo: (info: Partial<OrderInfo>) => void;
  onLog: (message: string) => void;
  onStats: (tokens: number) => void;
  onCreateOrder: () => void;
  isSaving: boolean;
  brandsList: string[];
  isFormValid?: boolean;
}

const API_KEY = import.meta.env.VITE_GROQ_API_KEY || '';

export const AiAssistant: React.FC<AiAssistantProps> = ({ onImport, onUpdateOrderInfo, onLog, onStats, onCreateOrder, isSaving, brandsList, isFormValid = true }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    onLog(`Запуск обработки AI (China_nai_bot)...`);

    try {
      const estimatedInputTokens = Math.ceil(inputText.length / 4);
      
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
        
        Задача 2: Извлечь метаданные заявки:
        - Дедлайн (deadline): YYYY-MM-DD.
        - Регион (region).
        - Город (city).
        - Email клиента (email).
        - Имя клиента (client_name).
        - Телефон (client_phone).
        - Тема письма (email_subject): Заголовок или тема, если есть (Subject: ...).

        Верни JSON объект:
        {
          "order_info": {
            "deadline": "", "region": "", "city": "", "email": "", 
            "client_name": "", "client_phone": "", "email_subject": ""
          },
          "parts": [
            { "name": "...", "brand": "...", "article": "...", "quantity": 0, "uom": "..." }
          ]
        }`
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
        
        if (parsedData.order_info) {
             const updates: Partial<OrderInfo> = {};
             if (parsedData.order_info.deadline) updates.deadline = parsedData.order_info.deadline;
             if (parsedData.order_info.region) updates.region = parsedData.order_info.region;
             if (parsedData.order_info.city) updates.city = parsedData.order_info.city;
             if (parsedData.order_info.email) updates.email = parsedData.order_info.email;
             if (parsedData.order_info.client_name) updates.clientName = parsedData.order_info.client_name;
             if (parsedData.order_info.client_phone) updates.clientPhone = parsedData.order_info.client_phone;
             if (parsedData.order_info.email_subject) updates.emailSubject = parsedData.order_info.email_subject;
             
             onUpdateOrderInfo(updates);
             onLog(`AI: Данные заголовка извлечены.`);
        }

        if (parsedData.parts && Array.isArray(parsedData.parts)) {
          const safeBrandsList = brandsList || [];
          const newParts = parsedData.parts.map((p: any, index: number) => {
            // Нормализация бренда по списку
            const existingBrand = safeBrandsList.find(b => b.toLowerCase() === (p.brand || '').toLowerCase());
            
            return {
              id: Date.now() + index,
              name: p.name || '',
              article: p.article || '',
              brand: existingBrand || p.brand || '', // Используем оригинал из базы или то что нашли
              uom: p.uom || 'шт',
              quantity: p.quantity || 1
            };
          });
          
          onImport(newParts);
          setInputText(''); 
          onLog(`AI: Добавлено ${newParts.length} позиций.`);
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

  return (
    <section>
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800">ИИ Ассистент & Действия</h2>
      </div>
      
      <div className="space-y-4">
        <div className="relative">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Вставьте текст из письма или опишите заказ... (Ctrl+Enter для запуска)"
            className="w-full min-h-[100px] h-32 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-y transition-all placeholder:text-slate-400 overflow-auto"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleProcess();
              }
            }}
          />
        </div>

        <div className="flex gap-4">
            <button
              onClick={handleProcess}
              disabled={isProcessing || !inputText.trim()}
              className={`
                flex-1 px-6 py-3 rounded-xl text-sm font-bold text-white shadow-lg shadow-indigo-200
                flex items-center justify-center gap-2 transition-all duration-200
                ${isProcessing || !inputText.trim()
                  ? 'bg-slate-300 shadow-none cursor-not-allowed'
                  : 'bg-indigo-500 hover:bg-indigo-600 hover:-translate-y-0.5'
                }
              `}
            >
              {isProcessing ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              РАСПОЗНАТЬ ЧЕРЕЗ AI
            </button>

            <button 
                onClick={onCreateOrder}
                disabled={isSaving || !isFormValid}
                className={`
                    flex-1 font-bold py-3 px-8 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 
                    ${isSaving || !isFormValid 
                        ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none' 
                        : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-200 hover:-translate-y-0.5'
                    }
                `}
            >
                {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                СОЗДАТЬ ЗАЯВКУ
            </button>
        </div>
      </div>
    </section>
  );
};