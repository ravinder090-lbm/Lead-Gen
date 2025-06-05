import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Plus, Copy, RotateCcw, Gift, Users, Percent } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { MainLayout } from "@/components/layout/main-layout";

interface Coupon {
  id: number;
  code: string;
  maxUses: number;
  currentUses: number;
  coinAmount: number;
  active: boolean;
  createdAt: string;
  createdByName: string;
}

export default function AdminCoupons() {
  const [isCreating, setIsCreating] = useState(false);
  const [maxUses, setMaxUses] = useState("100");
  const [coinAmount, setCoinAmount] = useState("50");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: coupons, isLoading } = useQuery<Coupon[]>({
    queryKey: ["/api/coupons"],
  });

  const createCouponMutation = useMutation({
    mutationFn: (data: { maxUses: number; coinAmount: number; active: boolean }) =>
      apiRequest("POST", "/api/coupons", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      setIsCreating(false);
      setMaxUses("100");
      setCoinAmount("50");
      toast({
        title: "Success",
        description: "Coupon created successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create coupon",
        variant: "destructive",
      });
    },
  });

  const toggleCouponMutation = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) =>
      apiRequest("PATCH", `/api/coupons/${id}`, { active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/coupons"] });
      toast({
        title: "Success",
        description: "Coupon status updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update coupon",
        variant: "destructive",
      });
    },
  });

  const handleCreateCoupon = () => {
    const maxUsesNum = parseInt(maxUses);
    const coinAmountNum = parseInt(coinAmount);

    if (isNaN(maxUsesNum) || maxUsesNum <= 0) {
      toast({
        title: "Error",
        description: "Max uses must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(coinAmountNum) || coinAmountNum <= 0) {
      toast({
        title: "Error",
        description: "Coin amount must be a positive number",
        variant: "destructive",
      });
      return;
    }

    createCouponMutation.mutate({
      maxUses: maxUsesNum,
      coinAmount: coinAmountNum,
      active: true,
    });
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "Coupon code copied to clipboard",
    });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <RotateCcw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <MainLayout>
<div className="container p-6 space-y-6 w-full max-w-full ">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Coupon Management</h1>
            <p className="text-muted-foreground">Create and manage promotional coupon codes</p>
          </div>
          <Button
            onClick={() => setIsCreating(!isCreating)}
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Coupon
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600">Total Coupons</p>
                  <p className="text-2xl font-bold text-green-700">{coupons?.length || 0}</p>
                </div>
                <Gift className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">Active Coupons</p>
                  <p className="text-2xl font-bold text-blue-700">
                    {coupons?.filter(c => c.active).length || 0}
                  </p>
                </div>
                <Percent className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">Total Claims</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {coupons?.reduce((acc, c) => acc + c.currentUses, 0) || 0}
                  </p>
                </div>
                <Users className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

      {isCreating && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Coupon</CardTitle>
            <CardDescription>
              Generate a new coupon code with specified coin amount and usage limits
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="maxUses">Maximum Uses</Label>
                <Input
                  id="maxUses"
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="100"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="coinAmount">Coin Amount</Label>
                <Input
                  id="coinAmount"
                  type="number"
                  value={coinAmount}
                  onChange={(e) => setCoinAmount(e.target.value)}
                  placeholder="50"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCreateCoupon}
                disabled={createCouponMutation.isPending}
              >
                {createCouponMutation.isPending ? "Creating..." : "Create Coupon"}
              </Button>
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4">
        {coupons?.map((coupon) => (
          <Card key={coupon.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <code className="bg-muted px-2 py-1 rounded text-lg font-mono">
                      {coupon.code}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(coupon.code)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>{coupon.coinAmount} LeadCoins</span>
                    <span>
                      {coupon.currentUses}/{coupon.maxUses} uses
                    </span>
                    <span>Created by {coupon.createdByName}</span>
                    <span>{new Date(coupon.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <Badge variant={coupon.active ? "default" : "secondary"}>
                    {coupon.active ? "Active" : "Inactive"}
                  </Badge>
                  <Switch
                    checked={coupon.active}
                    onCheckedChange={(checked) =>
                      toggleCouponMutation.mutate({ id: coupon.id, active: checked })
                    }
                    disabled={toggleCouponMutation.isPending}
                  />
                </div>
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${Math.min((coupon.currentUses / coupon.maxUses) * 100, 100)}%`,
                  }}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {!coupons?.length && (
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground">No coupons created yet</p>
            <Button
              onClick={() => setIsCreating(true)}
              className="mt-4"
              variant="outline"
            >
              Create your first coupon
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
    </MainLayout>
    
  );
}