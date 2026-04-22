import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ForgotEmail from './pages/ForgotEmail';
import DashboardLayout from './components/DashboardLayout';
import Dashboard from './pages/Dashboard';
import Packages from './pages/Packages';
import PackagePayouts from './pages/PackagePayouts';
import Wallet from './pages/Wallet';
import WithdrawList from './pages/WithdrawList';
import Performance from './pages/Performance';
import NotificationCenter from './pages/NotificationCenter';
import CollectionCenter from './pages/CollectionCenter';
import PaymentRequests from './pages/PaymentRequests';
import InterestGrowth from './pages/InterestGrowth';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/forgot-email" element={<ForgotEmail />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="packages" element={<Packages />} />
            <Route path="package-payouts" element={<PackagePayouts />} />
            <Route path="payment-requests" element={<PaymentRequests />} />
            <Route path="wallet" element={<Wallet />} />
            <Route path="collections" element={<CollectionCenter />} />
            <Route path="withdraw-list" element={<WithdrawList />} />
            <Route path="performance" element={<Performance />} />
            <Route path="notifications" element={<NotificationCenter />} />
            <Route path="interest-growth" element={<InterestGrowth />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;