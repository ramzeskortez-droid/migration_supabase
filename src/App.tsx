import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ClientInterface } from './components/client/ClientInterface';
import { BuyerInterface } from './components/buyer/BuyerInterface';
import { AdminInterface } from './components/admin/AdminInterface';
import { OperatorInterface } from './components/operator/OperatorInterface';
import { DebugInterface } from './components/debug/DebugInterface';
import { StartPage } from './components/start_page/StartPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<StartPage />} />
      <Route path="/start" element={<StartPage />} />
      
      <Route element={<MainLayout />}>
        <Route path="/operator" element={
          <ProtectedRoute role="operator">
            <OperatorInterface />
          </ProtectedRoute>
        } />
        <Route path="/client" element={<ClientInterface />} />
        <Route path="/buyer" element={
          <ProtectedRoute role="buyer">
            <BuyerInterface />
          </ProtectedRoute>
        } />
        <Route path="/admin" element={
          <ProtectedRoute role="admin">
            <AdminInterface />
          </ProtectedRoute>
        } />
        <Route path="/debug" element={<DebugInterface />} /> 
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;