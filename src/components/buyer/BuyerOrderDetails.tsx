import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { Send, CheckCircle, FileText, Copy, ShieldCheck, XCircle, MessageCircle, Folder, Paperclip, X, UploadCloud, Plus, Edit2, Menu, MoreHorizontal, Loader2, Save } from 'lucide-react';
import { BuyerItemCard } from './BuyerItemCard';
import { Order } from '../../types';
import { Toast } from '../shared/Toast';
import { DebugCopyModal } from '../shared/DebugCopyModal';
import { ConfirmationModal } from '../shared/ConfirmationModal'; 
import { SupabaseService } from '../../services/supabaseService';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { createPortal } from 'react-dom';

interface BuyerOrderDetailsProps {
  order: Order;
  editingItems: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[], supplierFiles?: any[], status?: string) => Promise<string | void>;
  isSubmitting: boolean;
  myOffer: any;
  statusInfo: any;
  onOpenChat: (orderId: string, targetRole?: 'OPERATOR' | 'MANAGER') => void;
}

export const BuyerOrderDetails: React.FC<BuyerOrderDetailsProps> = ({ 
  order, editingItems, setEditingItems, onSubmit, isSubmitting, myOffer, statusInfo, onOpenChat 
}) => { 
  const queryClient = useQueryClient();
  const [copyModal, setCopyModal] = useState<{isOpen: boolean, title: string, content: string}>({
      isOpen: false, title: '', content: ''
  });
  const [showRefuseModal, setShowRefuseModal] = useState(false); 
  const [showEmptyConfirm, setShowEmptyConfirm] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  
  const [requiredFields, setRequiredFields] = useState<any>({}); 
  const [toast, setToast] = useState<{message: string, type: 'error' | 'success'} | null>(null);
  const [supplierFiles, setSupplierFiles] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editTimeout, setEditTimeout] = useState(5);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'idle'>('idle');
  const [isDirty, setIsDirty] = useState(false); // NEW
  const hasMounted = useRef(false);

  const isDraft = myOffer?.status === 'Черновик';
  const isAllDeclined = editingItems.every(item => item.offeredQuantity === 0);
  const isDisabled = (order.isProcessed === true || (!!myOffer && !isDraft && !isEditing));

  // --- MANUAL SAVE ---
  const handleManualSave = async () => {
      setSaveStatus('saving');
      try {
          await onSubmit(order.id, editingItems, supplierFiles, 'Черновик');
          setSaveStatus('saved');
          setIsDirty(false);
          setToast({ message: 'Черновик сохранен', type: 'success' });
          setTimeout(() => setSaveStatus('idle'), 3000);
      } catch (e) {
          setSaveStatus('error');
          setToast({ message: 'Ошибка сохранения', type: 'error' });
          setTimeout(() => setSaveStatus('idle'), 3000);
      }
  };

  // --- GLOBAL DROPZONE LOGIC ---
  const onDrop = useCallback((acceptedFiles: File[]) => {
      if (isDisabled) return;
      
      const newFiles = acceptedFiles.map(file => ({
          file, 
          name: file.name,
          url: URL.createObjectURL(file),
          type: file.type,
          size: file.size
      }));

      // Upload automatically
      newFiles.forEach(async (f) => {
          try {
             const publicUrl = await SupabaseService.uploadFile(f.file, 'offers');
             setSupplierFiles(prev => [...prev, { name: f.name, url: publicUrl, type: f.type, size: f.size }]);
             setIsDirty(true);
          } catch (e) {
             setToast({ message: `Ошибка загрузки ${f.name}`, type: 'error' });
          }
      });
      
  }, [isDisabled]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: true,
        disabled: isDisabled
    });
  useEffect(() => {
      SupabaseService.getSystemSettings('buyer_required_fields').then(res => {
          if (res) setRequiredFields(res);
      });
      SupabaseService.getSystemSettings('offer_edit_timeout').then(res => {
          if (res) setEditTimeout(Number(res));
      });

      // Sync editingItems with existing offer data when not in active edit mode
      // Skip sync for drafts to prevent overwriting local work
      if (myOffer && !isDraft && !isEditing) {
          const mappedItems = order.items.map(oi => {
              const match = myOffer.items?.find((mi: any) => 
                  (mi.order_item_id && String(mi.order_item_id) === String(oi.id)) || 
                  (!mi.order_item_id && mi.name === oi.name)
              );
              
              if (match) {
                  return {
                      ...oi,
                      BuyerPrice: match.sellerPrice,
                      weight: match.weight,
                      deliveryWeeks: match.deliveryWeeks || (match.delivery_days ? match.delivery_days / 7 : 0),
                      offeredQuantity: match.offeredQuantity ?? (match.quantity ?? 0),
                      supplierSku: match.supplierSku,
                      comment: match.comment || '',
                      itemFiles: match.itemFiles || [],
                      offerItemId: match.id,
                      rank: match.rank,
                      isWinner: match.is_winner || match.rank === 'ЛИДЕР' || match.rank === 'LEADER'
                  };
              }
              return { ...oi, offeredQuantity: 0 };
          });
          setEditingItems(mappedItems);
      }

      if (myOffer?.supplier_files) {
          setSupplierFiles(myOffer.supplier_files);
      }
  }, [myOffer]);

  // --- EDITING LOGIC ---
  const handleStartEdit = async () => {
      if (!myOffer) return;
      
      // 1. Проверка дедлайна (3 дня - таймаут - 2 мин)
      const createdAt = new Date(order.createdAt);
      const autoCloseDate = new Date(createdAt.getTime() + 3 * 24 * 60 * 60 * 1000);
      const now = new Date();
      const timeRemainingMs = autoCloseDate.getTime() - now.getTime();
      const minRequiredMs = (editTimeout + 2) * 60 * 1000;

      if (timeRemainingMs < minRequiredMs) {
          setToast({ message: 'Редактирование недоступно: заказ скоро будет закрыт автоматически.', type: 'error' });
          return;
      }

      // 2. Блокировка в БД
      try {
          await SupabaseService.lockOffer(myOffer.id);
      } catch (e) {
          console.error('Lock failed', e);
      }

      // 3. Маппинг данных из существующего оффера в editingItems
      const mappedItems = order.items.map(oi => {
          const match = myOffer.items?.find((mi: any) => 
              (mi.order_item_id && String(mi.order_item_id) === String(oi.id)) || 
              (!mi.order_item_id && mi.name === oi.name)
          );
          if (match) {
              return {
                  ...oi,
                  BuyerPrice: match.sellerPrice, // Fixed: match.price was undefined
                  weight: match.weight,
                  deliveryWeeks: match.deliveryWeeks || (match.delivery_days ? match.delivery_days / 7 : 0),
                  offeredQuantity: match.offeredQuantity ?? (match.quantity ?? 0),
                  supplierSku: match.supplierSku,
                  comment: match.comment || '', // Fix: Use supplier comment only
                  itemFiles: match.itemFiles || [],
                  offerItemId: match.id 
              };
          }
          return { ...oi, offeredQuantity: 0 }; // Позиция не была заполнена
      });

      setEditingItems(mappedItems);
      setIsEditing(true);
      setToast({ message: 'Режим редактирования включен. У вас есть ' + editTimeout + ' мин.', type: 'success' });
  };

  const handleCancelEdit = async () => {
      if (!myOffer) return;
      try {
          await SupabaseService.unlockOffer(myOffer.id);
          setIsEditing(false);
          // Сброс данных к состоянию "только чтение" произойдет при ререндере, 
          // так как isDisabled снова станет true и BuyerItemCard покажет данные из myOffer.
      } catch (e) {
          setIsEditing(false);
      }
  };

  const handleSaveEdit = async () => {
      if (!isValid) {
          setToast({ message: 'Заполните поля для выбранных позиций!', type: 'error' });
          return;
      }
      try {
          await SupabaseService.editOffer(myOffer.id, editingItems, supplierFiles);
          setIsEditing(false);
          setToast({ message: 'Изменения сохранены!', type: 'success' });
          queryClient.invalidateQueries({ queryKey: ['orders'] });
          queryClient.invalidateQueries({ queryKey: ['order-details', order.id] });
      } catch (e: any) {
          setToast({ message: 'Ошибка: ' + e.message, type: 'error' });
      }
  };

  const BuyerAuth = useMemo(() => {
      try { return JSON.parse(localStorage.getItem('Buyer_auth') || 'null'); } catch { return null; } 
  }, []);

  const isValid = useMemo(() => {
      const hasAtLeastOneOffer = editingItems.some(item => item.BuyerPrice && item.BuyerPrice > 0);
      if (!hasAtLeastOneOffer) return false;

      return editingItems.every(item => {
          if (!item.BuyerPrice || item.BuyerPrice <= 0) return true;

          const reqWeight = requiredFields.weight !== false;
          const reqWeeks = requiredFields.delivery_weeks !== false;
          const reqQty = requiredFields.quantity === true;
          const reqComment = requiredFields.comment === true;
          const reqSku = requiredFields.supplier_sku === true;
          const reqImages = requiredFields.images === true;

          if (reqWeight && (!item.weight || item.weight <= 0)) return false;
          if (reqWeeks && (!item.deliveryWeeks || item.deliveryWeeks < 1)) return false;
          if (reqQty && (!item.offeredQuantity || item.offeredQuantity <= 0)) return false;
          
          if (reqSku && (!item.supplierSku || item.supplierSku.trim().length === 0)) return false;
          if (reqComment && (!item.comment || item.comment.trim().length === 0)) return false;
          if (reqImages && (!item.itemFiles || item.itemFiles.length === 0)) return false;

          return true;
      });
  }, [editingItems, requiredFields]);

  const handlePreSubmit = async () => {
      // 1. Проверка на незаполненные цены (но активные)
      const emptyPriceItems = editingItems.filter(item => (item.offeredQuantity > 0) && (!item.BuyerPrice || item.BuyerPrice <= 0));
      console.log('EMPTY PRICE ITEMS:', emptyPriceItems);
      
      if (emptyPriceItems.length > 0) {
          setShowEmptyConfirm(true);
          return;
      }

      if (!isValid) {
          setToast({ message: 'Заполните обязательные поля для выбранных позиций!', type: 'error' });
          return;
      }
      await onSubmit(order.id, editingItems, supplierFiles);
  };

  const handleConfirmEmptySubmit = async () => {
      // Превращаем пустые в отказ
      const processedItems = editingItems.map(item => {
          if ((item.offeredQuantity > 0) && (!item.BuyerPrice || item.BuyerPrice <= 0)) {
              return { ...item, offeredQuantity: 0 };
          }
          return item;
      });
      setShowEmptyConfirm(false);
      await onSubmit(order.id, processedItems, supplierFiles);
  };

  const handleUpdateItem = (idx: number, field: string, value: any) => {
      const newItems = [...editingItems];
      newItems[idx] = { ...newItems[idx], [field]: value };
      setEditingItems(newItems);
      setIsDirty(true);
  };

  const handleToggleItemStatus = (index: number) => {
      const item = editingItems[index];
      const isCurrentlyUnavailable = item.offeredQuantity === 0;

      if (isCurrentlyUnavailable) {
          handleUpdateItem(index, 'offeredQuantity', item.quantity || 1);
      } else {
          const otherActiveItems = editingItems.filter((it, idx) => idx !== index && (it.offeredQuantity || 0) > 0);
          console.log('TOGGLE STATUS DEBUG:', { index, otherActiveItemsCount: otherActiveItems.length, items: editingItems });
          
          if (otherActiveItems.length === 0) {
              setShowRefuseModal(true);
          } else {
              handleUpdateItem(index, 'offeredQuantity', 0);
          }
      }
  };

  const removeFileFromItem = (itemIdx: number, fileIdx: number) => {
      if (isDisabled) return;
      const newItems = [...editingItems];
      const newFiles = [...(newItems[itemIdx].itemFiles || [])];
      newFiles.splice(fileIdx, 1);
      newItems[itemIdx] = { ...newItems[idx], itemFiles: newFiles };
      setEditingItems(newItems);
      setIsDirty(true);
  };

  const removeGeneralFile = (fileIdx: number) => {
      if (isDisabled) return;
      const newFiles = [...supplierFiles];
      newFiles.splice(fileIdx, 1);
      setSupplierFiles(newFiles);
      setIsDirty(true);
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
      const content = `Order #${order.id}
` + formatItemText(item);
      setCopyModal({ isOpen: true, title: 'Копирование позиции', content });
  };

  const handleCopyAll = () => {
      let fullText = `Order #${order.id}

`;
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
    <div 
        {...getRootProps()} 
        className="bg-gray-50 p-2 md:p-6 min-h-screen relative outline-none transition-all duration-300"
    >
        <input {...getInputProps()} />
        
        {/* GLOBAL DRAG OVERLAY */}
        {isDragActive && (
            <div className="absolute inset-0 z-[50] m-4 border-8 border-indigo-500/50 border-dashed rounded-3xl bg-indigo-500/10 backdrop-blur-[2px] pointer-events-none transition-all duration-300" />
        )}

        {toast && createPortal(
            <div className="fixed top-24 right-6 z-[9999] animate-in slide-in-from-right-10 fade-in duration-300">
                <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
            </div>,
            document.body
        )}

        <DebugCopyModal 
            isOpen={copyModal.isOpen}
            title={copyModal.title}
            content={copyModal.content}
            onClose={() => setCopyModal({...copyModal, isOpen: false})}
            onConfirm={() => setCopyModal({...copyModal, isOpen: false})}
        />

        <ConfirmationModal 
            isOpen={showRefuseModal}
            onClose={() => setShowRefuseModal(false)}
            onConfirm={async () => {
                const zeroItems = editingItems.map(i => ({ ...i, offeredQuantity: 0 }));
                await onSubmit(order.id, zeroItems, supplierFiles, 'Отказ');
                setShowRefuseModal(false);
            }}
            title="Отказ от заказа"
            message="Вы уверены, что хотите отказаться? Заказ будет перемещен в архив."
            confirmText="Да, отказаться"
            cancelText="Отмена"
            isDangerous
        />

        <ConfirmationModal 
            isOpen={showEmptyConfirm}
            onClose={() => setShowEmptyConfirm(false)}
            onConfirm={handleConfirmEmptySubmit}
            title="Неполное заполнение"
            message={`Вы не указали цену для ${editingItems.filter(item => (item.offeredQuantity > 0) && (!item.BuyerPrice || item.BuyerPrice <= 0)).length} позиций. Отметить их как 'Отказ' и отправить КП?`}
            confirmText="Да, отправить с отказами"
            cancelText="Вернуться"
        />

        {/* 1. Блок Информации */}
        <div className="bg-white rounded-lg p-4 md:p-6 mb-4 md:mb-6 shadow-sm border border-gray-200">
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
                    <div className="font-medium text-gray-700 uppercase truncate" title={order.items?.[0]?.comment?.match(/\((Тема|S): (.*?)\)/)?.[2]}>
                        {order.items?.[0]?.comment?.match(/\((Тема|S): (.*?)\)/)?.[2] || '-'}
                    </div>
                </div>
            </div>
        </div>

        {/* 2. ТАБЛИЦА ТОВАРОВ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8 relative z-[60]">
            <div className="hidden md:grid grid-cols-[40px_100px_1fr_100px_60px_60px_60px] gap-4 px-6 py-3 bg-gray-50 border-b border-gray-200 text-[10px] font-black text-gray-500 uppercase tracking-wider rounded-t-xl">
                <div className="text-center">№</div>
                <div>Бренд</div>
                <div>Наименование</div>
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
                        sourceItem={order.items?.[idx]} 
                        index={idx} 
                        onUpdate={handleUpdateItem}
                        isDisabled={isDisabled}
                        orderId={order.id}
                        bestStats={!myOffer ? getBestStats(item.name) : null} 
                        onCopy={handleCopyItem}
                        requiredFields={requiredFields}
                        onToggleStatus={() => handleToggleItemStatus(idx)}
                    />
                ))}
            </div>
        </div>

        {/* 4. СПИСОК ФАЙЛОВ */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-6 mb-8">
            <div className="flex items-center gap-3 mb-4 pb-2 border-b border-gray-100">
                <Paperclip size={16} className="text-slate-400"/>
                <h3 className="text-xs font-black uppercase text-slate-500 tracking-tight">Вложения</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Файлы от Оператора */}
                {(() => {
                    const allOpFiles: any[] = [];
                    if (order.order_files) {
                        order.order_files.forEach(f => allOpFiles.push({...f, typeLabel: 'Общий'}));
                    }
                    order.items?.forEach((item, idx) => {
                        let currentFiles = item.itemFiles || [];
                        if (currentFiles.length === 0 && item.opPhotoUrl) {
                            currentFiles = [{ name: 'Фото', url: item.opPhotoUrl, type: 'image/jpeg' }];
                        }
                        currentFiles.forEach(f => {
                            allOpFiles.push({ ...f, typeLabel: `Поз. ${item.AdminName || item.name}` });
                        });
                    });

                    return (
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Файлы от оператора</span>
                            {allOpFiles.length > 0 ? (
                                <div className="flex flex-col gap-2 text-xs font-bold text-indigo-600 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    {allOpFiles.map((file, fidx) => (
                                        <div key={fidx} className="flex gap-2 items-start">
                                            <span className="text-slate-400 font-medium text-[10px] uppercase shrink-0 mt-0.5 bg-white px-1.5 rounded border border-slate-200">
                                                {file.typeLabel}
                                            </span>
                                            <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all leading-tight" title={file.name}>{file.name}</a>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-300 italic pl-2">— нет файлов —</span>
                            )}
                        </div>
                    );
                })()}

                {/* Файлы от Закупщика */}
                {(() => {
                    const allMyFiles: any[] = [];
                    supplierFiles.forEach((f, idx) => {
                        allMyFiles.push({ ...f, typeLabel: 'Общий', source: 'general', idx });
                    });
                    editingItems.forEach((item, itemIdx) => {
                        const files = item.itemFiles || [];
                        files.forEach((f: any, fIdx: number) => {
                            allMyFiles.push({ ...f, typeLabel: `Поз. ${item.name}`, source: 'item', itemIdx, fIdx });
                        });
                    });
                    
                    return (
                        <div>
                            <span className="block text-[10px] font-bold text-slate-400 uppercase mb-2">Ваши файлы (К отправке)</span>
                            {allMyFiles.length > 0 ? (
                                <div className="flex flex-col gap-2 text-xs font-bold text-emerald-600 max-h-40 overflow-y-auto pr-2 custom-scrollbar bg-emerald-50/50 p-3 rounded-lg border border-emerald-100">
                                    {allMyFiles.map((file, i) => (
                                        <div key={i} className="flex gap-2 items-start justify-between group">
                                            <div className="flex gap-2 items-start">
                                                <span className="text-emerald-400/80 font-medium text-[10px] uppercase shrink-0 mt-0.5 bg-white px-1.5 rounded border border-emerald-100">
                                                    {file.typeLabel}
                                                </span>
                                                <a href={file.url} target="_blank" rel="noopener noreferrer" className="hover:underline break-all leading-tight" title={file.name}>{file.name}</a>
                                            </div>
                                            {!isDisabled && (
                                                <button 
                                                    onClick={() => {
                                                        if (file.source === 'general') removeGeneralFile(file.idx);
                                                        else removeFileFromItem(file.itemIdx, file.fIdx);
                                                    }}
                                                    className="text-emerald-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1"
                                                    title="Удалить"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-xs text-slate-300 italic pl-2">— перетащите файлы в любое место на странице —</span>
                            )}
                        </div>
                    );
                })()}
            </div>
        </div>

        {/* 5. ФУТЕР ДЕЙСТВИЙ */}
        <div className="sticky bottom-0 bg-white/90 backdrop-blur-md border-t border-slate-200 p-4 -mx-2 -mb-2 md:-mx-6 md:-mb-6 flex gap-3 justify-between items-center shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-[100]">
            
            {/* DESKTOP ACTIONS (LEFT) */}
            <div className="hidden md:flex gap-3">
                <button 
                    onClick={() => onOpenChat(order.id, 'OPERATOR')}
                    className="flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 rounded-xl hover:bg-indigo-50 transition-all text-xs font-black uppercase border-2 border-indigo-100"
                >
                    <MessageCircle size={16} /> Оператор
                </button>
                {!order.isProcessed && !isEditing && (
                    <button 
                        onClick={() => setShowRefuseModal(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all text-xs font-black uppercase border border-red-100"
                    >
                        <XCircle size={16} /> Отказаться
                    </button>
                )}
                {isEditing && (
                    <button 
                        onClick={handleCancelEdit}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-500 rounded-xl hover:bg-slate-200 transition-all text-xs font-black uppercase border border-slate-200"
                    >
                        Отмена
                    </button>
                )}
                {!order.isProcessed && !isEditing && (
                    <button 
                        onClick={handleCopyAll}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all text-xs font-black uppercase"
                    >
                        <Copy size={16} /> Копировать всё
                    </button>
                )}
            </div>

            {/* MOBILE MENU (LEFT) */}
            <div className="md:hidden relative">
                <button 
                    onClick={() => setShowMobileMenu(!showMobileMenu)}
                    className="p-3 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all border border-slate-200"
                >
                    <Menu size={20} />
                </button>
                
                {showMobileMenu && (
                    <>
                        <div className="fixed inset-0 z-30" onClick={() => setShowMobileMenu(false)}></div>
                        <div className="absolute bottom-full left-0 mb-2 w-64 bg-white border border-slate-200 rounded-xl shadow-2xl z-40 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                            <button 
                                onClick={() => { onOpenChat(order.id, 'OPERATOR'); setShowMobileMenu(false); }}
                                className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                            >
                                <MessageCircle size={16} className="text-indigo-500"/> Чат с оператором
                            </button>
                            {!order.isProcessed && !isEditing && (
                                <button 
                                    onClick={() => { setShowRefuseModal(true); setShowMobileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-red-600 hover:bg-red-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                    <XCircle size={16}/> Отказаться от заказа
                                </button>
                            )}
                            {isEditing && (
                                <button 
                                    onClick={() => { handleCancelEdit(); setShowMobileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-500 hover:bg-slate-50 flex items-center gap-3 border-b border-slate-50"
                                >
                                    <X size={16}/> Отменить редактирование
                                </button>
                            )}
                            {!order.isProcessed && !isEditing && (
                                <button 
                                    onClick={() => { handleCopyAll(); setShowMobileMenu(false); }}
                                    className="w-full text-left px-4 py-3 text-xs font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-3"
                                >
                                    <Copy size={16}/> Копировать все позиции
                                </button>
                            )}
                        </div>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4 flex-1 justify-end md:flex-none">
                {/* Индикатор автосохранения */}
                {saveStatus !== 'idle' && (
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase text-slate-400 mr-2 animate-in fade-in transition-opacity duration-500">
                        {saveStatus === 'saving' && <Loader2 size={12} className="animate-spin"/>}
                        {saveStatus === 'saved' && <CheckCircle size={12} className="text-emerald-500"/>}
                        {saveStatus === 'error' && <XCircle size={12} className="text-red-500"/>}
                        {saveStatus === 'saving' ? 'Сохранение...' : (saveStatus === 'error' ? 'Ошибка' : 'Сохранено')}
                    </div>
                )}

                {/* Кнопка ИЗМЕНИТЬ / ДОПОЛНИТЬ (Только для отправленных) */}
                {!!myOffer && !isDraft && !order.isProcessed && !isEditing && (
                    <button 
                        onClick={handleStartEdit}
                        className="w-full md:w-auto px-6 py-4 rounded-xl bg-white border-2 border-indigo-600 text-indigo-600 font-black text-xs uppercase shadow-lg hover:bg-indigo-50 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        <Edit2 size={18} /> <span className="hidden sm:inline">Изменить / Дополнить</span><span className="sm:hidden">Изменить</span>
                    </button>
                )}

                {/* КНОПКИ ДЕЙСТВИЙ */}
                {(!myOffer || isDraft || isEditing) && !order.isProcessed && !isAllDeclined && (
                    <div className="flex gap-2">
                        {/* 1. Сохранить (Черновик) - Всегда доступно */}
                        <button 
                            disabled={isSubmitting} 
                            onClick={() => {
                                if (isEditing) handleSaveEdit(); // В режиме редактирования опубликованного - сохраняем изменения
                                else handleManualSave();
                            }}
                            className="px-4 py-4 rounded-xl bg-white border border-slate-200 text-slate-600 font-bold text-xs uppercase shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 active:scale-95"
                            title="Сохранить без отправки"
                        >
                            <Save size={18} />
                            <span className="hidden sm:inline">Сохранить</span>
                        </button>

                        {/* 2. Отправить КП - Требует валидации */}
                        <button 
                            disabled={!isValid || isSubmitting} 
                            onClick={isEditing ? handleSaveEdit : handlePreSubmit} 
                            className={`px-6 py-4 rounded-xl font-black text-xs uppercase shadow-xl transition-all flex items-center justify-center gap-2 active:scale-95 ${
                                isValid && !isSubmitting 
                                    ? 'bg-slate-900 text-white hover:bg-slate-800 shadow-slate-300' 
                                    : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            <span className="truncate">
                                {isEditing ? 'Сохранить изменения' : 'Отправить КП'}
                            </span> 
                            <CheckCircle size={18} className="shrink-0"/>
                        </button>
                    </div>
                )}
            </div>
        </div>

        {order.isProcessed && (
            <div className="mt-8 flex items-center gap-3 justify-center py-6 bg-white rounded-2xl border-2 border-dashed border-slate-200">
                <ShieldCheck size={24} className="text-slate-300"/>
                <span className="text-xs font-black uppercase text-slate-400 tracking-widest leading-relaxed text-center px-4">
                        {statusInfo.label === 'ЧАСТИЧНО' ? 'ЗАКАЗ ОБРАБОТАН. ЕСТЬ ПОЗИЦИИ, КОТОРЫЕ УТВЕРЖДЕНЫ К ПОКУПКЕ.' :
                        statusInfo.label === 'ВЫИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВЫ ВЫИГРАЛИ ПО ВСЕМ ПОЗИЦИЯМ.' :
                        statusInfo.label === 'ПРОИГРАЛ' ? 'ЗАКАЗ ОБРАБОТАН. ВАШЕ ПРЕДЛОЖЕНИЕ НЕ ПОДХОДИТ.' :
                        statusInfo.label === 'АННУЛИРОВАН' ? `ЗАКАЗ АННУЛИРОВАН. ПРИЧИНА: ${order.refusalReason || 'Не указана'}` :
                        'ЗАКАЗ ОБРАБОТАН МЕНЕДЖЕРОМ. РЕДАКТИРОВАНИЕ ЗАКРЫТО.'}
                </span>
            </div>
        )}
    </div>
  );
};
