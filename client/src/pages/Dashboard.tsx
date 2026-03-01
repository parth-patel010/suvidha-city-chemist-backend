import { useQuery } from "@tanstack/react-query";
import {
  ShoppingCart, Package, AlertTriangle, ShoppingBag,
  TrendingUp, TrendingDown, IndianRupee, Calendar, Clock, User
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { apiUrl } from "@/lib/api";

export default function Dashboard() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: stats, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/dashboard/stats"), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch stats");
      return response.json();
    },
  });

  const formatCurrency = (val: number | string) => {
    const num = typeof val === "string" ? parseFloat(val) : val;
    if (isNaN(num)) return "0.00";
    return num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getPercentChange = () => {
    const todayTotal = parseFloat(stats?.todaySales?.total) || 0;
    const yesterdayTotal = parseFloat(stats?.yesterdaySales?.total) || 0;
    if (yesterdayTotal === 0) return null;
    const change = ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    return change;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  };

  const formatDateTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
    });
  };

  const getDaysUntilExpiry = (dateStr: string) => {
    const expiry = new Date(dateStr);
    const now = new Date();
    return Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
          <p className="text-muted-foreground">Loading statistics...</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32 mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const percentChange = getPercentChange();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-dashboard-title">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome to Suvidha Pharmacy Management System
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card data-testid="card-todays-sales">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <IndianRupee className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-todays-sales-value">
              {`\u20B9${formatCurrency(stats?.todaySales?.total || 0)}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1" data-testid="text-todays-sales-count">
              {stats?.todaySales?.count || 0} transactions
            </p>
            {percentChange !== null && (
              <div className="flex items-center mt-2 text-xs gap-1">
                {percentChange >= 0 ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={percentChange >= 0 ? "text-green-500" : "text-red-500"} data-testid="text-sales-percent-change">
                  {percentChange >= 0 ? "+" : ""}{percentChange.toFixed(1)}% from yesterday
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-low-stock">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Low Stock Items
            </CardTitle>
            <Package className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <div className="text-2xl font-bold" data-testid="text-low-stock-value">{stats?.lowStockItems || 0}</div>
              {Number(stats?.lowStockItems) > 0 && (
                <Badge variant="destructive">Action Required</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need to reorder</p>
          </CardContent>
        </Card>

        <Card data-testid="card-expiring-soon">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Expiring Soon
            </CardTitle>
            <AlertTriangle className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <div className="text-2xl font-bold" data-testid="text-expiring-value">{stats?.expiringItems || 0}</div>
              {Number(stats?.expiringItems) > 0 && (
                <Badge variant="secondary">Review</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Within 30 days</p>
          </CardContent>
        </Card>

        <Card data-testid="card-pending-orders">
          <CardHeader className="flex flex-row items-center justify-between gap-1 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline justify-between gap-1 flex-wrap">
              <div className="text-2xl font-bold" data-testid="text-pending-orders-value">{stats?.pendingOrders || 0}</div>
              {Number(stats?.pendingOrders) > 0 && (
                <Badge>New</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Online orders to process</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card data-testid="card-sales-trend">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sales Trend (Last 7 Days)
            </CardTitle>
            <CardDescription>Daily sales summary</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.salesTrend && stats.salesTrend.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Transactions</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.salesTrend.map((day: any, index: number) => (
                    <TableRow key={index} data-testid={`row-trend-${index}`}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                          {formatDate(day.date)}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{day.count}</TableCell>
                      <TableCell className="text-right font-medium">{`\u20B9${formatCurrency(day.total)}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-trend-data">
                No sales data for the last 7 days
              </p>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-recent-sales">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Recent Sales
            </CardTitle>
            <CardDescription>Last 5 transactions</CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.recentSales && stats.recentSales.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentSales.map((sale: any) => (
                    <TableRow key={sale.id} data-testid={`row-recent-sale-${sale.id}`}>
                      <TableCell className="font-medium text-xs">{sale.invoiceNumber}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm">{sale.customer?.customerName || "Walk-in"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{formatDateTime(sale.saleDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium">{`\u20B9${formatCurrency(sale.totalAmount)}`}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6" data-testid="text-no-recent-sales">
                No recent sales
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {stats?.expiryAlerts && stats.expiryAlerts.length > 0 && (
        <Card data-testid="card-expiry-alerts">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Expiry Alerts
            </CardTitle>
            <CardDescription>Items expiring within 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.expiryAlerts.map((item: any) => {
                  const daysLeft = getDaysUntilExpiry(item.expiryDate);
                  return (
                    <TableRow key={item.id} data-testid={`row-expiry-alert-${item.id}`}>
                      <TableCell className="font-medium">{item.product?.productName || "Unknown"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{item.batchNumber}</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                      <TableCell className="text-right">{item.quantityInStock}</TableCell>
                      <TableCell>
                        <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>
                          {daysLeft <= 0 ? "Expired" : `${daysLeft}d left`}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Link href="/sales" data-testid="link-quick-sales">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <ShoppingCart className="h-5 w-5" />
                New Sale
              </CardTitle>
              <CardDescription>
                Create a new bill for walk-in customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-muted-foreground">
                Go to Sales
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/online-orders" data-testid="link-quick-orders">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <ShoppingBag className="h-5 w-5" />
                Online Orders
              </CardTitle>
              <CardDescription>
                View and process customer online orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-muted-foreground">
                View Orders
              </span>
            </CardContent>
          </Card>
        </Link>

        <Link href="/inventory" data-testid="link-quick-inventory">
          <Card className="hover-elevate cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Package className="h-5 w-5" />
                Inventory
              </CardTitle>
              <CardDescription>
                Manage stock levels and batches
              </CardDescription>
            </CardHeader>
            <CardContent>
              <span className="text-sm font-medium text-muted-foreground">
                Manage Inventory
              </span>
            </CardContent>
          </Card>
        </Link>
      </div>

      {(Number(stats?.lowStockItems) > 0 || Number(stats?.expiringItems) > 0) && (
        <Card data-testid="card-attention-required">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 flex-wrap">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
              Attention Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {Number(stats?.lowStockItems) > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-low-stock-alert">
                <strong>{stats.lowStockItems}</strong> items are running low on stock
              </p>
            )}
            {Number(stats?.expiringItems) > 0 && (
              <p className="text-sm text-muted-foreground" data-testid="text-expiry-alert">
                <strong>{stats.expiringItems}</strong> items will expire within 30 days
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
