import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Edit, Trash2, MoreVertical } from "lucide-react";
import { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type Subscription } from "@shared/schema";
import { useLocation } from "wouter";
import { confirmDelete } from "@/lib/sweet-alert";
import { useAuth } from "@/contexts/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface PlanCardProps {
  plan: Subscription;
  isActive?: boolean;
  showBuyCoins?: boolean;
  onEdit?: (plan: Subscription) => void;
}

export function PlanCard({
  plan,
  isActive = false,
  showBuyCoins = false,
  onEdit,
}: PlanCardProps) {
  const [location] = useLocation();
  const { toast } = useToast();
  const { refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const isDashboard =
    location.startsWith("/admin/subscriptions") ||
    location.startsWith("/subadmin/subscriptions");
  const isAdmin =
    location.startsWith("/admin/subscriptions") ||
    location.startsWith("/subadmin/subscriptions");

  const handleSubscribe = async () => {
    // Directly create a payment session and redirect to payment URL
    setIsLoading(true);
    try {
      // Create payment session via API
      const response = await apiRequest("POST", "/api/subscriptions/purchase", {
        subscriptionId: plan.id,
      });
      const data = await response.json();

      if (data.paymentSession && data.paymentSession.paymentUrl) {
        // Store session ID in localStorage for verification after return
        localStorage.setItem(
          "pendingPaymentSessionId",
          data.paymentSession.sessionId,
        );

        // Redirect to Stripe payment URL
        window.location.href = data.paymentSession.paymentUrl;
      } else {
        throw new Error("Failed to create payment URL");
      }
    } catch (error: any) {
      let errorMessage = "Failed to start checkout process. Please try again.";
      let errorTitle = "Checkout Error";
      let isSubscriptionLimitError = false;
      
      // Check if error contains JSON response data
      if (error.response) {
        try {
          const errorData = await error.response.json();
          errorMessage = errorData.message || errorMessage;
          
          // Check if the error message contains text about subscription limit
          if (errorMessage.includes("maximum limit of 3 subscription plans")) {
            errorTitle = "Subscription Limit Reached";
            isSubscriptionLimitError = true;
          }
        } catch (e) {
          // If we can't parse the JSON, use the error message or default
          errorMessage = error.message || errorMessage;
        }
      } else {
        // Just use the error message if available
        errorMessage = error.message || errorMessage;
      }
      
      // Show the error toast
      toast({
        variant: "destructive",
        title: errorTitle,
        description: errorMessage
      });
      
      // If it's a subscription limit error, show a helpful message about lead coins
      if (isSubscriptionLimitError) {
        setTimeout(() => {
          toast({
            title: "Need More Leads?",
            description: "You can still purchase additional Lead Coins to access more leads!",
            variant: "default"
          });
        }, 1000);
      }
      
      setIsLoading(false);
    }
  };

  const handleBuyCoins = async () => {
    setIsLoading(true);

    try {
      // Use fetch directly with error handling to avoid potential React Query issues
      const response = await fetch('/api/subscriptions/buy-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscriptionId: plan.id }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase LeadCoins');
      }

      const result = await response.json();

      // If we received a payment session with a URL, redirect to Stripe
      if (result.paymentSession && result.paymentSession.paymentUrl) {
        // Store the session ID in localStorage to verify payment status when returning
        localStorage.setItem('pendingPaymentSessionId', result.paymentSession.sessionId);
        
        toast({
          title: "Redirecting to payment",
          description: "You'll be redirected to complete your purchase securely.",
        });
        
        // Redirect to Stripe checkout page
        window.location.href = result.paymentSession.paymentUrl;
      } else {
        // In case we get a direct success (unlikely in production)
        toast({
          title: "Purchase successful",
          description: `You have successfully purchased ${plan.leadCoins} LeadCoins.`,
        });

        // Refresh user data
        refreshUser();
        
        // Invalidate relevant queries
        queryClient.invalidateQueries({
          queryKey: ["/api/auth/me"],
        });
        queryClient.invalidateQueries({
          queryKey: ["/api/user/dashboard"],
        });
      }
    } catch (error: any) {
      console.error("Error buying coins:", error);
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description:
          error.message || "Failed to purchase LeadCoins. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    const confirm = await confirmDelete(
      "Delete subscription plan?",
      "This will permanently delete this subscription plan. This action cannot be undone.",
    );

    if (!confirm) return; // Changed from !confirm.isConfirmed to just !confirm

    setIsLoading(true);

    try {
      const response = await fetch(`/api/subscriptions/${plan.id}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to delete plan");
      }

      toast({
        title: "Plan deleted",
        description: "The subscription plan has been deleted successfully.",
      });

      // Update cache immediately to remove the plan
      queryClient.setQueryData(["/api/subscriptions"], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.filter((p) => p.id !== plan.id);
      });

      // Still refresh to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to delete plan. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleStatus = async () => {
    setIsLoading(true);

    try {
      await apiRequest("PATCH", `/api/subscriptions/${plan.id}/toggle-status`);

      // Immediately toggle the active status in the UI
      const newActiveStatus = !plan.active;

      toast({
        title: plan.active ? "Plan deactivated" : "Plan activated",
        description: `The subscription plan has been ${plan.active ? "deactivated" : "activated"} successfully.`,
      });

      // Update the cache immediately
      queryClient.setQueryData(["/api/subscriptions"], (oldData: any[]) => {
        if (!oldData) return oldData;
        return oldData.map((p) => {
          if (p.id === plan.id) {
            return { ...p, active: newActiveStatus };
          }
          return p;
        });
      });

      // Still refresh to ensure consistency
      queryClient.invalidateQueries({ queryKey: ["/api/subscriptions"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update plan status. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Card
        className={`flex flex-col h-full ${isActive ? "border-primary shadow-lg" : ""}`}
      >
        <CardHeader className="flex flex-col space-y-1.5 pb-4">
          <div className="flex justify-between items-start">
            <div>
              {isActive && <Badge className="mb-2">Current Plan</Badge>}
              {isDashboard && (
                <Badge
                  variant={plan.active ? "default" : "secondary"}
                  className="mb-2 ml-2"
                >
                  {plan.active ? "Active" : "Inactive"}
                </Badge>
              )}
            </div>
            {isAdmin && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit && onEdit(plan)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>Edit</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleToggleStatus}>
                    <Badge
                      variant="outline"
                      className="mr-2 h-4 px-1 py-0 text-xs"
                    >
                      {plan.active ? "OFF" : "ON"}
                    </Badge>
                    <span>{plan.active ? "Deactivate" : "Activate"}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>Delete</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <div className="mt-2">
            <span className="text-3xl font-bold">
              {formatCurrency(plan.price)}
            </span>
            {plan.durationDays && (
              <span className="text-sm text-text-secondary ml-1">
                / {plan.durationDays} days
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-text-secondary mb-4">{plan.description}</p>
          <ul className="space-y-2">
            <li className="flex items-center">
              <Check className="mr-2 h-4 w-4 text-primary" />
              <span>{plan.leadCoins} LeadCoins included</span>
            </li>
            {plan.features &&
              plan.features.map((feature, i) => (
                <li key={i} className="flex items-center">
                  <Check className="mr-2 h-4 w-4 text-primary" />
                  <span>{feature}</span>
                </li>
              ))}
          </ul>
        </CardContent>
        {!isDashboard && (
          <CardFooter>
            <Button
              className="w-full"
              onClick={showBuyCoins ? handleBuyCoins : handleSubscribe}
              disabled={isLoading || (isActive && !showBuyCoins)}
            >
              {isLoading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="flex space-x-1">
                    <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/30" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/50" />
                    <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/70" />
                  </div>
                  <span>Processing</span>
                </div>
              ) : isActive && !showBuyCoins ? (
                "Current Plan"
              ) : showBuyCoins ? (
                `Buy ${plan.leadCoins} Coins`
              ) : (
                "Choose This Plan"
              )}
            </Button>
          </CardFooter>
        )}
      </Card>

      {/* Payment Modal removed as we're redirecting directly to Stripe */}
    </>
  );
}
