import { ReactNode, useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, Package, ShoppingCart, Users, ShoppingBag,
  Truck, FileText, Settings, LogOut, Menu, Building2,
  Bell, Crown, MessageSquare, Brain, GitBranch, UserCog,
  AlertTriangle, ChevronLeft, X, BarChart3, Boxes
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useQuery } from "@tanstack/react-query";
import { apiUrl } from "@/lib/api";

interface LayoutProps {
  children: ReactNode;
}

type UserRole = "Admin" | "Manager" | "Cashier";

const menuSections = [
  {
    label: "MAIN",
    items: [
      { path: "/", label: "Dashboard", icon: LayoutDashboard, roles: ["Admin", "Manager", "Cashier"] },
    ],
  },
  {
    label: "OPERATIONS",
    items: [
      { path: "/products", label: "Products", icon: Package, roles: ["Admin", "Manager", "Cashier"] },
      { path: "/inventory", label: "Inventory", icon: Boxes, roles: ["Admin", "Manager", "Cashier"] },
      { path: "/sales", label: "Sales / POS", icon: ShoppingCart, roles: ["Admin", "Manager", "Cashier"] },
      { path: "/online-orders", label: "Online Orders", icon: ShoppingBag, roles: ["Admin", "Manager"], hasBadge: true },
    ],
  },
  {
    label: "MANAGEMENT",
    items: [
      { path: "/purchase-orders", label: "Purchase Orders", icon: FileText, roles: ["Admin", "Manager"] },
      { path: "/suppliers", label: "Suppliers", icon: Truck, roles: ["Admin", "Manager"] },
      { path: "/customers", label: "Customers", icon: Users, roles: ["Admin", "Manager"] },
    ],
  },
  {
    label: "ANALYTICS",
    items: [
      { path: "/reports", label: "Reports", icon: BarChart3, roles: ["Admin", "Manager"] },
      { path: "/ai-analytics", label: "AI Analytics", icon: Brain, roles: ["Admin", "Manager"] },
      { path: "/alerts", label: "Alerts", icon: AlertTriangle, roles: ["Admin", "Manager"], hasBadge: true },
    ],
  },
  {
    label: "ADMIN",
    items: [
      { path: "/branches", label: "Branches", icon: GitBranch, roles: ["Admin"] },
      { path: "/users", label: "Users", icon: UserCog, roles: ["Admin"] },
      { path: "/loyalty", label: "Loyalty & Rewards", icon: Crown, roles: ["Admin", "Manager"] },
      { path: "/whatsapp", label: "WhatsApp", icon: MessageSquare, roles: ["Admin", "Manager"] },
      { path: "/settings", label: "Settings", icon: Settings, roles: ["Admin"] },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = JSON.parse(localStorage.getItem("pharmacy_user") || "{}");
  const token = localStorage.getItem("pharmacy_token");
  const userRole: UserRole = user.role?.roleName || "Cashier";

  const { data: alertCounts } = useQuery({
    queryKey: ["alert-counts"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/dashboard/stats"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { pendingOrders: 0, lowStockItems: 0, expiringItems: 0 };
      return res.json();
    },
    refetchInterval: 60000,
  });

  const alertBadgeCount = (alertCounts?.lowStockItems || 0) + (alertCounts?.expiringItems || 0);
  const orderBadgeCount = alertCounts?.pendingOrders || 0;

  const handleLogout = () => {
    localStorage.removeItem("pharmacy_token");
    localStorage.removeItem("pharmacy_user");
    window.location.href = "/login";
  };

  const getInitials = (name: string) => {
    return name?.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2) || "U";
  };

  const NavContent = () => (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
        <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center">
          <Building2 className="h-5 w-5 text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white truncate">Suvidha Pharmacy</div>
          <div className="text-[10px] text-slate-400 uppercase tracking-wider">Pro</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-5">
        {menuSections.map((section) => {
          const visibleItems = section.items.filter((item) =>
            item.roles.includes(userRole)
          );
          if (visibleItems.length === 0) return null;

          return (
            <div key={section.label}>
              <div className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
                {section.label}
              </div>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = item.path === "/"
                    ? location === "/"
                    : location.startsWith(item.path);

                  const badgeCount = item.label === "Alerts" ? alertBadgeCount
                    : item.label === "Online Orders" ? orderBadgeCount
                    : 0;

                  return (
                    <Link
                      key={item.path}
                      href={item.path}
                      onClick={() => setMobileOpen(false)}
                      data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all duration-150 group ${
                        isActive
                          ? "bg-blue-600/20 text-blue-400 border-l-[3px] border-blue-400 -ml-px"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? "text-blue-400" : "text-slate-500 group-hover:text-slate-300"}`} />
                      <span className="truncate">{item.label}</span>
                      {item.hasBadge && badgeCount > 0 && (
                        <Badge className="ml-auto bg-red-500 text-white text-[10px] h-5 min-w-[20px] flex items-center justify-center rounded-full px-1.5">
                          {badgeCount}
                        </Badge>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {getInitials(user.fullName)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-medium text-white truncate" data-testid="text-sidebar-user">
              {user.fullName || "User"}
            </div>
            <div className="text-[11px] text-slate-400 truncate">
              {userRole} {user.branch?.branchName ? `- ${user.branch.branchName}` : ""}
            </div>
          </div>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLogout}
                  className="h-8 w-8 text-slate-400 hover:text-white hover:bg-white/10 shrink-0"
                  data-testid="button-logout"
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>Logout</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-background">
      <aside className="hidden lg:flex w-[260px] shrink-0 flex-col bg-[#0F172A] fixed inset-y-0 left-0 z-40" data-testid="sidebar">
        <NavContent />
      </aside>

      <div className="lg:hidden">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-[260px] p-0 bg-[#0F172A] border-r-0">
            <NavContent />
          </SheetContent>
        </Sheet>
      </div>

      <div className="flex-1 lg:ml-[260px] flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 h-14 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 flex items-center px-4 lg:px-6 gap-4">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setMobileOpen(true)}
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>

          <div className="flex-1" />

          <div className="flex items-center gap-3 text-sm">
            <div className="hidden sm:flex items-center gap-2 text-muted-foreground">
              <Building2 className="h-4 w-4" />
              <span data-testid="text-branch-name">{user.branch?.branchName || "Main Branch"}</span>
            </div>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                {getInitials(user.fullName)}
              </div>
              <span className="font-medium hidden sm:inline" data-testid="text-user-name">{user.fullName}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
