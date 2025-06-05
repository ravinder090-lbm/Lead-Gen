import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Subscription } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SubadminSubscriptions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");

  // Check if user has permission
  const hasPermission = user?.permissions?.includes("subscription_management");

  // Handle unauthorized access
  if (!hasPermission) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the subscription management
              module.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // Fetch subscriptions data
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery<
    Subscription[]
  >({
    queryKey: ["/api/subscriptions"],
  });

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Subscription Management
        </h1>
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Plans</TabsTrigger>
                <TabsTrigger value="active">Active</TabsTrigger>
                <TabsTrigger value="inactive">Inactive</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {isLoadingSubscriptions ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-0">
                <div className="p-5">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-9 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-5 space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <div className="space-y-2">
                    {Array.from({ length: 3 }).map((_, j) => (
                      <div key={j} className="flex items-center">
                        <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                        <Skeleton className="h-4 flex-1" />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-5">
                  <Skeleton className="h-9 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : subscriptions && subscriptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subscriptions
            .filter(
              (plan) =>
                activeTab === "all" ||
                (activeTab === "active" && plan.active) ||
                (activeTab === "inactive" && !plan.active),
            )
            .map((plan) => (
              <PlanCard key={plan.id} plan={plan} />
            ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <i className="ri-stack-line text-5xl text-gray-300 mb-3"></i>
          <h3 className="text-lg font-medium">No subscription plans found</h3>
          <p className="text-text-secondary mt-1">
            Check back later for available subscription plans
          </p>
        </div>
      )}
    </MainLayout>
  );
}
