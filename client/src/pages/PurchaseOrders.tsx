import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { ClipboardList, Plus, Search, Eye, Pencil, Trash2, CheckCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";

interface POItem {
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
  gstPercentage: number;
  totalAmount: number;
}

export default function PurchaseOrders() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);
  const [newStatus, setNewStatus] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();

  const [supplierId, setSupplierId] = useState("");
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<POItem[]>([]);
  const [currentProductId, setCurrentProductId] = useState("");
  const [currentQuantity, setCurrentQuantity] = useState("");
  const [currentUnitPrice, setCurrentUnitPrice] = useState("");
  const [currentGstPercentage, setCurrentGstPercentage] = useState("18");

  const { data: purchaseOrdersList, isLoading } = useQuery({
    queryKey: ["purchase-orders"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/purchase-orders"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch purchase orders");
      return response.json();
    },
  });

  const { data: suppliersList } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/suppliers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  });

  const { data: productsList } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const filteredOrders = purchaseOrdersList?.filter((po: any) => {
    const matchesTab = activeTab === "ALL" || po.status === activeTab;
    if (!matchesTab) return false;
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      po.poNumber.toLowerCase().includes(term) ||
      po.supplier?.supplierName?.toLowerCase().includes(term)
    );
  });

  const totalItems = filteredOrders?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedOrders = filteredOrders?.slice(startIndex, startIndex + pageSize) || [];

  const resetForm = () => {
    setSupplierId("");
    setExpectedDeliveryDate("");
    setNotes("");
    setItems([]);
    setCurrentProductId("");
    setCurrentQuantity("");
    setCurrentUnitPrice("");
    setCurrentGstPercentage("18");
  };

  const addItem = () => {
    if (!currentProductId || !currentQuantity || !currentUnitPrice) return;
    const product = productsList?.find(
      (p: any) => p.id === parseInt(currentProductId)
    );
    if (!product) return;

    const qty = parseInt(currentQuantity);
    const price = parseFloat(currentUnitPrice);
    const gst = parseFloat(currentGstPercentage);
    const baseTotal = qty * price;
    const gstAmount = baseTotal * (gst / 100);
    const total = baseTotal + gstAmount;

    setItems((prev) => [
      ...prev,
      {
        productId: parseInt(currentProductId),
        productName: product.productName,
        quantity: qty,
        unitPrice: price,
        gstPercentage: gst,
        totalAmount: total,
      },
    ]);
    setCurrentProductId("");
    setCurrentQuantity("");
    setCurrentUnitPrice("");
    setCurrentGstPercentage("18");
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );
  const gstTotal = items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice * (item.gstPercentage / 100);
  }, 0);
  const grandTotal = subtotal + gstTotal;

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiUrl("/api/purchase-orders"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order created successfully" });
      setDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to create purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const response = await fetch(apiUrl(`/api/purchase-orders/${id}/status`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order status updated" });
      setStatusDialogOpen(false);
      setSelectedPO(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(apiUrl(`/api/purchase-orders/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
      toast({ title: "Purchase order deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedPO(null);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to delete purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      toast({
        title: "Please select a supplier and add at least one item",
        variant: "destructive",
      });
      return;
    }

    const payload: any = {
      supplierId: parseInt(supplierId),
      subtotal: subtotal.toFixed(2),
      gstAmount: gstTotal.toFixed(2),
      totalAmount: grandTotal.toFixed(2),
      notes: notes || undefined,
      status: "DRAFT",
      items: items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        gstPercentage: item.gstPercentage.toFixed(2),
        totalAmount: item.totalAmount.toFixed(2),
      })),
    };

    if (expectedDeliveryDate) {
      payload.expectedDeliveryDate = new Date(expectedDeliveryDate);
    }

    createMutation.mutate(payload);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "secondary";
      case "ORDERED":
        return "default";
      case "RECEIVED":
        return "outline";
      case "CANCELLED":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `₹${num.toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const openViewDialog = (po: any) => {
    setSelectedPO(po);
    setViewDialogOpen(true);
  };

  const openStatusDialog = (po: any) => {
    setSelectedPO(po);
    setNewStatus(po.status);
    setStatusDialogOpen(true);
  };

  const openDeleteDialog = (po: any) => {
    setSelectedPO(po);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 data-testid="text-page-title" className="text-3xl font-bold">
            Purchase Orders
          </h1>
          <p className="text-muted-foreground">
            Manage purchase orders from suppliers
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-po">
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Purchase Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Supplier *</Label>
                  <Select
                    value={supplierId}
                    onValueChange={setSupplierId}
                  >
                    <SelectTrigger data-testid="select-supplier">
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliersList?.map((s: any) => (
                        <SelectItem
                          key={s.id}
                          value={s.id.toString()}
                        >
                          {s.supplierName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expectedDeliveryDate">
                    Expected Delivery Date
                  </Label>
                  <Input
                    id="expectedDeliveryDate"
                    data-testid="input-delivery-date"
                    type="date"
                    value={expectedDeliveryDate}
                    onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  data-testid="input-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="resize-none"
                />
              </div>

              <div className="space-y-4">
                <Label className="text-base font-semibold">Order Items</Label>
                <div className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-4 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Product
                    </Label>
                    <Select
                      value={currentProductId}
                      onValueChange={setCurrentProductId}
                    >
                      <SelectTrigger data-testid="select-product">
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {productsList?.map((p: any) => (
                          <SelectItem
                            key={p.id}
                            value={p.id.toString()}
                          >
                            {p.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">Qty</Label>
                    <Input
                      data-testid="input-item-quantity"
                      type="number"
                      min="1"
                      placeholder="0"
                      value={currentQuantity}
                      onChange={(e) => setCurrentQuantity(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      Unit Price
                    </Label>
                    <Input
                      data-testid="input-item-price"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={currentUnitPrice}
                      onChange={(e) => setCurrentUnitPrice(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs text-muted-foreground">
                      GST %
                    </Label>
                    <Input
                      data-testid="input-item-gst"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="18"
                      value={currentGstPercentage}
                      onChange={(e) => setCurrentGstPercentage(e.target.value)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Button
                      type="button"
                      variant="outline"
                      data-testid="button-add-item"
                      onClick={addItem}
                      className="w-full"
                    >
                      Add
                    </Button>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Product</TableHead>
                          <TableHead className="text-right">Qty</TableHead>
                          <TableHead className="text-right">
                            Unit Price
                          </TableHead>
                          <TableHead className="text-right">GST %</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((item, idx) => (
                          <TableRow
                            key={idx}
                            data-testid={`row-po-item-${idx}`}
                          >
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="text-right">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.unitPrice)}
                            </TableCell>
                            <TableCell className="text-right">
                              {item.gstPercentage}%
                            </TableCell>
                            <TableCell className="text-right">
                              {formatCurrency(item.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                data-testid={`button-remove-item-${idx}`}
                                onClick={() => removeItem(idx)}
                                className="text-destructive"
                              >
                                Remove
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex justify-end mt-4">
                      <div className="space-y-1 text-sm w-64">
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">
                            Subtotal:
                          </span>
                          <span data-testid="text-subtotal">
                            {formatCurrency(subtotal)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span className="text-muted-foreground">GST:</span>
                          <span data-testid="text-gst">
                            {formatCurrency(gstTotal)}
                          </span>
                        </div>
                        <div className="flex justify-between gap-4 font-semibold text-base border-t pt-1">
                          <span>Total:</span>
                          <span data-testid="text-total">
                            {formatCurrency(grandTotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  data-testid="button-cancel"
                  onClick={() => {
                    setDialogOpen(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  data-testid="button-submit-po"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending
                    ? "Creating..."
                    : "Create Purchase Order"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
        <TabsList>
          <TabsTrigger value="ALL" data-testid="tab-all">
            All
          </TabsTrigger>
          <TabsTrigger value="DRAFT" data-testid="tab-draft">
            Draft
          </TabsTrigger>
          <TabsTrigger value="ORDERED" data-testid="tab-ordered">
            Ordered
          </TabsTrigger>
          <TabsTrigger value="RECEIVED" data-testid="tab-received">
            Received
          </TabsTrigger>
          <TabsTrigger value="CANCELLED" data-testid="tab-cancelled">
            Cancelled
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    data-testid="input-search"
                    placeholder="Search by PO number or supplier..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="pl-10"
                  />
                </div>
                {totalItems > 0 && (
                  <span className="text-sm text-muted-foreground" data-testid="text-record-count">
                    Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} orders
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-center py-8 text-muted-foreground">
                  Loading purchase orders...
                </p>
              ) : filteredOrders && filteredOrders.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>PO Number</TableHead>
                          <TableHead>Supplier</TableHead>
                          <TableHead>Order Date</TableHead>
                          <TableHead>Expected Delivery</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Items</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedOrders.map((po: any) => (
                          <TableRow
                            key={po.id}
                            data-testid={`row-po-${po.id}`}
                          >
                            <TableCell
                              className="font-mono text-sm"
                              data-testid={`text-po-number-${po.id}`}
                            >
                              {po.poNumber}
                            </TableCell>
                            <TableCell
                              className="font-medium"
                              data-testid={`text-po-supplier-${po.id}`}
                            >
                              {po.supplier?.supplierName || "-"}
                            </TableCell>
                            <TableCell>
                              {formatDate(po.orderDate)}
                            </TableCell>
                            <TableCell>
                              {formatDate(po.expectedDeliveryDate)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={getStatusVariant(po.status)}
                                data-testid={`badge-status-${po.id}`}
                              >
                                {po.status}
                              </Badge>
                            </TableCell>
                            <TableCell
                              className="text-right"
                              data-testid={`text-po-items-count-${po.id}`}
                            >
                              {po.items?.length || 0}
                            </TableCell>
                            <TableCell
                              className="text-right"
                              data-testid={`text-po-total-${po.id}`}
                            >
                              {formatCurrency(po.totalAmount)}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      data-testid={`button-view-po-${po.id}`}
                                      onClick={() => openViewDialog(po)}
                                    >
                                      <Eye className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>View Details</TooltipContent>
                                </Tooltip>
                                {(po.status === "DRAFT" || po.status === "ORDERED") && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        data-testid={`button-edit-status-${po.id}`}
                                        onClick={() => openStatusDialog(po)}
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Edit Status</TooltipContent>
                                  </Tooltip>
                                )}
                                {po.status === "DRAFT" && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        data-testid={`button-delete-po-${po.id}`}
                                        onClick={() => openDeleteDialog(po)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Delete</TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

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
                  <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p
                    className="text-muted-foreground"
                    data-testid="text-empty-state"
                  >
                    No purchase orders found
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Purchase Order Details</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">PO Number</Label>
                  <p className="font-mono font-medium" data-testid="text-detail-po-number">{selectedPO.poNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Status</Label>
                  <div>
                    <Badge variant={getStatusVariant(selectedPO.status)} data-testid="badge-detail-status">
                      {selectedPO.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier</Label>
                  <p data-testid="text-detail-supplier">{selectedPO.supplier?.supplierName || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Order Date</Label>
                  <p data-testid="text-detail-order-date">{formatDate(selectedPO.orderDate)}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Expected Delivery</Label>
                  <p data-testid="text-detail-delivery-date">{formatDate(selectedPO.expectedDeliveryDate)}</p>
                </div>
                {selectedPO.notes && (
                  <div className="col-span-2">
                    <Label className="text-muted-foreground text-xs">Notes</Label>
                    <p className="text-sm" data-testid="text-detail-notes">{selectedPO.notes}</p>
                  </div>
                )}
              </div>

              {selectedPO.items && selectedPO.items.length > 0 && (
                <div>
                  <Label className="text-muted-foreground text-xs mb-2 block">Items</Label>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead className="text-right">Received</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">GST %</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPO.items.map((item: any, idx: number) => (
                        <TableRow key={idx} data-testid={`row-detail-item-${idx}`}>
                          <TableCell>{item.product?.productName || `Product #${item.productId}`}</TableCell>
                          <TableCell className="text-right">{item.quantity}</TableCell>
                          <TableCell className="text-right">{item.receivedQuantity || 0}</TableCell>
                          <TableCell className="text-right">{formatCurrency(item.unitPrice)}</TableCell>
                          <TableCell className="text-right">{item.gstPercentage}%</TableCell>
                          <TableCell className="text-right font-medium">{formatCurrency(item.totalAmount)}</TableCell>
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
                    <span data-testid="text-detail-subtotal">{formatCurrency(selectedPO.subtotal)}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-muted-foreground">GST:</span>
                    <span data-testid="text-detail-gst">{formatCurrency(selectedPO.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between gap-4 font-semibold text-base border-t pt-1">
                    <span>Total:</span>
                    <span data-testid="text-detail-total">{formatCurrency(selectedPO.totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Update Status</DialogTitle>
          </DialogHeader>
          {selectedPO && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                PO: {selectedPO.poNumber}
              </div>
              <div className="space-y-2">
                <Label>New Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger data-testid="select-new-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ORDERED">Ordered</SelectItem>
                    <SelectItem value="RECEIVED">Received</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setStatusDialogOpen(false)} data-testid="button-cancel-status">
                  Cancel
                </Button>
                <Button
                  onClick={() => selectedPO && updateStatusMutation.mutate({ id: selectedPO.id, status: newStatus })}
                  disabled={updateStatusMutation.isPending || newStatus === selectedPO.status}
                  data-testid="button-submit-status"
                >
                  {updateStatusMutation.isPending ? "Updating..." : "Update Status"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Purchase Order</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete purchase order {selectedPO?.poNumber}? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => selectedPO && deleteMutation.mutate(selectedPO.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
