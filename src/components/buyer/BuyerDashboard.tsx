import React from 'react';
import { FileText, TrendingUp, Trophy, Clock } from 'lucide-react';
import { useBuyerStats } from '../../hooks/useBuyerStats';
import { TotalKpiCard } from './dashboard/TotalKpiCard';
import { KpiCard } from './dashboard/KpiCard';
import { LeaderBoard } from './dashboard/LeaderBoard';

interface BuyerDashboardProps {
  userId?: string;
}

export const BuyerDashboard: React.FC<BuyerDashboardProps> = ({ userId }) => {
  const { data: stats, isLoading } = useBuyerStats(userId);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('ru-RU', { 
        style: 'currency', 
        currency: 'RUB', 
        maximumFractionDigits: 0 
    }).format(val);
  };

  const formatNumber = (val: number) => {
      return new Intl.NumberFormat('ru-RU').format(val);
  };

  // Рассчитываем проценты до лидера
  const calculatePercent = (myVal: number, leaderVal: number) => {
      if (leaderVal === 0) return 0;
      const diff = leaderVal - myVal;
      if (diff <= 0) return 0; // Мы лидер или обогнали
      return Math.round((diff / leaderVal) * 100);
  };

  const calculateGap = (myVal: number, leaderVal: number) => {
      const diff = leaderVal - myVal;
      return diff > 0 ? diff : 0;
  };

  if (isLoading) {
      return <div className="p-8 text-center text-gray-500">Загрузка статистики...</div>;
  }

  if (!stats) return null;

  const { personal, department, leaders } = stats;

  const currentMonthName = new Date().toLocaleString('ru-RU', { month: 'long' });
  const capitalizedMonth = currentMonthName.charAt(0).toUpperCase() + currentMonthName.slice(1);

  const gapQty = calculateGap(personal.kp_count, leaders.quantity_val);
  const gapSum = calculateGap(personal.kp_sum, leaders.sum_val);
  
  // Процент "До лидера" - это сколько процентов от лидера нам не хватает? 
  // Или сколько мы составляем от лидера?
  // В референсе: "До лидера ... (31%)". Скорее всего это (Gap / Leader) * 100
  const gapQtyPercent = calculatePercent(personal.kp_count, leaders.quantity_val);
  const gapSumPercent = calculatePercent(personal.kp_sum, leaders.sum_val);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-6">
      {/* Верхняя секция: Оборот и Лидеры */}
      <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        
        {/* Оборот (3 колонки) */}
        <div className="lg:col-span-4 p-4 flex flex-col justify-center rounded-tl-xl rounded-bl-xl lg:rounded-bl-none">
          <TotalKpiCard
            title={`ОБОРОТ ОТДЕЛА ЗА ${capitalizedMonth.toUpperCase()}`}
            value={formatCurrency(department.turnover)}
            description={`Суммарная стоимость всех выставленных КП отделом за ${capitalizedMonth}`}
            tooltip="Сумма всех предложений отдела, которые были обработаны менеджером и переведены в статус 'КП готово'."
          />
        </div>

        {/* Лидерборд (8 колонок) */}
        <div className="lg:col-span-8 p-4 bg-slate-50/30 rounded-tr-xl lg:rounded-br-none rounded-br-xl lg:rounded-bl-none">
          <LeaderBoard
            quantityLeader={leaders.quantity_leader}
            quantityLeaderValue={leaders.quantity_val}
            sumLeader={leaders.sum_leader}
            sumLeaderValue={formatCurrency(leaders.sum_val)}
            
            toLeaderQuantity={gapQty}
            toLeaderQuantityPercent={gapQtyPercent}
            toLeaderSum={formatCurrency(gapSum)}
            toLeaderSumPercent={gapSumPercent}
          />
        </div>
      </div>

      {/* Нижняя секция: Личные KPI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 border-t border-slate-100 bg-white divide-x divide-slate-100 rounded-bl-xl rounded-br-xl">
        <KpiCard
          icon={FileText}
          value={formatNumber(personal.kp_count)}
          label="КП ВЫСТАВЛЕНО"
          period="МЕСЯЦ"
          iconColor="text-purple-500"
          tooltip="Количество ваших офферов, включенных в итоговое КП для клиента (заказ в статусе 'КП готово')."
        />
        <KpiCard
          icon={TrendingUp}
          value={formatCurrency(personal.kp_sum)}
          label="СУММА КП"
          period="МЕСЯЦ"
          iconColor="text-blue-500"
          tooltip="Общая стоимость товаров в ваших офферах, попавших в итоговое КП."
        />
        <KpiCard
          icon={Trophy}
          value={formatNumber(personal.won_count)}
          label="ВЫИГРАННЫЕ СДЕЛКИ"
          period="МЕСЯЦ"
          iconColor="text-purple-500"
          tooltip="Количество офферов, где хотя бы одна позиция была выбрана менеджером как 'Лидер'."
        />
        <KpiCard
          icon={Clock}
          value={formatCurrency(personal.won_sum)}
          label="СУММА ВЫИГРЫША"
          period="МЕСЯЦ"
          iconColor="text-blue-500"
          tooltip="Суммарная стоимость (admin_price) только тех позиций, которые получили статус победителя."
        />
      </div>
    </div>
  );
};
