import React from 'react';
import { X, ExternalLink, Plus } from 'lucide-react';

interface UploadedFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface OrderFilesUploadProps {
  files: UploadedFile[];
  setFiles: (files: UploadedFile[]) => void;
  onLog?: (message: string) => void;
  itemFiles?: { file: UploadedFile, label: string }[];
  onRemoveItemFile?: (url: string) => void;
  required?: boolean;
  onOpenFileDialog?: () => void; // Функция открытия диалога выбора файла
}

export const OrderFilesUpload: React.FC<OrderFilesUploadProps> = ({ files, setFiles, onLog, itemFiles = [], onRemoveItemFile, required, onOpenFileDialog }) => {
  
  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  const hasAnyFiles = files.length > 0 || itemFiles.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
            <h2 className="font-bold text-slate-800 tracking-tight uppercase text-xs">
                Файлы по заявке {required && <span className="text-red-500">*</span>}
            </h2>
        </div>
        
        {/* Кнопка добавления (если передан обработчик) */}
        {onOpenFileDialog && (
            <button 
                onClick={onOpenFileDialog}
                className="flex items-center gap-1 text-[10px] font-black uppercase text-indigo-500 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors border border-indigo-100"
            >
                <Plus size={12} strokeWidth={3} />
                Добавить файлы
            </button>
        )}
      </div>

      {/* Отображение загруженных файлов в строку */}
      {hasAnyFiles ? (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium text-indigo-600">
            {/* Общие файлы */}
            {files.map((file, idx) => (
              <React.Fragment key={`general-${idx}`}>
                <div className="flex items-center gap-1 group bg-white/50 px-1.5 py-0.5 rounded border border-transparent hover:border-indigo-100 hover:bg-white transition-all">
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    {file.name}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
                    title="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
                {(idx < files.length - 1 || itemFiles.length > 0) && <span className="text-slate-300">,</span>}
              </React.Fragment>
            ))}

            {/* Файлы позиций */}
            {itemFiles.map((item, idx) => (
              <React.Fragment key={`item-${idx}`}>
                <div className="flex items-center gap-1 group text-emerald-600 bg-white/50 px-1.5 py-0.5 rounded border border-transparent hover:border-emerald-100 hover:bg-white transition-all">
                  <span className="text-[9px] text-slate-400 uppercase mr-0.5">{item.label}:</span>
                  <a 
                    href={item.file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    {item.file.name}
                    <ExternalLink size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  {onRemoveItemFile && (
                      <button 
                        onClick={() => onRemoveItemFile(item.file.url)}
                        className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all ml-1"
                        title="Удалить из позиции"
                      >
                        <X size={14} />
                      </button>
                  )}
                </div>
                {idx < itemFiles.length - 1 && <span className="text-slate-300">,</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      ) : (
          <div className="text-[10px] text-slate-400 italic pl-4 py-2 border-l-2 border-slate-100">
              Нет файлов. Перетащите их в любое место окна или нажмите "Добавить".
          </div>
      )}
    </div>
  );
};
