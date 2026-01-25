import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { User, Users } from 'lucide-react';
import { AppUser } from '../../types';

interface AssignedBuyersBadgeProps {
    buyerIds: string[] | null | undefined;
    buyersMap: Record<string, AppUser>;
    showLabel?: boolean;
}

export const AssignedBuyersBadge: React.FC<AssignedBuyersBadgeProps> = ({ buyerIds, buyersMap, showLabel = true }) => {
    const [isHovered, setIsHovered] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0 });
    const badgeRef = useRef<HTMLDivElement>(null);

    if (!buyerIds || buyerIds.length === 0) return null;

    const names = buyerIds.map(id => buyersMap[id]?.name || 'Неизвестный').join(', ');
    const count = buyerIds.length;

    const handleMouseEnter = () => {
        if (badgeRef.current) {
            const rect = badgeRef.current.getBoundingClientRect();
            setCoords({
                top: rect.top - 10, // Чуть выше элемента
                left: rect.left + rect.width / 2
            });
            setIsHovered(true);
        }
    };

    return (
        <>
            <div 
                ref={badgeRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={() => setIsHovered(false)}
                className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-full 
                    bg-indigo-50 border border-indigo-200 text-indigo-700
                    cursor-help transition-colors hover:bg-indigo-100
                `}
            >
                {count > 1 ? <Users size={12} /> : <User size={12} />}
                <span className="text-[10px] font-black">{count}</span>
                {showLabel && <span className="text-[9px] font-bold uppercase hidden sm:inline">Адресовано</span>}
            </div>

            {/* Portal Tooltip */}
            {isHovered && createPortal(
                <div 
                    className="fixed z-[9999] pointer-events-none"
                    style={{ 
                        top: coords.top, 
                        left: coords.left,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-slate-800 text-white text-[10px] py-1.5 px-2.5 rounded-lg shadow-xl relative mb-2">
                        <div className="font-bold mb-0.5">Назначено:</div>
                        <div className="font-medium opacity-90 leading-tight whitespace-nowrap">{names}</div>
                        {/* Arrow */}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800"></div>
                    </div>
                </div>,
                document.body
            )}
        </>
    );
};