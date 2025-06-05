import { Switch, Route, Router, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, lazy, Suspense } from "react";
import { AuthProvider } from "./contexts/auth-context";
import { useAuth } from "./contexts/auth-context";
import PageLoader from "./components/ui/pageLoader";
import AdminLeadReports from "./pages/admin/lead-reports";
import UserLeadReports from "./pages/user/lead-reports";
import { PageTransitionWrapper } from "./components/ui/loading-overlay";

// Lazy-loaded components
// Auth Pages
const Login = lazy(() => import("@/pages/login"));
const Register = lazy(() => import("@/pages/register"));
const Verify = lazy(() => import("@/pages/verify"));
const ResetPassword = lazy(() => import("@/pages/reset-password"));
const LoginTest = lazy(() => import("@/pages/login-test"));
const AuthDebug = lazy(() => import("@/pages/auth-debug"));

// Admin Pages
const AdminDashboard = lazy(() => import("@/pages/admin/dashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/users"));
const AdminLeads = lazy(() => import("@/pages/admin/leads"));
const AdminCreateLead = lazy(() => import("@/pages/admin/create-lead"));
const AdminSupport = lazy(() => import("@/pages/admin/support"));
const AdminSubscriptions = lazy(() => import("@/pages/admin/subscriptions"));
const AdminSubadmins = lazy(() => import("@/pages/admin/subadmins"));
const AdminLeadcoins = lazy(() => import("@/pages/admin/leadcoins"));
const AdminProfile = lazy(() => import("@/pages/admin/profile"));
const LeadCategories = lazy(() => import("@/pages/admin/lead-categories"));
const AdminCoupons = lazy(() => import("@/pages/admin/coupons"));
// Subadmin Pages
const SubadminDashboard = lazy(() => import("@/pages/subadmin/dashboard"));
const SubadminUsers = lazy(() => import("@/pages/subadmin/users"));
const SubadminLeads = lazy(() => import("@/pages/subadmin/leads"));
const SubadminCreateLead = lazy(() => import("@/pages/subadmin/create-lead"));
const SubadminSupport = lazy(() => import("@/pages/subadmin/support"));
const SubadminSubscriptions = lazy(
  () => import("@/pages/subadmin/subscriptions"),
);
const SubadminProfile = lazy(() => import("@/pages/subadmin/profile"));

// User Pages
const UserDashboard = lazy(() => import("@/pages/user/dashboard"));
const UserLeads = lazy(() => import("@/pages/user/leads"));
const UserSubscriptions = lazy(() => import("@/pages/user/subscriptions"));
const UserSupport = lazy(() => import("@/pages/user/support"));
const UserProfile = lazy(() => import("@/pages/user/profile"));

// Other
const NotFound = lazy(() => import("@/pages/not-found"));
const LeadDetail = lazy(() => import("@/pages/lead-detail"));
const AdminEditLead = lazy(() => import("@/pages/admin/edit-lead"));
const SubadminEditLead = lazy(() => import("@/pages/subadmin/edit-lead"));
const Checkout = lazy(() => import("@/pages/checkout"));
const PaymentSuccess = lazy(() => import("@/pages/payment-success"));

// console.log("App.tsx loaded");

const LoadingFallback = () => (
  <PageTransitionWrapper isLoading={true}>
    <div className="min-h-screen" />
  </PageTransitionWrapper>
);

function AppRoutes() {
  const { user, isLoading } = useAuth();
  const [redirect, setRedirect] = useState<string | null>(null);
  const [location, navigate] = useLocation();

  // Always define all hooks at the top level
  useEffect(() => {
    if (redirect) {
      navigate(redirect);
      setRedirect(null);
    }
  }, [redirect, navigate]);

  // Optimization: Remove unnecessary log statements in production
  useEffect(() => {
    if (user && process.env.NODE_ENV === "development") {
      console.log("Auth check - user data:", user);
    }
  }, [isLoading, user, location]);

  // Remove full-page loading state
  // We'll render components directly and let them handle their own loading states

  // Render routes after all hooks and conditional logic
  if (!user) {
    return (
      <Switch>
        <Route path="/" component={Login} />
        <Route path="/login" component={Login} />
        <Route path="/login-test" component={LoginTest} />
        <Route path="/auth-debug" component={AuthDebug} />
        <Route path="/register" component={Register} />
        <Route path="/verify" component={Verify} />
        <Route path="/reset-password" component={ResetPassword} />
        <Route path="/checkout/:type/:id" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route component={Login} />
      </Switch>
    );
  }

  // Admin routes
  if (user.role === "admin") {
    return (
      <Switch>
        <Route path="/" component={AdminDashboard} />
        <Route path="/admin/dashboard" component={AdminDashboard} />
        <Route path="/admin/users" component={AdminUsers} />
        <Route path="/admin/leads" component={AdminLeads} />
        <Route path="/admin/create-lead" component={AdminCreateLead} />
        <Route path="/admin/edit-lead/:id" component={AdminEditLead} />
        <Route path="/admin/support" component={AdminSupport} />
        <Route path="/admin/support/:id" component={AdminSupport} />
        <Route path="/admin/subscriptions" component={AdminSubscriptions} />
        <Route path="/admin/subadmins" component={AdminSubadmins} />
        <Route path="/admin/leadcoins" component={AdminLeadcoins} />
        <Route path="/admin/lead-categories" component={LeadCategories} />
        <Route path="/admin/lead-reports" component={AdminLeadReports} />
        <Route path="/admin/coupons" component={AdminCoupons} />
        <Route path="/admin/profile" component={AdminProfile} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/lead/:id" component={LeadDetail} />
        <Route path="/checkout/:type/:id" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // Subadmin routes
  if (user.role === "subadmin") {
    return (
      <Switch>
        <Route path="/" component={SubadminDashboard} />
        <Route path="/subadmin/dashboard" component={SubadminDashboard} />
        <Route path="/subadmin/users" component={SubadminUsers} />
        <Route path="/subadmin/leads" component={SubadminLeads} />
        <Route path="/subadmin/create-lead" component={SubadminCreateLead} />
        <Route path="/subadmin/edit-lead/:id" component={SubadminEditLead} />
        <Route path="/subadmin/support" component={SubadminSupport} />
        <Route path="/subadmin/support/:id" component={SubadminSupport} />
        <Route
          path="/subadmin/subscriptions"
          component={SubadminSubscriptions}
        />
        <Route path="/subadmin/profile" component={SubadminProfile} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/checkout/:type/:id" component={Checkout} />
        <Route path="/payment-success" component={PaymentSuccess} />
        <Route component={NotFound} />
      </Switch>
    );
  }

  // User routes (default case)
  return (
    <Switch>
      <Route path="/" component={UserDashboard} />
      <Route path="/user/dashboard" component={UserDashboard} />
      <Route path="/user/leads" component={UserLeads} />
      <Route path="/user/subscriptions" component={UserSubscriptions} />
      <Route path="/user/support/:id" component={UserSupport} />
      <Route path="/user/support" component={UserSupport} />
      <Route path="/user/lead-reports" component={UserLeadReports} />
      <Route path="/user/profile" component={UserProfile} />
      <Route path="/leads/:id" component={LeadDetail} />
      <Route path="/checkout/:type/:id" component={Checkout} />
      <Route path="/payment-success" component={PaymentSuccess} />
      <Route component={NotFound} />
    </Switch>
  );
}

// Optimized route change handler with better state control
function RouteChangeHandler() {
  const { user, checkAuth } = useAuth();
  const [hasChecked, setHasChecked] = useState(false);

  // Use useEffect with proper state control to prevent infinite renders
  useEffect(() => {
    // Only check auth once on initial mount - removed isLoading check to prevent delays
    if (!user && !hasChecked) {
      setHasChecked(true);

      // Run auth check in background without blocking rendering
      setTimeout(() => {
        checkAuth().finally(() => {
          // Keep track of completed auth checks - just for development logging
          if (process.env.NODE_ENV === "development") {
            console.log("Auth check completed in background");
          }
        });
      }, 100);
    }
  }, [user, checkAuth, hasChecked]);

  return null;
}

// No custom hooks needed for basic routing

function App() {
  return (
    <>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <AuthProvider>
            <Router>
              <Suspense fallback={<LoadingFallback />}>
                <AppRoutes />
                <RouteChangeHandler />
                <Toaster />
              </Suspense>
            </Router>
          </AuthProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </>
  );
}

export default App;
