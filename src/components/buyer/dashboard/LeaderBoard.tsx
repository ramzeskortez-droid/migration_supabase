import React from 'react';
import { Trophy, Target } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';

interface LeaderBoardProps {
  quantityLeader: string;
  quantityLeaderValue: number;
  sumLeader: string;
  sumLeaderValue: string;
  toLeaderQuantity: number;
  toLeaderQuantityPercent: number;
  toLeaderSum: string;
  toLeaderSumPercent: number;
}

export function LeaderBoard({ 
  quantityLeader, 
  quantityLeaderValue,
  sumLeader, 
  sumLeaderValue,
  toLeaderQuantity, 
  toLeaderQuantityPercent,
  toLeaderSum,
  toLeaderSumPercent 
}: LeaderBoardProps) {
  return (
    <div className="bg-slate-50/50 rounded-lg p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-x divide-slate-200">
        {/* Левая часть - Лидеры */}
        <div className="pr-2">
          <div className="flex items-center mb-2">
            <Trophy className="w-4 h-4 text-orange-500 mr-1.5" />
            <h3 className="text-xs text-slate-700 uppercase tracking-wider font-black">Лидеры отдела</h3>
            <InfoTooltip text="Сотрудники с максимальным количеством и суммой выставленных КП за месяц." />
          </div>
          
          <div className="space-y-2">
            {/* Лидер по количеству */}
            <div className="bg-white/60 rounded-lg p-2.5 backdrop-blur-sm border border-white/50 shadow-sm flex justify-between items-center">
              <div className="text-[9px] text-gray-500 uppercase tracking-tight font-bold">
                По количеству
              </div>
              <div className="text-sm text-gray-900 font-black">
                {quantityLeader} <span className="text-gray-400">|</span> <span className="text-indigo-600">{quantityLeaderValue}</span>
              </div>
            </div>

            {/* Лидер по сумме */}
            <div className="bg-white/60 rounded-lg p-2.5 backdrop-blur-sm border border-white/50 shadow-sm flex justify-between items-center">
              <div className="text-[9px] text-gray-500 uppercase tracking-tight font-bold">
                По сумме
              </div>
              <div className="text-sm text-gray-900 font-black">
                {sumLeader} <span className="text-gray-400">|</span> <span className="text-indigo-600">{sumLeaderValue}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Правая часть - Мой прогресс */}
        <div className="pl-4">
          <div className="flex items-center mb-2">
            <Target className="w-4 h-4 text-blue-600 mr-1.5" />
            <h3 className="text-xs text-blue-600 uppercase tracking-wider font-black">Мой прогресс</h3>
            <InfoTooltip text="Разница между вашими показателями и показателями текущего лидера." />
          </div>

          <div className="space-y-2">
            <div className="bg-white/60 rounded-lg p-2.5 backdrop-blur-sm border border-white/50 shadow-sm flex justify-between items-center">
              <div className="text-[9px] text-gray-500 uppercase tracking-tight font-bold">
                До лидера (шт)
              </div>
              <div className="text-sm text-gray-900 font-black">
                {toLeaderQuantity} <span className="text-xs text-blue-600 font-bold ml-1">({toLeaderQuantityPercent}%)</span>
              </div>
            </div>

            <div className="bg-white/60 rounded-lg p-2.5 backdrop-blur-sm border border-white/50 shadow-sm flex justify-between items-center">
              <div className="text-[9px] text-gray-500 uppercase tracking-tight font-bold">
                До лидера (₽)
              </div>
              <div className="text-sm text-gray-900 font-black">
                {toLeaderSum} <span className="text-xs text-blue-600 font-bold ml-1">({toLeaderSumPercent}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}