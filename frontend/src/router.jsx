import React from 'react';
import { createBrowserRouter } from 'react-router-dom';
import ProtectedRoute from './lib/ProtectedRoute.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import BikeIntakePage from './pages/BikeIntakePage.jsx';
import BikeConfirmPage from './pages/BikeConfirmPage.jsx';
import BikeLookupPage from './pages/BikeLookupPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DashboardLayout from './pages/DashboardLayout.jsx';
import OrdersListPage from './pages/OrdersListPage.jsx';
import OrderDetailPage from './pages/OrderDetailPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const router = createBrowserRouter([
  { path: '/', element: <HomePage /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/panel/intake',
    element: <ProtectedRoute><BikeIntakePage /></ProtectedRoute>,
  },
  {
    path: '/panel/intake/:id/confirm',
    element: <ProtectedRoute><BikeConfirmPage /></ProtectedRoute>,
  },
  {
    path: '/panel/lookup',
    element: <ProtectedRoute><BikeLookupPage /></ProtectedRoute>,
  },
  {
    path: '/panel',
    element: <ProtectedRoute><DashboardPage /></ProtectedRoute>,
  },
  {
    path: '/panel/orders',
    element: <ProtectedRoute><OrdersListPage /></ProtectedRoute>,
  },
  {
    path: '/panel/orders/:id',
    element: <ProtectedRoute><OrderDetailPage /></ProtectedRoute>,
  },
  { path: '*', element: <DashboardLayout><NotFoundPage /></DashboardLayout> },
]);

export default router;
