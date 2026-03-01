import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";
import {
  Settings as SettingsIcon,
  Building2,
  User,
  Tag,
  Factory,
  Crown,
  MessageSquare,
  Brain,
  Plus,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { Textarea } from "@/components/ui/textarea";

function getAuthHeaders() {
  const token = localStorage.getItem("pharmacy_token");
  return { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
}

function getUserData() {
  try {
    const raw = localStorage.getItem("pharmacy_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function BranchInfoSection() {
  const user = getUserData();
  const branch = user?.branch;

  if (!branch) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No branch information available.</p>
        </CardContent>
      </Card>
    );
  }

  const fields = [
    { label: "Branch Code", value: branch.branchCode },
    { label: "Branch Name", value: branch.branchName },
    { label: "Address", value: branch.address },
    { label: "City", value: branch.city },
    { label: "State", value: branch.state },
    { label: "Pincode", value: branch.pincode },
    { label: "Phone", value: branch.phone },
    { label: "Email", value: branch.email },
    { label: "GST Number", value: branch.gstNumber },
    { label: "Drug License", value: branch.drugLicense },
    { label: "Manager", value: branch.managerName },
    { label: "Opening Time", value: branch.openingTime },
    { label: "Closing Time", value: branch.closingTime },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Branch Information
        </CardTitle>
        <CardDescription>Details about your current branch</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {fields.map((f) => (
            <div key={f.label} data-testid={`text-branch-${f.label.toLowerCase().replace(/\s/g, "-")}`}>
              <Label className="text-muted-foreground text-xs">{f.label}</Label>
              <p className="font-medium">{f.value || "N/A"}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function UserProfileSection() {
  const user = getUserData();
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordChange = () => {
    if (!currentPassword || !newPassword) {
      toast({ title: "Error", description: "Please fill in all password fields", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Error", description: "New passwords do not match", variant: "destructive" });
      return;
    }
    toast({ title: "Info", description: "Password change functionality will be available soon" });
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-muted-foreground">No user information available.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            User Profile
          </CardTitle>
          <CardDescription>Your account information</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div data-testid="text-user-fullname">
              <Label className="text-muted-foreground text-xs">Full Name</Label>
              <p className="font-medium">{user.fullName}</p>
            </div>
            <div data-testid="text-user-username">
              <Label className="text-muted-foreground text-xs">Username</Label>
              <p className="font-medium">{user.username}</p>
            </div>
            <div data-testid="text-user-email">
              <Label className="text-muted-foreground text-xs">Email</Label>
              <p className="font-medium">{user.email}</p>
            </div>
            <div data-testid="text-user-role">
              <Label className="text-muted-foreground text-xs">Role</Label>
              <p className="font-medium">{user.role?.roleName || "N/A"}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Change Password</CardTitle>
          <CardDescription>Update your account password</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 max-w-md">
            <div>
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                data-testid="input-current-password"
              />
            </div>
            <div>
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                data-testid="input-new-password"
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                data-testid="input-confirm-password"
              />
            </div>
            <Button onClick={handlePasswordChange} data-testid="button-change-password">
              Update Password
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function CategoriesSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [categoryName, setCategoryName] = useState("");
  const [description, setDescription] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/categories", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch categories");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: { categoryName: string; description: string }) => {
      const res = await fetch(apiUrl("/api/categories", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add category");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      toast({ title: "Success", description: "Category added successfully" });
      setCategoryName("");
      setDescription("");
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!categoryName.trim()) {
      toast({ title: "Error", description: "Category name is required", variant: "destructive" });
      return;
    }
    addMutation.mutate({ categoryName: categoryName.trim(), description: description.trim() });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Categories
          </CardTitle>
          <CardDescription>Manage product categories</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-category">
              <Plus className="h-4 w-4 mr-2" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Category</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="cat-name">Category Name</Label>
                <Input
                  id="cat-name"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  placeholder="e.g. Antibiotics"
                  data-testid="input-category-name"
                />
              </div>
              <div>
                <Label htmlFor="cat-desc">Description</Label>
                <Textarea
                  id="cat-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                  data-testid="input-category-description"
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="w-full"
                data-testid="button-submit-category"
              >
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Category
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categories?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No categories found
                  </TableCell>
                </TableRow>
              )}
              {categories?.map((cat: any) => (
                <TableRow key={cat.id} data-testid={`row-category-${cat.id}`}>
                  <TableCell>{cat.id}</TableCell>
                  <TableCell className="font-medium">{cat.categoryName}</TableCell>
                  <TableCell className="text-muted-foreground">{cat.description || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={cat.isActive ? "default" : "secondary"}>
                      {cat.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function ManufacturersSection() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    manufacturerName: "",
    contactPerson: "",
    phone: "",
    email: "",
    address: "",
    gstNumber: "",
  });

  const { data: manufacturers, isLoading } = useQuery({
    queryKey: ["manufacturers"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/manufacturers", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch manufacturers");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const res = await fetch(apiUrl("/api/manufacturers", {
        method: "POST",
        headers: getAuthHeaders(),
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to add manufacturer");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manufacturers"] });
      toast({ title: "Success", description: "Manufacturer added successfully" });
      setForm({ manufacturerName: "", contactPerson: "", phone: "", email: "", address: "", gstNumber: "" });
      setOpen(false);
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const handleAdd = () => {
    if (!form.manufacturerName.trim()) {
      toast({ title: "Error", description: "Manufacturer name is required", variant: "destructive" });
      return;
    }
    addMutation.mutate(form);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Manufacturers
          </CardTitle>
          <CardDescription>Manage product manufacturers</CardDescription>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-manufacturer">
              <Plus className="h-4 w-4 mr-2" />
              Add Manufacturer
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Manufacturer</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Manufacturer Name *</Label>
                <Input
                  value={form.manufacturerName}
                  onChange={(e) => setForm({ ...form, manufacturerName: e.target.value })}
                  placeholder="e.g. Sun Pharma"
                  data-testid="input-manufacturer-name"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Contact Person</Label>
                  <Input
                    value={form.contactPerson}
                    onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                    data-testid="input-manufacturer-contact"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    data-testid="input-manufacturer-phone"
                  />
                </div>
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  type="email"
                  data-testid="input-manufacturer-email"
                />
              </div>
              <div>
                <Label>GST Number</Label>
                <Input
                  value={form.gstNumber}
                  onChange={(e) => setForm({ ...form, gstNumber: e.target.value })}
                  data-testid="input-manufacturer-gst"
                />
              </div>
              <div>
                <Label>Address</Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  data-testid="input-manufacturer-address"
                />
              </div>
              <Button
                onClick={handleAdd}
                disabled={addMutation.isPending}
                className="w-full"
                data-testid="button-submit-manufacturer"
              >
                {addMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Add Manufacturer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>GST</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {manufacturers?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground">
                    No manufacturers found
                  </TableCell>
                </TableRow>
              )}
              {manufacturers?.map((m: any) => (
                <TableRow key={m.id} data-testid={`row-manufacturer-${m.id}`}>
                  <TableCell>{m.id}</TableCell>
                  <TableCell className="font-medium">{m.manufacturerName}</TableCell>
                  <TableCell className="text-muted-foreground">{m.contactPerson || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.phone || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{m.gstNumber || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={m.isActive ? "default" : "secondary"}>
                      {m.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function LoyaltyTiersSection() {
  const { data: tiers, isLoading } = useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/loyalty-tiers", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch loyalty tiers");
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Crown className="h-5 w-5" />
          Loyalty Tiers
        </CardTitle>
        <CardDescription>Customer loyalty program tier configuration</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : tiers?.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">No loyalty tiers configured</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {tiers?.map((tier: any) => (
              <Card key={tier.id} data-testid={`card-loyalty-tier-${tier.id}`}>
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <h3 className="font-semibold text-lg">{tier.tierName}</h3>
                    <Badge variant="outline">{tier.pointsMultiplier}x</Badge>
                  </div>
                  <Separator />
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Min Points</span>
                      <span className="font-medium">{tier.minPoints}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Max Points</span>
                      <span className="font-medium">{tier.maxPoints ?? "Unlimited"}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-muted-foreground">Discount</span>
                      <span className="font-medium">{tier.discountPercentage}%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WhatsAppStatusSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["whatsapp-status"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/whatsapp/status", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch WhatsApp status");
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          WhatsApp Integration
        </CardTitle>
        <CardDescription>WhatsApp API connection status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-4 rounded-md bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Unable to fetch WhatsApp status</p>
              <p className="text-sm text-muted-foreground">The service may be unavailable</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3" data-testid="status-whatsapp-connection">
              {data?.configured ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <p className="font-medium">
                  {data?.configured ? "WhatsApp API Configured" : "WhatsApp API Not Configured"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {data?.configured
                    ? "API credentials are set up and ready"
                    : "Set up WHATSAPP_API_TOKEN and WHATSAPP_PHONE_NUMBER_ID environment variables"}
                </p>
              </div>
            </div>
            {data?.provider && (
              <div className="text-sm">
                <span className="text-muted-foreground">Provider: </span>
                <span className="font-medium">{data.provider}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AIServiceSection() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["ai-health"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/ai/health", { headers: getAuthHeaders() });
      if (!res.ok) throw new Error("Failed to fetch AI health");
      return res.json();
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Service
        </CardTitle>
        <CardDescription>AI analytics service health status</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-3 p-4 rounded-md bg-destructive/10">
            <XCircle className="h-5 w-5 text-destructive" />
            <div>
              <p className="font-medium">Unable to reach AI Service</p>
              <p className="text-sm text-muted-foreground">The AI analytics service may be offline</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3" data-testid="status-ai-service">
              {data?.status === "healthy" || data?.status === "ok" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              ) : (
                <XCircle className="h-5 w-5 text-destructive" />
              )}
              <div>
                <p className="font-medium">
                  {data?.status === "healthy" || data?.status === "ok"
                    ? "AI Service Online"
                    : `AI Service: ${data?.status || "Unknown"}`}
                </p>
                {data?.version && (
                  <p className="text-sm text-muted-foreground">Version: {data.version}</p>
                )}
              </div>
            </div>
            {data?.endpoints && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Available Endpoints</p>
                <div className="flex flex-wrap gap-2">
                  {(Array.isArray(data.endpoints) ? data.endpoints : Object.keys(data.endpoints)).map(
                    (ep: string) => (
                      <Badge key={ep} variant="outline">
                        {ep}
                      </Badge>
                    )
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-settings-title">Settings</h1>
        <p className="text-muted-foreground">
          Manage your pharmacy system configuration
        </p>
      </div>

      <Tabs defaultValue="branch" className="space-y-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="branch" data-testid="tab-branch">
            <Building2 className="h-4 w-4 mr-2" />
            Branch
          </TabsTrigger>
          <TabsTrigger value="profile" data-testid="tab-profile">
            <User className="h-4 w-4 mr-2" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="categories" data-testid="tab-categories">
            <Tag className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="manufacturers" data-testid="tab-manufacturers">
            <Factory className="h-4 w-4 mr-2" />
            Manufacturers
          </TabsTrigger>
          <TabsTrigger value="loyalty" data-testid="tab-loyalty">
            <Crown className="h-4 w-4 mr-2" />
            Loyalty
          </TabsTrigger>
          <TabsTrigger value="whatsapp" data-testid="tab-whatsapp">
            <MessageSquare className="h-4 w-4 mr-2" />
            WhatsApp
          </TabsTrigger>
          <TabsTrigger value="ai" data-testid="tab-ai">
            <Brain className="h-4 w-4 mr-2" />
            AI Service
          </TabsTrigger>
        </TabsList>

        <TabsContent value="branch">
          <BranchInfoSection />
        </TabsContent>

        <TabsContent value="profile">
          <UserProfileSection />
        </TabsContent>

        <TabsContent value="categories">
          <CategoriesSection />
        </TabsContent>

        <TabsContent value="manufacturers">
          <ManufacturersSection />
        </TabsContent>

        <TabsContent value="loyalty">
          <LoyaltyTiersSection />
        </TabsContent>

        <TabsContent value="whatsapp">
          <WhatsAppStatusSection />
        </TabsContent>

        <TabsContent value="ai">
          <AIServiceSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
