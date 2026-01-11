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
      gradient: "from-cyan-400 to-blue-500",
    },
    {
      id: "buyer" as Role,
      label: "Я закупщик",
      icon: Package,
      gradient: "from-emerald-400 to-teal-500",
    },
    {
      id: "admin" as Role,
      label: "Я менеджер",
      icon: Briefcase,
      gradient: "from-violet-400 to-purple-500",
    },
  ];

  return (
    <div className="relative z-10 backdrop-blur-xl bg-white/10 rounded-3xl p-12 shadow-2xl border border-white/20 max-w-lg w-full mx-4">
      <div className="flex flex-col items-center mb-10">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-white/30 to-white/10 flex items-center justify-center mb-6 backdrop-blur-sm border border-white/30"
        >
          <svg
            className="w-12 h-12 text-white"
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
        </motion.div>
        <h1 className="text-4xl font-bold text-white mb-2 text-center">Добро пожаловать</h1>
        <p className="text-white/70 text-lg text-center">Выберите вашу роль для входа</p>
      </div>

      <div className="space-y-4">
        {roles.map((role, index) => {
          const Icon = role.icon;
          return (
            <motion.button
              key={role.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 * index, duration: 0.3 }}
              onClick={() => onRoleSelect(role.id)}
              className={`w-full bg-gradient-to-r ${role.gradient} text-white rounded-2xl p-6 flex items-center gap-6 transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-2xl group`}
            >
              <div className="w-14 h-14 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white/30 transition-all">
                <Icon className="w-8 h-8" />
              </div>
              <span className="text-xl font-semibold">{role.label}</span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};
