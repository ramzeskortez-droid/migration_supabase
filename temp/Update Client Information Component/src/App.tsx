import { useState } from 'react';
import { Search, ChevronDown, ChevronUp, Sparkles, FileText, Plus } from 'lucide-react';

interface Order {
  id: string;
  client: string;
  phone: string;
  email: string;
  theme: string;
  deadline: string;
  date: string;
  status: 'processing' | 'processed' | 'completed' | 'blocked';
  address: string;
  requestTitle: string;
  items: OrderItem[];
}

interface OrderItem {
  id: number;
  name: string;
  brand: string;
  article: string;
  quantity: number;
  unit: string;
}

const mockOrders: Order[] = [
  {
    id: '#100',
    client: 'Евгений',
    phone: '+7 (916) 754-47-63',
    email: 'client44s@mail.ru',
    theme: 'Запрос запчастей',
    deadline: '16.01.2026',
    date: '09.01.2026',
    status: 'processing',
    address: 'НИЖНИЙ НОВГОРОД',
    requestTitle: 'ЗАПРОС ЗАПЧАСТЕЙ',
    items: [
      { id: 1, name: 'КОЛОДКИ ТОРМОЗНЫЕ', brand: 'BREMBUS', article: '49012397', quantity: 1, unit: 'ШТ' },
      { id: 2, name: 'КОЛОДКИ ТОРМОЗНЫЕ', brand: 'SAMCO', article: 'H4356525', quantity: 4, unit: 'ШТ' },
      { id: 3, name: 'ФАРА ПРАВАЯ', brand: 'CLEO', article: 'E2560LX5', quantity: 4, unit: 'ШТ' },
    ]
  },
  {
    id: '#99',
    client: 'Андрей',
    phone: '+7 (985) 365-63-31',
    email: 'client3779@mail.ru',
    theme: 'В работу',
    deadline: '16.01.2026',
    date: '07.01.2026',
    status: 'processed',
    address: 'МОСКВА',
    requestTitle: 'ЗАПРОС ЗАПЧАСТЕЙ',
    items: []
  },
  {
    id: '#98',
    client: 'Сергей',
    phone: '+7 (913) 754-74-47',
    email: 'client46024@mail.ru',
    theme: 'В работу',
    deadline: '16.01.2026',
    date: '08.01.2026',
    status: 'processed',
    address: 'САНКТ-ПЕТЕРБУРГ',
    requestTitle: 'ЗАПРОС ЗАПЧАСТЕЙ',
    items: []
  },
  {
    id: '#97',
    client: 'Максим',
    phone: '',
    email: 'client2111@mail.ru',
    theme: 'В работу',
    deadline: '16.01.2026',
    date: '08.01.2026',
    status: 'processing',
    address: 'КАЗАНЬ',
    requestTitle: 'ЗАПРОС ЗАПЧАСТЕЙ',
    items: []
  }
];

export default function App() {
  const [expandedOrder, setExpandedOrder] = useState<string>('#100');
  const [activeTab, setActiveTab] = useState<'processing' | 'processed' | 'completed' | 'blocked'>('processing');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'processing':
        return 'bg-purple-50 text-purple-700 border border-purple-200';
      case 'processed':
        return 'bg-blue-50 text-blue-700 border border-blue-200';
      case 'completed':
        return 'bg-green-50 text-green-700 border border-green-200';
      case 'blocked':
        return 'bg-red-50 text-red-700 border border-red-200';
      default:
        return 'bg-gray-50 text-gray-700';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'processing':
        return 'В ОБРАБОТКЕ';
      case 'processed':
        return 'В ОБРАБОТКЕ';
      case 'completed':
        return 'ЗАВЕРШЕНО';
      case 'blocked':
        return 'ЗАБЛОКИРОВАНО';
      default:
        return status.toUpperCase();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">CN</span>
              </div>
              <h1 className="text-xl font-semibold">CHINA-NAI</h1>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>КУРС CNY/RUB</span>
              <span className="font-semibold">13.01</span>
              <span>¥/₽ 12</span>
              <span>$/₽ 91</span>
              <span>$/¥ 1</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-6">
            <button className="px-4 py-3 bg-gray-50 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors flex items-center justify-center gap-2">
              <FileText size={16} />
              Эмуляция
            </button>
            <button className="px-4 py-3 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition-colors flex items-center justify-center gap-2">
              <Sparkles size={16} />
              РАСПОЗНАТЬ ЧЕРЕЗ AI
            </button>
            <button className="px-4 py-3 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
              <Plus size={16} />
              СОЗДАТЬ ЗАЯВКУ
            </button>
          </div>

          {/* Status Bar */}
          <div className="bg-gradient-to-r from-gray-900 to-gray-800 rounded-xl p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-gray-400">СТАТУС</span>
                  <span className="text-sm text-green-400 font-medium">СИСТЕМА АКТИВНА</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">ЛИМИТ ТОКЕНОВ (AI)</span>
                  <span className="text-sm">0 / 6000</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">ЛИМИТ ЗАПРОСОВ</span>
                  <span className="text-sm">0 / 30</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-400">ВСЕГО ЗАПРОСОВ</div>
                <div className="text-2xl font-bold">0</div>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Поиск по ID, клиенту или телефону..."
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Archive Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-blue-600 flex items-center gap-2">
                <FileText size={20} />
                АРХИВ ЗАЯВОК
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveTab('processing')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'processing'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  В ОБРАБОТКЕ
                </button>
                <button
                  onClick={() => setActiveTab('processed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'processed'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ОБРАБОТАННЫЕ
                </button>
                <button
                  onClick={() => setActiveTab('completed')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'completed'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  УСПЕШНЫЕ
                </button>
                <button
                  onClick={() => setActiveTab('blocked')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'blocked'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ЗАБЛОКИРОВАННЫЕ
                </button>
              </div>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[100px_150px_200px_150px_120px_120px_150px_50px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
            <div>№ ЗАКАЗА ↓</div>
            <div>КЛИЕНТ</div>
            <div>ПОЧТА</div>
            <div>ТЕМА</div>
            <div>СРОК ДО</div>
            <div>ДАТА</div>
            <div>СТАТУС</div>
            <div></div>
          </div>

          {/* Table Rows */}
          <div className="divide-y divide-gray-200">
            {mockOrders.map((order) => (
              <div key={order.id}>
                <div
                  className="grid grid-cols-[100px_150px_200px_150px_120px_120px_150px_50px] gap-4 px-6 py-4 items-center hover:bg-gray-50 cursor-pointer"
                  onClick={() => setExpandedOrder(expandedOrder === order.id ? '' : order.id)}
                >
                  <div className="text-blue-600 font-semibold">{order.id}</div>
                  <div>
                    <div className="font-medium">{order.client}</div>
                    <div className="text-xs text-gray-500">{order.phone}</div>
                  </div>
                  <div className="text-sm text-gray-600">{order.email}</div>
                  <div className="text-sm">{order.theme}</div>
                  <div className="text-sm text-red-600 font-medium">{order.deadline}</div>
                  <div className="text-sm text-gray-600">{order.date}</div>
                  <div>
                    <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                      {getStatusText(order.status)}
                    </span>
                  </div>
                  <div className="flex justify-center">
                    {expandedOrder === order.id ? (
                      <ChevronUp size={20} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={20} className="text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {expandedOrder === order.id && (
                  <div className="px-6 py-6 bg-gray-50">
                    {/* Client Information */}
                    <div className="bg-white rounded-lg p-6 mb-6 border-t-4 border-red-500">
                      <div className="flex items-center gap-2 mb-4">
                        <FileText size={18} className="text-gray-600" />
                        <h3 className="font-semibold text-gray-700">ИНФОРМАЦИЯ ПО ЗАЯВКЕ</h3>
                      </div>

                      <div className="grid grid-cols-5 gap-4 mb-4">
                        <div>
                          <div className="text-xs text-gray-500 mb-1 uppercase">ИМЯ</div>
                          <div className="font-medium text-blue-600 uppercase">{order.client}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 uppercase">Телефон</div>
                          <div className="font-medium">{order.phone || '—'}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 uppercase">Почта</div>
                          <div className="font-medium">{order.email}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 uppercase">Адрес</div>
                          <div className="font-medium uppercase">{order.address}</div>
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 mb-1 uppercase flex items-center gap-2">
                            <span>Тема письма</span>
                            <FileText size={14} className="text-gray-400" />
                          </div>
                          <div className="font-medium uppercase">{order.requestTitle}</div>
                        </div>
                      </div>
                        
                      {/* NEW FILES ROW */}
                      <div>
                        <div className="text-xs text-gray-500 mb-1 uppercase">Файлы</div>
                        <div className="font-medium">
                          <a href="#" className="text-blue-600 underline hover:text-blue-700">dogovor_postavki.pdf</a>
                          <span className="text-gray-600">, </span>
                          <a href="#" className="text-blue-600 underline hover:text-blue-700">invoice_77.xlsx</a>
                          <span className="text-gray-600">, </span>
                          <a href="#" className="text-blue-600 underline hover:text-blue-700">photo_parts.jpg</a>
                        </div>
                      </div>
                    </div>

                    {/* Items Table */}
                    {order.items.length > 0 && (
                      <div className="bg-white rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[60px_1fr_150px_150px_100px_80px_80px] gap-4 px-6 py-3 bg-gray-100 border-b border-gray-200 text-xs font-semibold text-gray-600 uppercase">
                          <div>№</div>
                          <div>НАИМЕНОВАНИЕ</div>
                          <div>БРЕНД</div>
                          <div>АРТИКУЛ</div>
                          <div>КОЛ-ВО</div>
                          <div>ЕД.</div>
                          <div>ФОТО</div>
                        </div>
                        {order.items.map((item) => (
                          <div
                            key={item.id}
                            className="grid grid-cols-[60px_1fr_150px_150px_100px_80px_80px] gap-4 px-6 py-4 border-b border-gray-100 items-center"
                          >
                            <div className="text-sm text-gray-600">{item.id}</div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm">{item.brand}</div>
                            <div className="text-sm font-mono">{item.article}</div>
                            <div className="text-sm font-semibold text-center">{item.quantity}</div>
                            <div className="text-sm text-gray-600">{item.unit}</div>
                            <div></div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}