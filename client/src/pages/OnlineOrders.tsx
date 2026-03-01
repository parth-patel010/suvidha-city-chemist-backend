import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ShoppingBag, CheckCircle, Truck, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

export default function OnlineOrders() {
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["online-orders", statusFilter],
    queryFn: async () => {
      const base = apiUrl("/api/online-orders");
      const url = statusFilter !== "ALL" ? `${base}?status=${encodeURIComponent(statusFilter)}` : base;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch orders");
      return response.json();
    },
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ["online-orders", selectedOrder?.id],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/online-orders/${selectedOrder.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch order details");
      return response.json();
    },
    enabled: !!selectedOrder?.id && viewDialogOpen,
  });

  const confirmMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(apiUrl(`/api/online-orders/${orderId}/confirm`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to confirm order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online-orders"] });
      toast({ title: "Order confirmed successfully" });
    },
  });

  const dispatchMutation = useMutation({
    mutationFn: async (orderId: number) => {
      const response = await fetch(apiUrl(`/api/online-orders/${orderId}/dispatch`), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to dispatch order");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["online-orders"] });
      toast({ title: "Order dispatched successfully" });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      PENDING: { variant: "secondary", label: "Pending" },
      CONFIRMED: { variant: "default", label: "Confirmed" },
      PROCESSING: { variant: "default", label: "Processing" },
      READY: { variant: "default", label: "Ready" },
      DISPATCHED: { variant: "default", label: "Dispatched" },
      DELIVERED: { variant: "default", label: "Delivered" },
      CANCELLED: { variant: "destructive", label: "Cancelled" },
    };
    return variants[status] || variants.PENDING;
  };

  const totalItems = orders?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = orders?.slice(startIndex, startIndex + pageSize) || [];

  const openViewDialog = (order: any) => {
    setSelectedOrder(order);
    setViewDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-online-orders-title">Online Orders</h1>
        <p className="text-muted-foreground">
          Manage customer online orders from portal
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-pending-count">
              {orders?.filter((o: any) => o.status === "PENDING").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              To Confirm
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-to-confirm-count">
              {orders?.filter((o: any) => o.status === "PENDING" || o.status === "CONFIRMED").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready to Dispatch
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-dispatch-count">
              {orders?.filter((o: any) => o.status === "CONFIRMED" || o.status === "READY").length || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-total-revenue">
              ₹{orders?.reduce((sum: number, o: any) => sum + parseFloat(o.totalAmount), 0).toFixed(2) || '0.00'}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <Tabs value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
            <TabsList>
              <TabsTrigger value="PENDING" data-testid="tab-pending">Pending</TabsTrigger>
              <TabsTrigger value="CONFIRMED" data-testid="tab-confirmed">Confirmed</TabsTrigger>
              <TabsTrigger value="DISPATCHED" data-testid="tab-dispatched">Dispatched</TabsTrigger>
              <TabsTrigger value="DELIVERED" data-testid="tab-delivered">Delivered</TabsTrigger>
              <TabsTrigger value="ALL" data-testid="tab-all">All</TabsTrigger>
            </TabsList>
          </Tabs>
          {totalItems > 0 && (
            <span className="text-sm text-muted-foreground" data-testid="text-record-count">
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} orders
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading orders...</p>
          ) : orders && orders.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Delivery Address</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedOrders.map((order: any) => {
                    const statusBadge = getStatusBadge(order.status);
                    return (
                      <TableRow key={order.id} data-testid={`row-order-${order.id}`}>
                        <TableCell className="font-mono text-sm font-medium" data-testid={`text-order-number-${order.id}`}>
                          {order.orderNumber}
                        </TableCell>
                        <TableCell>
                          {new Date(order.orderDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{order.customer?.customerName}</div>
                            <div className="text-sm text-muted-foreground font-mono">
                              {order.contactPhone}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {order.orderItems?.length || 0} items
                        </TableCell>
                        <TableCell className="font-bold">
                          ₹{parseFloat(order.totalAmount).toFixed(2)}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="text-sm truncate">{order.deliveryAddress}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.deliveryCity}, {order.deliveryPincode}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusBadge.variant}>
                            {statusBadge.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-view-order-${order.id}`}
                                  onClick={() => openViewDialog(order)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            {order.status === "PENDING" && (
                              <Button
                                size="sm"
                                onClick={() => confirmMutation.mutate(order.id)}
                                disabled={confirmMutation.isPending}
                                data-testid={`button-confirm-order-${order.id}`}
                              >
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Confirm
                              </Button>
                            )}
                            {order.status === "CONFIRMED" && (
                              <Button
                                size="sm"
                                onClick={() => dispatchMutation.mutate(order.id)}
                                disabled={dispatchMutation.isPending}
                                data-testid={`button-dispatch-order-${order.id}`}
                              >
                                <Truck className="h-3 w-3 mr-1" />
                                Dispatch
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px]" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No orders found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
          </DialogHeader>
          {detailLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading order details...</p>
          ) : (orderDetail || selectedOrder) && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Order Number</Label>
                  <p className="font-mono font-medium" data-testid="text-detail-order-number">{(orderDetail || selectedOrder)?.orderNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div>
                    <Badge variant={getStatusBadge((orderDetail || selectedOrder)?.status).variant} data-testid="badge-detail-status">
                      {getStatusBadge((orderDetail || selectedOrder)?.status).label}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Order Date</Label>
                  <p data-testid="text-detail-date">{new Date((orderDetail || selectedOrder)?.orderDate).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Customer</Label>
                  <p data-testid="text-detail-customer">{(orderDetail || selectedOrder)?.customer?.customerName}</p>
                  <p className="text-sm text-muted-foreground">{(orderDetail || selectedOrder)?.contactPhone}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground text-xs">Delivery Address</Label>
                  <p data-testid="text-detail-address">
                    {(orderDetail || selectedOrder)?.deliveryAddress}, {(orderDetail || selectedOrder)?.deliveryCity}, {(orderDetail || selectedOrder)?.deliveryPincode}
                  </p>
                </div>
              </div>

              {(orderDetail || selectedOrder)?.orderItems && (orderDetail || selectedOrder).orderItems.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">GST %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(orderDetail || selectedOrder).orderItems.map((item: any, idx: number) => (
                        <TableRow key={idx} data-testid={`row-detail-item-${idx}`}>
                          <TableCell>{item.product?.productName || `Product #${item.productId}`}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">₹{parseFloat(item.unitPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{item.gstPercentage}%</TableCell>
                          <TableCell className="text-right font-medium">₹{parseFloat(item.totalAmount).toFixed(2)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex justify-end">
                <div className="space-y-1 text-sm w-64">
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span data-testid="text-detail-subtotal">₹{parseFloat((orderDetail || selectedOrder)?.subtotal || "0").toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">GST:</span>
                    <span data-testid="text-detail-gst">₹{parseFloat((orderDetail || selectedOrder)?.gstAmount || "0").toFixed(2)}</span>
                  </div>
                  {parseFloat((orderDetail || selectedOrder)?.deliveryCharge || "0") > 0 && (
                    <div className="flex justify-between gap-4">
                      <span className="text-muted-foreground">Delivery:</span>
                      <span>₹{parseFloat((orderDetail || selectedOrder)?.deliveryCharge || "0").toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between gap-4 font-semibold text-base border-t pt-1">
                    <span>Total:</span>
                    <span data-testid="text-detail-total">₹{parseFloat((orderDetail || selectedOrder)?.totalAmount || "0").toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
