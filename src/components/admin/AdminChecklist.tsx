import React, { useState, useEffect, useCallback } from 'react';
import { ClipboardList, Plus, RotateCcw, Loader2 } from 'lucide-react';
import { ConfirmationModal } from '../shared/ConfirmationModal';
import { SupabaseService } from '../../services/supabaseService';
import { AdminChecklistItem } from '../../services/api/admin/checklist';
import { ChecklistCategory } from './checklist/ChecklistCategory';

// Full default checklist seed
const DEFAULT_CHECKLIST_SEED = [
  // 1. АВТОРИЗАЦИЯ
  { 
      category: '1. Авторизация', text: 'Вход и Доступ', description: 'Базовая проверка прав.',
      sub_items: [
          { id: 'a1', text: 'Вход Менеджера (Полный доступ)', checked: false },
          { id: 'a2', text: 'Вход Оператора (Только свои заявки)', checked: false },
          { id: 'a3', text: 'Вход Закупщика (Только публичные/свои)', checked: false },
          { id: 'a4', text: 'Попытка входа заблокированного пользователя', checked: false }
      ]
  },
  {
      category: '1. Авторизация', text: 'Регистрация (Invite Flow)', description: 'Проверка системы приглашений.',
      sub_items: [
          { id: 'reg1', text: 'Генерация инвайта в Админке', checked: false },
          { id: 'reg2', text: 'Регистрация нового юзера на /start', checked: false },
          { id: 'reg3', text: 'Проверка статуса Pending', checked: false },
          { id: 'reg4', text: 'Одобрение пользователя Менеджером', checked: false }
      ]
  },
  // 2. ФИНАНСЫ
  {
      category: '2. Финансы', text: 'Курсы и Настройки', description: 'Влияние глобальных настроек.',
      sub_items: [
          { id: 'fin1', text: 'Изменить курс Юаня', checked: false },
          { id: 'fin2', text: 'Изменить Тариф доставки', checked: false },
          { id: 'fin3', text: 'Изменить Наценку', checked: false },
          { id: 'fin4', text: 'Сохранение настроек (F5)', checked: false }
      ]
  },
  {
      category: '2. Финансы', text: 'Калькулятор Цены', description: 'Проверка формулы.',
      sub_items: [
          { id: 'calc1', text: 'Открыть заказ с оффером', checked: false },
          { id: 'calc2', text: 'Сверить цену Итого', checked: false },
          { id: 'calc3', text: 'Цена считается за ВСЮ партию', checked: false },
          { id: 'calc4', text: 'Пересчет при смене курса', checked: false }
      ]
  },
  // 3. АДМИНКА
  {
      category: '3. Админка (Users)', text: 'Управление пользователями', description: 'CRUD операции.',
      sub_items: [
          { id: 'usr1', text: 'Смена роли пользователя', checked: false },
          { id: 'usr2', text: 'Блокировка пользователя', checked: false },
          { id: 'usr3', text: 'Удаление пользователя', checked: false },
          { id: 'usr4', text: 'Список активных инвайтов', checked: false }
      ]
  },
  // 4. ОПЕРАТОР
  { 
      category: '4. Оператор', text: 'Создание заявки', description: 'Ввод данных.',
      sub_items: [
          { id: 'op1', text: 'Создание вручную', checked: false },
          { id: 'op2', text: 'Создание через AI', checked: false },
          { id: 'op3', text: 'Загрузка файлов', checked: false },
          { id: 'op4', text: 'Авто-привязка Email', checked: false }
      ]
  },
  // 5. ЗАКУПЩИК
  { 
      category: '5. Закупщик', text: 'Подача офферов', description: 'Основной флоу.',
      sub_items: [
          { id: 'buy1', text: 'Поиск по бренду', checked: false },
          { id: 'buy2', text: 'Подача оффера', checked: false },
          { id: 'buy3', text: 'Редактирование (Amend)', checked: false },
          { id: 'buy4', text: 'Отказ от позиции', checked: false }
      ]
  },
  // 6. МЕНЕДЖЕР
  { 
      category: '6. Менеджер', text: 'Обработка Заказа', description: 'Принятие решений.',
      sub_items: [
          { id: 'man1', text: 'Выбор Лидера', checked: false },
          { id: 'man2', text: 'Утверждение КП', checked: false },
          { id: 'man3', text: 'Перевод в Ручную обработку', checked: false },
          { id: 'man4', text: 'Аннулирование заказа', checked: false }
      ]
  },
  // 7. СПРАВОЧНИКИ
  {
      category: '7. Справочники', text: 'Бренды', description: 'Управление базой.',
      sub_items: [
          { id: 'br1', text: 'Создание нового бренда', checked: false },
          { id: 'br2', text: 'Пометка Официальный', checked: false },
          { id: 'br3', text: 'Проверка отображения у Закупщика', checked: false }
      ]
  },
  // 8. НАВИГАЦИЯ
  {
      category: '8. Навигация', text: 'Поиск и Сортировка', description: 'Проверка фильтров.',
      sub_items: [
          { id: 'nav1', text: 'Поиск по ID заказа', checked: false },
          { id: 'nav2', text: 'Поиск по Телефону', checked: false },
          { id: 'nav3', text: 'Бесконечный скролл', checked: false }
      ]
  },
  // 9. СИСТЕМА
  {
      category: '9. Система', text: 'Уведомления и Realtime', description: 'Реактивность.',
      sub_items: [
          { id: 'sys1', text: 'Toast уведомления', checked: false },
          { id: 'sys2', text: 'Счетчик непрочитанных', checked: false },
          { id: 'sys3', text: 'Обновление данных без F5', checked: false }
      ]
  },
  // 10. MOBILE
  {
      category: '10. Мобильная версия', text: 'Адаптивность', description: 'Проверка на iPhone 12 Pro.',
      sub_items: [
          { id: 'mob1', text: 'Оператор: Форма создания', checked: false },
          { id: 'mob2', text: 'Закупщик: Карточка', checked: false },
          { id: 'mob3', text: 'Закупщик: Меню действий', checked: false }
      ]
  }
];

export const AdminChecklist: React.FC = () => {
  const [items, setItems] = useState<AdminChecklistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemDesc, setNewItemDesc] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Дополнительно');
  
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set()); 
  
  const [confirmModal, setConfirmModal] = useState<{isOpen: boolean, title: string, message: string, onConfirm: () => void, isDangerous?: boolean}>({
      isOpen: false, title: '', message: '', onConfirm: () => {}
  });

  const loadChecklist = useCallback(async () => {
      setLoading(true);
      try {
          const data = await SupabaseService.getChecklist();
          setItems(data);
          if (expandedCategories.size === 0 && data.length > 0) {
              const cats = new Set(data.map(i => i.category));
              setExpandedCategories(cats);
          }
      } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { loadChecklist(); }, [loadChecklist]);

  const updateItemInDb = async (item: Partial<AdminChecklistItem>) => {
      try { await SupabaseService.upsertChecklistItem(item); } catch (e) { loadChecklist(); }
  };

  const handleToggleItem = (item: AdminChecklistItem) => {
      const newChecked = !item.is_checked;
      const newSubItems = item.sub_items?.map(s => ({ ...s, checked: newChecked })) || [];
      const updatedItem = { ...item, is_checked: newChecked, sub_items: newSubItems };
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      updateItemInDb(updatedItem);
  };

  const handleToggleSubItem = (item: AdminChecklistItem, subItemId: string) => {
      const newSubItems = item.sub_items?.map(s => s.id === subItemId ? { ...s, checked: !s.checked } : s) || [];
      const allChecked = newSubItems.length > 0 && newSubItems.every(s => s.checked);
      const updatedItem = { ...item, sub_items: newSubItems, is_checked: allChecked };
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      updateItemInDb(updatedItem);
  };

  const handleAddSubItem = (item: AdminChecklistItem, text: string) => {
      const newSub = { id: Date.now().toString(), text, checked: false };
      const newSubItems = [...(item.sub_items || []), newSub];
      const updatedItem = { ...item, sub_items: newSubItems, is_checked: false };
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      updateItemInDb(updatedItem);
  };

  const handleDeleteSubItem = (item: AdminChecklistItem, subItemId: string) => {
      const newSubItems = item.sub_items?.filter(s => s.id !== subItemId) || [];
      const updatedItem = { ...item, sub_items: newSubItems };
      setItems(prev => prev.map(i => i.id === item.id ? updatedItem : i));
      updateItemInDb(updatedItem);
  };

  const handleDeleteItem = (id: number) => {
      setConfirmModal({
          isOpen: true, title: 'Удаление', message: 'Удалить этот пункт?',
          onConfirm: async () => {
              setItems(prev => prev.filter(i => i.id !== id));
              try { await SupabaseService.deleteChecklistItem(id); } catch(e) { loadChecklist(); }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleDeleteCategory = (category: string) => {
      setConfirmModal({
          isOpen: true, title: 'Удаление категории', message: `Удалить всё из "${category}"?`, isDangerous: true,
          onConfirm: async () => {
              const ids = items.filter(i => i.category === category).map(i => i.id);
              setItems(prev => prev.filter(i => i.category !== category));
              try { await Promise.all(ids.map(id => SupabaseService.deleteChecklistItem(id))); } catch(e) { loadChecklist(); }
              setConfirmModal(prev => ({ ...prev, isOpen: false }));
          }
      });
  };

  const handleSaveInlineItem = async (category: string, text: string, desc: string) => {
      const payload = { category, text, description: desc, is_checked: false, sub_items: [] };
      try { await SupabaseService.upsertChecklistItem(payload); loadChecklist(); } catch (e) { console.error(e); }
  };

  const handleAddItemGlobal = async () => {
      if (!newItemText.trim()) return;
      await SupabaseService.upsertChecklistItem({ category: newItemCategory, text: newItemText, description: newItemDesc, is_checked: false, sub_items: [] });
      setNewItemText(''); setNewItemDesc(''); loadChecklist();
  };

  const handleReset = () => {
      setConfirmModal({
          isOpen: true, title: 'Полный сброс', message: 'Вернуть список к заводским настройкам?', isDangerous: true,
          onConfirm: async () => {
              setLoading(true);
              try { await SupabaseService.resetChecklist(DEFAULT_CHECKLIST_SEED); loadChecklist(); } 
              catch (e) { console.error(e); } finally { setLoading(false); setConfirmModal(prev => ({ ...prev, isOpen: false })); }
          }
      });
  };

  const groupedItems = items.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, AdminChecklistItem[]>);

  // Stats
  const totalSub = items.reduce((acc, i) => acc + (i.sub_items?.length || 1), 0);
  const completedSub = items.reduce((acc, i) => acc + (i.sub_items ? i.sub_items.filter(s => s.checked).length : (i.is_checked ? 1 : 0)), 0);
  const progress = totalSub > 0 ? Math.round((completedSub / totalSub) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <ConfirmationModal 
          isOpen={confirmModal.isOpen} title={confirmModal.title} message={confirmModal.message}
          onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
          isDangerous={confirmModal.isDangerous}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><ClipboardList size={24} /></div>
              <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight uppercase">Чек-лист проекта</h2>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Database Sync</p>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="text-right">
                  <div className="text-2xl font-black text-indigo-600">{progress}%</div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase">{completedSub} / {totalSub} шагов</div>
              </div>
              <div className="w-32 h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                  <div className="h-full bg-indigo-600 transition-all duration-500 shadow-[0_0_10px_rgba(79,70,229,0.5)]" style={{ width: `${progress}%` }} />
              </div>
          </div>
      </div>

      {loading && <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-indigo-500"/></div>}

      {/* Categories */}
      <div className="space-y-6">
          {Object.entries(groupedItems).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true })).map(([category, catItems]) => (
              <ChecklistCategory 
                  key={category}
                  category={category}
                  items={catItems}
                  isExpanded={expandedCategories.has(category)}
                  expandedItems={expandedItems}
                  onToggleCategory={() => setExpandedCategories(prev => { const n = new Set(prev); if (n.has(category)) n.delete(category); else n.add(category); return n; })}
                  onDeleteCategory={() => handleDeleteCategory(category)}
                  onToggleItem={handleToggleItem}
                  onToggleExpandItem={(id) => setExpandedItems(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; })}
                  onDeleteItem={handleDeleteItem}
                  onToggleSub={handleToggleSubItem}
                  onDeleteSub={handleDeleteSubItem}
                  onAddSub={handleAddSubItem}
                  onAddItemToCategory={(text, desc) => handleSaveInlineItem(category, text, desc)}
              />
          ))}
      </div>

      {/* Global Add / Reset */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col gap-4">
          <h3 className="font-black text-slate-700 uppercase text-xs tracking-wider border-b border-slate-100 pb-2">Создать новый раздел или задачу</h3>
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_2fr_1fr] gap-4 items-start">
            <input value={newItemText} onChange={e => setNewItemText(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Задача..." />
            <input value={newItemDesc} onChange={e => setNewItemDesc(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Описание..." />
            <div className="space-y-1">
                <input value={newItemCategory} onChange={e => setNewItemCategory(e.target.value)} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-sm outline-none focus:border-indigo-500 transition-all" placeholder="Категория..." list="cats" />
                <datalist id="cats">{Object.keys(groupedItems).map(c => <option key={c} value={c} />)}</datalist>
            </div>
          </div>
          <div className="flex gap-3">
              <button onClick={handleAddItemGlobal} disabled={!newItemText.trim()} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-black uppercase text-xs tracking-wider hover:bg-slate-800 transition-all shadow-lg flex items-center justify-center gap-2"><Plus size={16} /> Создать</button>
              <button onClick={handleReset} className="px-6 py-3 border border-slate-200 text-slate-400 hover:text-red-500 rounded-xl font-black uppercase text-xs tracking-wider transition-all flex items-center justify-center gap-2"><RotateCcw size={16} /> Сброс шаблона</button>
          </div>
      </div>
    </div>
  );
};