import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Truck, Plus, Search, Eye, Pencil, Trash2, Download, ChevronLeft, ChevronRight } from "lucide-react";
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
import { apiUrl } from "@/lib/api";
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
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";

const emptyForm = {
  supplierName: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  gstNumber: "",
  drugLicense: "",
  paymentTerms: "",
  creditLimit: "",
};

export default function Suppliers() {
  const [search, setSearch] = useState("");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [formData, setFormData] = useState({ ...emptyForm });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();

  const { data: suppliers, isLoading } = useQuery({
    queryKey: ["/api/suppliers"],
    queryFn: async () => {
      const response = await fetch(apiUrl("/api/suppliers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      return response.json();
    },
  });

  const filteredSuppliers = suppliers?.filter((s: any) => {
    if (!search) return true;
    const term = search.toLowerCase();
    return (
      s.supplierName.toLowerCase().includes(term) ||
      s.supplierCode.toLowerCase().includes(term) ||
      s.phone?.includes(term)
    );
  }) || [];

  const totalRecords = filteredSuppliers.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const startIndex = (safeCurrentPage - 1) * pageSize;
  const paginatedSuppliers = filteredSuppliers.slice(startIndex, startIndex + pageSize);

  const resetForm = () => setFormData({ ...emptyForm });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await fetch(apiUrl("/api/suppliers"), {
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
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier added successfully" });
      setAddDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to add supplier", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await fetch(apiUrl(`/api/suppliers/${id}`), {
        method: "PUT",
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
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier updated successfully" });
      setEditDialogOpen(false);
      setSelectedSupplier(null);
      resetForm();
    },
    onError: (error: any) => {
      toast({ title: "Failed to update supplier", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(apiUrl(`/api/suppliers/${id}`), {
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
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
      toast({ title: "Supplier deleted successfully" });
      setDeleteDialogOpen(false);
      setSelectedSupplier(null);
    },
    onError: (error: any) => {
      toast({ title: "Failed to delete supplier", description: error.message, variant: "destructive" });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload: any = {
      supplierName: formData.supplierName,
      phone: formData.phone,
      address: formData.address,
    };
    if (formData.contactPerson) payload.contactPerson = formData.contactPerson;
    if (formData.email) payload.email = formData.email;
    if (formData.city) payload.city = formData.city;
    if (formData.state) payload.state = formData.state;
    if (formData.pincode) payload.pincode = formData.pincode;
    if (formData.gstNumber) payload.gstNumber = formData.gstNumber;
    if (formData.drugLicense) payload.drugLicense = formData.drugLicense;
    if (formData.paymentTerms) payload.paymentTerms = formData.paymentTerms;
    if (formData.creditLimit) payload.creditLimit = formData.creditLimit;
    createMutation.mutate(payload);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSupplier) return;
    const payload: any = {
      supplierName: formData.supplierName,
      phone: formData.phone,
      address: formData.address,
      contactPerson: formData.contactPerson || null,
      email: formData.email || null,
      city: formData.city || null,
      state: formData.state || null,
      pincode: formData.pincode || null,
      gstNumber: formData.gstNumber || null,
      drugLicense: formData.drugLicense || null,
      paymentTerms: formData.paymentTerms || null,
      creditLimit: formData.creditLimit || null,
    };
    updateMutation.mutate({ id: selectedSupplier.id, data: payload });
  };

  const openEditDialog = (supplier: any) => {
    setSelectedSupplier(supplier);
    setFormData({
      supplierName: supplier.supplierName || "",
      contactPerson: supplier.contactPerson || "",
      phone: supplier.phone || "",
      email: supplier.email || "",
      address: supplier.address || "",
      city: supplier.city || "",
      state: supplier.state || "",
      pincode: supplier.pincode || "",
      gstNumber: supplier.gstNumber || "",
      drugLicense: supplier.drugLicense || "",
      paymentTerms: supplier.paymentTerms || "",
      creditLimit: supplier.creditLimit || "",
    });
    setEditDialogOpen(true);
  };

  const openViewDialog = (supplier: any) => {
    setSelectedSupplier(supplier);
    setViewDialogOpen(true);
  };

  const openDeleteDialog = (supplier: any) => {
    setSelectedSupplier(supplier);
    setDeleteDialogOpen(true);
  };

  const updateField = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const formatCurrency = (val: any) => {
    if (!val || val === "0" || val === "0.00") return "₹0.00";
    return `₹${parseFloat(val).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  };

  const exportToExcel = () => {
    if (!filteredSuppliers.length) return;
    const headers = ["Supplier Code", "Supplier Name", "Contact Person", "Phone", "Email", "City", "GST Number", "Payment Terms", "Credit Limit", "Outstanding Balance", "Status"];
    const rows = filteredSuppliers.map((s: any) => [
      s.supplierCode,
      s.supplierName,
      s.contactPerson || "",
      s.phone || "",
      s.email || "",
      s.city || "",
      s.gstNumber || "",
      s.paymentTerms || "",
      s.creditLimit || "0",
      s.outstandingBalance || "0",
      s.isActive ? "Active" : "Inactive",
    ]);
    const csvContent = [headers, ...rows].map((r) => r.map((c: string) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "suppliers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const SupplierFormFields = () => (
    <div className="grid grid-cols-2 gap-4">
      <div className="space-y-2">
        <Label htmlFor="supplierName">Supplier Name *</Label>
        <Input id="supplierName" data-testid="input-supplier-name" value={formData.supplierName} onChange={(e) => updateField("supplierName", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="contactPerson">Contact Person</Label>
        <Input id="contactPerson" data-testid="input-contact-person" value={formData.contactPerson} onChange={(e) => updateField("contactPerson", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone *</Label>
        <Input id="phone" data-testid="input-phone" value={formData.phone} onChange={(e) => updateField("phone", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" data-testid="input-email" type="email" value={formData.email} onChange={(e) => updateField("email", e.target.value)} />
      </div>
      <div className="col-span-2 space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Input id="address" data-testid="input-address" value={formData.address} onChange={(e) => updateField("address", e.target.value)} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="city">City</Label>
        <Input id="city" data-testid="input-city" value={formData.city} onChange={(e) => updateField("city", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="state">State</Label>
        <Input id="state" data-testid="input-state" value={formData.state} onChange={(e) => updateField("state", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="pincode">Pincode</Label>
        <Input id="pincode" data-testid="input-pincode" value={formData.pincode} onChange={(e) => updateField("pincode", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="gstNumber">GST Number</Label>
        <Input id="gstNumber" data-testid="input-gst-number" value={formData.gstNumber} onChange={(e) => updateField("gstNumber", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="drugLicense">Drug License</Label>
        <Input id="drugLicense" data-testid="input-drug-license" value={formData.drugLicense} onChange={(e) => updateField("drugLicense", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="paymentTerms">Payment Terms</Label>
        <Input id="paymentTerms" data-testid="input-payment-terms" placeholder="e.g., Net 30" value={formData.paymentTerms} onChange={(e) => updateField("paymentTerms", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="creditLimit">Credit Limit</Label>
        <Input id="creditLimit" data-testid="input-credit-limit" type="number" step="0.01" placeholder="0.00" value={formData.creditLimit} onChange={(e) => updateField("creditLimit", e.target.value)} />
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 data-testid="text-page-title" className="text-3xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your pharmacy suppliers and vendors</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" data-testid="button-export" onClick={exportToExcel}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Dialog open={addDialogOpen} onOpenChange={(open) => { setAddDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-supplier">
                <Plus className="h-4 w-4 mr-2" />
                Add Supplier
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Supplier</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <SupplierFormFields />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" data-testid="button-cancel-add" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                  <Button type="submit" data-testid="button-submit-supplier" disabled={createMutation.isPending}>
                    {createMutation.isPending ? "Adding..." : "Add Supplier"}
                  </Button>
                </div>
              </form>
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
                data-testid="input-search"
                placeholder="Search by name, code, or phone..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-10"
              />
            </div>
            <p className="text-sm text-muted-foreground whitespace-nowrap" data-testid="text-record-count">
              Showing {paginatedSuppliers.length} of {totalRecords} suppliers
            </p>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading suppliers...</p>
          ) : paginatedSuppliers.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Supplier Name</TableHead>
                      <TableHead>Contact Person</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>City</TableHead>
                      <TableHead>GST Number</TableHead>
                      <TableHead>Payment Terms</TableHead>
                      <TableHead className="text-right">Credit Limit</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedSuppliers.map((supplier: any) => {
                      const outstanding = parseFloat(supplier.outstandingBalance || "0");
                      return (
                        <TableRow key={supplier.id} data-testid={`row-supplier-${supplier.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-supplier-code-${supplier.id}`}>
                            {supplier.supplierCode}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-supplier-name-${supplier.id}`}>
                            {supplier.supplierName}
                          </TableCell>
                          <TableCell className="text-muted-foreground">{supplier.contactPerson || "-"}</TableCell>
                          <TableCell className="font-mono">{supplier.phone}</TableCell>
                          <TableCell className="text-muted-foreground">{supplier.email || "-"}</TableCell>
                          <TableCell>{supplier.city || "-"}</TableCell>
                          <TableCell className="font-mono text-sm">{supplier.gstNumber || "-"}</TableCell>
                          <TableCell>{supplier.paymentTerms || "-"}</TableCell>
                          <TableCell className="text-right">{supplier.creditLimit ? formatCurrency(supplier.creditLimit) : "-"}</TableCell>
                          <TableCell className={`text-right font-medium ${outstanding > 0 ? "text-red-600 dark:text-red-400" : ""}`} data-testid={`text-outstanding-${supplier.id}`}>
                            {formatCurrency(supplier.outstandingBalance)}
                          </TableCell>
                          <TableCell>
                            {supplier.isActive ? (
                              <Badge variant="default" data-testid={`badge-status-${supplier.id}`}>Active</Badge>
                            ) : (
                              <Badge variant="secondary" data-testid={`badge-status-${supplier.id}`}>Inactive</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-view-${supplier.id}`} onClick={() => openViewDialog(supplier)}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-edit-${supplier.id}`} onClick={() => openEditDialog(supplier)}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" data-testid={`button-delete-${supplier.id}`} onClick={() => openDeleteDialog(supplier)}>
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
              </div>

              <div className="flex items-center justify-between gap-4 flex-wrap mt-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows per page:</span>
                  <Select value={String(pageSize)} onValueChange={(val) => { setPageSize(Number(val)); setCurrentPage(1); }}>
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
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <Button size="icon" variant="outline" data-testid="button-prev-page" disabled={safeCurrentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="outline" data-testid="button-next-page" disabled={safeCurrentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <Truck className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground" data-testid="text-empty-state">No suppliers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={(open) => { setEditDialogOpen(open); if (!open) { setSelectedSupplier(null); resetForm(); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Supplier</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <SupplierFormFields />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" data-testid="button-cancel-edit" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
              <Button type="submit" data-testid="button-save-edit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) setSelectedSupplier(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Supplier Details</DialogTitle>
          </DialogHeader>
          {selectedSupplier && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <p className="text-lg font-semibold" data-testid="text-view-name">{selectedSupplier.supplierName}</p>
                  <p className="text-sm text-muted-foreground font-mono">{selectedSupplier.supplierCode}</p>
                </div>
                {selectedSupplier.isActive ? (
                  <Badge variant="default">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )}
              </div>
              <Separator />
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Contact Person</p>
                  <p className="font-medium">{selectedSupplier.contactPerson || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Phone</p>
                  <p className="font-medium font-mono">{selectedSupplier.phone}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Email</p>
                  <p className="font-medium">{selectedSupplier.email || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">City</p>
                  <p className="font-medium">{selectedSupplier.city || "-"}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Address</p>
                  <p className="font-medium">
                    {[selectedSupplier.address, selectedSupplier.city, selectedSupplier.state, selectedSupplier.pincode].filter(Boolean).join(", ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">GST Number</p>
                  <p className="font-medium font-mono">{selectedSupplier.gstNumber || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Drug License</p>
                  <p className="font-medium font-mono">{selectedSupplier.drugLicense || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Payment Terms</p>
                  <p className="font-medium">{selectedSupplier.paymentTerms || "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Credit Limit</p>
                  <p className="font-medium">{selectedSupplier.creditLimit ? formatCurrency(selectedSupplier.creditLimit) : "-"}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Outstanding Balance</p>
                  <p className={`font-medium ${parseFloat(selectedSupplier.outstandingBalance || "0") > 0 ? "text-red-600 dark:text-red-400" : ""}`}>
                    {formatCurrency(selectedSupplier.outstandingBalance)}
                  </p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => { setDeleteDialogOpen(open); if (!open) setSelectedSupplier(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Supplier</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedSupplier?.supplierName}</span>? This action will mark the supplier as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              data-testid="button-confirm-delete"
              onClick={() => selectedSupplier && deleteMutation.mutate(selectedSupplier.id)}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
