import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  FileText, TrendingUp, Package, Users, Receipt, AlertTriangle,
  Download, DollarSign, BarChart3, ShoppingCart, Percent, Archive
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";

function formatCurrency(val: string | number | null | undefined): string {
  const num = typeof val === "string" ? parseFloat(val) : (val ?? 0);
  return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getDateRange(preset: string): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();

  switch (preset) {
    case "today":
      break;
    case "week":
      start.setDate(start.getDate() - start.getDay());
      break;
    case "month":
      start.setDate(1);
      break;
    case "quarter": {
      const q = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(q, 1);
      break;
    }
    case "year":
      start.setMonth(0, 1);
      break;
    default:
      start.setDate(start.getDate() - 30);
  }

  return {
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
  };
}

type DatePreset = "today" | "week" | "month" | "quarter" | "year";

function QuickDateFilter({ active, onChange }: { active: DatePreset; onChange: (p: DatePreset) => void }) {
  const presets: { label: string; value: DatePreset }[] = [
    { label: "Today", value: "today" },
    { label: "This Week", value: "week" },
    { label: "This Month", value: "month" },
    { label: "This Quarter", value: "quarter" },
    { label: "This Year", value: "year" },
  ];

  return (
    <div className="flex gap-2 flex-wrap">
      {presets.map((p) => (
        <Button
          key={p.value}
          variant={active === p.value ? "default" : "outline"}
          size="sm"
          onClick={() => onChange(p.value)}
          data-testid={`button-date-${p.value}`}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}

function downloadCSV(filename: string, headers: string[], rows: string[][]) {
  const csvContent = [headers.join(","), ...rows.map((r) => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

function StatCard({ title, value, icon: Icon, subtitle }: { title: string; value: string | number; icon: any; subtitle?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
        <CardContent>
          <Skeleton className="h-40 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

function SalesReport() {
  const token = localStorage.getItem("pharmacy_token");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const { startDate, endDate } = getDateRange(datePreset);

  const { data: sales, isLoading } = useQuery<any[]>({
    queryKey: ["/api/sales", startDate, endDate],
    queryFn: async () => {
      const base = apiUrl("/api/sales");
      const url = `${base}?startDate=${encodeURIComponent(new Date(startDate).toISOString())}&endDate=${encodeURIComponent(new Date(endDate + "T23:59:59").toISOString())}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  const stats = useMemo(() => {
    if (!sales || sales.length === 0) return { totalRevenue: 0, totalTransactions: 0, avgBillValue: 0, dailySales: [] as any[], topProducts: [] as any[] };

    const totalRevenue = sales.reduce((sum: number, s: any) => sum + parseFloat(s.totalAmount || "0"), 0);
    const totalTransactions = sales.length;
    const avgBillValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

    const dailyMap: Record<string, { date: string; total: number; count: number }> = {};
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {};

    sales.forEach((s: any) => {
      const dateKey = new Date(s.saleDate).toISOString().slice(0, 10);
      if (!dailyMap[dateKey]) dailyMap[dateKey] = { date: dateKey, total: 0, count: 0 };
      dailyMap[dateKey].total += parseFloat(s.totalAmount || "0");
      dailyMap[dateKey].count += 1;

      (s.saleItems || []).forEach((si: any) => {
        const pName = si.product?.productName || `Product #${si.productId}`;
        if (!productMap[pName]) productMap[pName] = { name: pName, qty: 0, revenue: 0 };
        productMap[pName].qty += si.quantity;
        productMap[pName].revenue += parseFloat(si.totalAmount || "0");
      });
    });

    const dailySales = Object.values(dailyMap).sort((a, b) => b.date.localeCompare(a.date));
    const topProducts = Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

    return { totalRevenue, totalTransactions, avgBillValue, dailySales, topProducts };
  }, [sales]);

  const handleExport = useCallback(() => {
    downloadCSV("sales_report",
      ["Date", "Transactions", "Total Revenue", "Avg Bill"],
      stats.dailySales.map((d: any) => [d.date, String(d.count), d.total.toFixed(2), (d.count > 0 ? d.total / d.count : 0).toFixed(2)])
    );
  }, [stats]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <QuickDateFilter active={datePreset} onChange={setDatePreset} />
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-sales">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} data-testid="text-total-revenue" />
        <StatCard title="Total Bills" value={stats.totalTransactions} icon={Receipt} />
        <StatCard title="Avg Bill Value" value={formatCurrency(stats.avgBillValue)} icon={FileText} />
      </div>

      {stats.topProducts.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top 10 Products by Revenue</CardTitle></CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Qty Sold</TableHead>
                  <TableHead>Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topProducts.map((p: any, i: number) => (
                  <TableRow key={p.name} data-testid={`row-top-product-${i}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.qty}</TableCell>
                    <TableCell>{formatCurrency(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader><CardTitle>Daily Sales Summary</CardTitle></CardHeader>
        <CardContent>
          {stats.dailySales.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Transactions</TableHead>
                  <TableHead>Total Revenue</TableHead>
                  <TableHead>Avg Bill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.dailySales.map((day: any) => (
                  <TableRow key={day.date} data-testid={`row-daily-sales-${day.date}`}>
                    <TableCell className="font-medium">{formatDate(day.date)}</TableCell>
                    <TableCell>{day.count}</TableCell>
                    <TableCell>{formatCurrency(day.total)}</TableCell>
                    <TableCell>{formatCurrency(day.count > 0 ? day.total / day.count : 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No sales data for the selected period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function InventoryReport() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: inventoryItems, isLoading } = useQuery<any[]>({
    queryKey: ["/api/inventory-report"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
  });

  const stats = useMemo(() => {
    if (!inventoryItems || inventoryItems.length === 0)
      return { totalItems: 0, totalStockValue: 0, lowStockItems: [] as any[], expiringItems: [] as any[], deadStockItems: [] as any[] };

    const totalItems = inventoryItems.length;
    const totalStockValue = inventoryItems.reduce((sum: number, item: any) =>
      sum + (item.quantityInStock * parseFloat(item.mrp || "0")), 0);

    const lowStockItems = inventoryItems.filter((item: any) => item.quantityInStock <= item.reorderLevel && item.quantityInStock > 0);

    const now = new Date();
    const ninetyDaysFromNow = new Date();
    ninetyDaysFromNow.setDate(now.getDate() + 90);

    const expiringItems = inventoryItems
      .filter((item: any) => {
        const expiry = new Date(item.expiryDate);
        return expiry <= ninetyDaysFromNow && expiry >= now;
      })
      .sort((a: any, b: any) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

    const deadStockItems = inventoryItems.filter((item: any) => item.quantityInStock === 0);

    return { totalItems, totalStockValue, lowStockItems, expiringItems, deadStockItems };
  }, [inventoryItems]);

  const handleExport = useCallback(() => {
    if (!inventoryItems) return;
    downloadCSV("inventory_report",
      ["Product", "Batch", "Stock", "Reorder Level", "MRP", "Expiry Date", "Status"],
      inventoryItems.map((item: any) => {
        let status = "OK";
        if (item.quantityInStock === 0) status = "Out of Stock";
        else if (item.quantityInStock <= item.reorderLevel) status = "Low Stock";
        return [item.product?.productName || "N/A", item.batchNumber, String(item.quantityInStock), String(item.reorderLevel), String(item.mrp), item.expiryDate ? new Date(item.expiryDate).toISOString().slice(0, 10) : "", status];
      })
    );
  }, [inventoryItems]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-inventory">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total Stock Items" value={stats.totalItems} icon={Package} />
        <StatCard title="Total Stock Value" value={formatCurrency(stats.totalStockValue)} icon={DollarSign} />
        <StatCard title="Low Stock Items" value={stats.lowStockItems.length} icon={AlertTriangle} />
        <StatCard title="Expiry Risk Items" value={stats.expiringItems.length} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader><CardTitle>Low Stock Items</CardTitle></CardHeader>
        <CardContent>
          {stats.lowStockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Current Stock</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.lowStockItems.map((item: any) => (
                  <TableRow key={item.id} data-testid={`row-low-stock-${item.id}`}>
                    <TableCell className="font-medium">{item.product?.productName || "N/A"}</TableCell>
                    <TableCell>{item.batchNumber}</TableCell>
                    <TableCell>{item.quantityInStock}</TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">Low Stock</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No low stock items</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Expiring Items (Next 90 Days)</CardTitle></CardHeader>
        <CardContent>
          {stats.expiringItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry Date</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>Qty</TableHead>
                  <TableHead>MRP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.expiringItems.map((item: any) => {
                  const daysLeft = Math.floor((new Date(item.expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
                  return (
                    <TableRow key={item.id} data-testid={`row-expiring-${item.id}`}>
                      <TableCell className="font-medium">{item.product?.productName || "N/A"}</TableCell>
                      <TableCell>{item.batchNumber}</TableCell>
                      <TableCell>{formatDate(item.expiryDate)}</TableCell>
                      <TableCell>
                        <Badge variant={daysLeft <= 30 ? "destructive" : "secondary"} className="text-xs">{daysLeft} days</Badge>
                      </TableCell>
                      <TableCell>{item.quantityInStock}</TableCell>
                      <TableCell>{formatCurrency(item.mrp)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No items expiring within 90 days</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Dead Stock (Out of Stock)</CardTitle></CardHeader>
        <CardContent>
          {stats.deadStockItems.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>MRP</TableHead>
                  <TableHead>Reorder Level</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.deadStockItems.map((item: any) => (
                  <TableRow key={item.id} data-testid={`row-dead-stock-${item.id}`}>
                    <TableCell className="font-medium">{item.product?.productName || "N/A"}</TableCell>
                    <TableCell>{item.batchNumber}</TableCell>
                    <TableCell>{formatCurrency(item.mrp)}</TableCell>
                    <TableCell>{item.reorderLevel}</TableCell>
                    <TableCell><Badge variant="destructive" className="text-xs">Out of Stock</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No dead stock items</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CustomerReport() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: customerList, isLoading } = useQuery<any[]>({
    queryKey: ["/api/customers-report"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const stats = useMemo(() => {
    if (!customerList || customerList.length === 0)
      return { total: 0, tierBreakdown: {} as Record<string, number>, totalPurchaseValue: 0, newThisMonth: 0, topCustomers: [] as any[] };

    const total = customerList.length;
    const tierBreakdown: Record<string, number> = {};
    let totalPurchaseValue = 0;

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    let newThisMonth = 0;

    customerList.forEach((c: any) => {
      const tier = c.loyaltyTier || "BRONZE";
      tierBreakdown[tier] = (tierBreakdown[tier] || 0) + 1;
      totalPurchaseValue += parseFloat(c.totalPurchases || "0");
      if (new Date(c.createdAt) >= monthStart) newThisMonth++;
    });

    const topCustomers = [...customerList]
      .sort((a: any, b: any) => parseFloat(b.totalPurchases || "0") - parseFloat(a.totalPurchases || "0"))
      .slice(0, 10);

    return { total, tierBreakdown, totalPurchaseValue, newThisMonth, topCustomers };
  }, [customerList]);

  const handleExport = useCallback(() => {
    if (!customerList) return;
    downloadCSV("customers_report",
      ["Code", "Name", "Phone", "Loyalty Tier", "Points", "Total Purchases"],
      customerList.map((c: any) => [c.customerCode, c.customerName, c.phone, c.loyaltyTier, String(c.loyaltyPoints), String(c.totalPurchases || "0")])
    );
  }, [customerList]);

  const tierOrder = ["BRONZE", "SILVER", "GOLD", "PLATINUM"];

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-customers">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Customers" value={stats.total} icon={Users} />
        <StatCard title="New This Month" value={stats.newThisMonth} icon={Users} />
        <StatCard title="Total Purchase Value" value={formatCurrency(stats.totalPurchaseValue)} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader><CardTitle>Loyalty Tier Distribution</CardTitle></CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            {tierOrder.map((tier) => (
              <div key={tier} className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs" data-testid={`badge-tier-${tier.toLowerCase()}`}>
                  {tier}
                </Badge>
                <span className="text-sm font-medium">{stats.tierBreakdown[tier] || 0}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Top 10 Customers by Purchase</CardTitle></CardHeader>
        <CardContent>
          {stats.topCustomers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Loyalty Tier</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Total Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topCustomers.map((c: any, i: number) => (
                  <TableRow key={c.id} data-testid={`row-top-customer-${c.id}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{c.customerCode}</TableCell>
                    <TableCell>{c.customerName}</TableCell>
                    <TableCell>{c.phone}</TableCell>
                    <TableCell><Badge variant="secondary" className="text-xs">{c.loyaltyTier}</Badge></TableCell>
                    <TableCell>{c.loyaltyPoints}</TableCell>
                    <TableCell>{formatCurrency(c.totalPurchases)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No customers found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function GSTReport() {
  const token = localStorage.getItem("pharmacy_token");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const { startDate, endDate } = getDateRange(datePreset);

  const { data: sales, isLoading } = useQuery<any[]>({
    queryKey: ["/api/gst-report", startDate, endDate],
    queryFn: async () => {
      const base = apiUrl("/api/sales");
      const url = `${base}?startDate=${encodeURIComponent(new Date(startDate).toISOString())}&endDate=${encodeURIComponent(new Date(endDate + "T23:59:59").toISOString())}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  const gstStats = useMemo(() => {
    if (!sales || sales.length === 0)
      return { totalCGST: 0, totalSGST: 0, totalIGST: 0, totalGST: 0, totalTaxableValue: 0, invoices: [] as any[] };

    let totalCGST = 0, totalSGST = 0, totalIGST = 0, totalTaxableValue = 0;

    const invoices = sales.map((s: any) => {
      const cgst = parseFloat(s.cgst || "0");
      const sgst = parseFloat(s.sgst || "0");
      const igst = parseFloat(s.igst || "0");
      const subtotal = parseFloat(s.subtotal || "0");
      totalCGST += cgst;
      totalSGST += sgst;
      totalIGST += igst;
      totalTaxableValue += subtotal;
      return { id: s.id, invoiceNumber: s.invoiceNumber, saleDate: s.saleDate, subtotal, cgst, sgst, igst, totalAmount: parseFloat(s.totalAmount || "0") };
    });

    return { totalCGST, totalSGST, totalIGST, totalGST: totalCGST + totalSGST + totalIGST, totalTaxableValue, invoices };
  }, [sales]);

  const handleExport = useCallback(() => {
    downloadCSV("gst_report",
      ["Invoice #", "Date", "Taxable Value", "CGST", "SGST", "IGST", "Total"],
      gstStats.invoices.map((inv: any) => [inv.invoiceNumber, new Date(inv.saleDate).toISOString().slice(0, 10), inv.subtotal.toFixed(2), inv.cgst.toFixed(2), inv.sgst.toFixed(2), inv.igst.toFixed(2), inv.totalAmount.toFixed(2)])
    );
  }, [gstStats]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <QuickDateFilter active={datePreset} onChange={setDatePreset} />
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-gst">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard title="Total CGST" value={formatCurrency(gstStats.totalCGST)} icon={Receipt} />
        <StatCard title="Total SGST" value={formatCurrency(gstStats.totalSGST)} icon={Receipt} />
        <StatCard title="Total IGST" value={formatCurrency(gstStats.totalIGST)} icon={Receipt} />
        <StatCard title="Total GST" value={formatCurrency(gstStats.totalGST)} icon={DollarSign} />
      </div>

      <Card>
        <CardHeader><CardTitle>GST Invoice Details</CardTitle></CardHeader>
        <CardContent>
          {gstStats.invoices.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Taxable Value</TableHead>
                  <TableHead>CGST</TableHead>
                  <TableHead>SGST</TableHead>
                  <TableHead>IGST</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {gstStats.invoices.map((inv: any) => (
                  <TableRow key={inv.id} data-testid={`row-gst-invoice-${inv.id}`}>
                    <TableCell className="font-medium">{inv.invoiceNumber}</TableCell>
                    <TableCell>{formatDate(inv.saleDate)}</TableCell>
                    <TableCell>{formatCurrency(inv.subtotal)}</TableCell>
                    <TableCell>{formatCurrency(inv.cgst)}</TableCell>
                    <TableCell>{formatCurrency(inv.sgst)}</TableCell>
                    <TableCell>{formatCurrency(inv.igst)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(inv.totalAmount)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No sales data for the selected period</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function PurchasesReport() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: purchaseOrdersData, isLoading } = useQuery<any[]>({
    queryKey: ["/api/purchase-orders-report"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/purchase-orders"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return response.json();
    },
  });

  const stats = useMemo(() => {
    if (!purchaseOrdersData || purchaseOrdersData.length === 0)
      return { totalPOs: 0, totalValue: 0, statusBreakdown: {} as Record<string, number>, supplierBreakdown: [] as any[] };

    const totalPOs = purchaseOrdersData.length;
    const totalValue = purchaseOrdersData.reduce((sum: number, po: any) => sum + parseFloat(po.totalAmount || "0"), 0);

    const statusBreakdown: Record<string, number> = {};
    const supplierMap: Record<string, { name: string; count: number; total: number }> = {};

    purchaseOrdersData.forEach((po: any) => {
      const status = po.status || "UNKNOWN";
      statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;

      const supplierName = po.supplier?.supplierName || "Unknown";
      if (!supplierMap[supplierName]) supplierMap[supplierName] = { name: supplierName, count: 0, total: 0 };
      supplierMap[supplierName].count += 1;
      supplierMap[supplierName].total += parseFloat(po.totalAmount || "0");
    });

    const supplierBreakdown = Object.values(supplierMap).sort((a, b) => b.total - a.total);

    return { totalPOs, totalValue, statusBreakdown, supplierBreakdown };
  }, [purchaseOrdersData]);

  const handleExport = useCallback(() => {
    if (!purchaseOrdersData) return;
    downloadCSV("purchases_report",
      ["PO #", "Supplier", "Order Date", "Status", "Total Amount"],
      purchaseOrdersData.map((po: any) => [po.poNumber, po.supplier?.supplierName || "N/A", new Date(po.orderDate).toISOString().slice(0, 10), po.status, String(po.totalAmount)])
    );
  }, [purchaseOrdersData]);

  if (isLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-purchases">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Total Purchase Orders" value={stats.totalPOs} icon={ShoppingCart} />
        <StatCard title="Total Purchase Value" value={formatCurrency(stats.totalValue)} icon={DollarSign} />
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status Breakdown</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2 flex-wrap">
              {Object.entries(stats.statusBreakdown).map(([status, count]) => (
                <Badge key={status} variant="secondary" className="text-xs" data-testid={`badge-po-status-${status.toLowerCase()}`}>
                  {status}: {count}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Supplier-wise Breakdown</CardTitle></CardHeader>
        <CardContent>
          {stats.supplierBreakdown.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Orders</TableHead>
                  <TableHead>Total Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.supplierBreakdown.map((s: any) => (
                  <TableRow key={s.name} data-testid={`row-supplier-${s.name}`}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{s.count}</TableCell>
                    <TableCell>{formatCurrency(s.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No purchase orders found</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ProfitMarginReport() {
  const token = localStorage.getItem("pharmacy_token");
  const [datePreset, setDatePreset] = useState<DatePreset>("month");
  const { startDate, endDate } = getDateRange(datePreset);

  const { data: sales, isLoading: salesLoading } = useQuery<any[]>({
    queryKey: ["/api/profit-sales", startDate, endDate],
    queryFn: async () => {
      const base = apiUrl("/api/sales");
      const url = `${base}?startDate=${encodeURIComponent(new Date(startDate).toISOString())}&endDate=${encodeURIComponent(new Date(endDate + "T23:59:59").toISOString())}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  const { data: inventoryItems } = useQuery<any[]>({
    queryKey: ["/api/inventory-for-profit"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
  });

  const stats = useMemo(() => {
    if (!sales || sales.length === 0)
      return { totalRevenue: 0, totalCost: 0, grossProfit: 0, marginPercent: 0, topProfitableProducts: [] as any[] };

    const costMap: Record<number, number> = {};
    if (inventoryItems) {
      inventoryItems.forEach((inv: any) => {
        costMap[inv.productId] = parseFloat(inv.purchasePrice || "0");
      });
    }

    let totalRevenue = 0;
    let totalCost = 0;
    const productProfitMap: Record<string, { name: string; revenue: number; cost: number; profit: number }> = {};

    sales.forEach((s: any) => {
      (s.saleItems || []).forEach((si: any) => {
        const revenue = parseFloat(si.totalAmount || "0");
        const unitCost = costMap[si.productId] || parseFloat(si.unitPrice || "0") * 0.7;
        const cost = unitCost * si.quantity;
        totalRevenue += revenue;
        totalCost += cost;

        const pName = si.product?.productName || `Product #${si.productId}`;
        if (!productProfitMap[pName]) productProfitMap[pName] = { name: pName, revenue: 0, cost: 0, profit: 0 };
        productProfitMap[pName].revenue += revenue;
        productProfitMap[pName].cost += cost;
        productProfitMap[pName].profit += (revenue - cost);
      });
    });

    const grossProfit = totalRevenue - totalCost;
    const marginPercent = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    const topProfitableProducts = Object.values(productProfitMap)
      .sort((a, b) => b.profit - a.profit)
      .slice(0, 10);

    return { totalRevenue, totalCost, grossProfit, marginPercent, topProfitableProducts };
  }, [sales, inventoryItems]);

  const handleExport = useCallback(() => {
    downloadCSV("profit_margin_report",
      ["Product", "Revenue", "Cost", "Profit", "Margin %"],
      stats.topProfitableProducts.map((p: any) => [
        p.name, p.revenue.toFixed(2), p.cost.toFixed(2), p.profit.toFixed(2),
        (p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0") + "%"
      ])
    );
  }, [stats]);

  if (salesLoading) return <LoadingSkeleton />;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <QuickDateFilter active={datePreset} onChange={setDatePreset} />
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="button-export-profit">
          <Download className="h-4 w-4 mr-2" /> Export Excel
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatCard title="Gross Profit" value={formatCurrency(stats.grossProfit)} icon={DollarSign} />
        <StatCard title="Profit Margin" value={`${stats.marginPercent.toFixed(1)}%`} icon={Percent} />
        <StatCard title="Total Revenue" value={formatCurrency(stats.totalRevenue)} icon={TrendingUp} subtitle={`Cost: ${formatCurrency(stats.totalCost)}`} />
      </div>

      <Card>
        <CardHeader><CardTitle>Top Profitable Products</CardTitle></CardHeader>
        <CardContent>
          {stats.topProfitableProducts.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Product</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Profit</TableHead>
                  <TableHead>Margin %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.topProfitableProducts.map((p: any, i: number) => (
                  <TableRow key={p.name} data-testid={`row-profitable-${i}`}>
                    <TableCell>{i + 1}</TableCell>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{formatCurrency(p.revenue)}</TableCell>
                    <TableCell>{formatCurrency(p.cost)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(p.profit)}</TableCell>
                    <TableCell>
                      <Badge variant={p.revenue > 0 && (p.profit / p.revenue) * 100 > 20 ? "default" : "secondary"} className="text-xs">
                        {p.revenue > 0 ? ((p.profit / p.revenue) * 100).toFixed(1) : "0"}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No sales data for profit calculation</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function Reports() {
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-reports-title">Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">View detailed analytics and export data</p>
      </div>

      <Tabs defaultValue="sales" className="w-full">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="sales" data-testid="tab-sales" className="gap-1">
            <TrendingUp className="h-4 w-4" /> Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" data-testid="tab-inventory" className="gap-1">
            <Package className="h-4 w-4" /> Inventory
          </TabsTrigger>
          <TabsTrigger value="customers" data-testid="tab-customers" className="gap-1">
            <Users className="h-4 w-4" /> Customers
          </TabsTrigger>
          <TabsTrigger value="gst" data-testid="tab-gst" className="gap-1">
            <Receipt className="h-4 w-4" /> GST
          </TabsTrigger>
          <TabsTrigger value="purchases" data-testid="tab-purchases" className="gap-1">
            <ShoppingCart className="h-4 w-4" /> Purchases
          </TabsTrigger>
          <TabsTrigger value="profit" data-testid="tab-profit" className="gap-1">
            <Percent className="h-4 w-4" /> Profit & Margin
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales" className="mt-4">
          <SalesReport />
        </TabsContent>
        <TabsContent value="inventory" className="mt-4">
          <InventoryReport />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <CustomerReport />
        </TabsContent>
        <TabsContent value="gst" className="mt-4">
          <GSTReport />
        </TabsContent>
        <TabsContent value="purchases" className="mt-4">
          <PurchasesReport />
        </TabsContent>
        <TabsContent value="profit" className="mt-4">
          <ProfitMarginReport />
        </TabsContent>
      </Tabs>
    </div>
  );
}
