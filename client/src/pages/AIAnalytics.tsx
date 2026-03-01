import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Brain, TrendingUp, AlertTriangle, Users, Package, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

export default function AIAnalytics() {
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();
  const [selectedProduct, setSelectedProduct] = useState("");

  const { data: health } = useQuery({
    queryKey: ["ai-health"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/ai/health"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return { available: false };
      return res.json();
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const expiryMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/ai/predict/expiry-risk"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const demandMutation = useMutation({
    mutationFn: async (productId: number) => {
      const res = await fetch(apiUrl("/api/ai/predict/demand"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ productId, forecastDays: 30 }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const segmentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/ai/segment/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const trendsMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(apiUrl("/api/ai/analyze/sales-trends"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ period: "monthly" }),
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">AI Analytics</h1>
        <p className="text-muted-foreground text-sm">AI-powered insights for your pharmacy</p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <Brain className="h-6 w-6 text-primary" />
            <div>
              <div className="font-medium">AI Service Status</div>
              <div className="flex items-center gap-2 mt-1">
                {health?.available ? (
                  <>
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm text-green-600">Online - {health.service}</span>
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm text-red-600">Offline</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="expiry">
        <TabsList>
          <TabsTrigger value="expiry">Expiry Risk</TabsTrigger>
          <TabsTrigger value="demand">Demand Forecast</TabsTrigger>
          <TabsTrigger value="segments">Customer Segments</TabsTrigger>
          <TabsTrigger value="trends">Sales Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="expiry" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Expiry Risk Analysis
                  </CardTitle>
                  <CardDescription>AI-scored risk assessment for all inventory batches</CardDescription>
                </div>
                <Button
                  onClick={() => expiryMutation.mutate()}
                  disabled={expiryMutation.isPending}
                  data-testid="button-run-expiry"
                >
                  {expiryMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : "Run Analysis"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {expiryMutation.data?.batches ? (
                <>
                  <div className="grid gap-4 md:grid-cols-3 mb-6">
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">High Risk</div><div className="text-2xl font-bold text-red-600">{expiryMutation.data.summary?.high_risk || 0}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Medium Risk</div><div className="text-2xl font-bold text-yellow-600">{expiryMutation.data.summary?.medium_risk || 0}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Low Risk</div><div className="text-2xl font-bold text-green-600">{expiryMutation.data.summary?.low_risk || 0}</div></CardContent></Card>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Expiry Date</TableHead>
                        <TableHead>Days Left</TableHead>
                        <TableHead>Stock</TableHead>
                        <TableHead>Risk Score</TableHead>
                        <TableHead>Risk Level</TableHead>
                        <TableHead>Recommendations</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {expiryMutation.data.batches.map((b: any, i: number) => (
                        <TableRow key={i} data-testid={`row-expiry-${i}`}>
                          <TableCell className="font-mono text-sm">{b.batch_number}</TableCell>
                          <TableCell className="font-medium">{b.product_name}</TableCell>
                          <TableCell>{b.expiry_date}</TableCell>
                          <TableCell className="font-mono">{b.days_until_expiry}</TableCell>
                          <TableCell>{b.quantity_in_stock}</TableCell>
                          <TableCell className="font-bold">{(b.risk_score * 100).toFixed(0)}%</TableCell>
                          <TableCell>
                            <Badge variant={b.risk_level === "HIGH" ? "destructive" : b.risk_level === "MEDIUM" ? "secondary" : "default"}>
                              {b.risk_level}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs max-w-xs">{b.recommendations?.join("; ")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Click "Run Analysis" to generate expiry risk scores</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="demand" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Demand Forecasting
              </CardTitle>
              <CardDescription>Predict future demand for products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4 mb-6">
                <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                  <SelectTrigger className="w-[300px]" data-testid="select-product-demand">
                    <SelectValue placeholder="Select a product" />
                  </SelectTrigger>
                  <SelectContent>
                    {products?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id.toString()}>{p.productName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => selectedProduct && demandMutation.mutate(parseInt(selectedProduct))}
                  disabled={!selectedProduct || demandMutation.isPending}
                  data-testid="button-run-demand"
                >
                  {demandMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Forecasting...</> : "Forecast"}
                </Button>
              </div>
              {demandMutation.data ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Avg Daily Demand</div><div className="text-2xl font-bold">{demandMutation.data.summary?.avg_daily_demand?.toFixed(1) || 0}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">30-Day Forecast</div><div className="text-2xl font-bold">{demandMutation.data.summary?.total_forecast?.toFixed(0) || 0}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Recommended Reorder</div><div className="text-2xl font-bold">{demandMutation.data.summary?.recommended_reorder_qty?.toFixed(0) || 0}</div></CardContent></Card>
                  </div>
                  {demandMutation.data.summary?.message && (
                    <p className="text-sm text-muted-foreground">{demandMutation.data.summary.message}</p>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Select a product and click "Forecast" to predict demand</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Customer Segmentation</CardTitle>
                  <CardDescription>RFM-based customer segments using K-Means clustering</CardDescription>
                </div>
                <Button onClick={() => segmentMutation.mutate()} disabled={segmentMutation.isPending} data-testid="button-run-segments">
                  {segmentMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Segmenting...</> : "Run Segmentation"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {segmentMutation.data?.customers ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer</TableHead>
                      <TableHead>Segment</TableHead>
                      <TableHead>Recency (days)</TableHead>
                      <TableHead>Frequency</TableHead>
                      <TableHead>Monetary</TableHead>
                      <TableHead>Recommendations</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {segmentMutation.data.customers.map((c: any) => (
                      <TableRow key={c.customer_id} data-testid={`row-segment-${c.customer_id}`}>
                        <TableCell className="font-medium">{c.customer_name}</TableCell>
                        <TableCell>
                          <Badge variant={c.segment === "Champions" || c.segment === "Loyal" ? "default" : c.segment === "Lost" || c.segment === "At Risk" ? "destructive" : "secondary"}>
                            {c.segment}
                          </Badge>
                        </TableCell>
                        <TableCell>{c.rfm_scores?.recency_days}</TableCell>
                        <TableCell>{c.rfm_scores?.frequency}</TableCell>
                        <TableCell>₹{c.rfm_scores?.monetary?.toFixed(0)}</TableCell>
                        <TableCell className="text-xs max-w-xs">{c.recommendations?.slice(0, 2).join("; ")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Click "Run Segmentation" to analyze customers</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" />Sales Trend Analysis</CardTitle>
                  <CardDescription>Linear regression and seasonal analysis</CardDescription>
                </div>
                <Button onClick={() => trendsMutation.mutate()} disabled={trendsMutation.isPending} data-testid="button-run-trends">
                  {trendsMutation.isPending ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Analyzing...</> : "Analyze Trends"}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {trendsMutation.data ? (
                <div className="space-y-4">
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Trend Direction</div><div className="text-2xl font-bold capitalize">{trendsMutation.data.trend?.direction || "N/A"}</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Growth Rate</div><div className="text-2xl font-bold">{trendsMutation.data.trend?.growth_rate_pct?.toFixed(1) || 0}%</div></CardContent></Card>
                    <Card><CardContent className="pt-4"><div className="text-sm text-muted-foreground">Total Revenue</div><div className="text-2xl font-bold">₹{trendsMutation.data.summary?.total_revenue?.toFixed(0) || 0}</div></CardContent></Card>
                  </div>
                  {trendsMutation.data.periods && trendsMutation.data.periods.length > 0 && (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Revenue</TableHead>
                          <TableHead>Transactions</TableHead>
                          <TableHead>Avg Transaction</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {trendsMutation.data.periods.map((p: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{p.period}</TableCell>
                            <TableCell>₹{p.total_revenue?.toFixed(0)}</TableCell>
                            <TableCell>{p.transaction_count}</TableCell>
                            <TableCell>₹{p.avg_transaction?.toFixed(0)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              ) : (
                <p className="text-center py-8 text-muted-foreground">Click "Analyze Trends" to see sales patterns</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
