import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { ProtectedRoute } from '../components/common/ProtectedRoute';
import { useAppSelector } from '../store';

// Auth Pages
import { LoginPage } from '../pages/auth/LoginPage';
import { RegisterPage } from '../pages/auth/RegisterPage';

// Customer Pages
import { ChatPage } from '../pages/customer/ChatPage';
import { OrdersPage } from '../pages/customer/OrdersPage';
import { RefundsPage } from '../pages/customer/RefundsPage';

// Agent Pages
import { DashboardPage } from '../pages/agent/DashboardPage';
import { CasesPage } from '../pages/agent/CasesPage';
import { CaseDetailPage } from '../pages/agent/CaseDetailPage';

// Supervisor Pages
import { PendingPage } from '../pages/supervisor/PendingPage';

// Analytics & Admin Pages
import { OverviewPage } from '../pages/analytics/OverviewPage';
import { UsersPage } from '../pages/admin/UsersPage';
import { KnowledgeBasePage } from '../pages/admin/KnowledgeBasePage';
import { ExperimentsPage } from '../pages/admin/ExperimentsPage';

const RootRedirect: React.FC = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }
  return <Navigate to={user.role === 'customer' ? '/customer/chat' : '/agent/dashboard'} replace />;
};

export const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* Public Auth Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected App Routes */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<RootRedirect />} />

        {/* Customer Portal */}
        <Route
          path="customer/chat"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <ChatPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer/orders"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <OrdersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="customer/refunds"
          element={
            <ProtectedRoute allowedRoles={['customer', 'admin']}>
              <RefundsPage />
            </ProtectedRoute>
          }
        />

        {/* Agent Portal */}
        <Route
          path="agent/dashboard"
          element={
            <ProtectedRoute allowedRoles={['agent', 'admin']}>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agent/cases"
          element={
            <ProtectedRoute allowedRoles={['agent', 'reviewer', 'admin']}>
              <CasesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="agent/cases/:id"
          element={
            <ProtectedRoute allowedRoles={['agent', 'reviewer', 'admin']}>
              <CaseDetailPage />
            </ProtectedRoute>
          }
        />

        {/* Supervisor Portal */}
        <Route
          path="supervisor/pending"
          element={
            <ProtectedRoute allowedRoles={['reviewer', 'admin']}>
              <PendingPage />
            </ProtectedRoute>
          }
        />

        {/* Analytics & Admin */}
        <Route
          path="analytics/overview"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <OverviewPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <UsersPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/knowledge-base"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <KnowledgeBasePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/experiments"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <ExperimentsPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
};
