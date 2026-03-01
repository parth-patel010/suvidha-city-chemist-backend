import { Route, Switch, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Products from "./pages/Products";
import Inventory from "./pages/Inventory";
import Sales from "./pages/Sales";
import Customers from "./pages/Customers";
import OnlineOrders from "./pages/OnlineOrders";
import PurchaseOrders from "./pages/PurchaseOrders";
import Suppliers from "./pages/Suppliers";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import Loyalty from "./pages/Loyalty";
import WhatsApp from "./pages/WhatsApp";
import AIAnalytics from "./pages/AIAnalytics";
import Branches from "./pages/Branches";
import UsersPage from "./pages/Users";
import Alerts from "./pages/Alerts";
import NotFound from "./pages/not-found";
import Layout from "./components/Layout";
import { useEffect, useState, useCallback } from "react";

function App() {
  const [location] = useLocation();
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem("pharmacy_token");
    setIsAuthenticated(!!token);
  }, []);

  useEffect(() => {
    checkAuth();
  }, [location, checkAuth]);

  useEffect(() => {
    const handleStorage = () => checkAuth();
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [checkAuth]);

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <Switch>
        <Route path="/login">
          {isAuthenticated ? <Redirect to="/" /> : <Login />}
        </Route>
        <Route>
          {!isAuthenticated ? (
            <Redirect to="/login" />
          ) : (
            <Layout>
              <Switch>
                <Route path="/" component={Dashboard} />
                <Route path="/products" component={Products} />
                <Route path="/inventory" component={Inventory} />
                <Route path="/sales" component={Sales} />
                <Route path="/customers" component={Customers} />
                <Route path="/online-orders" component={OnlineOrders} />
                <Route path="/purchase-orders" component={PurchaseOrders} />
                <Route path="/suppliers" component={Suppliers} />
                <Route path="/reports" component={Reports} />
                <Route path="/settings" component={Settings} />
                <Route path="/loyalty" component={Loyalty} />
                <Route path="/whatsapp" component={WhatsApp} />
                <Route path="/ai-analytics" component={AIAnalytics} />
                <Route path="/branches" component={Branches} />
                <Route path="/users" component={UsersPage} />
                <Route path="/alerts" component={Alerts} />
                <Route component={NotFound} />
              </Switch>
            </Layout>
          )}
        </Route>
      </Switch>
      <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
