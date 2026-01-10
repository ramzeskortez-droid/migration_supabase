import React, { useState, useEffect } from 'react';
import { SupabaseService } from '../../services/supabaseService';
import { Save, AlertCircle, Loader2 } from 'lucide-react';
import { Toast } from '../shared/Toast';

export const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setLoading(true);
        try {
            const val = await SupabaseService.getSystemSettings('buyer_required_fields');
            // Если в БД пусто, используем дефолт
            setSettings(val || { supplier_sku: false });
        } catch (e) {
            console.error('Error loading settings:', e);
            setToast({ message: 'Ошибка загрузки настроек (проверьте консоль)', type: 'error' });
            // Fallback
            setSettings({ supplier_sku: false });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // TODO: Передавать реальное имя админа
            await SupabaseService.updateSystemSettings('buyer_required_fields', settings, 'Manager');
            setToast({ message: 'Настройки сохранены', type: 'success' });
        } catch (e: any) {
            setToast({ message: 'Ошибка сохранения: ' + e.message, type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-12 text-center"><Loader2 className="animate-spin inline text-indigo-500" /></div>;

    return (
        <div className="p-8 max-w-4xl mx-auto">
            {toast && <div className="fixed top-4 right-4 z-[9999]"><Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} /></div>}

            <h1 className="text-2xl font-black text-slate-800 mb-8 uppercase tracking-tight">Настройки системы</h1>

            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 mb-8">
                <div className="flex items-center gap-3 mb-6">
                    <AlertCircle className="text-indigo-600" />
                    <h2 className="text-lg font-bold text-slate-700">Обязательные поля для Закупщика</h2>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 max-w-2xl">
                    Отметьте поля, которые закупщик обязан заполнить перед отправкой предложения. 
                    Если галочка стоит, система не даст отправить оффер без этих данных.
                </p>

                <div className="space-y-4">
                    <label className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all cursor-pointer group">
                        <div className="relative flex items-center">
                            <input 
                                type="checkbox"
                                className="peer h-6 w-6 cursor-pointer appearance-none rounded-lg border border-slate-300 shadow-sm transition-all checked:border-indigo-600 checked:bg-indigo-600 hover:border-indigo-400"
                                checked={settings?.supplier_sku || false}
                                onChange={(e) => setSettings({ ...settings, supplier_sku: e.target.checked })}
                            />
                            <svg className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-white opacity-0 peer-checked:opacity-100 transition-opacity" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                        <div>
                            <div className="font-bold text-slate-700 group-hover:text-indigo-700 transition-colors">Название и Номер поставщика</div>
                            <div className="text-xs text-slate-400 font-medium">Поле во внутренней карточке товара</div>
                        </div>
                    </label>
                </div>

                <div className="mt-8 pt-6 border-t border-slate-100 flex justify-between items-center">
                    <button 
                        onClick={() => setSettings({ supplier_sku: false })}
                        className="text-slate-400 hover:text-slate-600 text-xs font-bold uppercase underline"
                    >
                        Сбросить / Инициализировать
                    </button>

                    <button 
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-bold uppercase text-xs tracking-wider hover:bg-indigo-700 active:scale-95 transition-all shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {saving ? <Loader2 className="animate-spin" size={16} /> : <Save size={16} />}
                        Сохранить настройки
                    </button>
                </div>
            </div>
        </div>
    );
};
