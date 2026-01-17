import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Plus, CheckCircle, AlertTriangle, Loader2, RefreshCw, UploadCloud, ShieldCheck } from 'lucide-react';
import { Part } from './types';
import { FileDropzone } from '../shared/FileDropzone';
import { SupabaseService } from '../../services/supabaseService';
import { useDropzone } from 'react-dropzone';
import { useOfficialBrands } from '../../hooks/useOfficialBrands';

interface PartsListProps {
  parts: Part[];
  setParts: (parts: Part[]) => void;
  onAddBrand: (name: string) => void;
  onValidationChange?: (isValid: boolean) => void;
  requiredFields?: any;
  highlightedFields?: Set<string>;
  blinkTrigger?: number;
}

// --- PART ROW COMPONENT (With Local Dropzone) ---
const PartRow: React.FC<{
    part: Part;
    idx: number;
    updatePart: (id: number, field: keyof Part, value: any) => void;
    updatePartFields: (id: number, updates: Partial<Part>) => void;
    removePart: (id: number) => void;
    brandCache: Record<string, string | null>;
    validating: Set<number>;
    suggestions: string[];
    activeBrandInput: number | null;
    setActiveBrandInput: (id: number | null) => void;
    setSuggestions: (s: string[]) => void;
    setBrandCache: React.Dispatch<React.SetStateAction<Record<string, string | null>>>;
    requiredFields: any;
    getHighlightClass: (partId: number, field: string) => string;
    inputClass: string;
    blinkTrigger: number;
    officialBrands: Set<string>;
}> = ({ 
    part, idx, updatePart, updatePartFields, removePart, 
    brandCache, validating, suggestions, activeBrandInput, setActiveBrandInput, setSuggestions, setBrandCache,
    requiredFields, getHighlightClass, inputClass, blinkTrigger, officialBrands
}) => {
    // Local Dropzone
    const onDrop = useCallback(async (acceptedFiles: File[], fileRejections: any[], event: any) => {
        event.stopPropagation();
        
        const newFiles: any[] = [];
        await Promise.all(acceptedFiles.map(async (file) => {
            try {
                // Используем 'orders' так как 'attachments' не в списке разрешенных типов
                const publicUrl = await SupabaseService.uploadFile(file, 'orders');
                newFiles.push({ 
                    name: file.name, 
                    url: publicUrl, 
                    type: file.type, 
                    size: file.size 
                });
            } catch (e) {
                console.error('File upload failed', e);
            }
        }));

        if (newFiles.length > 0) {
            const currentFiles = part.itemFiles || (part.photoUrl ? [{name: 'Фото', url: part.photoUrl, type: 'image/jpeg'}] : []);
            
            updatePartFields(part.id, {
                itemFiles: [...currentFiles, ...newFiles],
                photoUrl: (!part.photoUrl && !part.itemFiles?.length) ? newFiles[0].url : part.photoUrl
            });
        }
    }, [part, updatePartFields]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        noClick: true,
        noKeyboard: true,
        multiple: true
    });

    const brandValue = part.brand?.trim() || '';
    const dbName = brandCache[brandValue.toLowerCase()];
    const isChecking = validating.has(part.id);
    
    const isStrictMatch = (dbName !== undefined && dbName !== null && dbName === brandValue) || part.isNewBrand;
    const isNonStrictMatch = (!isStrictMatch && dbName !== undefined && dbName !== null && dbName !== brandValue) || 
                             (!isStrictMatch && !dbName && suggestions.length > 0 && activeBrandInput === part.id);
    const isError = brandValue.length > 0 && !isStrictMatch && !isNonStrictMatch && !isChecking;
    const needsFix = dbName && dbName !== brandValue && !part.isNewBrand;
    
    // Official Check
    const isOfficial = officialBrands.has(brandValue.toLowerCase());

    return (
        <div 
            {...getRootProps()}
            className={`group relative grid grid-cols-[30px_2fr_4fr_3fr_1fr_1fr_1fr] gap-2 items-center bg-slate-50 border border-slate-200 rounded-lg p-2 transition-all ${isDragActive ? 'ring-4 ring-indigo-500 bg-indigo-50/50 z-10' : 'hover:border-indigo-300'}`}
        >
            <input {...getInputProps()} />
            
            {isDragActive && (
                <div className="absolute inset-0 z-[200] bg-indigo-600/90 backdrop-blur-sm rounded-lg flex items-center justify-center gap-2 animate-in fade-in zoom-in-95 duration-200 pointer-events-none">
                    <UploadCloud size={24} className="text-white animate-bounce" />
                    <span className="text-white font-black uppercase text-xs tracking-wide">Добавить в Позицию #{idx + 1}</span>
                </div>
            )}

            <div className="text-center text-slate-400 text-xs font-medium">{idx + 1}</div>
            
            <div className="relative">
                <input 
                key={`brand_${part.id}_${blinkTrigger}`}
                value={part.brand}
                onChange={(e) => {
                    updatePart(part.id, 'brand', e.target.value);
                    if (part.isNewBrand) updatePart(part.id, 'isNewBrand', false); 
                }}
                onFocus={() => setActiveBrandInput(part.id)}
                onBlur={() => setTimeout(() => setActiveBrandInput(null), 200)}
                placeholder="Бренд"
                className={`${inputClass} font-black uppercase pr-8
                    ${isError ? 'border-red-500 bg-red-50 text-red-700' : ''}
                    ${isNonStrictMatch ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : ''}
                    ${isStrictMatch ? (isOfficial ? 'border-amber-400 bg-amber-50 text-amber-700 underline decoration-amber-400/50 decoration-2 underline-offset-2' : 'border-emerald-500 bg-emerald-50 text-emerald-700') : 'text-indigo-700'}
                    ${getHighlightClass(part.id, 'brand')}
                `}
                title={isOfficial ? "Официальный представитель" : ""}
                />
                
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                {isChecking && <Loader2 size={12} className="animate-spin text-slate-400" />}
                {isStrictMatch && (
                    isOfficial ? <ShieldCheck size={14} className="text-amber-500" /> : <CheckCircle size={14} className="text-emerald-500" />
                )}
                {isNonStrictMatch && <AlertTriangle size={14} className="text-yellow-500" />}
                {needsFix && (
                    <button 
                        onClick={() => updatePart(part.id, 'brand', dbName)}
                        className="text-amber-500 hover:text-amber-600 transition-all hover:rotate-180"
                        title={`Найдено: ${dbName}. Нажмите для исправления регистра.`}
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
                {(isError || isNonStrictMatch) && !part.isNewBrand && (
                    <button 
                        onClick={() => updatePart(part.id, 'isNewBrand', true)}
                        className="text-slate-400 hover:text-indigo-600 transition-colors"
                        title="Добавить как новый бренд"
                    >
                        <Plus size={14} />
                    </button>
                )}
                </div>

                {activeBrandInput === part.id && suggestions.length > 0 && (
                    <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 overflow-hidden">
                        {suggestions.map(s => {
                            const isSugOfficial = officialBrands.has(s.toLowerCase());
                            return (
                                <div 
                                key={s}
                                onClick={() => {
                                    updatePart(part.id, 'brand', s);
                                    setBrandCache(prev => ({ ...prev, [s.toLowerCase()]: s }));
                                    setSuggestions([]);
                                }}
                                className="px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 cursor-pointer flex items-center justify-between"
                                >
                                <span>{s}</span>
                                {isSugOfficial && <ShieldCheck size={12} className="text-amber-500" />}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            <div>
                <input 
                key={`name_${part.id}_${blinkTrigger}`}
                value={part.name}
                onChange={(e) => updatePart(part.id, 'name', e.target.value)}
                placeholder="Наименование"
                className={`${inputClass} ${getHighlightClass(part.id, 'name')}`}
                />
            </div>

            <div>
                <input 
                value={part.article}
                onChange={(e) => updatePart(part.id, 'article', e.target.value)}
                placeholder="Артикул"
                className={`${inputClass} ${getHighlightClass(part.id, 'article')}`}
                />
            </div>

            <div>
                <input 
                value={part.uom}
                onChange={(e) => updatePart(part.id, 'uom', e.target.value)}
                className={`${inputClass} text-center`}
                />
            </div>

            <div className="flex justify-center">
                <input 
                type="number"
                min="1"
                step="1"
                value={part.quantity}
                onKeyDown={(e) => {
                    if (e.key === '.' || e.key === ',') e.preventDefault();
                }}
                onChange={(e) => {
                    const val = parseInt(e.target.value);
                    updatePart(part.id, 'quantity', isNaN(val) ? 1 : val);
                }}
                className={`${inputClass} text-center font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none ${getHighlightClass(part.id, 'quantity')}`}
                />
            </div>

            <div className="flex justify-center px-2">
                <div className="h-[34px] w-full flex items-center justify-center bg-white rounded border border-gray-300 overflow-hidden">
                    <FileDropzone 
                        files={part.itemFiles || (part.photoUrl ? [{name: 'Фото', url: part.photoUrl, type: 'image/jpeg'}] : [])} 
                        onUpdate={(files) => {
                            updatePartFields(part.id, {
                                itemFiles: files,
                                photoUrl: files.length > 0 ? files[0].url : ''
                            });
                        }} 
                        compact
                    />
                </div>
            </div>
            
            <button 
                onClick={() => removePart(part.id)}
                className="absolute -right-12 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 p-2 opacity-0 group-hover:opacity-100 transition-all"
            >
                <Trash2 size={16} />
            </button>
        </div>
    );
};

export const PartsList: React.FC<PartsListProps> = ({ parts, setParts, onAddBrand, onValidationChange, requiredFields = {}, highlightedFields = new Set(), blinkTrigger = 0 }) => {
  const [activeBrandInput, setActiveBrandInput] = useState<number | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [brandCache, setBrandCache] = useState<Record<string, string | null>>({});
  const [validating, setValidating] = useState<Set<number>>(new Set());
  const { data: officialBrands } = useOfficialBrands();
  
  const req = requiredFields as any;

  const getHighlightClass = (partId: number, field: string) => {
      if (highlightedFields.has(`part_${partId}_${field}`)) {
          return 'ring-2 ring-red-500 bg-red-50 animate-[pulse_0.5s_ease-in-out_1]';
      }
      return '';
  };

  useEffect(() => {
    if (!onValidationChange) return;
    const allValid = parts.every(part => {
        const brandValue = part.brand?.trim() || '';
        if (!brandValue) return false;
        const dbName = brandCache[brandValue.toLowerCase()];
        const isStrictMatch = (dbName !== undefined && dbName !== null && dbName === brandValue) || part.isNewBrand;
        return isStrictMatch;
    });
    onValidationChange(allValid);
  }, [parts, brandCache, onValidationChange]);

  const addPart = () => {
    setParts([...parts, { id: Date.now(), name: '', article: '', brand: '', uom: 'шт', quantity: 1 }]);
  };

  const removePart = (id: number) => {
    setParts(parts.filter(part => part.id !== id));
  };

  const updatePart = (id: number, field: keyof Part, value: any) => {
    setParts(parts.map(part => part.id === id ? { ...part, [field]: value } : part));
  };

  const updatePartFields = (id: number, updates: Partial<Part>) => {
    setParts(parts.map(part => part.id === id ? { ...part, ...updates } : part));
  };

  useEffect(() => {
      const activePart = parts.find(p => p.id === activeBrandInput);
      const query = activePart?.brand?.trim();

      if (!query || query.length < 2) {
          setSuggestions([]);
          return;
      }

      const handler = setTimeout(async () => {
          try {
              const results = await SupabaseService.searchBrands(query);
              setSuggestions(results);
          } catch (e) {}
      }, 300);

      return () => clearTimeout(handler);
  }, [activeBrandInput, parts]);

  useEffect(() => {
      parts.forEach(part => {
          const brandName = part.brand?.trim();
          if (!brandName || brandCache[brandName.toLowerCase()] !== undefined) return;

          const check = async () => {
              setValidating(prev => new Set(prev).add(part.id));
              try {
                  const dbName = await SupabaseService.checkBrandExists(brandName);
                  setBrandCache(prev => ({ ...prev, [brandName.toLowerCase()]: dbName }));
              } catch (e) {}
              finally { setValidating(prev => { const n = new Set(prev); n.delete(part.id); return n; }); }
          };
          check();
      });
  }, [parts, brandCache]);

  const inputClass = "w-full bg-white border border-slate-200 rounded-md px-2 py-1.5 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none transition-all placeholder:text-slate-300 placeholder:text-xs text-slate-700 shadow-sm";
  const headerClass = "col-span-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider";

  return (
    <section className="relative z-[60]">
      <div className="flex items-center gap-2 mb-4">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Список позиций</h2>
      </div>
      
      <div className="space-y-3">
        <div className="grid grid-cols-[30px_2fr_4fr_3fr_1fr_1fr_1fr] gap-2 px-2 items-center">
          <div className={`${headerClass} text-center`}>#</div>
          <div className={`${headerClass} text-indigo-600 font-black`}>Бренд {req.brand && <span className="text-red-500">*</span>}</div>
          <div className={headerClass}>Наименование {req.name && <span className="text-red-500">*</span>}</div>
          <div className={headerClass}>Артикул {req.article && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Ед. {req.uom && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Кол-во {req.quantity && <span className="text-red-500">*</span>}</div>
          <div className={`${headerClass} text-center`}>Фото {req.photos && <span className="text-red-500">*</span>}</div>
        </div>

        {parts.map((part, idx) => (
            <PartRow 
                key={part.id}
                part={part}
                idx={idx}
                updatePart={updatePart}
                updatePartFields={updatePartFields}
                removePart={removePart}
                brandCache={brandCache}
                validating={validating}
                suggestions={suggestions}
                activeBrandInput={activeBrandInput}
                setActiveBrandInput={setActiveBrandInput}
                setSuggestions={setSuggestions}
                setBrandCache={setBrandCache}
                requiredFields={req}
                getHighlightClass={getHighlightClass}
                inputClass={inputClass}
                blinkTrigger={blinkTrigger}
                officialBrands={officialBrands || new Set()}
            />
        ))}

        <button 
          onClick={addPart}
          className="mt-2 text-[10px] font-black text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2 uppercase tracking-widest"
        >
          <Plus size={14} /> Добавить позицию
        </button>
      </div>
    </section>
  );
};