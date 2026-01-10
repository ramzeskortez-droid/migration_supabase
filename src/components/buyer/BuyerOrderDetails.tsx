import React, { useState, useMemo, useEffect } from 'react';
import { Send, CheckCircle, FileText, Copy, ShieldCheck, XCircle, MessageCircle, Folder, Paperclip, X } from 'lucide-react';
import { BuyerItemCard } from './BuyerItemCard';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { DebugCopyModal } from '../shared/DebugCopyModal';
import { SupabaseService } from '../../services/supabaseService';
import { FileDropzone } from '../shared/FileDropzone';

interface BuyerOrderDetailsProps {
  order: Order;
  editingItems: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[], supplierFiles?: any[]) => Promise<void>;
  isSubmitting: boolean;
  myOffer: any;
  statusInfo: any;
  onOpenChat: (orderId: string) => void;
}

export const BuyerOrderDetails: React.FC<BuyerOrderDetailsProps> = ({ 
  order, editingItems, setEditingItems, onSubmit, isSubmitting, myOffer, statusInfo, onOpenChat 
}) => { 
  const [copyModal, setCopyModal] = useState<{isOpen: boolean, title: string, content: string}>({
      isOpen: false, title: '', content: ''
  });
  
  const [requiredFields, setRequiredFields] = useState<any>({}); 
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [supplierFiles, setSupplierFiles] = useState<any[]>([]);

  useEffect(() => {
      SupabaseService.getSystemSettings('buyer_required_fields').then(res => {
          if (res) setRequiredFields(res);
      });
      if (myOffer?.supplier_files) {
          setSupplierFiles(myOffer.supplier_files);
      }
  }, [myOffer]);

  const BuyerAuth = useMemo(() => {
      try { return JSON.parse(localStorage.getItem('Buyer_auth') || 'null'); } catch { return null; } 
  }, []);

  const isValid = editingItems.every(item => {
      if (item.offeredQuantity === 0) return true;
      const basicValid = (item.BuyerPrice > 0) && (item.weight > 0) && (item.deliveryWeeks >= 4);
      if (requiredFields.supplier_sku) {
          return basicValid && (item.supplierSku && item.supplierSku.trim().length > 0);
      }
      return basicValid;
  });

  const handlePreSubmit = async () => {
      if (requiredFields.supplier_sku) {
          const missingSku = editingItems.some(item => {
              const isMissing = item.offeredQuantity > 0 && (!item.supplierSku || item.supplierSku.trim() === '');
              return isMissing;
          });
          if (missingSku) {
              setToast({ message: 'Заполните поле "Поставщик" для всех позиций!', type: 'error' });
              return;
          }
      }
      await onSubmit(order.id, editingItems, supplierFiles);
  };

  const isAllDeclined = editingItems.every(item => item.offeredQuantity === 0);
  const isDisabled = order.isProcessed === true || !!myOffer;

  const handleUpdateItem = (idx: number, field: string, value: any) => {
      const newItems = [...editingItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setEditingItems(newItems);
  };

  const removeFileFromItem = (itemIdx: number, fileIdx: number) => {
      if (isDisabled) return;
      const newItems = [...editingItems];
      const newFiles = [...(newItems[itemIdx].itemFiles || [])];
      newFiles.splice(fileIdx, 1);
      newItems[itemIdx] = { ...newItems[itemIdx], itemFiles: newFiles };
      setEditingItems(newItems);
  };

  const removeGeneralFile = (fileIdx: number) => {
      if (isDisabled) return;
      const newFiles = [...supplierFiles];
      newFiles.splice(fileIdx, 1);
      setSupplierFiles(newFiles);
  };

  const formatItemText = (item: any, idx?: number) => {
      const parts = [
          item.AdminName || item.name,
          item.brand,
          item.article,
          `${item.quantity} ${item.uom || 'шт.'}`
      ].filter(Boolean);
      return idx !== undefined ? `${idx + 1}. ${parts.join(' ')}
` : parts.join(' ');
  };

  const handleCopyItem = (item: any) => {
      const content = `Order #${order.id}\n` + formatItemText(item);
      setCopyModal({ isOpen: true, title: 'Копирование позиции', content });
  };

  const handleCopyAll = () => {
      let fullText = `Order #${order.id}\n\n`;
      editingItems.forEach((item, idx) => {
          fullText += formatItemText(item, idx);
      });
      setCopyModal({ isOpen: true, title: 'Копирование всего заказа', content: fullText.trim() });
  };

  const getBestStats = (itemName: string) => {
      let minPrice = Infinity;
      let minWeeks = Infinity;
      if (!order.offers || order.offers.length === 0) return null;
      const otherOffers = order.offers.filter(o => !myOffer || o.id !== myOffer.id);
      if (otherOffers.length === 0) return null;
      otherOffers.forEach(offer => {
          const item = offer.items?.find((i: any) => i.name === itemName);
          if (item) {
              if (item.sellerPrice && item.sellerPrice < minPrice) minPrice = item.sellerPrice;
              if (item.deliveryWeeks && item.deliveryWeeks < minWeeks) minWeeks = item.deliveryWeeks;
          }
      });
      return { bestPrice: minPrice === Infinity ? null : minPrice, bestWeeks: minWeeks === Infinity ? null : minWeeks };
  };

  // Сбор всех файлов для отображения
  const allItemFiles = editingItems.flatMap((item, idx) => 
      (item.itemFiles || []).map((f: any, fIdx: number) => ({ ...f, sourceItemIdx: idx, sourceFileIdx: fIdx }))
  );

  return (
    <div className="bg-gray-50 p-6 min-h-screen">
        {toast && (
            <div className="fixed top-4 right-4 z-50">
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            </div>
        )}

        <DebugCopyModal 
            isOpen={copyModal.isOpen}
            title={copyModal.title}
            content={copyModal.content}
            onClose={() => setCopyModal({...copyModal, isOpen: false})}
            onConfirm={() => setCopyModal({...copyModal, isOpen: false})}
        />

        {/* 1. Блок Информации */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
                <FileText size={18} className="text-gray-600" />
                <h3 className="font-semibold text-gray-700 uppercase text-sm">Информация по заявке</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4 text-xs">
                <div>
                    <div className="text-gray-400 mb-1 uppercase font-bold text-[10px]">Имя</div>
                    <div className="font-bold text-indigo-600 uppercase">{order.clientName}</div>
                </div>
                <div>
                    <div className="text-gray-400 mb-1 uppercase font-bold text-[10px]">Почта</div>
                    <div className="font-medium text-gray-700">{order.clientEmail || '—'}</div>
                </div>
                <div>
                    <div className="text-gray-400 mb-1 uppercase font-bold text-[10px]">Адрес</div>
                    <div className="font-medium text-gray-700 uppercase">{order.location}</div>
                </div>
                <div>
                    <div className="text-gray-400 mb-1 uppercase font-bold text-[10px]">Тема письма</div>
                    <div className="font-medium text-gray-700 uppercase truncate" title={order.items?.[0]?.comment?.match(/\\\[Тема: (.*?) E]/)?.[1]}>
                        {order.items?.[0]?.comment?.match(/\\\[Тема: (.*?) E]/)?.[1] || '-'}
                    </div>
                </div>
            </div>
        </div>

        {/* 2. ТАБЛИЦА ТОВАРОВ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-8">
            <div className="hidden md:grid grid-cols-[40px_1fr_100px_100px_60px_60px_60px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider">
                <div className="text-center">№</div>
                <div>Наименование</div>
                <div>Бренд</div>
                <div>Артикул</div>
                <div className="text-center">Кол-во</div>
                <div className="text-center">Ед.</div>
                <div className="text-center">Фото</div>
            </div>

            <div className="divide-y divide-gray-100">
                {editingItems.map((item, idx) => (
                    <BuyerItemCard 
                        key={idx} 
                        item={item} 
                        index={idx} 
                        onUpdate={handleUpdateItem}
                        isDisabled={isDisabled}
                        orderId={order.id}
                        bestStats={!myOffer ? getBestStats(item.name) : null} 
                        onCopy={handleCopyItem}
                        isRequired={requiredFields.supplier_sku}
                    />
                ))}
            </div>
        </div>

        {/* 3. ДРОПЗОНА (Общая) */}
        {!isDisabled && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
                <FileDropzone 
                    files={supplierFiles}
                    onUpdate={setSupplierFiles}
                    label="Добавить общие файлы к заказу (счета, сертификаты)"
                />
            </div>
        )}

        {/* 4. СПИСОК ФАЙЛОВ (Строки с удалением) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 space-y-3">
            <div className="flex items-center gap-3 mb-2 pb-2 border-b border-gray-100">
                <Paperclip size={16} className="text-slate-400"/>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-tight">Вложения</h3>
            </div>

            {/* Файлы от Оператора */}
            <div className="flex items-start gap-2 text-xs">
                <span className="font-bold text-slate-400 uppercase shrink-0 mt-0.5 min-w-[120px]">От оператора:</span>
                <div className="font-medium text-indigo-600 flex flex-wrap gap-x-3 gap-y-2">
                    {/* Общие файлы */}
                    {order.order_files && order.order_files.map((file, idx) => (
                        <div key={`op-gen-${idx}`} className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">{file.name}</a>
                        </div>
                    ))}

                    {/* Файлы позиций */}
                    {order.items?.flatMap((item, itemIdx) => {
                        const files = item.itemFiles || [];
                        // Также учитываем старое поле opPhotoUrl, если нет itemFiles
                        if (files.length === 0 && item.opPhotoUrl) {
                            return [{ url: item.opPhotoUrl, name: 'Фото', type: 'image/jpeg', sourceItemIdx: itemIdx }];
                        }
                        return files.map((f: any, fIdx: number) => ({ ...f, sourceItemIdx: itemIdx, sourceFileIdx: fIdx }));
                    }).map((file, idx) => (
                        <div key={`op-item-${idx}`} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            <span className="text-[8px] font-bold text-slate-400 mr-1">#{file.sourceItemIdx + 1}</span>
                            <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">{file.name}</a>
                        </div>
                    ))}

                    {(!order.order_files?.length && !order.items?.some(i => i.itemFiles?.length || i.opPhotoUrl)) && (
                        <span className="text-slate-300 italic">—</span>
                    )}
                </div>
            </div>

            {/* Файлы от Закупщика */}
            <div className="flex items-start gap-2 text-xs pt-3 border-t border-slate-50">
                <span className="font-bold text-slate-400 uppercase shrink-0 mt-0.5 min-w-[120px]">От закупщика:</span>
                <div className="font-medium text-emerald-600 flex flex-wrap gap-x-3 gap-y-2">
                    {/* Общие файлы */}
                    {supplierFiles.map((file, idx) => (
                        <div key={`sup-${idx}`} className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                            <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">{file.name}</a>
                            {!isDisabled && (
                                <button onClick={() => removeGeneralFile(idx)} className="text-emerald-400 hover:text-red-500 transition-colors">
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    {/* Файлы позиций */}
                    {allItemFiles.map((file, idx) => (
                        <div key={`item-${idx}`} className="flex items-center gap-1 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            <span className="text-[8px] font-bold text-slate-400 mr-1">#{file.sourceItemIdx + 1}</span>
                            <a href={file.url} target="_blank" rel="noreferrer" className="hover:underline">{file.name}</a>
                            {!isDisabled && (
                                <button onClick={() => removeFileFromItem(file.sourceItemIdx, file.sourceFileIdx)} className="text-slate-400 hover:text-red-500 transition-colors">
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    ))}

                    {supplierFiles.length === 0 && allItemFiles.length === 0 && (
                        <span className="text-slate-300 italic">нет загруженных файлов</span>
                    )}
                </div>
            </div>
        </div>

        {/* 5. ФУТЕР ДЕЙСТВИЙ */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 -mx-6 -mb-6 flex justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100]">
            <div className="flex gap-3">
                <button 
                    onClick={() => onOpenChat(order.id)}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all text-xs font-black uppercase border-2 border-indigo-100"
                >
                    <MessageCircle size={16} /> Менеджер
                </button>
                {!order.isProcessed && (
                    <button 
                        onClick={handleCopyAll}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-xs font-black uppercase"
                    >
                        <Copy size={16} /> Копировать всё
                    </button>
                )}
            </div>

            {!myOffer && !order.isProcessed && (
                <button 
                    disabled={!isValid || isSubmitting} 
                    onClick={handlePreSubmit} 
                    className={`px-10 py-4 rounded-xl font-black text-xs uppercase shadow-xl transition-all flex items-center gap-3 active:scale-95 ${isValid && !isSubmitting ? (isAllDeclined ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-200' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300') : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'}`}
                >
                    {isValid ? (isAllDeclined ? 'Отказаться от заказа' : 'Отправить предложение') : 'Заполните все поля'} 
                    {isAllDeclined ? <XCircle size={18}/> : <CheckCircle size={18}/>}
                </button>
            )}
        </div>

        {order.isProcessed && (
            <div className="mt-8 flex items-center gap-3 justify-center py-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <ShieldCheck size={24} className="text-slate-300"/>
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-relaxed text-center px-4">
                        {statusInfo.label === 'ЧАСТИЧНО' ? 'ЗАКАЗ ОБРАБОТАН. ЕСТЬ ПОЗИЦИИ, КОТОРЫЕ УТВЕРЖДЕНЫ К ПОКУПКЕ.' :
                        statusInfo.label === 'ВЫИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВЫ ВЫИГРАЛИ ПО ВСЕМ ПОЗИЦИЯМ.' :
                        statusInfo.label === 'ПРОИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВАШЕ ПРЕДЛОЖЕНИЕ НЕ ПОДХОДИТ.' :
                        'ЗАКАЗ ОБРАБОТАН МЕНЕДЖЕРОМ. РЕДАКТИРОВАНИЕ ЗАКРЫТО.'}
                </span>
            </div>
        )}
    </div>
  );
};