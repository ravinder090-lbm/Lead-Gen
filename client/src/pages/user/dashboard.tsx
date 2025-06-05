import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { MainLayout } from "@/components/layout/main-layout";
import { SubscriptionCard } from "@/components/dashboard/subscription-card";
import { PendingSubscriptionCard } from "@/components/dashboard/pending-subscription-card";
import { RecentLeads } from "@/components/dashboard/recent-leads";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth-context";
import { TicketCard } from "@/components/support/ticket-card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

export default function UserDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch current subscription
  const { data: currentSubscription, isLoading: isLoadingSubscription } =
    useQuery({
      queryKey: ["/api/subscriptions/current"],
      // Default query to handle errors
      refetchOnWindowFocus: false,
    });

  // console.log("Current subscription:", currentSubscription?.subscriptionId);

  // if (currentSubscription?.subscriptionId) {
  //   const { data: currentPlan, isLoading: isLoadingcurrentPlan } = useQuery({
  //     queryKey: [`/api/subscriptions/${currentSubscription?.subscriptionId}`],
  //     // Default query to handle errors
  //     refetchOnWindowFocus: false,
  //   });
  //   console.log("Current plan:", currentPlan);
  // }

  // Fetch pending subscriptions
  const {
    data: pendingSubscriptions = [],
    isLoading: isLoadingPendingSubscriptions,
  } = useQuery({
    queryKey: ["/api/subscriptions/pending"],
    // Default query to handle errors
    refetchOnWindowFocus: false,
  });

  // Fetch all subscription plans (to get details for pending subscriptions)
  const { data: subscriptionPlans = [], isLoading: isLoadingPlans } = useQuery({
    queryKey: ["/api/subscriptions"],
    refetchOnWindowFocus: false,
  });

  // Fetch recent tickets
  const { data: tickets = [], isLoading: isLoadingTickets } = useQuery({
    queryKey: ["/api/support/user"],
    // Default query to handle errors
    refetchOnWindowFocus: false,
  });

  // Calculate LeadCoin progress based on the current subscription and user's lead coins
  const [initialCoins, setInitialCoins] = useState(100);
  const [currentCoins, setCurrentCoins] = useState(user?.leadCoins || 0);
  const [coinPercentage, setCoinPercentage] = useState(0);

  // Update the coin percentage when user data or subscriptions change
  useEffect(() => {
    // Ensure we have user data
    if (!user?.leadCoins && user?.leadCoins !== 0) return;

    // Always update current coins from user data
    setCurrentCoins(user.leadCoins);

    // If we have current subscription data
    if (currentSubscription && typeof currentSubscription === "object") {
      // Try to determine the initial/total coins from various possible data structures
      let subscriptionCoins = 100; // Default fallback

      if (
        currentSubscription.name &&
        typeof currentSubscription.leadCoins === "number"
      ) {
        // Direct subscription plan data
        subscriptionCoins = currentSubscription.leadCoins;
      } else if (
        currentSubscription.name &&
        typeof currentSubscription.name.leadCoins === "number"
      ) {
        // Nested subscription data
        subscriptionCoins = currentSubscription.name.leadCoins;
      } else if (typeof currentSubscription.initialLeadCoins === "number") {
        // Explicit initial coins property
        subscriptionCoins = currentSubscription.initialLeadCoins;
      }

      // Calculate total coins (initial from plan + any additional purchased)
      const totalInitialCoins = Math.max(subscriptionCoins, user.leadCoins);
      setInitialCoins(totalInitialCoins);

      // Calculate how many coins have been used based on the difference from the HIGHER of:
      // 1. Original subscription amount, or
      // 2. The highest amount user has had (current amount + used)
      const usedCoins = totalInitialCoins - user.leadCoins;

      // Calculate the percentage of coins used (0-100)
      // This should reflect the percentage of ALL coins used, not just the subscription's initial coins
      const usedPercentage = Math.max(
        0,
        Math.min(100, Math.round((usedCoins / totalInitialCoins) * 100)),
      );
      setCoinPercentage(usedPercentage);
    } else {
      // No subscription - just show user's coins
      setInitialCoins(user.leadCoins || 100);
      setCoinPercentage(0); // 0% used if no active subscription
    }
  }, [user, currentSubscription]);

 
  // let percentage = user?.leadCoins || 0;
  let percentage = ((currentSubscription?.leadCoinsLeft * 100) / (currentSubscription?.leadCoinsLeft + (user?.leadCoins || 0))).toFixed(1);


  return (
    <MainLayout>
      <div className="max-w-[110rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-blue-800 p-6 rounded-2xl shadow-lg text-white">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2">
              Welcome, {user?.name || 'User'}!
            </h1>
            <p className="text-blue-100 mb-4">
              Track your leads, manage your subscriptions, and access support all in one place.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => navigate("/user/leads")}
                className="bg-white text-blue-700 hover:bg-blue-50 rounded-full"
                size="sm"
              >
                <i className="ri-file-list-3-line mr-1.5"></i>
                Browse Leads
              </Button>
              <Button
                onClick={() => navigate("/user/profile")}
                className="bg-blue-500 text-white hover:bg-blue-600 rounded-full border border-blue-400"
                size="sm"
                variant="outline"
              >
                <i className="ri-shopping-bag-line mr-1.5"></i>
                View Plans
              </Button>
            </div>
          </div>
          <div className="hidden md:flex justify-end">
            <div className="bg-blue-500/30 backdrop-blur-md p-5 rounded-xl border border-blue-400/30 max-w-xs">
              <div className="flex items-center mb-3">
                <i className="ri-lightbulb-line text-2xl text-yellow-300 mr-3"></i>
                <h3 className="text-lg font-bold text-white">Quick Tip</h3>
              </div>
              <p className="text-sm text-blue-100">
                LeadCoins let you access detailed contact information. Subscribe to a plan to get more coins and premium features.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Current Subscription */}
      <div className="mb-8">
        {isLoadingSubscription ? (
          <div className="dashboard-card">
            <CardHeader>
              <Skeleton className="h-6 w-56" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col md:flex-row justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-6 w-32" />
                  <Skeleton className="h-4 w-48" />
                  <div className="flex gap-4 mt-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                </div>
                <Skeleton className="h-10 w-40 mt-4 md:mt-0" />
              </div>
              <div className="space-y-2 mt-4">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-3 w-4" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-8" />
                </div>
              </div>
            </CardContent>
          </div>
        ) : currentSubscription && typeof currentSubscription === "object" ? (
          <SubscriptionCard
            subscription={currentSubscription as any}
            onUpgrade={() => navigate("/user/subscriptions")}
            onBuyCoins={() => navigate("/user/subscriptions")}
          />
        ) : (
          <div className="dashboard-card bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow hover:shadow-lg transition-all duration-300 overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
            <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-5 px-4 md:px-5">
              <div className="flex items-center space-x-2">
                <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                  <i className="ri-vip-crown-line text-xl text-blue-600"></i>
                </div>
                <CardTitle className="text-sm md:text-base font-bold text-blue-700">
                  Subscription Status
                </CardTitle>
              </div>
              <Button 
                className="text-xs md:text-sm h-8 md:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
                onClick={() => navigate("/user/subscriptions")}
              >
                <i className="ri-shopping-cart-line mr-1.5"></i>
                Get Started
              </Button>
            </CardHeader>
            <CardContent className="p-4 md:p-5">
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 text-center">
                <div className="flex flex-col items-center justify-center space-y-5">
                  <div className="h-20 w-20 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-2">
                    <i className="ri-stack-line text-4xl"></i>
                  </div>
                  <h3 className="text-xl font-bold text-gradient">
                    No Active Subscription
                  </h3>
                  <p className="text-sm text-blue-700 max-w-md">
                    Subscribe to a plan to start viewing lead contact details and
                    get access to all platform features
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-2xl mt-4">
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mb-2">
                        <i className="ri-contacts-book-line text-blue-600"></i>
                      </div>
                      <h4 className="text-sm font-medium text-blue-700">Contact Details</h4>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mb-2">
                        <i className="ri-coin-line text-blue-600"></i>
                      </div>
                      <h4 className="text-sm font-medium text-blue-700">LeadCoins</h4>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 flex flex-col items-center">
                      <div className="w-10 h-10 bg-blue-200 rounded-full flex items-center justify-center mb-2">
                        <i className="ri-customer-service-line text-blue-600"></i>
                      </div>
                      <h4 className="text-sm font-medium text-blue-700">Priority Support</h4>
                    </div>
                  </div>
                  <Button
                    onClick={() => navigate("/user/subscriptions")}
                    className="mt-4 btn-blue-gradient px-6 py-2 rounded-full"
                  >
                    <i className="ri-price-tag-3-line mr-1.5"></i>
                    View Subscription Plans
                  </Button>
                </div>
              </div>
            </CardContent>
          </div>
        )}
      </div>

      {/* Note: Pending Subscriptions section removed from dashboard as requested */}

      {/* LeadCoins Usage Card */}
      {/* <div className="mb-8">
        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50 shadow hover:shadow-md transition-all duration-300">
          <CardHeader className="flex md:flex-row items-center justify-between pb-2 border-b border-blue-100">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                <i className="ri-coin-line text-xl text-blue-600"></i>
              </div>
              <CardTitle className="text-xl font-bold text-blue-700">
                LeadCoins Status
              </CardTitle>
            </div>
            <div className="inline-flex px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-full items-center shadow-sm">
              <i className="ri-wallet-3-line mr-1"></i>
              <span className="font-medium">Balance: </span>
              <span className="ml-1 font-bold">{user?.leadCoins  || 0}</span>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <div className="bg-blue-50 rounded-lg p-3 max-w-md">
                  <h4 className="text-sm font-medium text-blue-700 flex items-center">
                    <i className="ri-information-line mr-1.5 text-blue-500"></i>
                    What are LeadCoins?
                  </h4>
                  <p className="text-xs text-blue-600 mt-1">
                    LeadCoins are your virtual currency to access detailed lead information. 
                    Each time you view a lead's contact details, LeadCoins are deducted from your balance.
                  </p>
                </div>
                <Button
                  onClick={() => navigate("/user/subscriptions")}
                  className="btn-blue-gradient rounded-full text-sm h-10"
                  size="sm"
                >
                  <i className="ri-add-circle-line mr-1.5"></i>
                  Buy More Coins
                </Button>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 mt-4">
                <EnhancedProgress
                  value={percentage}
                  className="h-4 transition-all mt-2"
                  showLabel={false}
                  animate={true}
                  showUsageIcons={true}
                  title="LeadCoins Usage Status"
                  description="Monitor your LeadCoin balance and consumption"
                  available={user?.leadCoins || 0}
                  total={initialCoins}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-4">
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                      <i className="ri-stack-line"></i>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Total Initial</p>
                      <p className="text-lg font-bold text-blue-700">{initialCoins} Coins</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-gradient-to-br from-blue-50 to-white p-4 rounded-lg border border-blue-100 shadow-sm">
                  <div className="flex items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mr-2">
                      <i className="ri-shopping-basket-line"></i>
                    </div>
                    <div>
                      <p className="text-xs text-blue-600">Used Coins</p>
                      <p className="text-lg font-bold text-blue-700">{initialCoins - (user?.leadCoins || 0)} Coins</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </div>
      </div> */}

      {/* Dashboard Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Recent Leads */}
        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50 shadow hover:shadow-md transition-all duration-300">
          <CardHeader className="flex md:flex-row items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                <i className="ri-file-list-3-line text-xl text-blue-600"></i>
              </div>
              <CardTitle className="text-xl font-bold text-blue-700">
                Recent Leads
              </CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/user/leads")}
              className="bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
            >
              <i className="ri-arrow-right-line mr-1"></i>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
              <RecentLeads
                limit={2}
                showViewAll={false}
                onViewAll={() => navigate("/user/leads")}
              />
            </div>
          </CardContent>
        </div>

        {/* Support Tickets */}
        <div className="dashboard-card bg-gradient-to-br from-white to-blue-50 shadow hover:shadow-md transition-all duration-300">
          <CardHeader className="flex md:flex-row items-center justify-between pb-3 border-b border-blue-100">
            <div className="flex items-center space-x-2">
              <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
                <i className="ri-customer-service-2-line text-xl text-blue-600"></i>
              </div>
              <CardTitle className="text-xl font-bold text-blue-700">
                Support Tickets
              </CardTitle>
            </div>
            <Button
              onClick={() => navigate("/user/support")}
              className="bg-blue-50 border-blue-200 text-blue-600 hover:text-blue-800 hover:bg-blue-100 rounded-full"
              size="sm"
              variant="outline"
            >
              <i className="ri-arrow-right-line mr-1"></i>
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-5">
            {isLoadingTickets ? (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-4">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="sky-glass-card rounded-lg">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <Skeleton className="h-5 w-64" />
                          <Skeleton className="h-4 w-full max-w-[500px]" />
                        </div>
                        <Skeleton className="h-6 w-20 rounded-full" />
                      </div>
                      <div className="flex items-center justify-between mt-4">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    </CardContent>
                  </div>
                ))}
              </div>
            ) : Array.isArray(tickets) && tickets.length > 0 ? (
              <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100 space-y-4">
                {tickets.slice(0, 2).map((ticket: any) => (
                  <TicketCard key={ticket.id} ticket={ticket} />
                ))}

                {tickets.length > 2 && (
                  <div className="text-center mt-4">
                    <Button
                      variant="outline"
                      onClick={() => navigate("/user/support")}
                      className="btn-blue-gradient text-white rounded-full"
                    >
                      <i className="ri-eye-line mr-1.5"></i>
                      View All Tickets
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-6 shadow-sm border border-blue-100 flex flex-col items-center justify-center text-center">
                <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 mb-3">
                  <i className="ri-customer-service-2-line text-3xl"></i>
                </div>
                <h3 className="text-lg font-bold text-gradient">
                  No Support Tickets
                </h3>
                <p className="text-blue-600 mt-1 mb-4">
                  You haven't created any support tickets yet
                </p>
                <Button
                  onClick={() => navigate("/user/support")}
                  className="btn-blue-gradient rounded-full"
                >
                  <i className="ri-add-line mr-1.5"></i>
                  Create Support Ticket
                </Button>
              </div>
            )}
          </CardContent>
        </div>
      </div>
      </div>
    </MainLayout>
  );
}
