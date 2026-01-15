import React, { useState } from 'react';
import { Loader2, Sparkles, Save, FileText } from 'lucide-react';
import { Part, OrderInfo } from './types';
import { supabase } from '../../lib/supabaseClient';

interface AiAssistantProps {
  onImport: (newParts: Part[]) => void;
  onUpdateOrderInfo: (info: Partial<OrderInfo>) => void;
  onLog: (message: string) => void;
  onStats: (tokens: number) => void;
  onCreateOrder: () => void;
  isSaving: boolean;
  isFormValid?: boolean;
  debugMode?: boolean;
}

export const AiAssistant: React.FC<AiAssistantProps> = ({ onImport, onUpdateOrderInfo, onLog, onStats, onCreateOrder, isSaving, isFormValid = true, debugMode = false }) => {
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Слушаем импорт из почты
  React.useEffect(() => {
      const handleImport = (e: any) => {
          if (e.detail) setInputText(e.detail);
      };
      window.addEventListener('importEmailText', handleImport);
      return () => window.removeEventListener('importEmailText', handleImport);
  }, []);

  const handleEmulate = () => {
      const template = `Добрый день!
ТЕМА: ЗАЯВКА 24121414
Подскажите, пожалуйста, по наличию и ценам на оборудование Danfoss и совместимые аналоги. Нужно до 15.01 организовать поставку в город Грязи, Грязинский р-н, Липецкая обл, Россия.

Позиции к запросу:

Комплект кабелей гнездовых 3 м\tDanfoss\t027H0438\t3\tшт
Электропривод\tICAD\t1200B\tс\tдисплеем\tDanfoss\t027H0491\t2\tшт
Кабель\tсигнальный\t5\tм\tCarel\tNTCCAB050\t1\tкомплект
Датчик\tтемпературы\tуниверсальный\tEliwell\tTAC100\t6\tшт
Модуль\tпитания\tдля\tICAD\t600/900\tDanfoss\t027H0502\t2\tуп

Просьба указать наличие, цену с\tНДС, сроки поставки и доступные аналоги (если какие‑то позиции отсутствуют).
При наличии прайса\tили\tтехнических описаний\t—\tпришлите, пожалуйста, в\tответ.

С уважением,
Елена
Тел:\t+7\t(900)\t123‑45‑67
E‑mail:\telena.kaknibud@pochta.ru`;
      setInputText(template);
      onLog('Текст тестовой заявки вставлен.');
  };

  const handleProcess = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    onLog(`Запуск обработки AI (Edge Function)...`);

    try {
      const { data, error } = await supabase.functions.invoke('process-email', {
        body: { text: inputText }
      });

      if (error) {
          console.error("Supabase Invoke Error:", error);
          throw new Error(error.message || "Ошибка вызова функции");
      }

      if (data.error) {
          throw new Error(`Groq API: ${data.details || data.error}`);
      }

      const content = data.choices?.[0]?.message?.content;
      if (!content) throw new Error("Пустой ответ от AI");
      
      let parsedData;
      try {
          parsedData = JSON.parse(content);
      } catch (e) {
          console.error("JSON Parse Error:", content);
          throw new Error("Некорректный JSON от AI");
      }

      handleAiResult(parsedData);

    } catch (error) {
      console.error("AI Processing Error:", error);
      onLog(`Ошибка: ${error instanceof Error ? error.message : 'Unknown error'}`);
      alert(`Ошибка AI: ${error instanceof Error ? error.message : 'Сбой'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiResult = (parsedData: any) => {
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
      const newParts = parsedData.parts.map((p: any, index: number) => ({
        id: Date.now() + index,
        name: p.name || '',
        article: p.article || '',
        brand: p.brand || '', 
        uom: p.uom || 'шт',
        quantity: p.quantity || 1
      }));
      
      onImport(newParts);
      setInputText(''); 
      onLog(`AI: Добавлено ${newParts.length} позиций.`);
    } else {
      onLog(`Обработано: детали не найдены`);
    }
    setIsProcessing(false);
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
            {debugMode && (
                <button
                onClick={handleEmulate}
                className="px-4 py-3 rounded-xl text-sm font-bold bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
                title="Вставить тестовый текст заявки"
                >
                <FileText size={16} />
                <span className="hidden sm:inline">Эмуляция</span>
                </button>
            )}

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
