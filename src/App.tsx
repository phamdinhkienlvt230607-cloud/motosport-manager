import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { StoreProvider } from './data/Store';
import { AuthProvider } from './auth/AuthContext.tsx';
import { RequireAuth, RequirePermission } from './auth/RouteGuards';
import { MainLayout } from './layouts/MainLayout';
import { Dashboard } from './pages/Dashboard';
import { CarsPage } from './pages/Cars';
import { CategoriesPage, CustomersPage, InvoicesPage, PurchasesPage, ReportsPage, SalesPage, SettingsPage, SuppliersPage } from './pages/Operations';
import { AccountsPage } from './pages/AccountsPage';
import { LoginPage, UnauthorizedPage } from './pages/LoginPage';
import './styles.css';
import './auth/auth.css';

export default function App() {
  return (
    <AuthProvider>
      <StoreProvider>
        <BrowserRouter>
          <Routes>
            <Route path="login" element={<LoginPage />} />
            <Route path="unauthorized" element={<RequireAuth><UnauthorizedPage /></RequireAuth>} />
            <Route element={<RequireAuth><MainLayout /></RequireAuth>}>
              <Route index element={<RequirePermission permission="dashboard:view"><Dashboard /></RequirePermission>} />
              <Route path="cars" element={<RequirePermission permission="vehicles:manage"><CarsPage /></RequirePermission>} />
              <Route path="categories" element={<RequirePermission permission="categories:manage"><CategoriesPage /></RequirePermission>} />
              <Route path="customers" element={<RequirePermission permission="customers:manage"><CustomersPage /></RequirePermission>} />
              <Route path="suppliers" element={<RequirePermission permission="suppliers:manage"><SuppliersPage /></RequirePermission>} />
              <Route path="purchases" element={<RequirePermission permission="purchases:manage"><PurchasesPage /></RequirePermission>} />
              <Route path="sales" element={<RequirePermission permission="sales:manage"><SalesPage /></RequirePermission>} />
              <Route path="invoices" element={<RequirePermission permission="invoices:manage"><InvoicesPage /></RequirePermission>} />
              <Route path="reports" element={<RequirePermission permission="reports:view"><ReportsPage /></RequirePermission>} />
              <Route path="settings" element={<RequirePermission permission="settings:manage"><SettingsPage /></RequirePermission>} />
              <Route path="accounts" element={<RequirePermission permission="accounts:manage"><AccountsPage /></RequirePermission>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </StoreProvider>
    </AuthProvider>
  );
}