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
    <div className="h-screen w-full flex items-center justify-center bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <motion.div 
            animate={{ x: [0, 100, 0], y: [0, -50, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 -left-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl"
        ></motion.div>
        <motion.div 
            animate={{ x: [0, -100, 0], y: [0, 100, 0] }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 -right-4 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl"
        ></motion.div>
        <motion.div 
            animate={{ x: [0, 50, 0], y: [0, 50, 0] }}
            transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl"
        ></motion.div>
      </div>

      <AnimatePresence mode="wait">
        {!selectedRole ? (
          <motion.div
            key="role-selection"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex justify-center"
          >
            <RoleSelection onRoleSelect={handleRoleSelect} />
          </motion.div>
        ) : (
          <motion.div
            key="login-form"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full flex justify-center"
          >
            <LoginForm role={selectedRole} onBack={handleBack} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
