import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { PendingSubscriptionCard } from "@/components/dashboard/pending-subscription-card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { type Subscription, type UserSubscription } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle, XCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import ClaimCouponModal from "@/components/users/claim-coupon-modal";
export default function UserSubscriptions() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("subscriptions");
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [paymentStatus, setPaymentStatus] = useState<{
    success?: boolean;
    message?: string;
  }>({});
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);
  
  // Check if this is a coin purchase (from URL parameter)
  const isCoinPurchase = new URLSearchParams(window.location.search).get("coins") === "true";
  
  // If it's a coin purchase, set the active tab to "coins"
  useEffect(() => {
    if (isCoinPurchase) {
      setActiveTab("coins");
    }
  }, [isCoinPurchase]);
  
  // Redirect to profile page if no payment verification is needed
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hasPaymentParams = urlParams.get("success") === "true" || 
                             urlParams.get("canceled") === "true" || 
                             urlParams.get("verify") === "true" ||
                             urlParams.get("session_id");
                             
    if (!hasPaymentParams) {
      // Redirect to profile page with the appropriate tab
      navigate("/user/profile?tab=subscriptions");
    }
  }, [navigate]);

  // Get URL query parameters
  const urlParams = new URLSearchParams(window.location.search);
  const success = urlParams.get("success") === "true";
  const canceled = urlParams.get("canceled") === "true";
  const sessionId = urlParams.get("session_id");
  
  // Reset history page to 1 when changing to history tab
  useEffect(() => {
    if (activeTab === "history") {
      setHistoryPage(1);
    }
  }, [activeTab]);

  // Check payment status when coming back from Stripe
  useEffect(() => {
    // First check if we have a pending payment session ID in localStorage
    const pendingSessionId = localStorage.getItem("pendingPaymentSessionId");
    const hasReturnedFromPayment = pendingSessionId || success || canceled;

    if (!hasReturnedFromPayment) return;

    if (canceled) {
      setPaymentStatus({
        success: false,
        message: "Payment was canceled. You can try again when you're ready.",
      });
      // Clear any pending session
      localStorage.removeItem("pendingPaymentSessionId");
      return;
    }

    // Determine which session ID to use (prefer the URL parameter if available)
    const sessionIdToVerify = sessionId || pendingSessionId;
    
    if (sessionIdToVerify) {
      // Show verifying message
      setPaymentStatus({
        success: undefined,
        message: "Verifying your payment status...",
      });
      
      // Verify the payment
      const verifyPayment = async () => {
        try {
          // Check if this is a coin purchase by looking at URL
          const urlParams = new URLSearchParams(window.location.search);
          const isCoinPurchase = urlParams.get("coins") === "true";
          
          // Build the verification URL with the appropriate parameter
          const verifyUrl = `/api/subscriptions/verify-payment?sessionId=${sessionIdToVerify}${isCoinPurchase ? '&coins=true' : ''}`;
          
          const response = await apiRequest(
            "GET",
            verifyUrl,
          );
          const data = await response.json();
          
          if (response.ok && (data.verified === true || data.success === true)) {
            // Create a more detailed success message
            const cleanUrl = location.split("?")[0];
            window.history.replaceState({}, document.title, cleanUrl);
            
            // Different message based on transaction type
            let message = '';
            
            if (isCoinPurchase || data.coinPurchase) {
              // This was a coin purchase
              const coinAmount = data.coinPurchase?.leadCoins || 
                     data.leadCoins || 
                     "additional";
                     
              message = `Your LeadCoins purchase was successful! ${coinAmount} LeadCoins have been added to your account.`;
              
              // Update the tab to show the coins tab
              setActiveTab("coins");
            } else {
              // Regular subscription purchase
              const subscriptionData = data.userSubscription;
              const planName = subscriptionData?.name || 
                subscriptions?.find(s => s.id === subscriptionData?.subscriptionId)?.name || 
                "Premium Plan";
              
              message = `Your subscription to ${planName} has been activated successfully. You now have access to ${subscriptionData?.leadCoinsLeft || 0} LeadCoins.`;
            }
            
            setPaymentStatus({
              success: true,
              message: message,
            });
            
            // Notify user with toast
            toast({
              title: "Payment Successful!",
              description: "Your subscription is now active.",
            });
            
            // Refresh user data and subscription data
            queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/current"] });
            queryClient.invalidateQueries({ queryKey: ["/api/subscriptions/pending"] });
            queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
            
            // Redirect to profile page with active_subs tab after successful payment
            setTimeout(() => {
              navigate("/user/profile?tab=active_subs");
            }, 1500);

            // Clear the pending session ID
            localStorage.removeItem("pendingPaymentSessionId");
          } else {
            // Payment verification failed or is still pending
            setPaymentStatus({
              success: false,
              message: data.error || "Payment verification failed. Please try again or contact support.",
            });
            
            // Only remove pending session ID if there was a definitive failure
            // For "still processing" type responses, keep the ID for later verification
            if (data.error && !data.pending) {
              localStorage.removeItem("pendingPaymentSessionId");
            }
          }
        } catch (error: any) {
          console.error("Error verifying payment:", error);
          
          // Try to extract a more specific error message if available
          let errorMessage = "Failed to verify payment status. Please contact support.";
          
          if (error.response) {
            try {
              const errorData = await error.response.json();
              
              // Check if this is a subscription limit message
              if (errorData.message && errorData.message.includes("maximum limit of 3 subscription plans")) {
                errorMessage = errorData.message;
                
                // Display a toast with guidance for the user
                toast({
                  title: "Subscription Limit Reached",
                  description: "You've reached the maximum of 3 subscription plans. You can still purchase LeadCoins to access more leads.",
                  variant: "default",
                });
              } else {
                errorMessage = errorData.message || errorMessage;
              }
            } catch (e) {
              // If we can't parse the error response JSON, just use the default message
            }
          }
          
          setPaymentStatus({
            success: false,
            message: errorMessage,
          });

          // Clear the pending session ID
          localStorage.removeItem("pendingPaymentSessionId");
        }
      };

      verifyPayment();
    }
  }, [success, canceled, sessionId, location, toast]);

  // Fetch subscriptions data
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery<
    Subscription[]
  >({
    queryKey: ["/api/subscriptions"],
  });

  // Fetch current subscription data
  const { data: currentSubscription, isLoading: isLoadingCurrentSubscription } =
    useQuery<UserSubscription & { name: string }>({
      queryKey: ["/api/subscriptions/current"],
    });

  // Fetch pending subscriptions
  const {
    data: pendingSubscriptions = [],
    isLoading: isLoadingPendingSubscriptions,
  } = useQuery({
    queryKey: ["/api/subscriptions/pending"],
    refetchOnWindowFocus: false,
  });
  
  // Fetch subscription history with pagination
  const {
    data: subscriptionHistory,
    isLoading: isLoadingHistory,
  } = useQuery<{
    history: Array<
    | (UserSubscription & { type: 'subscription' })
    | {
        id: number;
        type: 'coin_transfer';
        amount: number;
        description: string;
        createdAt: string;
        adminName: string;
      }
  >;
    pagination: {
      total: number;
      page: number;
      limit: number;
      totalPages: number;
    }
  }>({
    queryKey: ["/api/subscriptions/history", { page: historyPage, limit: historyLimit }],
    refetchOnWindowFocus: false,
    enabled: activeTab === "history",
  });

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Subscription Plans
        </h1>
        <div className="inline-flex px-3 py-1.5 bg-primary text-white rounded-full items-center">
          <i className="ri-coin-line mr-1"></i>
          <span className="font-medium">LeadCoins: </span>
          <span className="ml-1 font-bold">{user?.leadCoins || 0}</span>
        </div>
      </div>

      {/* Payment status alert */}
      {paymentStatus.message && (
        <Alert
          className={`mb-6 ${paymentStatus.success === true ? "bg-green-50 border-green-200" : 
                           paymentStatus.success === false ? "bg-red-50 border-red-200" : 
                           "bg-blue-50 border-blue-200"}`}
        >
          {paymentStatus.success === true ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : paymentStatus.success === false ? (
            <XCircle className="h-4 w-4 text-red-600" />
          ) : (
            <div className="flex space-x-1">
              <Skeleton className="h-1.5 w-1.5 rounded-full bg-blue-300" />
              <Skeleton className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <Skeleton className="h-1.5 w-1.5 rounded-full bg-blue-500" />
            </div>
          )}
          <AlertTitle className={
            paymentStatus.success === true ? "text-green-800" : 
            paymentStatus.success === false ? "text-red-800" : 
            "text-blue-800"
          }>
            {paymentStatus.success === true ? "Payment Successful" : 
             paymentStatus.success === false ? "Payment Issue" : 
             "Verifying Payment"}
          </AlertTitle>
          <AlertDescription
            className={
              paymentStatus.success === true ? "text-green-700" : 
              paymentStatus.success === false ? "text-red-700" : 
              "text-blue-700"
            }
          >
            {paymentStatus.message}

            {/* Show subscription details when payment is successful */}
            {paymentStatus.success === true && currentSubscription && (
              <div className="mt-3 p-3 bg-white/70 rounded-md border border-green-100">
                <p className="font-medium text-green-900">
                  Your subscription is now active:
                </p>
                <ul className="mt-1 space-y-1 text-sm">
                  <li className="flex items-center">
                    <span className="font-medium mr-2">Plan:</span>
                    {subscriptions?.find(
                      (s) => s.id === currentSubscription.subscriptionId,
                    )?.name || "Premium Plan"}
                  </li>
                  <li className="flex items-center">
                    <span className="font-medium mr-2">Status:</span>
                    <span className="capitalize">
                      {currentSubscription.status}
                    </span>
                  </li>
                  <li className="flex items-center">
                    <span className="font-medium mr-2">LeadCoins:</span>
                    {currentSubscription.leadCoinsLeft}
                  </li>
                  <li className="flex items-center">
                    <span className="font-medium mr-2">Valid until:</span>
                    {currentSubscription.endDate
                      ? new Date(
                          currentSubscription.endDate,
                        ).toLocaleDateString()
                      : "N/A"}
                  </li>
                </ul>
              </div>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="mb-2 flex flex-wrap">
          <TabsTrigger value="subscriptions">Available Plans</TabsTrigger>
          <TabsTrigger value="active">Active Subscriptions</TabsTrigger>
          <TabsTrigger value="pending">Pending Subscriptions</TabsTrigger>
          <TabsTrigger value="history">Subscription History</TabsTrigger>
          <TabsTrigger value="coins" className="bg-amber-50 hover:bg-amber-100 data-[state=active]:bg-amber-200">
            <span className="flex items-center">
              <i className="ri-coin-line mr-1"></i>
              Buy LeadCoins
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Available Subscription Plans */}
        <TabsContent value="subscriptions">
          <h2 className="text-xl font-semibold mb-4">Available Subscription Plans</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingSubscriptions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, j) => (
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
              ))
            ) : subscriptions?.length ? (
              subscriptions
                .filter((plan) => plan.active)
                .map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    isActive={currentSubscription?.subscriptionId === plan.id}
                  />
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 text-center">
                <i className="ri-stack-line text-5xl text-gray-300 mb-3"></i>
                <h3 className="text-lg font-medium">
                  No subscription plans available
                </h3>
                <p className="text-text-secondary mt-1">
                  Check back later for available subscription plans
                </p>
              </div>
            )}
          </div>
        </TabsContent>
        
        {/* Active Subscriptions Tab */}
        <TabsContent value="active">
          <h2 className="text-xl font-semibold mb-4">Your Active Subscriptions</h2>
          {isLoadingCurrentSubscription ? (
            <Card className="mb-6">
              <CardHeader>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-4" />
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="h-3 w-8" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : currentSubscription && currentSubscription.status === "active" ? (
            <Card className="mb-6 bg-gradient-to-br from-blue-50 to-white border-blue-100">
              <CardHeader className="border-b border-blue-100">
                <CardTitle className="text-primary">Current Subscription</CardTitle>
                <CardDescription>
                  Your active subscription plan details
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-bold text-primary">
                        {subscriptions?.find(
                          (s) => s.id === currentSubscription.subscriptionId,
                        )?.name || "Premium Plan"}
                      </h3>
                      <p className="text-sm text-text-secondary">
                        Valid until:{" "}
                        {currentSubscription.endDate
                          ? new Date(
                              currentSubscription.endDate,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                    <div>
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        Active
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-text-secondary">
                        LeadCoins Remaining:
                      </span>
                      <span className="font-medium">
                        {currentSubscription.leadCoinsLeft} coins
                      </span>
                    </div>

                    <Progress
                      value={
                        (currentSubscription.leadCoinsLeft / 
                          (subscriptions?.find(s => s.id === currentSubscription.subscriptionId)?.leadCoins || 100)) *
                        100
                      }
                    />

                    <div className="flex justify-between text-xs text-text-secondary">
                      <span>0</span>
                      <span>
                        Usage:{" "}
                        {Math.round(
                          (1 -
                            currentSubscription.leadCoinsLeft /
                              (subscriptions?.find(s => s.id === currentSubscription.subscriptionId)?.leadCoins || 100)) *
                            100,
                        )}
                        %
                      </span>
                      <span>100%</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50 rounded-lg border border-blue-100">
              <i className="ri-information-line text-5xl text-blue-300 mb-3"></i>
              <h3 className="text-lg font-medium text-blue-700">
                No active subscriptions
              </h3>
              <p className="text-blue-600 mt-1">
                You don't have any active subscription plans at the moment.
                Visit the "Available Plans" tab to subscribe.
              </p>
            </div>
          )}
        </TabsContent>
        
        {/* Pending Subscriptions Tab */}
        <TabsContent value="pending">
          <h2 className="text-xl font-semibold mb-4">Pending Subscriptions</h2>
          {isLoadingPendingSubscriptions ? (
            <Card className="mb-6">
              <CardHeader>
                <Skeleton className="h-6 w-44" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <Skeleton className="h-8 w-32" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : Array.isArray(pendingSubscriptions) && pendingSubscriptions.length > 0 ? (
            <div className="grid gap-4">
              {pendingSubscriptions.map((pendingSub) => (
                <PendingSubscriptionCard
                  key={pendingSub.id}
                  subscription={pendingSub}
                  subscriptionInfo={subscriptions?.find(
                    (s) => s.id === pendingSub.subscriptionId,
                  )}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50 rounded-lg border border-blue-100">
              <i className="ri-time-line text-5xl text-blue-300 mb-3"></i>
              <h3 className="text-lg font-medium text-blue-700">
                No pending subscriptions
              </h3>
              <p className="text-blue-600 mt-1">
                You don't have any pending subscription plans awaiting payment verification.
              </p>
            </div>
          )}
        </TabsContent>
        
        {/* Subscription History Tab */}
        {/* Coins Tab */}
        <TabsContent value="coins">
          <div className="mb-4 space-y-2">
            <h2 className="text-xl font-semibold">Buy LeadCoins</h2>
            <p className="text-gray-500">
              Purchase LeadCoins to view lead contact details, without subscribing to a monthly plan.
            </p>
          </div>
          
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-lg border border-amber-100 mb-6">
          <div className="flex items-center justify-between">
              <div className="flex items-center">
                <i className="ri-coin-line text-amber-500 text-2xl mr-3"></i>
                <div>
                  <h3 className="font-medium text-amber-800">Your LeadCoins Balance</h3>
                  <p className="text-2xl font-bold text-amber-700">{user?.leadCoins || 0} coins</p>
                </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {isLoadingSubscriptions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                      </div>
                    </div>
                    <div className="p-5">
                      <Skeleton className="h-9 w-full" />
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : subscriptions?.length ? (
              subscriptions
                .filter((plan) => plan.active)
                .map((plan) => (
                  <Card key={plan.id} className="overflow-hidden border-amber-100">
                    {/* Coin Package Header */}
                    <CardHeader className="pb-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="font-semibold">{plan.name}</CardTitle>
                          <CardDescription className="text-2xl font-bold text-amber-600 mt-1">
                            ${plan.price.toFixed(2)}
                          </CardDescription>
                        </div>
                        <Badge className="bg-amber-500 hover:bg-amber-600">
                          {plan.leadCoins} Coins
                        </Badge>
                      </div>
                    </CardHeader>
                    
                    {/* Coin Package Content */}
                    <CardContent className="pt-4">
                      <p className="text-sm text-gray-500 mb-4">
                        Purchase {plan.leadCoins} LeadCoins to access lead details.
                      </p>
                      
                      {/* Usage Information */}
                      <div className="space-y-2 mb-6 text-sm">
                        <div className="flex items-center">
                          <i className="ri-check-line text-amber-600 mr-2"></i>
                          <span>Unlock contact details of leads</span>
                        </div>
                        <div className="flex items-center">
                          <i className="ri-check-line text-amber-600 mr-2"></i>
                          <span>No subscription required</span>
                        </div>
                        <div className="flex items-center">
                          <i className="ri-check-line text-amber-600 mr-2"></i>
                          <span>Coins never expire</span>
                        </div>
                      </div>
                      
                      {/* Buy Button */}
                      <Button 
                        className="w-full bg-amber-600 hover:bg-amber-700"
                        onClick={async () => {
                          try {
                            const response = await apiRequest(
                              "POST",
                              "/api/subscriptions/buy-coins",
                              {
                                subscriptionId: plan.id,
                              }
                            );
                            
                            const data = await response.json();
                            
                            if (response.ok && data.url) {
                              // Store the payment session ID in localStorage to check it when the user returns
                              localStorage.setItem("pendingPaymentSessionId", data.sessionId);
                              
                              // Redirect to Stripe checkout
                              window.location.href = data.url;
                              
                              // Show a loading toast
                              toast({
                                title: "Redirecting to payment...",
                                description: "Please complete your purchase on the secure payment page.",
                              });
                            } else {
                              toast({
                                title: "Error",
                                description: data.message || "Could not create payment session",
                                variant: "destructive",
                              });
                            }
                          } catch (error) {
                            console.error("Error purchasing coins:", error);
                            toast({
                              title: "Error",
                              description: "Failed to create payment session",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <i className="ri-coin-line mr-2"></i>
                        Buy {plan.leadCoins} Coins
                      </Button>
                    </CardContent>
                  </Card>
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 text-center">
                <i className="ri-coin-line text-5xl text-gray-300 mb-3"></i>
                <h3 className="text-lg font-medium text-gray-900">No coin packages available</h3>
                <p className="text-gray-500 mt-1">
                  There are currently no coin packages available for purchase.
                </p>
              </div>
            )}
          </div>
          
          {/* Information section */}
          <div className="p-4 border rounded-lg bg-gray-50">
            <h3 className="font-medium text-gray-900 mb-2">How LeadCoins Work</h3>
            <ul className="space-y-1 text-gray-600 text-sm">
              <li className="flex items-start">
                <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
                LeadCoins are used to unlock contact information for leads in the system.
              </li>
              <li className="flex items-start">
                <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
                Different information levels cost different amounts of coins.
              </li>
              <li className="flex items-start">
                <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
                Once purchased, your coins remain in your account until used.
              </li>
              <li className="flex items-start">
                <i className="ri-information-line text-blue-500 mr-2 mt-0.5"></i>
                Payments are securely processed through Stripe.
              </li>
            </ul>
          </div>
          </div>
          </div>
        </TabsContent>
        
        <TabsContent value="history">
          <h2 className="text-xl font-semibold mb-4">Subscription History</h2>
          
          {isLoadingHistory ? (
            <Card className="mb-6">
              <CardContent className="p-5">
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
                  ) : subscriptionHistory?.history && subscriptionHistory.history.length > 0 ? (
            <Card>
              <CardContent className="p-5">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50 hover:bg-blue-50">
                    <TableHead className="text-blue-700">Type</TableHead>
                    <TableHead className="text-blue-700">Description</TableHead>
                      <TableHead className="text-blue-700">Status</TableHead>
                      <TableHead className="text-blue-700">Date</TableHead>
                      <TableHead className="text-blue-700">Coins</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                  {subscriptionHistory.history.map((item) => {
                      if (item.type === 'coin_transfer') {
                        return (
                          <TableRow key={`transfer-${item.id}`} className="border-b border-blue-100">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="bg-green-100 p-1 rounded-full mr-2">
                                  <i className="ri-coin-line text-green-600 text-sm"></i>
                                </div>
                                Admin Coin Transfer
                              </div>
                            </TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{item.description}</p>
                                {item.adminName && (
                                  <p className="text-sm text-gray-500">
                                    Sent by: {item.adminName}
                                  </p>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
                                Completed
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-green-700">
                              +{item.amount} coins
                            </TableCell>
                          </TableRow>
                        );
                      } else {
                        // Regular subscription
                        const plan = subscriptions?.find(s => s.id === item.subscriptionId);
                        return (
                          <TableRow key={`subscription-${item.id}`} className="border-b border-blue-100">
                            <TableCell className="font-medium">
                              <div className="flex items-center">
                                <div className="bg-blue-100 p-1 rounded-full mr-2">
                                  <i className="ri-file-list-3-line text-blue-600 text-sm"></i>
                                </div>
                                Subscription Plan
                              </div>
                            </TableCell>
                            <TableCell>
                              <p className="font-medium">{plan?.name || 'Unknown Plan'}</p>
                              <p className="text-sm text-gray-500">{plan?.description}</p>
                            </TableCell>
                            <TableCell>
                              <Badge className={
                                item.status === 'active' && item.paymentVerified ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                                item.status === 'active' && !item.paymentVerified ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : 
                                item.status === 'pending' ? 'bg-blue-100 text-blue-800 hover:bg-blue-200' : 
                                'bg-gray-100 text-gray-800 hover:bg-gray-200'
                              }>
                                {item.status === 'active' && item.paymentVerified ? 'Active' : 
                                 item.status === 'active' && !item.paymentVerified ? 'Processing' : 
                                 item.status === 'pending' ? 'Pending' : 
                                 item.status === 'expired' ? 'Expired' : item.status}
                              </Badge>
                            </TableCell>
                            <TableCell>{new Date(item.createdAt).toLocaleDateString()}</TableCell>
                            <TableCell className="font-semibold text-blue-700">
                              {item.leadCoinsLeft} / {plan?.leadCoins || 'N/A'}
                            </TableCell>
                          </TableRow>
                        );
                      }
                    })}
                  </TableBody>
                </Table>
                
                {/* Pagination controls */}
                {subscriptionHistory.pagination && subscriptionHistory.pagination.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4">
                    <p className="text-sm text-gray-500">
                    Showing {subscriptionHistory.history.length} of {subscriptionHistory.pagination.total} items
                    </p>
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setHistoryPage(p => Math.max(1, p - 1))}
                        disabled={historyPage <= 1 || isLoadingHistory}
                        className="h-8 w-8 p-0"
                      >
                        {isLoadingHistory ? (
                          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ChevronLeft className="h-4 w-4" />
                        )}
                      </Button>
                      <span className="text-sm font-medium">
                        Page {historyPage} of {subscriptionHistory.pagination.totalPages}
                      </span>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setHistoryPage(p => Math.min(subscriptionHistory.pagination.totalPages, p + 1))}
                        disabled={historyPage >= subscriptionHistory.pagination.totalPages || isLoadingHistory}
                        className="h-8 w-8 p-0"
                      >
                        {isLoadingHistory ? (
                          <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50 rounded-lg border border-blue-100">
              <i className="ri-history-line text-5xl text-blue-300 mb-3"></i>
              <h3 className="text-lg font-medium text-blue-700">
                No subscription history
              </h3>
              <p className="text-blue-600 mt-1">
                You haven't purchased any subscription plans yet. Visit the "Available Plans" tab to subscribe.
              </p>
            </div>
          )}
        </TabsContent>

        {/* Buy LeadCoins Tab */}
        <TabsContent value="coins">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Buy Additional LeadCoins</CardTitle>
              <CardDescription>
                Purchase more LeadCoins to view lead contact details without
                changing your subscription
              </CardDescription>
            </CardHeader>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {isLoadingSubscriptions ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Card key={i} className="relative overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <Skeleton className="h-6 w-32" />
                      <Skeleton className="h-8 w-24" />
                      <Skeleton className="h-4 w-full" />
                      <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, j) => (
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
              ))
            ) : subscriptions?.length ? (
              subscriptions
                .filter((plan) => plan.active)
                .map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    showBuyCoins={true}
                    isActive={false}
                  />
                ))
            ) : (
              <div className="col-span-full flex flex-col items-center justify-center p-10 text-center">
                <i className="ri-coin-line text-5xl text-gray-300 mb-3"></i>
                <h3 className="text-lg font-medium">
                  No LeadCoin packages available
                </h3>
                <p className="text-text-secondary mt-1">
                  Check back later for available LeadCoin packages
                </p>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
}