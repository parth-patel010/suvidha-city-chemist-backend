import { useQuery } from "@tanstack/react-query";
import { Crown, Star, Gift, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { apiUrl } from "@/lib/api";

export default function Loyalty() {
  const token = localStorage.getItem("pharmacy_token");

  const { data: tiers, isLoading: tiersLoading } = useQuery({
    queryKey: ["loyalty-tiers"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/loyalty-tiers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch tiers");
      return res.json();
    },
  });

  const { data: customers } = useQuery({
    queryKey: ["customers"],
    queryFn: async () => {
      const res = await fetch(apiUrl("/api/customers"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed");
      return res.json();
    },
  });

  const tierDistribution = customers ? {
    BRONZE: customers.filter((c: any) => c.loyaltyTier === "BRONZE").length,
    SILVER: customers.filter((c: any) => c.loyaltyTier === "SILVER").length,
    GOLD: customers.filter((c: any) => c.loyaltyTier === "GOLD").length,
    PLATINUM: customers.filter((c: any) => c.loyaltyTier === "PLATINUM").length,
  } : { BRONZE: 0, SILVER: 0, GOLD: 0, PLATINUM: 0 };

  const tierColors: Record<string, string> = {
    BRONZE: "bg-orange-100 text-orange-700 border-orange-200",
    SILVER: "bg-gray-100 text-gray-700 border-gray-200",
    GOLD: "bg-yellow-100 text-yellow-700 border-yellow-200",
    PLATINUM: "bg-purple-100 text-purple-700 border-purple-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold" data-testid="text-page-title">Loyalty & Rewards</h1>
        <p className="text-muted-foreground text-sm">Manage loyalty tiers, points, and rewards</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {["BRONZE", "SILVER", "GOLD", "PLATINUM"].map((tier) => (
          <Card key={tier} data-testid={`card-tier-${tier.toLowerCase()}`}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Crown className="h-4 w-4" />
                {tier}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{tierDistribution[tier as keyof typeof tierDistribution]}</div>
              <p className="text-xs text-muted-foreground mt-1">customers</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5" />
            Tier Configuration
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tiersLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading tiers...</p>
          ) : tiers && tiers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tier</TableHead>
                  <TableHead>Min Points</TableHead>
                  <TableHead>Max Points</TableHead>
                  <TableHead>Discount %</TableHead>
                  <TableHead>Points Multiplier</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tiers.map((tier: any) => (
                  <TableRow key={tier.id} data-testid={`row-tier-${tier.id}`}>
                    <TableCell>
                      <Badge className={tierColors[tier.tierName] || ""}>
                        <Crown className="h-3 w-3 mr-1" />
                        {tier.tierName}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono">{tier.minPoints}</TableCell>
                    <TableCell className="font-mono">{tier.maxPoints || "Unlimited"}</TableCell>
                    <TableCell>{tier.discountPercentage}%</TableCell>
                    <TableCell>{tier.pointsMultiplier}x</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Gift className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No loyalty tiers configured</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Loyalty Members
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customers && customers.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Points</TableHead>
                  <TableHead>Total Purchases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers
                  .sort((a: any, b: any) => b.loyaltyPoints - a.loyaltyPoints)
                  .slice(0, 10)
                  .map((c: any) => (
                    <TableRow key={c.id} data-testid={`row-member-${c.id}`}>
                      <TableCell className="font-medium">{c.customerName}</TableCell>
                      <TableCell className="font-mono text-sm">{c.phone}</TableCell>
                      <TableCell>
                        <Badge className={tierColors[c.loyaltyTier] || ""}>
                          {c.loyaltyTier}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-bold">{c.loyaltyPoints}</TableCell>
                      <TableCell>₹{parseFloat(c.totalPurchases || "0").toFixed(2)}</TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-center py-8 text-muted-foreground">No customers yet</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
