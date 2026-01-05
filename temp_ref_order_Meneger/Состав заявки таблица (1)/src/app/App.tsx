import { useState } from "react";
import {
  ChevronRight,
  ChevronDown,
  BadgeCheck,
  FileImage,
  Edit2,
  Camera,
  Pencil,
} from "lucide-react";

interface SupplierOffer {
  id: string;
  supplier: string;
  verified: boolean;
  supplierPrice: number;
  currency: string;
  quantity: number;
  weight: number;
  deliveryTime: string;
  photo: string;
  photoUrl?: string; // URL of uploaded photo
  clientPrice: number;
  clientDeliveryTime: string;
  comment: string;
}

interface Product {
  id: string;
  number: number;
  name: string;
  brand: string;
  article: string;
  quantity: number;
  unit: string;
  hasPhoto: boolean;
  offers: SupplierOffer[];
}

export default function App() {
  const [expandedProducts, setExpandedProducts] = useState<
    Set<string>
  >(new Set(["1"]));
  const [selectedOffers, setSelectedOffers] = useState<
    Set<string>
  >(new Set());
  const [comments, setComments] = useState<
    Record<string, string>
  >({});

  const products: Product[] = [
    {
      id: "1",
      number: 1,
      name: "Пила",
      brand: "MAKITA",
      article: "MKT-5007",
      quantity: 5,
      unit: "шт",
      hasPhoto: true,
      offers: [
        {
          id: "1-1",
          supplier: "BUYER 1",
          verified: true,
          supplierPrice: 5,
          currency: "¥",
          quantity: 5,
          weight: 5,
          deliveryTime: "5 м.",
          photo: "+ 123 ф",
          photoUrl: "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400&h=300&fit=crop",
          clientPrice: 3422,
          clientDeliveryTime: "5 м.",
          comment: "",
        },
        {
          id: "1-2",
          supplier: "BUYER 2",
          verified: true,
          supplierPrice: 6,
          currency: "¥",
          quantity: 5,
          weight: 4.5,
          deliveryTime: "7 м.",
          photo: "+ 98 ф",
          clientPrice: 3650,
          clientDeliveryTime: "7 м.",
          comment: "",
        },
        {
          id: "1-3",
          supplier: "BUYER 3",
          verified: false,
          supplierPrice: 4.5,
          currency: "¥",
          quantity: 5,
          weight: 5.2,
          deliveryTime: "10 м.",
          photo: "+ 156 ф",
          photoUrl: "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=400&h=300&fit=crop",
          clientPrice: 3200,
          clientDeliveryTime: "10 м.",
          comment: "",
        },
      ],
    },
    {
      id: "2",
      number: 2,
      name: "Дрель",
      brand: "BOSCH",
      article: "BSH-3000",
      quantity: 3,
      unit: "шт",
      hasPhoto: true,
      offers: [
        {
          id: "2-1",
          supplier: "BUYER 1",
          verified: true,
          supplierPrice: 8,
          currency: "¥",
          quantity: 3,
          weight: 2.5,
          deliveryTime: "5 м.",
          photo: "+ 67 ф",
          photoUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400&h=300&fit=crop",
          clientPrice: 4500,
          clientDeliveryTime: "5 м.",
          comment: "",
        },
        {
          id: "2-2",
          supplier: "BUYER 4",
          verified: true,
          supplierPrice: 7.5,
          currency: "¥",
          quantity: 3,
          weight: 2.3,
          deliveryTime: "6 м.",
          photo: "+ 45 ф",
          clientPrice: 4350,
          clientDeliveryTime: "6 м.",
          comment: "",
        },
      ],
    },
  ];

  const toggleProduct = (productId: string) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const toggleOfferSelection = (offerId: string) => {
    const newSelected = new Set(selectedOffers);
    if (newSelected.has(offerId)) {
      newSelected.delete(offerId);
    } else {
      newSelected.add(offerId);
    }
    setSelectedOffers(newSelected);
  };

  const updateComment = (offerId: string, value: string) => {
    setComments({ ...comments, [offerId]: value });
  };

  const convertToYuan = (rubles: number): string => {
    const rate = 11.41; // RUB to CNY conversion rate
    return (rubles / rate).toFixed(2);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-[1600px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl mb-2">Состав заявки</h1>
            <p className="text-gray-500">
              Заказ #519 от 05.01.2026
            </p>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {/* Product Table Header */}
          <div className="bg-gray-100 border-b border-gray-300">
            <div className="grid grid-cols-[60px_1fr_150px_150px_100px_100px_100px] gap-4 items-center px-6 py-3">
              <div className="text-sm text-gray-600">№</div>
              <div className="text-sm text-gray-600">Наименование</div>
              <div className="text-sm text-gray-600">Бренд</div>
              <div className="text-sm text-gray-600">Артикул</div>
              <div className="text-sm text-gray-600 text-center">Кол-во</div>
              <div className="text-sm text-gray-600 text-center">Ед. изм.</div>
              <div className="text-sm text-gray-600 text-center">Фото</div>
            </div>
          </div>

          {products.map((product) => (
            <div
              key={product.id}
              className="border-b border-gray-200 last:border-b-0"
            >
              {/* Product Row */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-150 transition-colors">
                <div className="grid grid-cols-[60px_1fr_150px_150px_100px_100px_100px] gap-4 items-center px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleProduct(product.id)}
                      className="hover:bg-gray-200 rounded-lg p-1 transition-colors"
                    >
                      {expandedProducts.has(product.id) ? (
                        <ChevronDown className="w-5 h-5 text-gray-600" />
                      ) : (
                        <ChevronRight className="w-5 h-5 text-gray-600" />
                      )}
                    </button>
                    <span className="text-gray-600">
                      {product.number}
                    </span>
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">
                      {product.name}
                    </div>
                  </div>
                  <div className="text-gray-700">
                    {product.brand}
                  </div>
                  <div className="text-gray-600">
                    {product.article}
                  </div>
                  <div className="text-gray-700 text-center">
                    {product.quantity}
                  </div>
                  <div className="text-gray-600 text-center">
                    {product.unit}
                  </div>
                  <div className="flex justify-center">
                    {product.hasPhoto && (
                      <FileImage className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </div>

              {/* Supplier Offers Section */}
              {expandedProducts.has(product.id) && (
                <div className="bg-white">
                  {/* Offers Header */}
                  <div className="bg-slate-800 text-white">
                    <div className="grid grid-cols-[220px_140px_90px_90px_120px_120px_200px_140px_160px] gap-4 px-6 py-3 text-sm">
                      <div>Поставщик</div>
                      <div>Цена поставщика</div>
                      <div>Кол-во</div>
                      <div>Вес (кг.)</div>
                      <div>Срок поставки</div>
                      <div>Фото</div>
                      <div>Цена для клиента</div>
                      <div>Срок для клиента</div>
                      <div>Действие</div>
                    </div>
                  </div>

                  {/* Offers List */}
                  {product.offers.map((offer) => {
                    const isSelected = selectedOffers.has(
                      offer.id,
                    );
                    return (
                      <div
                        key={offer.id}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <div
                          className={`grid grid-cols-[220px_140px_90px_90px_120px_120px_200px_140px_160px] gap-4 px-6 py-4 items-center transition-colors ${
                            isSelected
                              ? "bg-green-50"
                              : "hover:bg-gray-50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {offer.supplier}
                            </span>
                          </div>
                          <div className="text-gray-700">
                            {offer.supplierPrice}{" "}
                            {offer.currency}
                          </div>
                          <div className="text-gray-700 text-center">
                            {offer.quantity}
                          </div>
                          <div className="text-gray-600">
                            <span className="text-purple-600">
                              {offer.weight} кг
                            </span>
                          </div>
                          <div className="text-orange-500">
                            {offer.deliveryTime}
                          </div>
                          <div className="flex items-center justify-center">
                            {offer.photoUrl ? (
                              <button
                                onClick={() => window.open(offer.photoUrl, '_blank')}
                                className="hover:opacity-80 transition-opacity"
                              >
                                <img
                                  src={offer.photoUrl}
                                  alt="Фото товара"
                                  className="w-16 h-12 object-cover rounded border border-gray-300"
                                />
                              </button>
                            ) : (
                              <button
                                onClick={() => alert('Загрузить фото')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Загрузить фото"
                              >
                                <Camera className="w-5 h-5 text-gray-400" />
                              </button>
                            )}
                          </div>
                          <div>
                            <div className="text-lg text-gray-900">
                              {offer.clientPrice.toLocaleString()}{" "}
                              ₽
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              ≈ {convertToYuan(offer.clientPrice)} ¥
                            </div>
                          </div>
                          <div className="text-orange-500">
                            {offer.clientDeliveryTime}
                          </div>
                          <div>
                            <button
                              onClick={() =>
                                toggleOfferSelection(offer.id)
                              }
                              className={`w-full py-2 px-4 rounded-lg transition-all ${
                                isSelected
                                  ? "bg-green-500 hover:bg-green-600 text-white"
                                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                              }`}
                            >
                              {isSelected ? (
                                <span className="flex items-center justify-center gap-2">
                                  <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                  Выбрано
                                </span>
                              ) : (
                                "Выбрать"
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Comment Field */}
                        <div className={`px-6 pb-4 ${isSelected ? "bg-green-50" : ""}`}>
                          <div className="relative">
                            <input
                              type="text"
                              placeholder="Комментарий..."
                              value={comments[offer.id] || ""}
                              onChange={(e) =>
                                updateComment(
                                  offer.id,
                                  e.target.value,
                                )
                              }
                              className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-600 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            <Edit2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="mt-6 flex justify-between items-center">
          <button className="flex items-center gap-2 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors">
            <Pencil className="w-4 h-4" />
            Изменить
          </button>
          <div className="flex gap-3">
            <button className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors">
              Аннулировать
            </button>
            <button className="px-6 py-3 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition-colors flex items-center gap-2">
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Утвердить КП и отправить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}