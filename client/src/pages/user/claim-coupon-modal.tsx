import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Gift } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface ClaimCouponModalProps {
  onSuccess?: () => void;
}

export default function ClaimCouponModal({ onSuccess }: ClaimCouponModalProps) {
  const [open, setOpen] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const claimCouponMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest("POST", "/api/coupons/claim", { code }),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      setOpen(false);
      setCouponCode("");
      toast({
        title: "Coupon Claimed Successfully!",
        description: `You received ${data.coinsReceived} LeadCoins. New balance: ${data.newBalance}`,
      });
      onSuccess?.();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Claim Coupon",
        description: error.message || "Invalid or expired coupon code",
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    if (!couponCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a coupon code",
        variant: "destructive",
      });
      return;
    }

    claimCouponMutation.mutate(couponCode.trim().toUpperCase());
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Gift className="h-4 w-4" />
          Claim Coupon
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Claim Coupon Code</DialogTitle>
          <DialogDescription>
            Enter your coupon code to receive free LeadCoins
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="couponCode">Coupon Code</Label>
            <Input
              id="couponCode"
              value={couponCode}
              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground">
              Format: XXXX-XXXX-XXXX (letters and numbers only)
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={handleClaim}
              disabled={claimCouponMutation.isPending || !couponCode.trim()}
              className="flex-1"
            >
              {claimCouponMutation.isPending ? "Claiming..." : "Claim Coupon"}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}