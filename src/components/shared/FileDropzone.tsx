import React, { useRef, useState } from 'react';
import { Upload, X, FileText, Loader2, Paperclip, Files } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';

interface UploadedFile {
  name: string;
  url: string;
  size?: number;
  type?: string;
}

interface FileDropzoneProps {
  files: UploadedFile[];
  onUpdate: (files: UploadedFile[]) => void;
  label?: string;
  compact?: boolean;
}

export const FileDropzone: React.FC<FileDropzoneProps> = ({ files = [], onUpdate, label, compact }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setIsUploading(true);
    setIsDragging(false);
    dragCounter.current = 0;

    const newFiles = [...files];
    for (const file of Array.from(fileList)) {
        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `temp/${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
            
            const { error } = await supabase.storage.from('attachments').upload(fileName, file);
            if (error) throw error;

            const { data } = supabase.storage.from('attachments').getPublicUrl(fileName);
            newFiles.push({
                name: file.name,
                url: data.publicUrl,
                size: file.size,
                type: file.type || 'application/octet-stream'
            });
        } catch (e) {
            console.error('Upload failed:', e);
        }
    }
    onUpdate(newFiles);
    setIsUploading(false);
  };

  const removeFile = (idx: number, e?: React.MouseEvent) => {
      e?.stopPropagation();
      const next = [...files];
      next.splice(idx, 1);
      onUpdate(next);
  };

  const onDragEnter = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current += 1;
      if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
          setIsDragging(true);
      }
  };

  const onDragLeave = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      dragCounter.current -= 1;
      if (dragCounter.current === 0) {
          setIsDragging(false);
      }
  };

  const onDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const onDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;
      handleUpload(e.dataTransfer.files);
  };

  // Компактный режим (для ячейки таблицы) - БЕЗ УДАЛЕНИЯ (только просмотр/добавление)
  if (compact) {
      const isSingleImage = files.length === 1 && (files[0].type?.startsWith('image/') || files[0].url.match(/\.(jpeg|jpg|png|webp)$/i));
      const hasFiles = files.length > 0;

      return (
          <div 
            className={`relative w-full h-full min-h-[32px] rounded border transition-all flex items-center justify-center cursor-pointer group overflow-hidden ${isDragging ? 'bg-indigo-50 border-indigo-400 ring-2 ring-indigo-200 z-50' : 'bg-white border-gray-200 hover:border-indigo-300'}`}
            onClick={() => inputRef.current?.click()}
            onDragEnter={onDragEnter}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            title="Перетащите файлы или нажмите"
          >
              <input type="file" multiple className="hidden" ref={inputRef} onChange={(e) => handleUpload(e.target.files)} />
              
              <div className={`w-full h-full flex items-center justify-center ${isDragging ? 'pointer-events-none' : ''}`}>
                  {isUploading ? (
                      <Loader2 size={16} className="animate-spin text-indigo-500"/>
                  ) : hasFiles ? (
                      isSingleImage ? (
                          <div className="w-full h-full relative">
                              <img src={files[0].url} className="w-full h-full object-cover" alt="" />
                          </div>
                      ) : (
                          <div className="flex items-center gap-1 relative w-full h-full justify-center">
                              {files.length === 1 ? (
                                  <div className="flex items-center gap-1 max-w-full px-1 w-full justify-center">
                                      <FileText size={16} className="text-slate-500 shrink-0"/>
                                      <span className="text-[9px] truncate font-medium text-slate-700">{files[0].name.slice(0, 5)}...</span>
                                  </div>
                              ) : (
                                  <div className="flex items-center gap-1.5 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
                                      <Files size={14} />
                                      <span className="text-[10px] font-black">{files.length}</span>
                                  </div>
                              )}
                          </div>
                      )
                  ) : (
                      <div className="flex items-center gap-2 text-slate-300">
                          <Paperclip size={16} />
                          {isDragging && <span className="text-[9px] font-bold text-indigo-400">Drop!</span>}
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Полный режим (удаление доступно)
  return (
    <div 
        className={`space-y-3 p-6 border-2 border-dashed rounded-xl transition-all relative ${isDragging ? 'bg-indigo-50 border-indigo-400 ring-4 ring-indigo-100' : 'border-slate-200 bg-white hover:border-indigo-300'}`}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
    >
        {label && <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">{label}</div>}
        
        {files.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4 relative z-10">
                {files.map((f, i) => (
                    <div key={i} className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-2 rounded-lg group animate-in zoom-in-95 duration-200">
                        {f.type?.startsWith('image/') ? <FileText size={16} className="text-indigo-500"/> : <FileText size={16} className="text-slate-500"/>}
                        <a href={f.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-slate-700 hover:text-indigo-600 hover:underline truncate max-w-[200px]">{f.name}</a>
                        <button 
                            onClick={(e) => removeFile(i, e)} 
                            className="text-slate-400 hover:text-red-500 ml-2 p-1 hover:bg-red-50 rounded transition-colors"
                            title="Удалить"
                        >
                            <X size={14}/>
                        </button>
                    </div>
                ))}
            </div>
        )}

        <div 
            onClick={() => inputRef.current?.click()}
            className={`flex flex-col items-center justify-center cursor-pointer py-4 ${isDragging ? 'pointer-events-none' : ''}`}
        >
            <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mb-3 text-indigo-500 group-hover:scale-110 transition-transform">
                {isUploading ? <Loader2 className="animate-spin" size={24}/> : <Upload size={24}/>}
            </div>
            <div className="text-sm font-bold text-slate-700">Нажмите для загрузки файлов</div>
            <div className="text-xs text-slate-400 font-medium mt-1">Перетащите файлы сюда (PDF, Excel, Фото)</div>
        </div>
        <input type="file" multiple className="hidden" ref={inputRef} onChange={(e) => handleUpload(e.target.files)} />
    </div>
  );
};