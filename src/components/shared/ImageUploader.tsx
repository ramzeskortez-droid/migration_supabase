import React, { useState, useRef } from 'react';
import { UploadCloud, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { SupabaseService } from '../../services/supabaseService';

interface ImageUploaderProps {
  currentUrl?: string;
  onUpload: (url: string) => void;
  folder?: 'orders' | 'offers' | 'chat';
  compact?: boolean;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({ currentUrl, onUpload, folder = 'orders', compact = false }) => {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
        await processFile(e.target.files[0]);
    }
  };

  const processFile = async (file: File) => {
      setUploading(true);
      try {
          // Валидация размера (макс 5МБ)
          if (file.size > 5 * 1024 * 1024) {
              alert('Файл слишком большой (макс 5МБ)');
              return;
          }
          const url = await SupabaseService.uploadFile(file, folder);
          onUpload(url);
      } catch (e: any) {
          console.error(e);
          alert('Ошибка загрузки: ' + e.message);
      } finally {
          setUploading(false);
      }
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          await processFile(e.dataTransfer.files[0]);
      }
  };

  if (currentUrl) {
      return (
          <div className={`relative group ${compact ? 'w-8 h-8' : 'w-20 h-20'}`}>
              <img 
                src={currentUrl} 
                alt="Attachment" 
                className="w-full h-full object-cover rounded-lg border border-slate-200 shadow-sm cursor-pointer"
                onClick={() => window.open(currentUrl, '_blank')}
              />
              <button 
                onClick={(e) => { e.stopPropagation(); onUpload(''); }}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
              >
                  <X size={10} />
              </button>
          </div>
      );
  }

  return (
    <div 
        className={`
            relative border-2 border-dashed border-slate-300 rounded-xl 
            flex flex-col items-center justify-center 
            transition-colors hover:border-indigo-400 hover:bg-indigo-50/30 cursor-pointer
            ${compact ? 'w-8 h-8 p-0' : 'w-full h-24 p-2'}
        `}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
    >
        <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileChange} 
            accept="image/*,application/pdf"
            className="hidden" 
        />
        
        {uploading ? (
            <Loader2 size={compact ? 12 : 20} className="animate-spin text-indigo-500" />
        ) : (
            compact ? <ImageIcon size={14} className="text-slate-400" /> : (
                <>
                    <UploadCloud size={24} className="text-slate-400 mb-1" />
                    <span className="text-[9px] font-bold text-slate-400 uppercase text-center leading-tight">
                        Перетащите или <span className="text-indigo-500">выберите</span>
                    </span>
                </>
            )
        )}
    </div>
  );
};