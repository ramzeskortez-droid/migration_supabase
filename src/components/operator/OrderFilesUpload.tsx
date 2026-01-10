import React, { useState, useRef } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { Upload, X, FileText, ExternalLink } from 'lucide-react';

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
}

export const OrderFilesUpload: React.FC<OrderFilesUploadProps> = ({ files, setFiles, onLog }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (selectedFiles: FileList | File[]) => {
    setIsUploading(true);
    const newFiles = [...files];

    for (const file of Array.from(selectedFiles)) {
      try {
        if (onLog) onLog(`Загрузка файла: ${file.name}...`);
        
        // Загружаем в папку temp
        const fileExt = file.name.split('.').pop();
        const fileName = `temp/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
        
        const { data, error } = await supabase.storage
          .from('attachments')
          .upload(fileName, file);

        if (error) throw error;

        const { data: urlData } = supabase.storage
          .from('attachments')
          .getPublicUrl(fileName);

        newFiles.push({
          name: file.name,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
        });
        
        if (onLog) onLog(`Файл ${file.name} успешно загружен.`);
      } catch (error: any) {
        console.error('Upload error:', error);
        if (onLog) onLog(`Ошибка загрузки ${file.name}: ${error.message}`);
      }
    }

    setFiles(newFiles);
    setIsUploading(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files);
    }
  };

  const onFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleUpload(e.target.files);
    }
  };

  const removeFile = (index: number) => {
    const newFiles = [...files];
    newFiles.splice(index, 1);
    setFiles(newFiles);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-indigo-600"></span>
        <h2 className="font-bold text-slate-800 tracking-tight uppercase text-xs">Файлы по заявке</h2>
      </div>

      {/* Отображение загруженных файлов в строку */}
      {files.length > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Загруженные файлы:</div>
          <div className="flex flex-wrap gap-x-2 gap-y-1 text-sm font-medium text-indigo-600">
            {files.map((file, idx) => (
              <React.Fragment key={idx}>
                <div className="flex items-center gap-1 group">
                  <a 
                    href={file.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="hover:underline flex items-center gap-1"
                  >
                    {file.name}
                    <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                  </a>
                  <button 
                    onClick={() => removeFile(idx)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                    title="Удалить"
                  >
                    <X size={14} />
                  </button>
                </div>
                {idx < files.length - 1 && <span className="text-slate-300">,</span>}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* Область загрузки (Dropzone) */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative border-2 border-dashed rounded-2xl py-10 px-6 transition-all cursor-pointer
          flex flex-col items-center justify-center gap-3
          ${isDragging ? 'border-indigo-400 bg-indigo-50/50' : 'border-slate-200 bg-white hover:border-slate-300'}
          ${isUploading ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input 
          type="file" 
          multiple 
          className="hidden" 
          ref={fileInputRef}
          onChange={onFileSelect}
        />
        
        <div className="w-12 h-12 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
          {isUploading ? (
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <Upload size={24} />
          )}
        </div>

        <div className="text-center">
          <p className="text-sm font-bold text-slate-700">
            {isUploading ? 'Загрузка файлов...' : 'Выбрать файлы или перетащить'}
          </p>
          <p className="text-xs text-slate-400 font-medium mt-1">
            PDF, Excel, Фото и др.
          </p>
        </div>
      </div>
    </div>
  );
};
