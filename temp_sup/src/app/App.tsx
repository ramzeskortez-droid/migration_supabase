import React from 'react';
import { FileText, TrendingUp, Trophy, Clock } from 'lucide-react';
import { TotalKpiCard } from './components/TotalKpiCard';
import { KpiCard } from './components/KpiCard';
import { LeaderBoard } from './components/LeaderBoard';

export default function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Верхний блок - Общий KPI */}
        <TotalKpiCard
          title="ОБОРОТ ОТДЕЛА"
          value="15 450 000 ₽"
          description="Суммарная стоимость всех выставленных КП отделом за текущий месяц"
        />

        {/* Средний блок - Личные показатели */}
        <div className="grid grid-cols-4 gap-6">
          <KpiCard
            icon={FileText}
            value="42"
            label="КП ВЫСТАВЛЕНО"
            period="МЕСЯЦ"
            iconColor="text-purple-500"
          />
          <KpiCard
            icon={TrendingUp}
            value="3 850 000 ₽"
            label="СУММА КП"
            period="МЕСЯЦ"
            iconColor="text-blue-500"
          />
          <KpiCard
            icon={Trophy}
            value="18"
            label="ВЫИГРАННЫЕ СДЕЛКИ"
            period="МЕСЯЦ"
            iconColor="text-purple-500"
          />
          <KpiCard
            icon={Clock}
            value="2 420 000 ₽"
            label="СУММА ВЫИГРЫША"
            period="МЕСЯЦ"
            iconColor="text-blue-500"
          />
        </div>

        {/* Нижний блок - Панель лидеров */}
        <LeaderBoard
          quantityLeader="Иванов Петр"
          quantityLeaderValue={55}
          sumLeader="Сидорова Анна"
          sumLeaderValue="5 000 000 ₽"
          toLeaderQuantity={13}
          toLeaderQuantityPercent={31}
          toLeaderSum="1 200 000 ₽"
          toLeaderSumPercent={15}
        />
      </div>
    </div>
  );
}