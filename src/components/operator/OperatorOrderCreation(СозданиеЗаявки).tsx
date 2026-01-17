import React, { useState, useEffect, useCallback } from 'react';
import { OrderInfoForm } from './OrderInfoForm';
import { OrderFilesUpload } from './OrderFilesUpload';
import { PartsList } from './PartsList';
import { AiAssistant } from './AiAssistant';
import { SystemStatusHorizontal } from './SystemStatusHorizontal';
import { OrderInfo, Part, LogHistory, DisplayStats } from './types';
import { SupabaseService } from '../../services/supabaseService';
import { Toast } from '../shared/Toast';
import { AppUser } from '../../types';
import { createPortal } from 'react-dom';
import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';

interface OperatorOrderCreationProps {
    currentUser: AppUser | null;
    onLog: (msg: string) => void;
    onOrderCreated: () => void;
    debugMode?: boolean;
}

export const OperatorOrderCreation: React.FC<OperatorOrderCreationProps> = ({ currentUser, onLog, onOrderCreated, debugMode = false }) => {
    // State
    const [parts, setParts] = useState<Part[]>([
        { id: 1, name: '', article: '', brand: '', uom: 'шт', quantity: 1 }
    ]);
    
    const [orderInfo, setOrderInfo] = useState<OrderInfo>({
        deadline: '',
        region: '',
        city: '',
        email: '',
        clientEmail: '',
        emailSubject: '',
        clientName: '',
        clientPhone: ''
    });

    const [linkedEmailId, setLinkedEmailId] = useState<string | null>(null);
    const [orderFiles, setOrderFiles] = useState<{name: string, url: string, size?: number, type?: string}[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const [isBrandsValid, setIsBrandsValid] = useState(false);
    const [toast, setToast] = useState<{message: string, type?: 'success' | 'error' | 'info'} | null>(null);
    const [requiredFields, setRequiredFields] = useState<any>({ name: true, brand: true }); // Defaults
    const [highlightedFields, setHighlightedFields] = useState<Set<string>>(new Set());
    const [blinkTrigger, setBlinkTrigger] = useState(0);

    // --- GLOBAL DROPZONE LOGIC ---
    const onDrop = useCallback((acceptedFiles: File[]) => {
        acceptedFiles.forEach(async (file) => {
            try {
                // Прямая загрузка в Supabase (как это делалось в OrderFilesUpload)
                const publicUrl = await SupabaseService.uploadFile(file, 'attachments'); // Используем attachments бакет (как у оператора)
                
                setOrderFiles(prev => [...prev, {
                    name: file.name,
                    url: publicUrl,
                    size: file.size,
                    type: file.type
                }]);
                onLog(`Файл ${file.name} загружен через Drag-n-Drop.`);
            } catch (e: any) {
                console.error(e);
                setToast({ message: `Ошибка загрузки ${file.name}`, type: 'error' });
            }
        });
    }, [onLog]);

    const { getRootProps, getInputProps, isDragActive, open } = useDropzone({ 
        onDrop, 
        noClick: true, // Клик по контейнеру не открывает диалог, только кнопка
        noKeyboard: true
    });

    useEffect(() => {
        SupabaseService.getSystemSettings('operator_required_fields').then(res => {
            if (res) setRequiredFields(res);
        });
    }, []);

    // Stats
    const [requestHistory, setRequestHistory] = useState<LogHistory[]>([]);
    const [displayStats, setDisplayStats] = useState<DisplayStats>({
        rpm: 0,
        tpm: 0,
        totalRequests: 0,
        resetIn: 0,
        logs: []
    });

    // Stats Logic
    useEffect(() => {
        const interval = setInterval(() => {
            const now = Date.now();
            const oneMinuteAgo = now - 60000;

            setRequestHistory(currentHistory => {
                const recentHistory = currentHistory.filter(item => item.timestamp > oneMinuteAgo);
                const currentRpm = recentHistory.length;
                const currentTpm = recentHistory.reduce((sum, item) => sum + item.tokens, 0);
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

    const handleAddBrand = async (name: string) => {
        if (!name) return;
        try {
            await SupabaseService.addBrand(name, currentUser?.name || 'Operator');
            onLog(`Бренд "${name}" добавлен в базу.`);
            setToast({ message: `Бренд ${name} добавлен`, type: 'success' });
        } catch (e: any) {
            if (e.code === '23505') {
               setToast({ message: `Бренд ${name} уже существует`, type: 'info' });
            } else {
               console.error(e);
               setToast({ message: 'Ошибка добавления бренда: ' + e.message, type: 'error' });
            }
        }
    };

    const handleRemoveItemFile = (fileUrl: string) => {
        setParts(prevParts => prevParts.map(part => {
            const newFiles = (part.itemFiles || []).filter(f => f.url !== fileUrl);
            const newPhotoUrl = newFiles.length > 0 ? newFiles[0].url : (part.photoUrl === fileUrl ? '' : part.photoUrl);
            return { ...part, itemFiles: newFiles, photoUrl: newPhotoUrl };
        }));
        onLog(`Файл позиции удален.`);
    };

    const handleQuickFill = async () => {
        const names = ['Иван', 'Петр', 'Алексей', 'Сергей', 'Максим'];
        const cities = ['Москва', 'СПб', 'Екб', 'Казань'];
        const subjects = ['Запчасти на ТО', 'Срочный заказ', 'Детали подвески', 'Расходники'];
        
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomCity = cities[Math.floor(Math.random() * cities.length)];
        const randomSubject = subjects[Math.floor(Math.random() * subjects.length)];
        const randomPhone = `+7 (9${Math.floor(Math.random() * 10)}${Math.floor(Math.random() * 10)}) ${Math.floor(100 + Math.random() * 900)}-${Math.floor(10 + Math.random() * 90)}-${Math.floor(10 + Math.random() * 90)}`;
        
        setOrderInfo({
            deadline: new Date().toISOString().split('T')[0],
            region: 'РФ',
            city: randomCity,
            email: '',
            clientEmail: `client${Math.floor(Math.random() * 1000)}@mail.ru`,
            emailSubject: randomSubject,
            clientName: randomName,
            clientPhone: randomPhone
        });

        const dbBrands = await SupabaseService.getBrandsList();
        const safeBrands = dbBrands.length > 0 ? dbBrands : ['Toyota', 'BMW', 'Mercedes'];
        
        const partsPool = ['Фильтр масляный', 'Колодки тормозные', 'Свеча зажигания', 'Амортизатор', 'Рычаг подвески'];
        const newParts: Part[] = [];
        for(let i=0; i<2; i++) {
            const partName = partsPool[Math.floor(Math.random() * partsPool.length)];
            const brandName = safeBrands[Math.floor(Math.random() * safeBrands.length)];
            const randomArticle = Math.random().toString(36).substring(2, 10).toUpperCase();

            newParts.push({
                id: Date.now() + i,
                name: partName,
                brand: brandName,
                article: randomArticle,
                uom: 'шт',
                quantity: Math.floor(Math.random() * 4) + 1
            });
        }
        setParts(newParts);
        setIsBrandsValid(true);
        setToast({ message: 'Данные заполнены (2 позиции)', type: 'success' });
    };

    const validateForm = () => {
        const errors: string[] = [];
        const highlighted = new Set<string>();
        
        // 1. Header Fields
        if (requiredFields.client_name && !orderInfo.clientName?.trim()) { errors.push('Имя клиента'); highlighted.add('clientName'); }
        if (requiredFields.client_phone && !orderInfo.clientPhone?.trim()) { errors.push('Телефон'); highlighted.add('clientPhone'); }
        if (requiredFields.client_email && !orderInfo.clientEmail?.trim()) { errors.push('Почта'); highlighted.add('clientEmail'); }
        if (requiredFields.location && !orderInfo.city?.trim()) { errors.push('Адрес/Город'); highlighted.add('city'); }
        if (requiredFields.email_subject && !orderInfo.emailSubject?.trim()) { errors.push('Тема письма'); highlighted.add('emailSubject'); }

        // 2. Parts Fields
        parts.forEach((p, idx) => {
            if (requiredFields.name && !p.name?.trim()) { errors.push(`Поз. ${idx+1}: Наименование`); highlighted.add(`part_${p.id}_name`); }
            if (requiredFields.brand && !p.brand?.trim()) { errors.push(`Поз. ${idx+1}: Бренд`); highlighted.add(`part_${p.id}_brand`); }
            if (requiredFields.article && !p.article?.trim()) { errors.push(`Поз. ${idx+1}: Артикул`); highlighted.add(`part_${p.id}_article`); }
            if (requiredFields.quantity && (!p.quantity || p.quantity <= 0)) { errors.push(`Поз. ${idx+1}: Кол-во`); highlighted.add(`part_${p.id}_quantity`); }
            if (requiredFields.photos && (!p.itemFiles?.length && !p.photoUrl)) {
                 // Check if orderFiles exists (общие фото могут считаться зачет)
                 if (orderFiles.length === 0) { errors.push(`Поз. ${idx+1}: Фото/Файлы`); highlighted.add(`part_${p.id}_photos`); }
            }
        });

        if (requiredFields.brand && !isBrandsValid) errors.push('Бренды должны быть из базы (зеленые)');

        return { errors, highlighted };
    };

    const handleCreateOrder = async () => {
        if (!currentUser) return;

        if (orderInfo.clientEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(orderInfo.clientEmail)) {
            setToast({ message: 'Некорректный формат почты клиента (требуется @ и .)', type: 'error' });
            return;
        }

        const { errors, highlighted } = validateForm();
        if (errors.length > 0) {
            setHighlightedFields(highlighted);
            setBlinkTrigger(prev => prev + 1); // Trigger animation
            setToast({ message: `Заполните обязательные поля: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`, type: 'error' });
            
            // Убираем подсветку через 1 секунду (после анимации)
            setTimeout(() => {
                setHighlightedFields(new Set());
            }, 1000);
            return;
        }
        
        setHighlightedFields(new Set()); // Clear on success or proceeding
        setIsSaving(true);
        try {
            const newBrands = parts.filter(p => p.isNewBrand && p.brand?.trim()).map(p => p.brand.trim());
            if (newBrands.length > 0) {
                for (const bName of newBrands) {
                    try { await SupabaseService.addBrand(bName, currentUser.name); } catch (e) {}
                }
            }

            const itemsForDb = parts.map((p, index) => {
                let comment = '';
                if (index === 0 && orderInfo.emailSubject) {
                    comment = `[S: ${orderInfo.emailSubject}]`;
                }

                // FIX: Если itemFiles пуст, но есть photoUrl - создаем itemFiles явно
                let finalItemFiles = p.itemFiles;
                if ((!finalItemFiles || finalItemFiles.length === 0) && p.photoUrl) {
                     finalItemFiles = [{ name: 'Фото', url: p.photoUrl, type: 'image/jpeg' }];
                }

                return {
                    name: p.name,
                    quantity: p.quantity,
                    comment: comment, 
                    category: 'Оригинал',
                    brand: p.brand,
                    article: p.article,
                    uom: p.uom,
                    photoUrl: p.photoUrl,
                    itemFiles: finalItemFiles
                };
            });

            const orderId = await SupabaseService.createOrder(
                itemsForDb,
                orderInfo.clientName || 'Не указано',
                orderInfo.clientPhone,
                currentUser.id, 
                orderInfo.deadline || (() => {
                    const date = new Date();
                    date.setDate(date.getDate() + 3);
                    return date.toISOString().split('T')[0];
                })(),
                orderInfo.clientEmail,
                orderInfo.city,
                orderFiles,
                linkedEmailId // Передаем ID письма
            );

            // Если был привязан email, архивируем его
            if (linkedEmailId) {
                try {
                    await SupabaseService.archiveEmail(linkedEmailId);
                    onLog(`Письмо перемещено в архив.`);
                } catch (e) {
                    console.error('Ошибка архивации письма:', e);
                }
            }

            setToast({ message: `Заказ №${orderId} создан успешно`, type: 'success' });
            onLog(`Заказ №${orderId} создан.`);
            onOrderCreated();
            
            // Reset form
            setParts([{ id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
            setOrderFiles([]);
            setOrderInfo({
                deadline: '', region: '', city: '', email: '', clientEmail: '', emailSubject: '', clientName: '', clientPhone: ''
            });
            setLinkedEmailId(null);

        } catch (e: any) {
            console.error(e);
            setToast({ message: 'Ошибка создания: ' + e.message, type: 'error' });
            onLog(`Ошибка создания заявки: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // Слушатель для импорта из почты
    useEffect(() => {
        const handleLink = (e: any) => {
            setLinkedEmailId(e.detail);
            onLog('Письмо успешно привязано к будущему заказу.');
        };
        
        window.addEventListener('linkEmailToOrder', handleLink);
        return () => window.removeEventListener('linkEmailToOrder', handleLink);
    }, []);

    // Слушатель для импорта из почты (предыдущий хук был пустой, заменяем его)
    useEffect(() => {
        const handleImport = (e: any) => {
            // Логика будет внутри AiAssistant, здесь просто слушаем или пробрасываем?
            // AiAssistant сам подписан? Нет, OperatorInterface подписан.
            // Сейчас OperatorInterface пробрасывает `onImport`.
            // Нам нужно прокинуть событие в AiAssistant?
            // В оригинале было window.dispatchEvent. AiAssistant не слушает window.
            // OperatorInterface слушал email widget и вызывал handleImportEmail -> window.dispatchEvent
            // А кто слушал? AiAssistant? Нет. 
            // А, AiAssistant передается `onImport`.
            // Значит, нам нужно пробросить метод `handleImportEmail` из OperatorInterface сюда?
            // Или перенести слушатель сюда?
        };
    }, []);

    return (
        <div {...getRootProps()} className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 md:p-10 space-y-10 relative outline-none">
            <input {...getInputProps()} />
            
            {/* DRAG OVERLAY */}
            {isDragActive && (
                <div className="absolute inset-0 z-[50] bg-indigo-500/10 border-8 border-indigo-500/50 border-dashed m-4 rounded-3xl backdrop-blur-[2px] pointer-events-none transition-all duration-300" />
            )}

            {toast && createPortal(
                <div className="fixed top-4 right-4 z-[100] animate-in slide-in-from-right-10 fade-in duration-300">
                    <Toast message={toast.message} onClose={() => setToast(null)} type={toast.type as any} duration={1000} />
                </div>,
                document.body
            )}

            <OrderInfoForm 
                orderInfo={orderInfo} 
                setOrderInfo={setOrderInfo} 
                onQuickFill={debugMode ? handleQuickFill : undefined} 
                requiredFields={requiredFields} 
                highlightedFields={highlightedFields}
                blinkTrigger={blinkTrigger}
            />
            
            <OrderFilesUpload 
                files={orderFiles} 
                setFiles={setOrderFiles} 
                onLog={onLog} 
                itemFiles={parts.flatMap((p, idx) => {
                    const files = p.itemFiles || (p.photoUrl ? [{name: 'Фото', url: p.photoUrl, type: 'image/jpeg'}] : []);
                    return files.map(f => ({ file: f, label: `Поз. ${idx + 1}` }));
                })}
                onRemoveItemFile={handleRemoveItemFile}
                required={requiredFields.photos}
                onOpenFileDialog={open} // Передаем функцию открытия диалога
            />
            
            <PartsList 
                parts={parts} 
                setParts={setParts} 
                onAddBrand={handleAddBrand}
                onValidationChange={setIsBrandsValid}
                requiredFields={requiredFields}
                highlightedFields={highlightedFields}
                blinkTrigger={blinkTrigger}
            />
            
            <AiAssistant 
                onImport={(newParts) => {
                    if (parts.length === 1 && !parts[0].name) {
                        setParts(newParts);
                    } else {
                        setParts([...parts, ...newParts]);
                    }
                }}
                onUpdateOrderInfo={(info) => setOrderInfo(prev => ({ ...prev, ...info }))}
                onLog={onLog}
                onStats={(tokens) => {
                    setRequestHistory(prev => [...prev, { timestamp: Date.now(), tokens }]);
                    setDisplayStats(prev => ({ ...prev, totalRequests: prev.totalRequests + 1 }));
                }}
                onCreateOrder={handleCreateOrder}
                isSaving={isSaving}
                debugMode={debugMode}
            />
            
            <SystemStatusHorizontal displayStats={displayStats} />
        </div>
    );
};
