import { useState, useMemo, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";
import {
  ShoppingCart, Plus, Receipt, Trash2, Search, X, Eye, Printer,
  ChevronLeft, ChevronRight, Package, CreditCard, Banknote, Smartphone
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

interface SaleItem {
  inventoryId: number;
  productId: number;
  productName: string;
  batchNumber: string;
  quantity: number;
  unitPrice: number;
  mrp: number;
  gstPercentage: number;
  gstAmount: number;
  totalAmount: number;
  expiryDate: string;
  availableQty: number;
}

export default function Sales() {
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();

  const [posOpen, setPosOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewSaleId, setViewSaleId] = useState<number | null>(null);
  const [customerId, setCustomerId] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [amountPaid, setAmountPaid] = useState(0);
  const [saleItems, setSaleItems] = useState<SaleItem[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [itemQuantity, setItemQuantity] = useState(1);

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const authHeaders = { Authorization: `Bearer ${token}` };

  const { data: sales, isLoading } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/sales"), { headers: authHeaders });
      if (!response.ok) throw new Error("Failed to fetch sales");
      return response.json();
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/customers"), { headers: authHeaders });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/inventory"), { headers: authHeaders });
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
    enabled: posOpen,
  });

  const { data: viewSaleData, isLoading: viewLoading } = useQuery({
    queryKey: ["/api/sales", viewSaleId],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/sales/${viewSaleId}`), { headers: authHeaders });
      if (!response.ok) throw new Error("Failed to fetch sale details");
      return response.json();
    },
    enabled: !!viewSaleId,
  });

  const filteredInventory = useMemo(() => {
    if (!inventoryItems || !productSearch) return [];
    const term = productSearch.toLowerCase();
    return inventoryItems.filter(
      (item: any) =>
        item.quantityInStock > 0 &&
        (item.product?.productName?.toLowerCase().includes(term) ||
          item.product?.productCode?.toLowerCase().includes(term) ||
          item.product?.genericName?.toLowerCase().includes(term) ||
          item.batchNumber?.toLowerCase().includes(term))
    );
  }, [inventoryItems, productSearch]);

  const subtotal = useMemo(
    () => saleItems.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [saleItems]
  );

  const totalGst = useMemo(
    () => saleItems.reduce((sum, item) => sum + item.gstAmount, 0),
    [saleItems]
  );

  const cgst = totalGst / 2;
  const sgst = totalGst / 2;

  const preRoundTotal = subtotal + totalGst - discountAmount;
  const roundOff = Math.round(preRoundTotal) - preRoundTotal;
  const grandTotal = Math.round(preRoundTotal);
  const changeGiven = amountPaid > grandTotal ? amountPaid - grandTotal : 0;
  const loyaltyPointsEarned = Math.floor(grandTotal / 100);

  const totalSales = sales?.length || 0;
  const totalPages = Math.ceil(totalSales / itemsPerPage);
  const paginatedSales = useMemo(() => {
    if (!sales) return [];
    const start = (currentPage - 1) * itemsPerPage;
    return sales.slice(start, start + itemsPerPage);
  }, [sales, currentPage, itemsPerPage]);

  const addItemFromInventory = (inv: any) => {
    const existing = saleItems.find((si) => si.inventoryId === inv.id);
    if (existing) {
      toast({
        title: "Item already added",
        description: "Update the quantity of the existing item instead.",
        variant: "destructive",
      });
      return;
    }

    if (itemQuantity > inv.quantityInStock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${inv.quantityInStock} available.`,
        variant: "destructive",
      });
      return;
    }

    const unitPrice = parseFloat(inv.sellingPrice);
    const mrp = parseFloat(inv.mrp);
    const gstPct = parseFloat(inv.gstPercentage);
    const baseAmount = unitPrice * itemQuantity;
    const gstAmount = (baseAmount * gstPct) / 100;

    const newItem: SaleItem = {
      inventoryId: inv.id,
      productId: inv.productId,
      productName: inv.product?.productName || "Unknown",
      batchNumber: inv.batchNumber,
      quantity: itemQuantity,
      unitPrice,
      mrp,
      gstPercentage: gstPct,
      gstAmount,
      totalAmount: baseAmount + gstAmount,
      expiryDate: inv.expiryDate,
      availableQty: inv.quantityInStock,
    };

    setSaleItems((prev) => [...prev, newItem]);
    setProductSearch("");
    setItemQuantity(1);
  };

  const updateItemQuantity = (inventoryId: number, newQty: number) => {
    setSaleItems((prev) =>
      prev.map((item) => {
        if (item.inventoryId !== inventoryId) return item;
        const qty = Math.min(Math.max(1, newQty), item.availableQty);
        const baseAmount = item.unitPrice * qty;
        const gstAmount = (baseAmount * item.gstPercentage) / 100;
        return { ...item, quantity: qty, gstAmount, totalAmount: baseAmount + gstAmount };
      })
    );
  };

  const removeItem = (inventoryId: number) => {
    setSaleItems((prev) => prev.filter((item) => item.inventoryId !== inventoryId));
  };

  const createSaleMutation = useMutation({
    mutationFn: async (salePayload: any) => {
      const response = await fetch(apiUrl("/api/sales", {
        method: "POST",
        headers: { ...authHeaders, "Content-Type": "application/json" },
        body: JSON.stringify(salePayload),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err);
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sale completed",
        description: `Invoice ${data.invoiceNumber} created successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      resetPOS();
    },
    onError: (error: any) => {
      toast({
        title: "Sale failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitSale = () => {
    if (saleItems.length === 0) {
      toast({
        title: "No items",
        description: "Add at least one item to the sale.",
        variant: "destructive",
      });
      return;
    }

    if (amountPaid < grandTotal) {
      toast({
        title: "Insufficient payment",
        description: "Amount paid must be at least the total amount.",
        variant: "destructive",
      });
      return;
    }

    const items = saleItems.map((item) => ({
      inventoryId: item.inventoryId,
      productId: item.productId,
      batchNumber: item.batchNumber,
      quantity: item.quantity,
      unitPrice: item.unitPrice.toFixed(2),
      mrp: item.mrp.toFixed(2),
      gstPercentage: item.gstPercentage.toFixed(2),
      gstAmount: item.gstAmount.toFixed(2),
      totalAmount: item.totalAmount.toFixed(2),
      expiryDate: item.expiryDate,
    }));

    createSaleMutation.mutate({
      customerId: customerId ? parseInt(customerId) : null,
      paymentMethod,
      subtotal: subtotal.toFixed(2),
      discountAmount: discountAmount.toFixed(2),
      gstAmount: totalGst.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      igst: "0.00",
      roundOff: roundOff.toFixed(2),
      totalAmount: grandTotal.toFixed(2),
      amountPaid: amountPaid.toFixed(2),
      changeGiven: changeGiven.toFixed(2),
      loyaltyPointsEarned,
      items,
    });
  };

  const resetPOS = () => {
    setPosOpen(false);
    setCustomerId("");
    setPaymentMethod("CASH");
    setDiscountAmount(0);
    setAmountPaid(0);
    setSaleItems([]);
    setProductSearch("");
    setItemQuantity(1);
  };

  const handlePrintInvoice = (sale: any) => {
    const printWindow = window.open("", "_blank", "width=400,height=600");
    if (!printWindow) return;

    const items = sale.saleItems || [];
    const itemRows = items.map((si: any) =>
      `<tr>
        <td style="padding:4px;border-bottom:1px solid #eee">${si.product?.productName || "Item"}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:center">${si.quantity}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right">${parseFloat(si.unitPrice).toFixed(2)}</td>
        <td style="padding:4px;border-bottom:1px solid #eee;text-align:right">${parseFloat(si.totalAmount).toFixed(2)}</td>
      </tr>`
    ).join("");

    printWindow.document.write(`
      <html><head><title>Invoice ${sale.invoiceNumber}</title></head>
      <body style="font-family:monospace;padding:20px;max-width:360px;margin:0 auto">
        <h2 style="text-align:center;margin-bottom:4px">Suvidha City Chemist</h2>
        <p style="text-align:center;margin:0;font-size:12px">Tax Invoice</p>
        <hr/>
        <p><strong>Invoice:</strong> ${sale.invoiceNumber}</p>
        <p><strong>Date:</strong> ${new Date(sale.saleDate).toLocaleString()}</p>
        <p><strong>Customer:</strong> ${sale.customer?.customerName || "Walk-in"}</p>
        <p><strong>Payment:</strong> ${sale.paymentMethod}</p>
        <hr/>
        <table style="width:100%;border-collapse:collapse;font-size:12px">
          <thead><tr>
            <th style="text-align:left;padding:4px;border-bottom:2px solid #333">Item</th>
            <th style="text-align:center;padding:4px;border-bottom:2px solid #333">Qty</th>
            <th style="text-align:right;padding:4px;border-bottom:2px solid #333">Price</th>
            <th style="text-align:right;padding:4px;border-bottom:2px solid #333">Total</th>
          </tr></thead>
          <tbody>${itemRows}</tbody>
        </table>
        <hr/>
        <table style="width:100%;font-size:13px">
          <tr><td>Subtotal</td><td style="text-align:right">${parseFloat(sale.subtotal).toFixed(2)}</td></tr>
          <tr><td>CGST</td><td style="text-align:right">${parseFloat(sale.cgst).toFixed(2)}</td></tr>
          <tr><td>SGST</td><td style="text-align:right">${parseFloat(sale.sgst).toFixed(2)}</td></tr>
          <tr><td>Discount</td><td style="text-align:right">-${parseFloat(sale.discountAmount || "0").toFixed(2)}</td></tr>
          <tr><td>Round Off</td><td style="text-align:right">${parseFloat(sale.roundOff || "0").toFixed(2)}</td></tr>
        </table>
        <hr/>
        <p style="font-size:16px;font-weight:bold;text-align:right">Total: ${parseFloat(sale.totalAmount).toFixed(2)}</p>
        <p style="text-align:center;margin-top:20px;font-size:11px">Thank you for your purchase!</p>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const getStockBadge = (qty: number) => {
    if (qty <= 0) return <Badge variant="destructive" className="text-xs">Out</Badge>;
    if (qty <= 10) return <Badge variant="destructive" className="text-xs">{qty}</Badge>;
    if (qty <= 50) return <Badge variant="secondary" className="text-xs">{qty}</Badge>;
    return <Badge variant="outline" className="text-xs">{qty}</Badge>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-sales-title">Sales / POS</h1>
          <p className="text-muted-foreground">
            Manage billing and transactions
          </p>
        </div>
        <Button
          data-testid="button-new-sale"
          onClick={() => setPosOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          New Sale
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Today's Sales
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-today-sales-total">
              ₹{sales?.reduce((sum: number, s: any) => {
                const today = new Date().toDateString();
                const saleDate = new Date(s.saleDate).toDateString();
                return today === saleDate ? sum + parseFloat(s.totalAmount) : sum;
              }, 0).toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sales?.filter((s: any) => new Date(s.saleDate).toDateString() === new Date().toDateString()).length || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              This Week
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-week-sales-total">
              ₹{sales?.reduce((sum: number, s: any) => {
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                const saleDate = new Date(s.saleDate);
                return saleDate >= weekAgo ? sum + parseFloat(s.totalAmount) : sum;
              }, 0).toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {sales?.filter((s: any) => {
                const now = new Date();
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return new Date(s.saleDate) >= weekAgo;
              }).length || 0} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Average Bill Value
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold" data-testid="text-avg-bill">
              ₹{sales && sales.length > 0 ? (sales.reduce((sum: number, s: any) => sum + parseFloat(s.totalAmount), 0) / sales.length).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Based on {sales?.length || 0} sales
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2 flex-wrap">
          <CardTitle>Recent Transactions</CardTitle>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground" data-testid="text-sales-count">
              Showing {paginatedSales.length} of {totalSales} sales
            </span>
            <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(parseInt(v)); setCurrentPage(1); }}>
              <SelectTrigger className="w-[100px]" data-testid="select-per-page">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10/page</SelectItem>
                <SelectItem value="25">25/page</SelectItem>
                <SelectItem value="50">50/page</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading sales...</p>
          ) : sales && sales.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead>Total Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedSales.map((sale: any) => (
                    <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                      <TableCell className="font-mono text-sm" data-testid={`text-invoice-${sale.id}`}>
                        {sale.invoiceNumber}
                      </TableCell>
                      <TableCell className="text-sm">
                        {new Date(sale.saleDate).toLocaleString()}
                      </TableCell>
                      <TableCell data-testid={`text-customer-${sale.id}`}>
                        {sale.customer?.customerName || "Walk-in"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {sale.saleItems?.length || 0} items
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{sale.paymentMethod}</Badge>
                      </TableCell>
                      <TableCell className="font-bold" data-testid={`text-amount-${sale.id}`}>
                        ₹{parseFloat(sale.totalAmount).toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            sale.status === "COMPLETED"
                              ? "default"
                              : sale.status === "CANCELLED"
                              ? "destructive"
                              : "secondary"
                          }
                          data-testid={`badge-status-${sale.id}`}
                        >
                          {sale.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-view-sale-${sale.id}`}
                                onClick={() => {
                                  setViewSaleId(sale.id);
                                  setViewDialogOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>View Invoice</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="ghost"
                                data-testid={`button-print-sale-${sale.id}`}
                                onClick={() => handlePrintInvoice(sale)}
                              >
                                <Printer className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Print Invoice</TooltipContent>
                          </Tooltip>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage <= 1}
                      data-testid="button-prev-page"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 5) {
                        page = i + 1;
                      } else if (currentPage <= 3) {
                        page = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        page = totalPages - 4 + i;
                      } else {
                        page = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          data-testid={`button-page-${page}`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    })}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages}
                      data-testid="button-next-page"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No sales records found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={posOpen} onOpenChange={(open) => { if (!open) resetPOS(); else setPosOpen(true); }}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              New Sale - Point of Sale
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <Label>Customer (optional)</Label>
                    <Select value={customerId} onValueChange={setCustomerId}>
                      <SelectTrigger data-testid="select-customer">
                        <SelectValue placeholder="Walk-in Customer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="walkin">Walk-in Customer</SelectItem>
                        {customers?.map((c: any) => (
                          <SelectItem key={c.id} value={c.id.toString()}>
                            {c.customerName} - {c.phone}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                      <SelectTrigger data-testid="select-payment-method">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="CARD">Card</SelectItem>
                        <SelectItem value="UPI">UPI</SelectItem>
                        <SelectItem value="MIXED">Mixed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-base font-semibold">Search & Add Products</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                    <Input
                      data-testid="input-product-search"
                      placeholder="Search by product name, code, generic name, or batch..."
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="pl-10 text-base"
                    />
                    {productSearch && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="absolute right-1 top-1/2 -translate-y-1/2"
                        onClick={() => setProductSearch("")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {productSearch && filteredInventory.length > 0 && (
                  <div className="max-h-64 overflow-y-auto space-y-1 border rounded-md p-2">
                    {filteredInventory.slice(0, 20).map((inv: any) => (
                      <div
                        key={inv.id}
                        data-testid={`inventory-option-${inv.id}`}
                        className="flex items-center justify-between p-3 rounded-md cursor-pointer hover-elevate"
                        onClick={() => addItemFromInventory(inv)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center justify-center w-10 h-10 rounded-md bg-muted">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <p className="font-medium text-sm">{inv.product?.productName}</p>
                            <p className="text-xs text-muted-foreground">
                              Batch: {inv.batchNumber} | Exp: {new Date(inv.expiryDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {getStockBadge(inv.quantityInStock)}
                          <div className="text-right">
                            <p className="font-semibold text-sm">₹{parseFloat(inv.sellingPrice).toFixed(2)}</p>
                            <p className="text-xs text-muted-foreground">MRP: ₹{parseFloat(inv.mrp).toFixed(2)}</p>
                          </div>
                          <Button size="sm" variant="outline" data-testid={`button-add-product-${inv.id}`}>
                            <Plus className="h-3 w-3 mr-1" /> Add
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {productSearch && filteredInventory.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No matching products found in inventory.
                  </p>
                )}

                {saleItems.length > 0 && (
                  <div>
                    <Label className="text-base font-semibold mb-2 block">
                      Cart ({saleItems.length} items)
                    </Label>
                    <div className="border rounded-md overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Product</TableHead>
                            <TableHead>Batch</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>GST%</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Total</TableHead>
                            <TableHead></TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {saleItems.map((item) => (
                            <TableRow key={item.inventoryId} data-testid={`row-sale-item-${item.inventoryId}`}>
                              <TableCell className="text-sm font-medium">
                                {item.productName}
                              </TableCell>
                              <TableCell className="text-sm text-muted-foreground">
                                {item.batchNumber}
                              </TableCell>
                              <TableCell className="text-sm">
                                ₹{item.unitPrice.toFixed(2)}
                              </TableCell>
                              <TableCell className="text-sm">
                                {item.gstPercentage}%
                              </TableCell>
                              <TableCell>
                                <Input
                                  data-testid={`input-qty-${item.inventoryId}`}
                                  type="number"
                                  min={1}
                                  max={item.availableQty}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    updateItemQuantity(
                                      item.inventoryId,
                                      parseInt(e.target.value) || 1
                                    )
                                  }
                                  className="w-16"
                                />
                              </TableCell>
                              <TableCell className="font-semibold text-sm">
                                ₹{item.totalAmount.toFixed(2)}
                              </TableCell>
                              <TableCell>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-remove-item-${item.inventoryId}`}
                                  onClick={() => removeItem(item.inventoryId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                )}

                {saleItems.length === 0 && !productSearch && (
                  <div className="text-center py-8 border rounded-md border-dashed">
                    <ShoppingCart className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                    <p className="text-muted-foreground text-sm">Search and add products to start billing</p>
                  </div>
                )}
              </div>

              <div className="lg:col-span-2 space-y-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Bill Summary</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span data-testid="text-subtotal">₹{subtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CGST</span>
                      <span data-testid="text-cgst">₹{cgst.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">SGST</span>
                      <span data-testid="text-sgst">₹{sgst.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div>
                      <Label htmlFor="pos-discount" className="text-sm">Discount (₹)</Label>
                      <Input
                        id="pos-discount"
                        data-testid="input-discount"
                        type="number"
                        min={0}
                        step={0.01}
                        value={discountAmount}
                        onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount</span>
                      <span data-testid="text-discount" className="text-destructive">-₹{discountAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Round Off</span>
                      <span data-testid="text-roundoff">₹{roundOff.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-xl">
                      <span>Grand Total</span>
                      <span data-testid="text-grand-total">₹{grandTotal.toFixed(2)}</span>
                    </div>
                    <Separator />
                    <div>
                      <Label htmlFor="pos-amount-paid" className="text-sm">Amount Paid (₹)</Label>
                      <Input
                        id="pos-amount-paid"
                        data-testid="input-amount-paid"
                        type="number"
                        min={0}
                        step={0.01}
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Change</span>
                      <span data-testid="text-change" className="font-semibold">₹{changeGiven.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loyalty Points Earned</span>
                      <span data-testid="text-loyalty-points">{loyaltyPointsEarned}</span>
                    </div>
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    data-testid="button-cancel-sale"
                    onClick={resetPOS}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white border-green-600"
                    data-testid="button-submit-sale"
                    onClick={handleSubmitSale}
                    disabled={
                      saleItems.length === 0 ||
                      amountPaid < grandTotal ||
                      createSaleMutation.isPending
                    }
                  >
                    {createSaleMutation.isPending ? "Processing..." : "Complete Sale"}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { if (!open) { setViewDialogOpen(false); setViewSaleId(null); } }}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Invoice Details
            </DialogTitle>
          </DialogHeader>
          {viewLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading invoice details...</p>
          ) : viewSaleData ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Invoice Number</p>
                  <p className="font-mono font-semibold" data-testid="text-view-invoice">{viewSaleData.invoiceNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-semibold">{new Date(viewSaleData.saleDate).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer</p>
                  <p className="font-semibold" data-testid="text-view-customer">{viewSaleData.customer?.customerName || "Walk-in"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Payment Method</p>
                  <Badge variant="outline">{viewSaleData.paymentMethod}</Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge variant={viewSaleData.status === "COMPLETED" ? "default" : "destructive"}>
                    {viewSaleData.status}
                  </Badge>
                </div>
                {viewSaleData.branch && (
                  <div>
                    <p className="text-sm text-muted-foreground">Branch</p>
                    <p className="font-semibold">{viewSaleData.branch.branchName}</p>
                  </div>
                )}
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-2">Items</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Batch</TableHead>
                      <TableHead>MRP</TableHead>
                      <TableHead>Price</TableHead>
                      <TableHead>GST%</TableHead>
                      <TableHead>Qty</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {viewSaleData.saleItems?.map((si: any, idx: number) => (
                      <TableRow key={si.id || idx} data-testid={`row-view-item-${idx}`}>
                        <TableCell className="font-medium text-sm">
                          {si.product?.productName || "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{si.batchNumber}</TableCell>
                        <TableCell className="text-sm">₹{parseFloat(si.mrp).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">₹{parseFloat(si.unitPrice).toFixed(2)}</TableCell>
                        <TableCell className="text-sm">{parseFloat(si.gstPercentage).toFixed(1)}%</TableCell>
                        <TableCell className="text-sm">{si.quantity}</TableCell>
                        <TableCell className="text-sm font-semibold">₹{parseFloat(si.totalAmount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <Separator />

              <div className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>₹{parseFloat(viewSaleData.subtotal).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">CGST</span>
                  <span>₹{parseFloat(viewSaleData.cgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">SGST</span>
                  <span>₹{parseFloat(viewSaleData.sgst).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Discount</span>
                  <span className="text-destructive">-₹{parseFloat(viewSaleData.discountAmount || "0").toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Round Off</span>
                  <span>₹{parseFloat(viewSaleData.roundOff || "0").toFixed(2)}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total Amount</span>
                  <span data-testid="text-view-total">₹{parseFloat(viewSaleData.totalAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span>₹{parseFloat(viewSaleData.amountPaid).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Change Given</span>
                  <span>₹{parseFloat(viewSaleData.changeGiven || "0").toFixed(2)}</span>
                </div>
                {(viewSaleData.loyaltyPointsEarned ?? 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Loyalty Points Earned</span>
                    <span>{viewSaleData.loyaltyPointsEarned}</span>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  data-testid="button-print-view-invoice"
                  onClick={() => handlePrintInvoice(viewSaleData)}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Invoice
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">Invoice not found</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
