import React, { memo, useState } from 'react';
import { ChevronRight, Loader2, Tag, Clock, X } from 'lucide-react';
import { Order } from '../../types';
import { BuyerOrderDetails } from './BuyerOrderDetails';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SupabaseService } from '../../services/supabaseService';

interface BuyerOrderRowProps {
  order: Order;
  isExpanded: boolean;
  onToggle: () => void;
  statusInfo: { label: string, color: string, icon: React.ReactNode };
  myOffer: any;
  // Props for Details
  editingItems?: any[];
  setEditingItems: (items: any[]) => void;
  onSubmit: (orderId: string, items: any[]) => Promise<void>;
  isSubmitting: boolean;
  buyerToken?: string;
  gridCols?: string;
  onOpenChat: (orderId: string, targetRole?: 'OPERATOR' | 'MANAGER') => void;
}

const STICKER_COLORS = [
    { name: 'blue', class: 'bg-blue-500' },
    { name: 'emerald', class: 'bg-emerald-500' },
    { name: 'rose', class: 'bg-rose-500' },
    { name: 'amber', class: 'bg-amber-500' },
    { name: 'purple', class: 'bg-purple-500' },
];

const COLOR_MAP: Record<string, string> = {
    'blue': 'bg-blue-500',
    'emerald': 'bg-emerald-500',
    'rose': 'bg-rose-500',
    'amber': 'bg-amber-500',
    'purple': 'bg-purple-500'
};

export const BuyerOrderRow: React.FC<BuyerOrderRowProps> = memo(({ 
  order, isExpanded, onToggle, statusInfo, myOffer,
  editingItems, setEditingItems, onSubmit, isSubmitting, buyerToken, gridCols, onOpenChat
}) => {
  const queryClient = useQueryClient();
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  
  // Lazy load details ONLY when expanded
  const { data: details, isLoading: detailsLoading } = useQuery({
      queryKey: ['order-details', order.id],
      queryFn: () => SupabaseService.getOrderDetails(order.id),
      enabled: isExpanded,
      staleTime: 60000
  });

  const labelMutation = useMutation({
      mutationFn: (color: string) => SupabaseService.toggleOrderLabel(buyerToken!, order.id, color),
      onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['orders'] });
      }
  });

  // Merge loaded details into order object for sub-component
  const fullOrder = React.useMemo(() => ({
      ...order,
      items: details?.items || order.items || [],
      offers: details?.offers || order.offers || [],
      refusalReason: details?.refusalReason || order.refusalReason
  }), [order, details]);

  const containerStyle = isExpanded 
    ? "border-l-4 border-l-indigo-600 ring-1 ring-indigo-600/10 shadow-xl bg-white relative z-10 rounded-none md:rounded-xl my-2 md:my-3 mx-0 md:mx-4" 
    : "hover:bg-slate-50 border-l-transparent border-b-4 md:border-b border-slate-200 last:border-0";

  const displayItems = (editingItems && editingItems.length > 0) ? editingItems : (details?.items || []);

  // Ensure we use the FULL offer details (with comments) from the loaded details, not the potentially incomplete prop
  const detailedMyOffer = React.useMemo(() => {
      if (!myOffer || !fullOrder.offers) return myOffer;
      return fullOrder.offers.find(o => String(o.id) === String(myOffer.id)) || myOffer;
  }, [fullOrder, myOffer]);

  const activeLabel = order.buyerLabels?.[0];
  const activeColorClass = activeLabel ? (COLOR_MAP[activeLabel.color] || 'bg-slate-500') : '';

  // Data Extraction
  const firstItem = order.items?.[0];
  const firstItemName = firstItem?.name || '-';
  const subjectMatch = firstItem?.comment?.match(/\[(Тема|S): (.*?)\]/);
  const subject = subjectMatch ? subjectMatch[2] : '-';
  const datePart = order.createdAt.split(',')[0];

  return (
    <div className={`transition-all duration-500 border-l-4 ${containerStyle}`}>
      <div 
        onClick={onToggle}
        className="p-3 select-none cursor-pointer group"
      >
          {/* MOBILE VIEW */}
          <div className="md:hidden flex flex-col gap-2">
              <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                        {/* Sticker Picker Mobile */}
                        <div className="relative group/sticker flex items-center">
                            <button 
                                onClick={(e) => { e.stopPropagation(); setShowStickerPicker(!showStickerPicker); }}
                                className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all flex items-center justify-center ${activeLabel ? activeColorClass : 'bg-slate-200 hover:bg-slate-300'}`}
                            >
                                {!activeLabel && <Tag size={7} className="text-white opacity-50" />}
                            </button>
                            {showStickerPicker && (
                                <div className="absolute top-full left-0 mt-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex gap-1 animate-in fade-in slide-in-from-top-1">
                                    {STICKER_COLORS.map(c => (
                                        <button 
                                            key={c.name}
                                            onClick={(e) => { e.stopPropagation(); labelMutation.mutate(c.name); setShowStickerPicker(false); }}
                                            className={`w-5 h-5 rounded-lg ${c.class} hover:scale-110 transition-transform ${activeLabel?.color === c.name ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                                        />
                                    ))}
                                    {activeLabel && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); labelMutation.mutate(activeLabel.color); setShowStickerPicker(false); }}
                                            className="w-5 h-5 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
                                        >
                                            <X size={10} />
                                        </button>
                                    )}
                                </div>
                            )}
                            {showStickerPicker && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowStickerPicker(false); }}></div>}
                        </div>
                        <div className="text-xs font-black font-mono text-indigo-600">#{order.id}</div>
                  </div>
                  
                  <div className={`px-2 py-0.5 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                        {statusInfo.icon}
                        {statusInfo.label}
                  </div>
              </div>

              <div className="flex flex-col gap-1">
                  <div className="font-bold text-slate-800 text-sm truncate">{subject}</div>
                  <div className="font-medium text-slate-500 text-xs truncate">{firstItemName}</div>
              </div>

              <div className="flex justify-between items-center mt-1 border-t border-slate-100 pt-2">
                  <div className="flex items-center gap-3">
                      <div className="font-bold text-slate-400 text-[10px]">{datePart}</div>
                      <div className="flex items-center gap-1 text-slate-500 font-bold text-[10px]">
                        <Clock size={10} className="text-amber-500"/>
                        <span>{order.deadline || '24ч'}</span>
                      </div>
                  </div>
                  <ChevronRight size={16} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : ''}`}/>
              </div>
          </div>

          {/* DESKTOP VIEW */}
          <div className={`hidden md:grid ${gridCols || 'grid-cols-1'} gap-4 items-center text-[10px] text-left`}>
            {/* 1. ID + Sticker */}
            <div className="flex items-center gap-2">
                <div className="relative group/sticker flex items-center">
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowStickerPicker(!showStickerPicker); }}
                        className={`w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm transition-all flex items-center justify-center ${activeLabel ? activeColorClass : 'bg-slate-200 hover:bg-slate-300'}`}
                    >
                        {!activeLabel && <Tag size={7} className="text-white opacity-50" />}
                    </button>

                    {showStickerPicker && (
                        <div className="absolute top-full left-0 mt-2 p-1.5 bg-white border border-slate-200 rounded-xl shadow-xl z-50 flex gap-1 animate-in fade-in slide-in-from-top-1">
                            {STICKER_COLORS.map(c => (
                                <button 
                                    key={c.name}
                                    onClick={(e) => { e.stopPropagation(); labelMutation.mutate(c.name); setShowStickerPicker(false); }}
                                    className={`w-5 h-5 rounded-lg ${c.class} hover:scale-110 transition-transform ${activeLabel?.color === c.name ? 'ring-2 ring-offset-1 ring-indigo-500' : ''}`}
                                />
                            ))}
                            {activeLabel && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); labelMutation.mutate(activeLabel.color); setShowStickerPicker(false); }}
                                    className="w-5 h-5 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center hover:bg-slate-200"
                                >
                                    <X size={10} />
                                </button>
                            )}
                        </div>
                    )}
                    {showStickerPicker && <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setShowStickerPicker(false); }}></div>}
                </div>
                <div className="text-[11px] font-black text-indigo-600 truncate group-hover:text-indigo-700">#{order.id}</div>
            </div>
            
            {/* 2. Deadline */}
            <div className="flex items-center gap-1 text-slate-500 font-bold">
                <Clock size={10} className="text-amber-500"/>
                <span>{order.deadline || '24ч'}</span>
            </div>

            {/* 3. Subject */}
            <div className="font-bold text-slate-600 truncate" title={subject}>{subject}</div>

            {/* 4. First Item */}
            <div className="font-bold text-slate-800 truncate" title={firstItemName}>{firstItemName}</div>

            {/* 5. Status */}
            <div className="flex justify-start">
                <div className={`px-2 py-1 rounded-md font-black text-[8px] uppercase border flex items-center gap-1.5 shadow-sm ${statusInfo.color}`}>
                    {statusInfo.icon}
                    {statusInfo.label}
                </div>
            </div>

            {/* 6. Date */}
            <div className="font-bold text-slate-400 flex items-center gap-1">{datePart}</div>

            {/* 7. Arrow */}
            <div className="flex justify-end items-center">
                <ChevronRight size={14} className={`text-slate-300 transition-transform ${isExpanded ? 'rotate-90 text-indigo-600' : 'group-hover:translate-x-0.5'}`}/>
            </div>
          </div>
      </div>

      {isExpanded && (
        <div className="border-t border-slate-100 bg-slate-50 min-h-[100px]">
            {detailsLoading ? (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="animate-spin text-indigo-500" size={24}/>
                </div>
            ) : (
                <BuyerOrderDetails 
                    order={fullOrder}
                    editingItems={displayItems}
                    setEditingItems={setEditingItems}
                    onSubmit={onSubmit}
                    isSubmitting={isSubmitting}
                    myOffer={detailedMyOffer}
                    statusInfo={statusInfo}
                    onOpenChat={onOpenChat}
                />
            )}
        </div>
      )}
    </div>
  );
});