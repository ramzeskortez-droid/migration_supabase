import React, { useState } from "react";
import { RoleSelection } from "./RoleSelection";
import { LoginForm } from "./LoginForm";
import { motion, AnimatePresence } from "motion/react";

export type Role = "operator" | "buyer" | "admin" | null;

export const StartPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role>(null);

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
  };

  const handleBack = () => {
    setSelectedRole(null);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 p-4">
      <AnimatePresence mode="wait">
        {!selectedRole ? (
          <motion.div
            key="role-selection"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full flex justify-center"
          >
            <RoleSelection onRoleSelect={handleRoleSelect} />
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="w-full flex justify-center"
          >
            <LoginForm role={selectedRole} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
