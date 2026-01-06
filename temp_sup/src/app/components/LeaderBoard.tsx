import React from 'react';
import { Trophy, Target } from 'lucide-react';

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
    <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-lg">
      <div className="grid grid-cols-2 gap-12">
        {/* Левая часть - Лидеры */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-orange-500" />
            <h3 className="text-lg text-gray-700 uppercase tracking-wide font-bold">Лидеры отдела</h3>
          </div>
          
          <div className="space-y-3">
            {/* Лидер по количеству */}
            <div className="bg-white/80 rounded-xl p-4 backdrop-blur-sm shadow-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">
                По количеству КП
              </div>
              <div className="text-3xl text-gray-900 font-bold">
                {quantityLeader} <span className="text-gray-400">-</span> {quantityLeaderValue}
              </div>
            </div>

            {/* Лидер по сумме */}
            <div className="bg-white/80 rounded-xl p-4 backdrop-blur-sm shadow-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">
                По сумме КП
              </div>
              <div className="text-3xl text-gray-900 font-bold">
                {sumLeader} <span className="text-gray-400">-</span> {sumLeaderValue}
              </div>
            </div>
          </div>
        </div>

        {/* Правая часть - Мой прогресс */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Target className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg text-blue-600 uppercase tracking-wide font-bold">Мой прогресс</h3>
          </div>

          <div className="space-y-3">
            {/* Прогресс по количеству */}
            <div className="bg-white/80 rounded-xl p-4 backdrop-blur-sm shadow-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">
                До лидера по количеству КП
              </div>
              <div className="text-3xl text-gray-900 font-bold">
                {toLeaderQuantity} <span className="text-xl text-blue-600">({toLeaderQuantityPercent}%)</span>
              </div>
            </div>

            {/* Прогресс по сумме */}
            <div className="bg-white/80 rounded-xl p-4 backdrop-blur-sm shadow-sm">
              <div className="text-xs text-gray-500 uppercase tracking-wider mb-2 font-bold">
                До лидера по сумме КП
              </div>
              <div className="text-3xl text-gray-900 font-bold">
                {toLeaderSum} <span className="text-xl text-blue-600">({toLeaderSumPercent}%)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}