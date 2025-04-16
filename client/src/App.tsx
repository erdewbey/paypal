import { Switch, Route } from "wouter";
import NotFound from "@/pages/not-found";
import DashboardPage from "@/pages/dashboard-page";
import HomePage from "@/pages/home-page";
import AuthPage from "@/pages/auth-page";
import ConvertPage from "@/pages/convert-page";
import WalletPage from "@/pages/wallet-page";
import HistoryPage from "@/pages/history-page";
import ProfilePage from "@/pages/profile-page";
import ForgotPasswordPage from "@/pages/forgot-password-page";
import ResetPasswordPage from "@/pages/reset-password-page";
import VerificationPendingPage from "@/pages/verification-pending-page";
import VerificationSuccessPage from "@/pages/verification-success-page";
import RegistrationSuccessPage from "@/pages/registration-success-page";
import { ProtectedRoute } from "./lib/protected-route";
import { AdminRoute } from "./lib/admin-route";
import AdminDashboard from "@/pages/admin/dashboard";
import AdminTransactions from "@/pages/admin/transactions";
import AdminUsers from "@/pages/admin/users";
import AdminRates from "@/pages/admin/rates";
import AdminPaymentAccounts from "@/pages/admin/payment-accounts";
import AdminIdentityVerification from "@/pages/admin/identity-verification";
import { useAuth } from "@/hooks/use-auth";

function Router() {
  const { user } = useAuth();

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={HomePage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password/:token" component={ResetPasswordPage} />
      <Route path="/verification-pending" component={VerificationPendingPage} />
      <Route path="/verification-success" component={VerificationSuccessPage} />
      <Route path="/registration-success" component={RegistrationSuccessPage} />
      
      {/* Protected routes */}
      <ProtectedRoute path="/dashboard" component={DashboardPage} />
      <ProtectedRoute path="/convert" component={ConvertPage} />
      <ProtectedRoute path="/wallet" component={WalletPage} />
      <ProtectedRoute path="/history" component={HistoryPage} />
      <ProtectedRoute path="/profile" component={ProfilePage} />
      
      {/* Admin routes - only accessible to admin users */}
      <AdminRoute path="/admin" component={AdminDashboard} />
      <AdminRoute path="/admin/transactions" component={AdminTransactions} />
      <AdminRoute path="/admin/users" component={AdminUsers} />
      <AdminRoute path="/admin/rates" component={AdminRates} />
      <AdminRoute path="/admin/payment-accounts" component={AdminPaymentAccounts} />
      <AdminRoute path="/admin/identity-verification" component={AdminIdentityVerification} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return <Router />;
}

export default App;
