import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Users, Plus, Search, Crown, Eye, Pencil, Trash2, MessageCircle,
  ChevronLeft, ChevronRight, X, ShoppingBag, Calendar, Clock
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiUrl } from "@/lib/api";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const customerFormSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  phone: z.string().min(10, "Phone must be at least 10 digits"),
  email: z.string().email("Invalid email").or(z.literal("")).optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  pincode: z.string().optional(),
  whatsappOptIn: z.boolean().default(false),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

const TIERS = ["ALL", "BRONZE", "SILVER", "GOLD", "PLATINUM"] as const;
const PAGE_SIZES = [10, 25, 50] as const;

function getDaysSinceLastVisit(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function Customers() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerProfile, setCustomerProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();

  const { data: customers, isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: async () => {
      const base = apiUrl("/api/customers");
      const url = search ? `${base}?search=${encodeURIComponent(search)}` : base;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to fetch customers");
      return response.json();
    },
  });

  const filteredCustomers = (customers || []).filter((c: any) => {
    if (tierFilter !== "ALL" && c.loyaltyTier !== tierFilter) return false;
    return true;
  });

  const totalCount = filteredCustomers.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safeCurrentPage = Math.min(page, totalPages);
  const startIdx = (safeCurrentPage - 1) * pageSize;
  const paginatedCustomers = filteredCustomers.slice(startIdx, startIdx + pageSize);

  const addForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerName: "", phone: "", email: "", dateOfBirth: "",
      gender: "", address: "", city: "", pincode: "", whatsappOptIn: false,
    },
  });

  const editForm = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      customerName: "", phone: "", email: "", dateOfBirth: "",
      gender: "", address: "", city: "", pincode: "", whatsappOptIn: false,
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: CustomerFormData) => {
      const payload: any = { customerName: data.customerName, phone: data.phone, whatsappOptIn: data.whatsappOptIn };
      if (data.email) payload.email = data.email;
      if (data.dateOfBirth) payload.dateOfBirth = new Date(data.dateOfBirth);
      if (data.gender) payload.gender = data.gender;
      if (data.address) payload.address = data.address;
      if (data.city) payload.city = data.city;
      if (data.pincode) payload.pincode = data.pincode;
      const response = await fetch(apiUrl("/api/customers"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) { const err = await response.text(); throw new Error(err || "Failed to add customer"); }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Customer added successfully" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setAddDialogOpen(false);
      addForm.reset();
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const editMutation = useMutation({
    mutationFn: async (data: CustomerFormData & { id: number }) => {
      const { id, ...rest } = data;
      const payload: any = { customerName: rest.customerName, phone: rest.phone, whatsappOptIn: rest.whatsappOptIn };
      if (rest.email) payload.email = rest.email;
      if (rest.dateOfBirth) payload.dateOfBirth = new Date(rest.dateOfBirth);
      if (rest.gender) payload.gender = rest.gender;
      if (rest.address) payload.address = rest.address;
      if (rest.city) payload.city = rest.city;
      if (rest.pincode) payload.pincode = rest.pincode;
      const response = await fetch(apiUrl(`/api/customers/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });
      if (!response.ok) { const err = await response.text(); throw new Error(err || "Failed to update customer"); }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Customer updated successfully" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setEditDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(apiUrl(`/api/customers/${id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to delete customer");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Customer deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteDialogOpen(false);
      setSelectedCustomer(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const openEditDialog = (customer: any) => {
    setSelectedCustomer(customer);
    editForm.reset({
      customerName: customer.customerName || "",
      phone: customer.phone || "",
      email: customer.email || "",
      dateOfBirth: customer.dateOfBirth ? new Date(customer.dateOfBirth).toISOString().split("T")[0] : "",
      gender: customer.gender || "",
      address: customer.address || "",
      city: customer.city || "",
      pincode: customer.pincode || "",
      whatsappOptIn: customer.whatsappOptIn || false,
    });
    setEditDialogOpen(true);
  };

  const openViewProfile = async (customer: any) => {
    setSelectedCustomer(customer);
    setProfileLoading(true);
    setViewDialogOpen(true);
    try {
      const response = await fetch(apiUrl(`/api/customers/${customer.id}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error("Failed to load profile");
      const profile = await response.json();
      setCustomerProfile(profile);
    } catch {
      toast({ title: "Error", description: "Failed to load customer profile", variant: "destructive" });
    } finally {
      setProfileLoading(false);
    }
  };

  const openDeleteConfirm = (customer: any) => {
    setSelectedCustomer(customer);
    setDeleteDialogOpen(true);
  };

  const sendWhatsApp = (customer: any) => {
    const phone = customer.phone?.replace(/\D/g, "");
    if (phone) {
      window.open(`https://wa.me/91${phone}`, "_blank");
    }
  };

  const getTierVariant = (tier: string): "default" | "secondary" | "outline" => {
    switch (tier) {
      case "GOLD": case "PLATINUM": return "default";
      case "SILVER": return "secondary";
      default: return "outline";
    }
  };

  const renderCustomerForm = (form: any, onSubmit: (data: any) => void, isPending: boolean, submitLabel: string) => (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="customerName" render={({ field }) => (
          <FormItem>
            <FormLabel>Customer Name *</FormLabel>
            <FormControl><Input data-testid="input-customer-name" placeholder="Full name" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem>
              <FormLabel>Phone *</FormLabel>
              <FormControl><Input data-testid="input-phone" placeholder="10-digit phone" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl><Input data-testid="input-email" placeholder="email@example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
            <FormItem>
              <FormLabel>Date of Birth</FormLabel>
              <FormControl><Input data-testid="input-dob" type="date" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="gender" render={({ field }) => (
            <FormItem>
              <FormLabel>Gender</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger data-testid="select-gender"><SelectValue placeholder="Select gender" /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="address" render={({ field }) => (
          <FormItem>
            <FormLabel>Address</FormLabel>
            <FormControl><Input data-testid="input-address" placeholder="Street address" {...field} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />

        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="city" render={({ field }) => (
            <FormItem>
              <FormLabel>City</FormLabel>
              <FormControl><Input data-testid="input-city" placeholder="City" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={form.control} name="pincode" render={({ field }) => (
            <FormItem>
              <FormLabel>Pincode</FormLabel>
              <FormControl><Input data-testid="input-pincode" placeholder="6-digit pincode" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </div>

        <FormField control={form.control} name="whatsappOptIn" render={({ field }) => (
          <FormItem className="flex flex-row items-center gap-3 space-y-0">
            <FormControl>
              <Checkbox data-testid="checkbox-whatsapp" checked={field.value} onCheckedChange={field.onChange} />
            </FormControl>
            <FormLabel className="cursor-pointer">Enable WhatsApp notifications</FormLabel>
            <FormMessage />
          </FormItem>
        )} />

        <Button type="submit" className="w-full" disabled={isPending} data-testid="button-submit-customer">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </form>
    </Form>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold" data-testid="text-page-title">Customers</h1>
          <p className="text-muted-foreground">Manage customer profiles and loyalty program</p>
        </div>
        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer"><Plus className="h-4 w-4 mr-2" />Add Customer</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-dialog-title">Add New Customer</DialogTitle>
              <DialogDescription>Fill in the details below to create a new customer record.</DialogDescription>
            </DialogHeader>
            {renderCustomerForm(addForm, (data: CustomerFormData) => addMutation.mutate(data), addMutation.isPending, "Add Customer")}
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                data-testid="input-search-customers"
                placeholder="Search by name, phone, or customer code..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-10"
              />
            </div>
            <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1); }}>
              <SelectTrigger className="w-[160px]" data-testid="select-tier-filter">
                <SelectValue placeholder="Loyalty Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Tiers</SelectItem>
                <SelectItem value="BRONZE">Bronze</SelectItem>
                <SelectItem value="SILVER">Silver</SelectItem>
                <SelectItem value="GOLD">Gold</SelectItem>
                <SelectItem value="PLATINUM">Platinum</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3" data-testid="text-loading">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : paginatedCustomers.length > 0 ? (
            <>
              <div className="text-sm text-muted-foreground mb-3" data-testid="text-record-count">
                Showing {startIdx + 1}–{Math.min(startIdx + pageSize, totalCount)} of {totalCount} customers
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Customer Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Date of Birth</TableHead>
                      <TableHead>Loyalty Tier</TableHead>
                      <TableHead>Points</TableHead>
                      <TableHead>Total Purchases</TableHead>
                      <TableHead>Last Visit</TableHead>
                      <TableHead>Days Since Visit</TableHead>
                      <TableHead>WhatsApp</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedCustomers.map((customer: any) => {
                      const daysSince = getDaysSinceLastVisit(customer.updatedAt);
                      return (
                        <TableRow key={customer.id} data-testid={`row-customer-${customer.id}`}>
                          <TableCell className="font-mono text-sm" data-testid={`text-customer-code-${customer.id}`}>
                            {customer.customerCode}
                          </TableCell>
                          <TableCell className="font-medium" data-testid={`text-customer-name-${customer.id}`}>
                            {customer.customerName}
                          </TableCell>
                          <TableCell className="font-mono">{customer.phone}</TableCell>
                          <TableCell>{formatDate(customer.dateOfBirth)}</TableCell>
                          <TableCell>
                            <Badge variant={getTierVariant(customer.loyaltyTier)}>
                              <Crown className="h-3 w-3 mr-1" />
                              {customer.loyaltyTier}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-bold">{customer.loyaltyPoints}</TableCell>
                          <TableCell>{"\u20B9"}{parseFloat(customer.totalPurchases || "0").toFixed(2)}</TableCell>
                          <TableCell>{formatDate(customer.updatedAt)}</TableCell>
                          <TableCell>
                            {daysSince !== null ? (
                              <Badge variant={daysSince >= 60 ? "destructive" : "secondary"} data-testid={`badge-days-since-${customer.id}`}>
                                <Clock className="h-3 w-3 mr-1" />
                                {daysSince}d
                              </Badge>
                            ) : "-"}
                          </TableCell>
                          <TableCell>
                            {customer.whatsappOptIn ? (
                              <Badge variant="default">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => openViewProfile(customer)} data-testid={`button-view-${customer.id}`}>
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>View Profile</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => openEditDialog(customer)} data-testid={`button-edit-${customer.id}`}>
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Edit</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => openDeleteConfirm(customer)} data-testid={`button-delete-${customer.id}`}>
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Delete</TooltipContent>
                              </Tooltip>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="icon" variant="ghost" onClick={() => sendWhatsApp(customer)} data-testid={`button-whatsapp-${customer.id}`}>
                                    <MessageCircle className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send WhatsApp</TooltipContent>
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
                  <Select value={pageSize.toString()} onValueChange={(v) => { setPageSize(parseInt(v)); setPage(1); }}>
                    <SelectTrigger className="w-[80px]" data-testid="select-page-size">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PAGE_SIZES.map((s) => (
                        <SelectItem key={s} value={s.toString()}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    Page {safeCurrentPage} of {totalPages}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={safeCurrentPage <= 1}
                    onClick={() => setPage(safeCurrentPage - 1)}
                    data-testid="button-prev-page"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={safeCurrentPage >= totalPages}
                    onClick={() => setPage(safeCurrentPage + 1)}
                    data-testid="button-next-page"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-12" data-testid="text-empty-state">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No customers found</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-edit-dialog-title">Edit Customer</DialogTitle>
            <DialogDescription>Update the customer details below.</DialogDescription>
          </DialogHeader>
          {renderCustomerForm(
            editForm,
            (data: CustomerFormData) => editMutation.mutate({ ...data, id: selectedCustomer?.id }),
            editMutation.isPending,
            "Save Changes"
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={viewDialogOpen} onOpenChange={(open) => { setViewDialogOpen(open); if (!open) { setCustomerProfile(null); setSelectedCustomer(null); } }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle data-testid="text-profile-dialog-title">Customer Profile</DialogTitle>
            <DialogDescription>View customer details and purchase history.</DialogDescription>
          </DialogHeader>
          {profileLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-6 w-1/2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : customerProfile ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-medium" data-testid="text-profile-name">{customerProfile.customerName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Customer Code</p>
                  <p className="font-mono" data-testid="text-profile-code">{customerProfile.customerCode}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-mono">{customerProfile.phone}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p>{customerProfile.email || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Date of Birth</p>
                  <p>{formatDate(customerProfile.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Gender</p>
                  <p>{customerProfile.gender || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p>{[customerProfile.address, customerProfile.city, customerProfile.pincode].filter(Boolean).join(", ") || "-"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Loyalty</p>
                  <div className="flex items-center gap-2">
                    <Badge variant={getTierVariant(customerProfile.loyaltyTier)}>
                      <Crown className="h-3 w-3 mr-1" />{customerProfile.loyaltyTier}
                    </Badge>
                    <span className="font-bold">{customerProfile.loyaltyPoints} pts</span>
                  </div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Purchases</p>
                  <p className="font-bold">{"\u20B9"}{parseFloat(customerProfile.totalPurchases || "0").toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">WhatsApp</p>
                  <Badge variant={customerProfile.whatsappOptIn ? "default" : "outline"}>
                    {customerProfile.whatsappOptIn ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>

              <Separator />

              <div>
                <h3 className="font-semibold mb-3 flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4" /> Purchase History
                </h3>
                {customerProfile.sales && customerProfile.sales.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Invoice</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerProfile.sales.map((sale: any) => (
                        <TableRow key={sale.id} data-testid={`row-sale-${sale.id}`}>
                          <TableCell className="font-mono text-sm">{sale.invoiceNumber}</TableCell>
                          <TableCell>{formatDate(sale.saleDate)}</TableCell>
                          <TableCell>{sale.paymentMethod}</TableCell>
                          <TableCell className="font-bold">{"\u20B9"}{parseFloat(sale.totalAmount).toFixed(2)}</TableCell>
                          <TableCell>
                            <Badge variant={sale.status === "COMPLETED" ? "default" : "secondary"}>{sale.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-muted-foreground text-sm py-4 text-center" data-testid="text-no-purchases">No purchase history found</p>
                )}
              </div>

              {customerProfile.loyaltyTransactions && customerProfile.loyaltyTransactions.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-3 flex items-center gap-2">
                      <Crown className="h-4 w-4" /> Loyalty Transactions
                    </h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Type</TableHead>
                          <TableHead>Points</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Date</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {customerProfile.loyaltyTransactions.map((tx: any) => (
                          <TableRow key={tx.id} data-testid={`row-loyalty-${tx.id}`}>
                            <TableCell>
                              <Badge variant={tx.transactionType === "EARN" ? "default" : "secondary"}>
                                {tx.transactionType}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-bold">
                              {tx.transactionType === "EARN" ? "+" : "-"}{tx.points}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">{tx.description || "-"}</TableCell>
                            <TableCell>{formatDate(tx.createdAt)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Customer</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <span className="font-semibold">{selectedCustomer?.customerName}</span>? This action will deactivate the customer record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedCustomer && deleteMutation.mutate(selectedCustomer.id)}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
