import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { GitBranch, Plus, Eye, Pencil, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiUrl } from "@/lib/api";

export default function Branches() {
  const token = localStorage.getItem("pharmacy_token");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [form, setForm] = useState({
    branchCode: "", branchName: "", address: "", city: "", state: "", pincode: "",
    phone: "", email: "", gstNumber: "", drugLicense: "", drugLicenseExpiry: "",
    managerName: "", openingTime: "09:00", closingTime: "21:00",
  });

  const { data: branches, isLoading } = useQuery({
    queryKey: ["branches"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/branches"), { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(apiUrl("/api/branches"), {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...data, drugLicenseExpiry: new Date(data.drugLicenseExpiry) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error); }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["branches"] });
      toast({ title: "Branch added successfully" });
      setAddOpen(false);
      setForm({ branchCode: "", branchName: "", address: "", city: "", state: "", pincode: "", phone: "", email: "", gstNumber: "", drugLicense: "", drugLicenseExpiry: "", managerName: "", openingTime: "09:00", closingTime: "21:00" });
    },
    onError: (e: any) => { toast({ title: "Error", description: e.message, variant: "destructive" }); },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" data-testid="text-page-title">Branches</h1>
          <p className="text-muted-foreground text-sm">Manage pharmacy branches</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-branch"><Plus className="h-4 w-4 mr-2" />Add Branch</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Add New Branch</DialogTitle></DialogHeader>
            <div className="grid grid-cols-2 gap-4">
              {[
                { key: "branchCode", label: "Branch Code *", placeholder: "BR001" },
                { key: "branchName", label: "Branch Name *", placeholder: "Main Branch" },
                { key: "address", label: "Address *", placeholder: "123 Street" },
                { key: "city", label: "City *", placeholder: "Mumbai" },
                { key: "state", label: "State *", placeholder: "Maharashtra" },
                { key: "pincode", label: "Pincode *", placeholder: "400001" },
                { key: "phone", label: "Phone *", placeholder: "9876543210" },
                { key: "email", label: "Email", placeholder: "branch@email.com" },
                { key: "gstNumber", label: "GST Number *", placeholder: "27AABCU9603R1ZP" },
                { key: "drugLicense", label: "Drug License *", placeholder: "DL-XXXXX" },
                { key: "drugLicenseExpiry", label: "License Expiry *", placeholder: "", type: "date" },
                { key: "managerName", label: "Manager Name", placeholder: "John Doe" },
                { key: "openingTime", label: "Opening Time", placeholder: "09:00" },
                { key: "closingTime", label: "Closing Time", placeholder: "21:00" },
              ].map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs">{field.label}</Label>
                  <Input
                    type={field.type || "text"}
                    placeholder={field.placeholder}
                    value={(form as any)[field.key]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    data-testid={`input-branch-${field.key}`}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button onClick={() => addMutation.mutate(form)} disabled={addMutation.isPending} data-testid="button-save-branch">
                {addMutation.isPending ? "Saving..." : "Save Branch"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="text-sm text-muted-foreground">Showing {branches?.length || 0} branches</div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading branches...</p>
          ) : branches && branches.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Branch Name</TableHead>
                  <TableHead>City</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>GST Number</TableHead>
                  <TableHead>Drug License</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {branches.map((b: any) => (
                  <TableRow key={b.id} data-testid={`row-branch-${b.id}`}>
                    <TableCell className="font-mono text-sm">{b.branchCode}</TableCell>
                    <TableCell className="font-medium">{b.branchName}</TableCell>
                    <TableCell>{b.city}</TableCell>
                    <TableCell className="font-mono text-sm">{b.phone}</TableCell>
                    <TableCell className="font-mono text-xs">{b.gstNumber}</TableCell>
                    <TableCell className="font-mono text-xs">{b.drugLicense}</TableCell>
                    <TableCell>{b.managerName || "-"}</TableCell>
                    <TableCell>
                      <Badge variant={b.isActive ? "default" : "secondary"}>{b.isActive ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TooltipProvider>
                          <Tooltip><TooltipTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><Eye className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent>View</TooltipContent></Tooltip>
                        </TooltipProvider>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No branches found</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
