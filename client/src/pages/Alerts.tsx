import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Package, Clock, ShieldAlert } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";

export default function Alerts() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: expiryAlerts, isLoading: expiryLoading } = useQuery({
    queryKey: ["alerts-expiry"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/alerts/expiry"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const { data: stockAlerts, isLoading: stockLoading } = useQuery({
    queryKey: ["alerts-stock"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/alerts/stock"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Alerts</h1>
        <p className="text-muted-foreground text-sm">Expiry and low stock alerts</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />Expiring Soon
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{expiryAlerts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="h-4 w-4" />Low Stock
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stockAlerts?.length || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <ShieldAlert className="h-4 w-4" />Total Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(expiryAlerts?.length || 0) + (stockAlerts?.length || 0)}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="expiry">
        <TabsList>
          <TabsTrigger value="expiry">
            Expiry Alerts {expiryAlerts?.length ? <Badge className="ml-2 h-5" variant="destructive">{expiryAlerts.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="stock">
            Stock Alerts {stockAlerts?.length ? <Badge className="ml-2 h-5" variant="secondary">{stockAlerts.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expiry" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {expiryLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : expiryAlerts && expiryAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch Number</TableHead>
                      <TableHead>Expiry Date</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Alert Level</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expiryAlerts.map((a: any) => (
                      <TableRow key={a.id} data-testid={`row-expiry-alert-${a.id}`}>
                        <TableCell className="font-medium">{a.product?.productName || "-"}</TableCell>
                        <TableCell className="font-mono text-sm">{a.batchNumber}</TableCell>
                        <TableCell>{new Date(a.expiryDate).toLocaleDateString()}</TableCell>
                        <TableCell>{a.quantityInStock}</TableCell>
                        <TableCell>
                          <Badge variant={a.alertLevel === "CRITICAL" ? "destructive" : a.alertLevel === "WARNING" ? "secondary" : "default"}>
                            {a.alertLevel}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <AlertTriangle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No expiry alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {stockLoading ? (
                <p className="text-center py-8 text-muted-foreground">Loading...</p>
              ) : stockAlerts && stockAlerts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Reorder Level</TableHead>
                      <TableHead>Alert Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockAlerts.map((a: any) => (
                      <TableRow key={a.id} data-testid={`row-stock-alert-${a.id}`}>
                        <TableCell className="font-medium">{a.product?.productName || "-"}</TableCell>
                        <TableCell className={a.currentStock === 0 ? "text-red-600 font-bold" : ""}>{a.currentStock}</TableCell>
                        <TableCell>{a.reorderLevel}</TableCell>
                        <TableCell>
                          <Badge variant={a.alertType === "OUT_OF_STOCK" ? "destructive" : "secondary"}>
                            {a.alertType === "OUT_OF_STOCK" ? "Out of Stock" : "Low Stock"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No stock alerts</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
