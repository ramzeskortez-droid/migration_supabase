import React, { useState } from "react";
import { RoleSelection } from "./RoleSelection";
import { LoginForm } from "./LoginForm";
import { RegisterForm } from "./RegisterForm";
import { motion, AnimatePresence } from "motion/react";

export type Role = "operator" | "buyer" | "admin" | null;
type ViewMode = "login" | "register";

export const StartPage: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<Role>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("login");

  const handleRoleSelect = (role: Role) => {
    setSelectedRole(role);
    setViewMode("login"); // Reset to login when choosing role
  };

  const handleBack = () => {
    setSelectedRole(null);
    setViewMode("login");
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
            key={viewMode} // Key change triggers animation between login/register
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="w-full flex justify-center"
          >
            {viewMode === "login" ? (
              <LoginForm 
                role={selectedRole} 
                onBack={handleBack} 
                onSwitchToRegister={() => setViewMode("register")}
              />
            ) : (
              <RegisterForm 
                role={selectedRole} 
                onBack={handleBack} 
                onSwitchToLogin={() => setViewMode("login")}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
