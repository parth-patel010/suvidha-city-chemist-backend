import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Package, Plus, Eye, Pencil, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import { apiUrl } from "@/lib/api";

export default function Inventory() {
  const token = localStorage.getItem("pharmacy_token");
  const user = JSON.parse(localStorage.getItem("pharmacy_user") || "{}");
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [formData, setFormData] = useState({
    productId: "",
    batchNumber: "",
    expiryDate: "",
    purchasePrice: "",
    sellingPrice: "",
    mrp: "",
    gstPercentage: "",
    quantityInStock: "",
    reorderLevel: "",
    location: "",
    supplierId: "",
  });

  const [editFormData, setEditFormData] = useState({
    quantityInStock: "",
    reorderLevel: "",
    sellingPrice: "",
    mrp: "",
    location: "",
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ["inventory"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/inventory"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch inventory");
      return response.json();
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/products"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ["suppliers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/suppliers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  });

  const addStockMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await fetch(apiUrl("/api/inventory"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to add stock");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Stock added successfully" });
      setDialogOpen(false);
      setFormData({
        productId: "",
        batchNumber: "",
        expiryDate: "",
        purchasePrice: "",
        sellingPrice: "",
        mrp: "",
        gstPercentage: "",
        quantityInStock: "",
        reorderLevel: "",
        location: "",
        supplierId: "",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error adding stock", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Record<string, unknown> }) => {
      const response = await fetch(apiUrl(`/api/inventory/${id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to update inventory");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Inventory updated successfully" });
      setEditDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error updating inventory", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(apiUrl(`/api/inventory/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to delete inventory item");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      toast({ title: "Inventory item deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedItem(null);
    },
    onError: (error: Error) => {
      toast({ title: "Error deleting inventory item", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: Record<string, unknown> = {
      productId: parseInt(formData.productId),
      branchId: user.branch?.id || user.branchId,
      batchNumber: formData.batchNumber,
      expiryDate: new Date(formData.expiryDate).toISOString(),
      purchasePrice: formData.purchasePrice,
      sellingPrice: formData.sellingPrice,
      mrp: formData.mrp,
      gstPercentage: formData.gstPercentage,
      quantityInStock: parseInt(formData.quantityInStock),
      reorderLevel: parseInt(formData.reorderLevel),
      location: formData.location || null,
    };
    if (formData.supplierId) {
      payload.supplierId = parseInt(formData.supplierId);
    }
    addStockMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;
    editMutation.mutate({
      id: selectedItem.id,
      data: {
        quantityInStock: parseInt(editFormData.quantityInStock),
        reorderLevel: parseInt(editFormData.reorderLevel),
        sellingPrice: editFormData.sellingPrice,
        mrp: editFormData.mrp,
        location: editFormData.location || null,
      },
    });
  };

  const openEditDialog = (item: any) => {
    setSelectedItem(item);
    setEditFormData({
      quantityInStock: item.quantityInStock.toString(),
      reorderLevel: item.reorderLevel.toString(),
      sellingPrice: item.sellingPrice,
      mrp: item.mrp,
      location: item.location || "",
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (item: any) => {
    setSelectedItem(item);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (item: any) => {
    setSelectedItem(item);
    setDeleteDialogOpen(true);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const getStockStatus = (current: number, reorder: number) => {
    if (current === 0) return { label: "Out of Stock", variant: "destructive" };
    if (current <= reorder) return { label: "Low Stock", variant: "warning" };
    return { label: "In Stock", variant: "default" };
  };

  const getExpiryStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) return { label: "Expired", variant: "destructive" };
    if (daysUntilExpiry <= 30) return { label: `${daysUntilExpiry}d`, variant: "destructive" };
    if (daysUntilExpiry <= 90) return { label: `${daysUntilExpiry}d`, variant: "warning" };
    return { label: `${daysUntilExpiry}d`, variant: "default" };
  };

  const totalItems = inventory?.length || 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const paginatedInventory = inventory?.slice(startIndex, startIndex + pageSize) || [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-inventory-title">Inventory</h1>
          <p className="text-muted-foreground">
            Track stock levels and expiry dates
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-stock">
              <Plus className="h-4 w-4 mr-2" />
              Add Stock
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Stock Entry</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="productId">Product *</Label>
                  <Select
                    value={formData.productId}
                    onValueChange={(v) => updateField("productId", v)}
                  >
                    <SelectTrigger data-testid="select-product">
                      <SelectValue placeholder="Select product" />
                    </SelectTrigger>
                    <SelectContent>
                      {(productsData || []).map((p: any) => (
                        <SelectItem key={p.id} value={p.id.toString()}>
                          {p.productName} ({p.productCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="batchNumber">Batch Number *</Label>
                  <Input
                    id="batchNumber"
                    data-testid="input-batch-number"
                    value={formData.batchNumber}
                    onChange={(e) => updateField("batchNumber", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="expiryDate">Expiry Date *</Label>
                  <Input
                    id="expiryDate"
                    type="date"
                    data-testid="input-expiry-date"
                    value={formData.expiryDate}
                    onChange={(e) => updateField("expiryDate", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="purchasePrice">Purchase Price *</Label>
                  <Input
                    id="purchasePrice"
                    type="number"
                    step="0.01"
                    data-testid="input-purchase-price"
                    value={formData.purchasePrice}
                    onChange={(e) => updateField("purchasePrice", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sellingPrice">Selling Price *</Label>
                  <Input
                    id="sellingPrice"
                    type="number"
                    step="0.01"
                    data-testid="input-selling-price"
                    value={formData.sellingPrice}
                    onChange={(e) => updateField("sellingPrice", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mrp">MRP *</Label>
                  <Input
                    id="mrp"
                    type="number"
                    step="0.01"
                    data-testid="input-mrp"
                    value={formData.mrp}
                    onChange={(e) => updateField("mrp", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gstPercentage">GST % *</Label>
                  <Input
                    id="gstPercentage"
                    type="number"
                    step="0.01"
                    data-testid="input-gst-percentage"
                    value={formData.gstPercentage}
                    onChange={(e) => updateField("gstPercentage", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quantityInStock">Quantity *</Label>
                  <Input
                    id="quantityInStock"
                    type="number"
                    data-testid="input-quantity"
                    value={formData.quantityInStock}
                    onChange={(e) => updateField("quantityInStock", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reorderLevel">Reorder Level *</Label>
                  <Input
                    id="reorderLevel"
                    type="number"
                    data-testid="input-reorder-level"
                    value={formData.reorderLevel}
                    onChange={(e) => updateField("reorderLevel", e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    data-testid="input-location"
                    value={formData.location}
                    onChange={(e) => updateField("location", e.target.value)}
                    placeholder="e.g. Shelf A3"
                  />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label htmlFor="supplierId">Supplier</Label>
                  <Select
                    value={formData.supplierId}
                    onValueChange={(v) => updateField("supplierId", v)}
                  >
                    <SelectTrigger data-testid="select-supplier">
                      <SelectValue placeholder="Select supplier (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(suppliersData || []).map((s: any) => (
                        <SelectItem key={s.id} value={s.id.toString()}>
                          {s.supplierName} ({s.supplierCode})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  data-testid="button-cancel-stock"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={addStockMutation.isPending || !formData.productId || !formData.batchNumber}
                  data-testid="button-submit-stock"
                >
                  {addStockMutation.isPending ? "Adding..." : "Add Stock"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4 flex-wrap">
          <CardTitle>Current Stock</CardTitle>
          {totalItems > 0 && (
            <span className="text-sm text-muted-foreground" data-testid="text-record-count">
              Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} items
            </span>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading inventory...</p>
          ) : inventory && inventory.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Batch Number</TableHead>
                    <TableHead>Stock</TableHead>
                    <TableHead>Reorder Level</TableHead>
                    <TableHead>MRP</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedInventory.map((item: any) => {
                    const stockStatus = getStockStatus(item.quantityInStock, item.reorderLevel);
                    const expiryStatus = getExpiryStatus(item.expiryDate);
                    
                    return (
                      <TableRow key={item.id} data-testid={`row-inventory-${item.id}`}>
                        <TableCell className="font-medium">
                          {item.product?.productName}
                          <div className="text-xs text-muted-foreground">
                            {item.product?.productCode}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {item.batchNumber}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <span className="font-bold">{item.quantityInStock}</span>
                            <span className="text-muted-foreground text-sm">
                              {item.product?.unit}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.reorderLevel}
                        </TableCell>
                        <TableCell data-testid={`text-mrp-${item.id}`}>₹{item.mrp}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {new Date(item.expiryDate).toLocaleDateString()}
                            <Badge variant={expiryStatus.variant as any}>
                              {expiryStatus.label}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {item.location || "-"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={stockStatus.variant as any}>
                            {stockStatus.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-view-inventory-${item.id}`}
                                  onClick={() => openViewDialog(item)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>View Details</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-edit-inventory-${item.id}`}
                                  onClick={() => openEditDialog(item)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Edit</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  data-testid={`button-delete-inventory-${item.id}`}
                                  onClick={() => openDeleteDialog(item)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Delete</TooltipContent>
                            </Tooltip>
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
                    Page {currentPage} of {totalPages}
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
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No inventory items found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Inventory Details</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground text-xs">Product</Label>
                  <p className="font-medium" data-testid="text-view-product">{selectedItem.product?.productName}</p>
                  <p className="text-xs text-muted-foreground">{selectedItem.product?.productCode}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Batch Number</Label>
                  <p className="font-mono" data-testid="text-view-batch">{selectedItem.batchNumber}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Quantity in Stock</Label>
                  <p className="font-bold" data-testid="text-view-stock">{selectedItem.quantityInStock} {selectedItem.product?.unit}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Reorder Level</Label>
                  <p data-testid="text-view-reorder">{selectedItem.reorderLevel}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Purchase Price</Label>
                  <p data-testid="text-view-purchase-price">₹{selectedItem.purchasePrice}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Selling Price</Label>
                  <p data-testid="text-view-selling-price">₹{selectedItem.sellingPrice}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">MRP</Label>
                  <p data-testid="text-view-mrp">₹{selectedItem.mrp}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">GST %</Label>
                  <p data-testid="text-view-gst">{selectedItem.gstPercentage}%</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Expiry Date</Label>
                  <p data-testid="text-view-expiry">{new Date(selectedItem.expiryDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Location</Label>
                  <p data-testid="text-view-location">{selectedItem.location || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Supplier</Label>
                  <p data-testid="text-view-supplier">{selectedItem.supplier?.supplierName || "-"}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Branch</Label>
                  <p data-testid="text-view-branch">{selectedItem.branch?.branchName || "-"}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Inventory</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div className="text-sm text-muted-foreground mb-2">
                {selectedItem.product?.productName} - Batch: {selectedItem.batchNumber}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    data-testid="input-edit-quantity"
                    value={editFormData.quantityInStock}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, quantityInStock: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Reorder Level</Label>
                  <Input
                    type="number"
                    data-testid="input-edit-reorder"
                    value={editFormData.reorderLevel}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, reorderLevel: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Selling Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    data-testid="input-edit-selling-price"
                    value={editFormData.sellingPrice}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, sellingPrice: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>MRP</Label>
                  <Input
                    type="number"
                    step="0.01"
                    data-testid="input-edit-mrp"
                    value={editFormData.mrp}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, mrp: e.target.value }))}
                    required
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label>Location</Label>
                  <Input
                    data-testid="input-edit-location"
                    value={editFormData.location}
                    onChange={(e) => setEditFormData((prev) => ({ ...prev, location: e.target.value }))}
                    placeholder="e.g. Shelf A3"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                  Cancel
                </Button>
                <Button type="submit" disabled={editMutation.isPending} data-testid="button-submit-edit">
                  {editMutation.isPending ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedItem?.product?.productName} (Batch: {selectedItem?.batchNumber})? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
