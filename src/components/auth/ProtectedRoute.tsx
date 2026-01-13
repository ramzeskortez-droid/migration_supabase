import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  role: 'operator' | 'buyer' | 'admin';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, role }) => {
  const location = useLocation();

  const checkAuth = () => {
    switch (role) {
      case 'operator':
        return !!localStorage.getItem('operatorToken');
      case 'buyer':
        return !!localStorage.getItem('buyer_auth_token');
      case 'admin':
        return !!localStorage.getItem('adminToken');
      default:
        return false;
    }
  };

  if (!checkAuth()) {
    return <Navigate to="/" replace state={{ from: location }} />;
  }

  return <>{children}</>;
};
