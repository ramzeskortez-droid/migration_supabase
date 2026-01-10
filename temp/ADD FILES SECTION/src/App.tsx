import { useState } from 'react';
import { Zap } from 'lucide-react';

export default function App() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const files = Array.from(event.target.files);
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    
    if (event.dataTransfer.files) {
      const files = Array.from(event.dataTransfer.files);
      setSelectedFiles([...selectedFiles, ...files]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-[960px] mx-auto">
        {/* Main Order Info Section */}
        <div className="bg-white rounded-[16px] p-8 mb-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-gray-900">
              <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
              ОСНОВНАЯ ИНФОРМАЦИЯ ПО ЗАЯВКЕ
            </h2>
            <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors">
              <Zap className="w-4 h-4" />
              БЫСТРЫЙ ТЕСТ
            </button>
          </div>

          {/* Subject Field */}
          <div className="mb-6">
            <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
              ТЕМА ПИСЬМА
            </label>
            <input
              type="text"
              defaultValue="Re: Запрос на запчасти..."
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Contact Info Grid */}
          <div className="grid grid-cols-5 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                ТЕЛЕФОН
              </label>
              <input
                type="text"
                defaultValue="+7 (999)..."
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                ИМЯ
              </label>
              <input
                type="text"
                defaultValue="Иван"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                ПОЧТА КЛИЕНТА
              </label>
              <input
                type="email"
                defaultValue="example@mail.com"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                АДРЕС
              </label>
              <input
                type="text"
                defaultValue="Москва, МО"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                СРОК ДО
              </label>
              <input
                type="text"
                defaultValue="ДД.ММ.ГГГГ"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* NEW: Files Upload Section */}
        <div className="bg-white rounded-[16px] p-8 mb-4 shadow-sm border border-gray-100">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-gray-900 mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            ФАЙЛЫ ПО ЗАЯВКЕ
          </h2>

          <div
            className={`relative border-2 border-dashed rounded-2xl py-16 px-12 transition-all ${
              isDragging
                ? 'border-blue-400 bg-blue-50/30'
                : 'border-gray-300 bg-white'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          >
            <div className="flex flex-col items-center justify-center gap-4">
              <label htmlFor="file-input">
                <div className="px-10 py-3.5 bg-black text-white rounded-xl cursor-pointer hover:bg-gray-900 transition-colors text-sm font-medium">
                  Выбрать файлы
                </div>
              </label>
              <input
                id="file-input"
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
              />
              <p className="text-sm text-gray-600">
                Выберите файлы или перетащите их сюда
              </p>
            </div>
          </div>

          {/* Display selected files */}
          {selectedFiles.length > 0 && (
            <div className="mt-6 space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg border border-gray-100"
                >
                  <span className="text-sm text-gray-700">{file.name}</span>
                  <button
                    onClick={() => {
                      setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
                    }}
                    className="text-sm text-red-600 hover:text-red-700 font-medium"
                  >
                    Удалить
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Item List Section */}
        <div className="bg-white rounded-[16px] p-8 mb-4 shadow-sm border border-gray-100">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-gray-900 mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            СПИСОК ПОЗИЦИЙ
          </h2>

          {/* Table Header */}
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_100px_100px_80px] gap-4 mb-4 px-4 text-xs font-medium text-gray-500 uppercase tracking-wide">
            <div>#</div>
            <div>НАИМЕНОВАНИЕ *</div>
            <div>БРЕНД *</div>
            <div>АРТИКУЛ</div>
            <div>ЕД.</div>
            <div>КОЛ-ВО</div>
            <div>ФОТО</div>
          </div>

          {/* Table Row */}
          <div className="grid grid-cols-[60px_1fr_1fr_1fr_100px_100px_80px] gap-4 items-center px-4 py-3 bg-gray-50 rounded-lg mb-4">
            <div className="text-sm text-gray-700">1</div>
            <input
              type="text"
              placeholder="Наименование"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Бренд"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              placeholder="Артикул"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              defaultValue="ШТ"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="number"
              defaultValue="1"
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button className="w-10 h-10 flex items-center justify-center border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <span className="text-gray-400 text-xl">📷</span>
            </button>
          </div>

          {/* Add Position Button */}
          <button className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-2">
            <span className="text-lg">+</span>
            ДОБАВИТЬ ПОЗИЦИЮ
          </button>
        </div>

        {/* AI Assistant Section */}
        <div className="bg-white rounded-[16px] p-8 mb-4 shadow-sm border border-gray-100">
          <h2 className="flex items-center gap-3 text-sm font-bold uppercase tracking-wide text-gray-900 mb-4">
            <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
            ИИ Ассистент & Действия
          </h2>

          <textarea
            placeholder="Вставьте текст из письма или опишите заказ... (Ctrl+Enter для запуска)"
            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
          />

          {/* Action Buttons */}
          <div className="grid grid-cols-3 gap-4">
            <button className="px-6 py-3 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2">
              <span>📄</span>
              Эмуляция
            </button>
            <button className="px-6 py-3 bg-blue-400 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
              <span>🤖</span>
              РАСПОЗНАТЬ ЧЕРЕЗ AI
            </button>
            <button className="px-6 py-3 bg-blue-400 text-white rounded-lg text-sm font-medium hover:bg-blue-500 transition-colors flex items-center justify-center gap-2">
              <span>📋</span>
              СОЗДАТЬ ЗАЯВКУ
            </button>
          </div>
        </div>

        {/* Status Bar */}
        <div className="bg-black rounded-[16px] px-8 py-6 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-green-500 rounded"></div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Статус</div>
              <div className="text-sm font-medium text-green-400">СИСТЕМА АКТИВНА</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-purple-500 rounded"></div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Лимит Токенов (AI)</div>
              <div className="text-sm font-medium">0 / 6000</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <div className="w-1 h-6 bg-blue-500 rounded"></div>
            <div>
              <div className="text-xs text-gray-400 uppercase">Лимит Запросов</div>
              <div className="text-sm font-medium">0 / 30</div>
            </div>
          </div>

          <div className="text-xs text-gray-400 uppercase">
            Всего запросов: <span className="text-white font-medium">0</span>
          </div>
        </div>
      </div>
    </div>
  );
}