import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Plus, Search, Package, Eye, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { apiUrl } from "@/lib/api";
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
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

function getStockBadge(totalStock: number, reorderLevel: number) {
  if (totalStock <= 0) return <Badge variant="destructive" className="text-xs" data-testid="badge-stock-out">Out of Stock</Badge>;
  if (totalStock <= reorderLevel) return <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200" data-testid="badge-stock-low">Low Stock</Badge>;
  return <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200" data-testid="badge-stock-ok">In Stock</Badge>;
}

function getScheduleBadges(product: any) {
  const badges = [];
  if (product.requiresPrescription) badges.push(<Badge key="rx" variant="outline" className="text-xs">Rx</Badge>);
  if (product.isScheduleH) badges.push(<Badge key="h" variant="destructive" className="text-xs">H</Badge>);
  if (product.isScheduleH1) badges.push(<Badge key="h1" variant="destructive" className="text-xs">H1</Badge>);
  return badges;
}

export default function Products() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", statusFilter],
    queryFn: async () => {
      const base = apiUrl("/api/products");
      const url = statusFilter !== "all" ? `${base}?status=${encodeURIComponent(statusFilter)}` : base;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch products");
      return response.json();
    },
  });

  const { data: categoriesList } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/categories"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch categories");
      return response.json();
    },
  });

  const { data: manufacturersList } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/manufacturers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch manufacturers");
      return response.json();
    },
  });

  const { data: viewProduct, isLoading: viewLoading } = useQuery({
    queryKey: ["products", selectedProduct?.id],
    queryFn: async () => {
      const response = await fetch(apiUrl(`/api/products/${selectedProduct.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch product details");
      return response.json();
    },
    enabled: !!selectedProduct?.id && viewDialogOpen,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = [...products];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p: any) =>
        p.productName.toLowerCase().includes(s) ||
        p.productCode.toLowerCase().includes(s) ||
        p.genericName?.toLowerCase().includes(s)
      );
    }
    if (categoryFilter !== "all") {
      result = result.filter((p: any) => p.categoryId === parseInt(categoryFilter));
    }
    return result;
  }, [products, search, categoryFilter]);

  const totalProducts = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(totalProducts / perPage));
  const paginatedProducts = filteredProducts.slice((currentPage - 1) * perPage, currentPage * perPage);

  const safeCurrentPage = Math.min(currentPage, totalPages);
  if (safeCurrentPage !== currentPage && totalProducts > 0) {
    setCurrentPage(safeCurrentPage);
  }

  const form = useForm({
    defaultValues: {
      productCode: "",
      productName: "",
      genericName: "",
      categoryId: "",
      manufacturerId: "",
      composition: "",
      dosageForm: "",
      strength: "",
      packSize: "",
      unit: "",
      hsnCode: "",
      requiresPrescription: false,
      isScheduleH: false,
      isScheduleH1: false,
      mrp: "",
      purchasePrice: "",
      sellingPrice: "",
      gstPercentage: "",
      reorderLevel: "",
    },
  });

  const editForm = useForm({
    defaultValues: {
      productCode: "",
      productName: "",
      genericName: "",
      categoryId: "",
      manufacturerId: "",
      composition: "",
      dosageForm: "",
      strength: "",
      packSize: "",
      unit: "",
      hsnCode: "",
      requiresPrescription: false,
      isScheduleH: false,
      isScheduleH1: false,
    },
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiUrl("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productCode: data.productCode,
          productName: data.productName,
          genericName: data.genericName,
          categoryId: parseInt(data.categoryId),
          manufacturerId: parseInt(data.manufacturerId),
          composition: data.composition,
          dosageForm: data.dosageForm,
          strength: data.strength,
          packSize: data.packSize,
          unit: data.unit,
          hsnCode: data.hsnCode,
          requiresPrescription: data.requiresPrescription,
          isScheduleH: data.isScheduleH,
          isScheduleH1: data.isScheduleH1,
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to create product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product added successfully" });
      setDialogOpen(false);
      form.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiUrl(`/api/products/${selectedProduct.id}`), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productCode: data.productCode,
          productName: data.productName,
          genericName: data.genericName,
          categoryId: parseInt(data.categoryId),
          manufacturerId: parseInt(data.manufacturerId),
          composition: data.composition,
          dosageForm: data.dosageForm,
          strength: data.strength,
          packSize: data.packSize,
          unit: data.unit,
          hsnCode: data.hsnCode,
          requiresPrescription: data.requiresPrescription,
          isScheduleH: data.isScheduleH,
          isScheduleH1: data.isScheduleH1,
        }),
      });
      if (!response.ok) {
        const err = await response.text();
        throw new Error(err || "Failed to update product");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product updated successfully" });
      setEditDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(apiUrl(`/api/products/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete product");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({
        title: "Product deleted",
        description: "The product has been deactivated.",
      });
      setDeleteDialogOpen(false);
      setSelectedProduct(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  function onSubmit(data: any) {
    createProductMutation.mutate(data);
  }

  function onEditSubmit(data: any) {
    updateProductMutation.mutate(data);
  }

  function openEditDialog(product: any) {
    setSelectedProduct(product);
    editForm.reset({
      productCode: product.productCode || "",
      productName: product.productName || "",
      genericName: product.genericName || "",
      categoryId: String(product.categoryId),
      manufacturerId: String(product.manufacturerId),
      composition: product.composition || "",
      dosageForm: product.dosageForm || "",
      strength: product.strength || "",
      packSize: product.packSize || "",
      unit: product.unit || "",
      hsnCode: product.hsnCode || "",
      requiresPrescription: product.requiresPrescription || false,
      isScheduleH: product.isScheduleH || false,
      isScheduleH1: product.isScheduleH1 || false,
    });
    setEditDialogOpen(true);
  }

  function openViewDialog(product: any) {
    setSelectedProduct(product);
    setViewDialogOpen(true);
  }

  function openDeleteDialog(product: any) {
    setSelectedProduct(product);
    setDeleteDialogOpen(true);
  }

  function getProductInventoryInfo(product: any) {
    const inv = product.inventory;
    if (!inv || inv.length === 0) return { mrp: null, gst: null, reorderLevel: null, totalStock: 0 };
    const first = inv[0];
    const totalStock = inv.reduce((sum: number, i: any) => sum + (i.quantityInStock || 0), 0);
    return {
      mrp: first.mrp,
      gst: first.gstPercentage,
      reorderLevel: first.reorderLevel,
      totalStock,
    };
  }

  function exportToCSV() {
    if (!filteredProducts.length) return;
    const headers = ["Code", "Product Name", "Generic Name", "Category", "Manufacturer", "HSN Code", "MRP", "GST%", "Reorder Level", "Stock", "Status"];
    const rows = filteredProducts.map((p: any) => {
      const info = getProductInventoryInfo(p);
      return [
        p.productCode,
        `"${p.productName}"`,
        `"${p.genericName || ""}"`,
        `"${p.category?.categoryName || ""}"`,
        `"${p.manufacturer?.manufacturerName || ""}"`,
        p.hsnCode,
        info.mrp || "",
        info.gst || "",
        info.reorderLevel || "",
        info.totalStock,
        p.isActive ? "Active" : "Inactive",
      ].join(",");
    });
    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_export_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function renderProductForm(formInstance: any, onSubmitFn: any, isPending: boolean, isEdit: boolean) {
    return (
      <Form {...formInstance}>
        <form onSubmit={formInstance.handleSubmit(onSubmitFn)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={formInstance.control}
              name="productCode"
              rules={{ required: "Product code is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Product Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. PRD001" {...field} data-testid="input-product-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="productName"
              rules={{ required: "Product name is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Product Name *</FormLabel>
                  <FormControl>
                    <Input placeholder="Product name" {...field} data-testid="input-product-name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={formInstance.control}
            name="genericName"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Generic Name</FormLabel>
                <FormControl>
                  <Input placeholder="Generic / salt name" {...field} data-testid="input-generic-name" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={formInstance.control}
              name="categoryId"
              rules={{ required: "Category is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Category *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Select category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categoriesList?.map((cat: any) => (
                        <SelectItem key={cat.id} value={String(cat.id)} data-testid={`select-category-${cat.id}`}>
                          {cat.categoryName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="manufacturerId"
              rules={{ required: "Manufacturer is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Manufacturer *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-manufacturer">
                        <SelectValue placeholder="Select manufacturer" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {manufacturersList?.map((mfr: any) => (
                        <SelectItem key={mfr.id} value={String(mfr.id)} data-testid={`select-manufacturer-${mfr.id}`}>
                          {mfr.manufacturerName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={formInstance.control}
            name="composition"
            render={({ field }: any) => (
              <FormItem>
                <FormLabel>Composition</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Paracetamol 500mg" {...field} data-testid="input-composition" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid grid-cols-3 gap-4">
            <FormField
              control={formInstance.control}
              name="dosageForm"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Dosage Form</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-dosage-form">
                        <SelectValue placeholder="Select form" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Tablet">Tablet</SelectItem>
                      <SelectItem value="Capsule">Capsule</SelectItem>
                      <SelectItem value="Syrup">Syrup</SelectItem>
                      <SelectItem value="Injection">Injection</SelectItem>
                      <SelectItem value="Cream">Cream</SelectItem>
                      <SelectItem value="Ointment">Ointment</SelectItem>
                      <SelectItem value="Drops">Drops</SelectItem>
                      <SelectItem value="Inhaler">Inhaler</SelectItem>
                      <SelectItem value="Powder">Powder</SelectItem>
                      <SelectItem value="Gel">Gel</SelectItem>
                      <SelectItem value="Spray">Spray</SelectItem>
                      <SelectItem value="Suspension">Suspension</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="strength"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Strength</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 500mg" {...field} data-testid="input-strength" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="packSize"
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Pack Size</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 10 tabs" {...field} data-testid="input-pack-size" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={formInstance.control}
              name="unit"
              rules={{ required: "Unit is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>Unit *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-unit">
                        <SelectValue placeholder="Select unit" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PCS">PCS</SelectItem>
                      <SelectItem value="STRIP">STRIP</SelectItem>
                      <SelectItem value="BOX">BOX</SelectItem>
                      <SelectItem value="BOTTLE">BOTTLE</SelectItem>
                      <SelectItem value="TUBE">TUBE</SelectItem>
                      <SelectItem value="VIAL">VIAL</SelectItem>
                      <SelectItem value="AMPOULE">AMPOULE</SelectItem>
                      <SelectItem value="SACHET">SACHET</SelectItem>
                      <SelectItem value="KG">KG</SelectItem>
                      <SelectItem value="LTR">LTR</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="hsnCode"
              rules={{ required: "HSN code is required" }}
              render={({ field }: any) => (
                <FormItem>
                  <FormLabel>HSN Code *</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. 3004" {...field} data-testid="input-hsn-code" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {!isEdit && (
            <>
              <Separator />
              <p className="text-sm font-medium text-muted-foreground">Pricing & Inventory (optional, first batch)</p>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={formInstance.control}
                  name="mrp"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>MRP</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-mrp" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formInstance.control}
                  name="purchasePrice"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Purchase Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-purchase-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={formInstance.control}
                  name="sellingPrice"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Selling Price</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-selling-price" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formInstance.control}
                  name="gstPercentage"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>GST %</FormLabel>
                      <FormControl>
                        <Input type="number" step="0.01" placeholder="e.g. 12" {...field} data-testid="input-gst-percentage" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={formInstance.control}
                  name="reorderLevel"
                  render={({ field }: any) => (
                    <FormItem>
                      <FormLabel>Reorder Level</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 10" {...field} data-testid="input-reorder-level" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </>
          )}

          <div className="flex items-center gap-6 flex-wrap">
            <FormField
              control={formInstance.control}
              name="requiresPrescription"
              render={({ field }: any) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-requires-prescription"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Requires Prescription (Rx)</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="isScheduleH"
              render={({ field }: any) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-schedule-h"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Schedule H</FormLabel>
                </FormItem>
              )}
            />
            <FormField
              control={formInstance.control}
              name="isScheduleH1"
              render={({ field }: any) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      data-testid="checkbox-schedule-h1"
                    />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Schedule H1</FormLabel>
                </FormItem>
              )}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => isEdit ? setEditDialogOpen(false) : setDialogOpen(false)}
              data-testid="button-cancel-product"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              data-testid="button-submit-product"
            >
              {isPending ? (isEdit ? "Saving..." : "Adding...") : (isEdit ? "Save Changes" : "Add Product")}
            </Button>
          </div>
        </form>
      </Form>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-products-title">Products</h1>
          <p className="text-muted-foreground">
            Manage your pharmacy product catalog
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-product">
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
                <DialogDescription>Fill in the product details below.</DialogDescription>
              </DialogHeader>
              {renderProductForm(form, onSubmit, createProductMutation.isPending, false)}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, code, or generic name..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10"
                data-testid="input-search-products"
              />
            </div>
            <Select value={categoryFilter} onValueChange={(v) => { setCategoryFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categoriesList?.map((cat: any) => (
                  <SelectItem key={cat.id} value={String(cat.id)}>{cat.categoryName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setCurrentPage(1); }}>
              <SelectTrigger className="w-[150px]" data-testid="select-status-filter">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading products...</p>
          ) : filteredProducts.length > 0 ? (
            <>
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <p className="text-sm text-muted-foreground" data-testid="text-product-count">
                  Showing {Math.min((currentPage - 1) * perPage + 1, totalProducts)} - {Math.min(currentPage * perPage, totalProducts)} of {totalProducts} products
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Per page:</span>
                  <Select value={String(perPage)} onValueChange={(v) => { setPerPage(parseInt(v)); setCurrentPage(1); }}>
                    <SelectTrigger className="w-[70px]" data-testid="select-per-page">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">MRP</TableHead>
                      <TableHead className="text-right">GST%</TableHead>
                      <TableHead className="text-right">Reorder Lvl</TableHead>
                      <TableHead>Schedule</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedProducts.map((product: any) => {
                      const invInfo = getProductInventoryInfo(product);
                      return (
                        <TableRow key={product.id} data-testid={`row-product-${product.id}`}>
                          <TableCell className="font-mono text-sm">
                            {product.productCode}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{product.productName}</div>
                            {product.genericName && (
                              <div className="text-xs text-muted-foreground">{product.genericName}</div>
                            )}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{product.category?.categoryName || "-"}</TableCell>
                          <TableCell className="text-right font-mono text-sm">
                            {invInfo.mrp ? `₹${parseFloat(invInfo.mrp).toFixed(2)}` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {invInfo.gst ? `${invInfo.gst}%` : "-"}
                          </TableCell>
                          <TableCell className="text-right text-sm">
                            {invInfo.reorderLevel ?? "-"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 flex-wrap">
                              {getScheduleBadges(product).length > 0 ? getScheduleBadges(product) : <span className="text-muted-foreground text-xs">-</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStockBadge(invInfo.totalStock, invInfo.reorderLevel || 0)}
                          </TableCell>
                          <TableCell>
                            {product.isActive ? (
                              <Badge variant="default" data-testid={`badge-status-${product.id}`}>Active</Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-status-${product.id}`}>Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openViewDialog(product)}
                                    data-testid={`button-view-product-${product.id}`}
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
                                    onClick={() => openEditDialog(product)}
                                    data-testid={`button-edit-product-${product.id}`}
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit Product</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    onClick={() => openDeleteDialog(product)}
                                    data-testid={`button-delete-product-${product.id}`}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete Product</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 mt-4 flex-wrap">
                  <p className="text-sm text-muted-foreground">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      data-testid="button-prev-page"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum: number;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          size="icon"
                          variant={currentPage === pageNum ? "default" : "outline"}
                          onClick={() => setCurrentPage(pageNum)}
                          data-testid={`button-page-${pageNum}`}
                        >
                          {pageNum}
                        </Button>
                      );
                    })}
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      data-testid="button-next-page"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-no-products">No products found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update the product details below.</DialogDescription>
          </DialogHeader>
          {renderProductForm(editForm, onEditSubmit, updateProductMutation.isPending, true)}
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setSelectedProduct(null); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Product Details</DialogTitle>
            <DialogDescription>
              {selectedProduct?.productCode} - {selectedProduct?.productName}
            </DialogDescription>
          </DialogHeader>
          {viewLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading details...</p>
          ) : viewProduct ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Product Code</p>
                  <p className="font-medium" data-testid="text-view-product-code">{viewProduct.productCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Product Name</p>
                  <p className="font-medium" data-testid="text-view-product-name">{viewProduct.productName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Generic Name</p>
                  <p className="font-medium">{viewProduct.genericName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Category</p>
                  <p className="font-medium">{viewProduct.category?.categoryName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Manufacturer</p>
                  <p className="font-medium">{viewProduct.manufacturer?.manufacturerName || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Composition</p>
                  <p className="font-medium">{viewProduct.composition || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Dosage Form</p>
                  <p className="font-medium">{viewProduct.dosageForm || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Strength</p>
                  <p className="font-medium">{viewProduct.strength || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Pack Size</p>
                  <p className="font-medium">{viewProduct.packSize || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Unit</p>
                  <p className="font-medium">{viewProduct.unit}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">HSN Code</p>
                  <p className="font-mono font-medium">{viewProduct.hsnCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium">
                    {viewProduct.isActive ? (
                      <Badge variant="default">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {viewProduct.requiresPrescription && <Badge variant="outline">Requires Prescription (Rx)</Badge>}
                {viewProduct.isScheduleH && <Badge variant="destructive">Schedule H</Badge>}
                {viewProduct.isScheduleH1 && <Badge variant="destructive">Schedule H1</Badge>}
              </div>

              <Separator />
              <h3 className="font-semibold text-lg">Batch & Stock Information</h3>
              {viewProduct.inventory && viewProduct.inventory.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Batch #</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead className="text-right">MRP</TableHead>
                        <TableHead className="text-right">Purchase</TableHead>
                        <TableHead className="text-right">Selling</TableHead>
                        <TableHead className="text-right">GST%</TableHead>
                        <TableHead className="text-right">Stock</TableHead>
                        <TableHead className="text-right">Reorder</TableHead>
                        <TableHead>Expiry</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {viewProduct.inventory.map((inv: any) => (
                        <TableRow key={inv.id} data-testid={`row-inventory-${inv.id}`}>
                          <TableCell className="font-mono text-sm">{inv.batchNumber}</TableCell>
                          <TableCell>{inv.branch?.branchName || "-"}</TableCell>
                          <TableCell className="text-right font-mono">₹{parseFloat(inv.mrp).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">₹{parseFloat(inv.purchasePrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right font-mono">₹{parseFloat(inv.sellingPrice).toFixed(2)}</TableCell>
                          <TableCell className="text-right">{inv.gstPercentage}%</TableCell>
                          <TableCell className="text-right">
                            <span className={inv.quantityInStock <= inv.reorderLevel ? "text-red-600 dark:text-red-400 font-medium" : ""}>
                              {inv.quantityInStock}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{inv.reorderLevel}</TableCell>
                          <TableCell>
                            {inv.expiryDate ? new Date(inv.expiryDate).toLocaleDateString() : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No inventory batches found for this product.</p>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{selectedProduct?.productName}"? This will deactivate the product. It can be restored later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedProduct && deleteProductMutation.mutate(selectedProduct.id)}
              data-testid="button-confirm-delete"
            >
              {deleteProductMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
