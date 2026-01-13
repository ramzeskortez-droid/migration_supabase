import React from 'react';
import { UserCog, Package, Briefcase } from "lucide-react";
import { motion } from "motion/react";
import { Role } from "./StartPage";

interface RoleSelectionProps {
  onRoleSelect: (role: Role) => void;
}

export const RoleSelection: React.FC<RoleSelectionProps> = ({ onRoleSelect }) => {
  const roles = [
    {
      id: "operator" as Role,
      label: "Я оператор",
      icon: UserCog,
      iconColor: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "hover:border-blue-400",
    },
    {
      id: "buyer" as Role,
      label: "Я закупщик",
      icon: Package,
      iconColor: "text-emerald-600",
      bgColor: "bg-emerald-50",
      borderColor: "hover:border-emerald-400",
    },
    {
      id: "admin" as Role,
      label: "Я менеджер",
      icon: Briefcase,
      iconColor: "text-violet-600",
      bgColor: "bg-violet-50",
      borderColor: "hover:border-violet-400",
    },
  ];

  return (
    <div className="bg-white rounded-2xl p-10 shadow-xl border border-slate-200 max-w-lg w-full">
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-indigo-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2 text-center">Добро пожаловать</h1>
        <p className="text-slate-500 text-center">Выберите вашу роль для входа</p>
      </div>

      <div className="space-y-3">
        {roles.map((role, index) => {
          const Icon = role.icon;
          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 * index, duration: 0.2 }}
              onClick={() => onRoleSelect(role.id)}
              className={`w-full bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4 transition-all duration-200 hover:shadow-md ${role.borderColor} group`}
            >
              <div className={`w-12 h-12 rounded-lg ${role.bgColor} flex items-center justify-center transition-colors`}>
                <Icon className={`w-6 h-6 ${role.iconColor}`} />
              </div>
              <span className="text-lg font-semibold text-slate-700 group-hover:text-slate-900 transition-colors">
                {role.label}
              </span>
              <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400">
                →
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
