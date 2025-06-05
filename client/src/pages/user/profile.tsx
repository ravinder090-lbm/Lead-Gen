import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn, formatDate } from "@/lib/utils";
import { updateUserProfileSchema, changePasswordSchema } from "@shared/schema";
import { PasswordInput } from "@/components/ui/password-input";
import { Skeleton } from "@/components/ui/skeleton";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { Textarea } from "@/components/ui/textarea";
import {
  Subscription,
  UserSubscription,
  type SupportTicket,
  type SupportTicketReply,
  type LeadCoinPackage,
} from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, ChevronLeft, ChevronRight, XCircle } from "lucide-react";
import { PlanCard } from "@/components/subscriptions/plan-card";
import ClaimCouponModal from "./claim-coupon-modal";


export default function UserProfile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingSupport, setIsLoadingSupport] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [ticketReply, setTicketReply] = useState("");
  const [location, navigate] = useLocation();
  const [historyPage, setHistoryPage] = useState(1);
  const [historyLimit] = useState(10);

  // Set the active tab based on the URL query parameter
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");
    // Get URL query parameters
    const success = urlParams.get("success") === "true";
    const canceled = urlParams.get("canceled") === "true";
    const sessionId = urlParams.get("session_id");


    // Valid tab values
    const validTabs = [
      "profile",
      "password",
      "subscriptions",
      "active_subs",
      "pending_subs",
      "history",
      "support",
      "leadcoins",
    ];

    // If subscription tab is requested, redirect to subscriptions page
    // if (
    //   tab &&
    //   ["subscriptions", "active_subs", "pending_subs", "history"].includes(
    //     tab,
    //   )
    // ) {
    //   navigate(`/user/profile?tab=${tab}`);
    //   return "profile";
    // }

    return validTabs.includes(tab as string) ? (tab as string) : "profile";
  });

  // Handle tab changes
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get("tab");

    if (
      tab &&
      ["subscriptions", "active_subs", "pending_subs", "history_subs"].includes(
        tab,
      )
    ) {
      navigate(`/user/profile?tab=${tab}`);
    }
  }, [activeTab]);

  useEffect(() => {
    const handlePaymentStatus = async () => {
      const params = new URLSearchParams(window.location.search);
      const canceled = params.get("canceled") === "true";
      const success = params.get("success") === "true";
      const coins = params.get("type") == "coins";
      const session_id = params.get("session_id");

      if (canceled) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Payment cancelled",
        });
        return;
      }


      if (success && session_id) {
        try {
          const verifyUrl = `/api/subscriptions/verify-payment?sessionId=${session_id}&coins=${coins}`;
          const response = await apiRequest("GET", verifyUrl);
          const data = await response.json();
          if (data.success) {
            toast({
              title: "Payment Successful!",
              description: "Your subscription is now active.",
            });
          }
          // Optional: handle `data` if needed
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Verification Failed",
            description: "There was a problem verifying your payment.",
          });
        }
      }
    };

    handlePaymentStatus();
  }, []);

  // Fetch subscriptions
  const { data: subscriptions = [], isLoading: isLoadingSubscriptions } =
    useQuery<Subscription[]>({
      queryKey: ["/api/subscriptions"],
    });

  // Fetch current subscription
  const { data: currentSubscription, isLoading: isLoadingCurrentSubscription } =
    useQuery<UserSubscription>({
      queryKey: ["/api/subscriptions/current"],
    });

  // Fetch pending subscriptions
  const {
    data: pendingSubscriptions = [],
    isLoading: isLoadingPendingSubscriptions,
  } = useQuery<UserSubscription[]>({
    queryKey: ["/api/subscriptions/pending"],
  });

  // Fetch user's support tickets
  const {
    data: supportTickets = [],
    isLoading: isLoadingTickets,
    refetch: refetchTickets,
  } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/user"],
  });

  // Fetch selected ticket replies
  const {
    data: ticketReplies = [],
    isLoading: isLoadingReplies,
    refetch: refetchReplies,
  } = useQuery<SupportTicketReply[]>({
    queryKey: [`/api/support/${selectedTicketId}/replies`],
    enabled: !!selectedTicketId,
  });
  // Fetch LeadCoin packages
  const { data: leadCoinPackages = [], isLoading: isLoadingLeadCoinPackages } =
    useQuery<LeadCoinPackage[]>({
      queryKey: ["/api/leadcoin-packages"],
    });

  const profileForm = useForm({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      name: user?.name || "",
      profileImage: user?.profileImage || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(values: any) {
    setIsLoadingProfile(true);

    try {
      await apiRequest("PATCH", "/api/auth/profile", values);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      // Refresh user data
      refreshUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }
  // Function to handle purchase
  const handleBuyCoins = async (subscriptionId: string, leadCoins: number) => {
    setIsLoading(true);
    console.log("herererer")

    try {
      const response = await fetch('/api/subscriptions/buy-coins', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ subscriptionId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to purchase LeadCoins');
      }

      const result = await response.json();

      if (result.paymentSession && result.paymentSession.paymentUrl) {
        localStorage.setItem('pendingPaymentSessionId', result.paymentSession.sessionId);

        toast({
          title: "Redirecting to payment",
          description: "You'll be redirected to complete your purchase securely.",
        });

        window.location.href = result.paymentSession.paymentUrl;
      } else {
        toast({
          title: "Purchase successful",
          description: `You have successfully purchased ${leadCoins} LeadCoins.`,
        });

        refreshUser();

        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });
      }
    } catch (error: any) {
      console.error("Error buying coins:", error);
      toast({
        variant: "destructive",
        title: "Purchase failed",
        description: error.message || "Failed to purchase LeadCoins. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };
  const handleSubscribe = async (leadpurchaseId: string, leadCoins: number) => {
    // Directly create a payment session and redirect to payment URL
    setIsLoading(true);
    try {
      // Create payment session via API
      const response = await apiRequest("POST", "/api/subscriptions/purchase-coin", {
        leadpurchaseId: leadpurchaseId,
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
  async function onPasswordSubmit(values: any) {
    setIsLoadingPassword(true);

    try {
      // Only process the response as successful if it's actually successful
      const response = await apiRequest(
        "POST",
        "/api/auth/change-password",
        values,
      );

      // If we get here, the request was successful
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully.",
      });

      // Reset form
      passwordForm.reset();
    } catch (error: any) {
      // Handle specific error for incorrect current password
      if (
        error.message === "Current password is incorrect" ||
        error.message.includes("Current password is incorrect")
      ) {
        // Set the error directly on the field
        passwordForm.setError("currentPassword", {
          type: "manual",
          message: "Current password is incorrect",
        });
      } else {
        // Show general error toast
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message || "Failed to change password. Please try again.",
        });
      }
    } finally {
      setIsLoadingPassword(false);
    }
  }

  async function handleSubmitTicket() {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please fill in all fields.",
      });
      return;
    }

    setIsLoadingSupport(true);

    try {
      await apiRequest("POST", "/api/support", {
        subject: supportSubject,
        message: supportMessage,
      });

      toast({
        title: "Ticket submitted",
        description: "Your support ticket has been submitted successfully.",
      });

      // Clear form
      setSupportSubject("");
      setSupportMessage("");

      // Refresh tickets
      refetchTickets();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to submit ticket. Please try again.",
      });
    } finally {
      setIsLoadingSupport(false);
    }
  }

  async function handleSubmitReply() {
    if (!ticketReply.trim() || !selectedTicketId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter a reply.",
      });
      return;
    }

    try {
      await apiRequest("POST", `/api/support/${selectedTicketId}/reply`, {
        message: ticketReply,
      });

      toast({
        title: "Reply sent",
        description: "Your reply has been sent successfully.",
      });

      // Clear form
      setTicketReply("");

      // Refresh replies
      refetchReplies();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to send reply. Please try again.",
      });
    }
  }

  function handleSelectTicket(ticketId: number) {
    setSelectedTicketId(ticketId);
  }

  const [purchasingSubscription, setPurchasingSubscription] = useState<number | null>(null);

  async function handlePurchaseSubscription(subscriptionId: number) {
    setPurchasingSubscription(subscriptionId);
    try {
      let resData = await apiRequest("POST", "/api/subscriptions/purchase", {
        subscriptionId,
      });
      let data = await resData.json();
      console.log("Purchase response:", data);

      if (data) {
        // navigate(data?.paymentSession?.paymentUrl);
        window.location.href = data?.paymentSession?.paymentUrl;
      }

      // toast({
      //   title: "Subscription purchased",
      //   description: "Your subscription has been purchased successfully.",
      // });

      // Refresh subscriptions data
      queryClient.invalidateQueries({
        queryKey: ["/api/subscriptions/current"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/subscriptions/pending"],
      });

      // Refresh user data to update leadCoins
      // refreshUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to purchase subscription. Please try again.",
      });
      setPurchasingSubscription(null);
    } finally {
      // If the payment processing takes longer than expected, reset the loading state after 10 seconds
      setTimeout(() => {
        setPurchasingSubscription(null);
      }, 10000);
    }
  }
  // Fetch subscription history with pagination
  const {
    data: subscriptionHistory,
    isLoading: isLoadingHistory,
  } = useQuery<{
    subscriptions: UserSubscription[];
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

  let totalLeadcoins = parseInt(currentSubscription?.leadCoinsLeft || 0) + parseInt(user?.leadCoins || 0)
  let leftcoins = parseInt(user?.leadCoins || 0)
  let usedpercentage = ((leftcoins * 100) / totalLeadcoins)


  return (
    <MainLayout>
      <div className="max-w-[100rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-semibold text-blue-800">
            My Profile
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 py-1.5 text-xs sm:text-sm"
            >
              Role: {user?.role || "User"}
            </Badge>
            <Badge
              variant="outline"
              className="bg-green-50 text-green-700 border-green-200 py-1.5 text-xs sm:text-sm"
            >
              Balance: {user?.leadCoins || 0} coins
            </Badge>
            {user?.verified && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 py-1.5 text-xs sm:text-sm"
              >
                Verified
              </Badge>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-6 sm:mb-8">
          <div className="relative">
            <div className="h-24 sm:h-32 w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="absolute -bottom-12 sm:-bottom-16 left-4 sm:left-8">
              <Avatar className="h-24 w-24 sm:h-32 sm:w-32 border-4 border-white shadow-lg">
                {user?.profileImage ? (
                  <AvatarImage src={user.profileImage} alt={user?.name || ""} />
                ) : (
                  <AvatarFallback className="text-2xl sm:text-4xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <div className="absolute bottom-2 sm:bottom-3 right-4 sm:right-8 text-right">
              <h2 className="text-lg sm:text-2xl font-semibold text-white truncate max-w-[180px] sm:max-w-[300px]">
                {user?.name}
              </h2>
              <p className="text-blue-100 text-sm sm:text-base truncate max-w-[180px] sm:max-w-[300px]">
                {user?.email}
              </p>
            </div>
          </div>
          <div className="mt-16 sm:mt-20 px-3 sm:px-8 pb-4 sm:pb-6">
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <div className="flex gap-8 justify-between">

                <div className="overflow-x-auto pb-2">
                  <TabsList className="flex min-w-max w-full max-w-4xl mb-4 sm:mb-6">
                    <TabsTrigger
                      value="profile"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Profile & Password
                    </TabsTrigger>
                    <TabsTrigger
                      value="subscriptions"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Available Plans
                    </TabsTrigger>
                    <TabsTrigger
                      value="active_subs"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Active Subscriptions
                    </TabsTrigger>
                    <TabsTrigger
                      value="pending_subs"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Pending Subscriptions
                    </TabsTrigger>
                    <TabsTrigger
                      value="history"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Subscription History
                    </TabsTrigger>
                    <TabsTrigger
                      value="leadcoins"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Buy LeadCoins
                    </TabsTrigger>
                    <TabsTrigger
                      value="support"
                      className="text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 flex-1"
                    >
                      Support Tickets
                    </TabsTrigger>
                  </TabsList>
                </div>
                <ClaimCouponModal />
              </div>
              {/* Profile Details Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Edit Profile */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Edit Profile
                      </CardTitle>
                      <CardDescription>
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Form {...profileForm}>
                        <form
                          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Full Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isLoadingProfile}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="profileImage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Profile Image
                                </FormLabel>
                                <FormControl>
                                  <FileUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isLoadingProfile}
                                    accept="image/*"
                                    maxSize={2}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Click to upload or drag and drop your profile
                                  image (max 2MB)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end pt-3">
                            <Button
                              type="submit"
                              disabled={isLoadingProfile}
                              className="bg-gradient-to-r from-blue-600 to-blue-500"
                            >
                              {isLoadingProfile ? (
                                <span className="flex items-center justify-center">
                                  <span className="h-4 w-4 mr-2 rounded-full bg-white/20 animate-pulse"></span>
                                  Saving
                                </span>
                              ) : "Save Changes"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Change Password */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Change Password
                      </CardTitle>
                      <CardDescription>
                        Update your account password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Form {...passwordForm}>
                        <form
                          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Current Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  New Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Confirm New Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end pt-3">
                            <Button
                              type="submit"
                              disabled={isLoadingPassword}
                              className="bg-gradient-to-r from-blue-600 to-blue-500"
                            >
                              {isLoadingPassword ? (
                                <span className="flex items-center justify-center">
                                  <span className="h-4 w-4 mr-2 rounded-full bg-white/20 animate-pulse"></span>
                                  Updating
                                </span>
                              ) : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Subscription Plans Tab */}
              <TabsContent value="subscriptions" className="space-y-8">
                {/* Current subscription */}
                {/* {currentSubscription && (
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Active Subscription
                      </CardTitle>
                      <CardDescription>
                        Your current active subscription plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-blue-700 text-lg">
                              {subscriptions?.find(
                                (s) =>
                                  s.id === currentSubscription.subscriptionId,
                              )?.name || "Subscription"}
                            </h4>
                            <div className="mt-2 text-blue-600">
                              Status:{" "}
                              <span
                                className={cn(
                                  "font-medium",
                                  currentSubscription.status === "active" &&
                                    "text-green-600",
                                  currentSubscription.status === "pending" &&
                                    "text-amber-600",
                                  currentSubscription.status === "expired" &&
                                    "text-red-600",
                                )}
                              >
                                {currentSubscription.status
                                  .charAt(0)
                                  .toUpperCase() +
                                  currentSubscription.status.slice(1)}
                              </span>
                            </div>
                            <div className="mt-1 text-blue-600">
                              Purchase Date:{" "}
                              {formatDate(
                                new Date(currentSubscription.startDate),
                              )}
                            </div>
                            {currentSubscription.endDate && (
                              <div className="mt-1 text-blue-600">
                                Expiry Date:{" "}
                                {formatDate(
                                  new Date(currentSubscription.endDate),
                                )}
                              </div>
                            )}
                          </div>
                          <Badge
                            className={cn(
                              "text-white px-4 py-2 text-base",
                              currentSubscription.status === "active" &&
                                "bg-green-500",
                              currentSubscription.status === "pending" &&
                                "bg-amber-500",
                              currentSubscription.status === "expired" &&
                                "bg-red-500",
                            )}
                          >
                            {currentSubscription.status === "active" &&
                              "Active"}
                            {currentSubscription.status === "pending" &&
                              "Pending"}
                            {currentSubscription.status === "expired" &&
                              "Expired"}
                          </Badge>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )} */}

                {/* Pending subscriptions */}
                {/* {pendingSubscriptions.length > 0 && (
                  <Card className="shadow-sm border-amber-100">
                    <CardHeader className="bg-gradient-to-r from-amber-50 to-amber-100/50 border-b border-amber-100">
                      <CardTitle className="text-amber-800">
                        Pending Subscriptions
                      </CardTitle>
                      <CardDescription>
                        Subscription plans waiting for approval
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {pendingSubscriptions.map((subscription) => (
                          <div
                            key={subscription.id}
                            className="p-4 border border-amber-200 rounded-lg bg-amber-50/50"
                          >
                            <div className="flex justify-between items-center">
                              <div>
                                <h4 className="font-medium text-amber-700 text-lg">
                                  {subscriptions?.find(
                                    (s) => s.id === subscription.subscriptionId,
                                  )?.name || "Subscription"}
                                </h4>
                                <div className="mt-2 text-amber-600">
                                  Status:{" "}
                                  <span className="font-medium">
                                    Pending Approval
                                  </span>
                                </div>
                                <div className="mt-1 text-amber-600">
                                  Purchase Date:{" "}
                                  {formatDate(new Date(subscription.startDate))}
                                </div>
                              </div>
                              <Badge className="bg-amber-500 text-white px-4 py-2 text-base">
                                Pending
                              </Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )} */}

                {/* Available subscription plans */}
                {/* <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {subscriptions.map((subscription) => (
                    <Card
                      key={subscription.id}
                      className="overflow-hidden border border-blue-100 shadow-sm relative"
                    >
                      <div className="absolute top-0 right-0 w-24 h-24 overflow-hidden">
                        <div className="bg-blue-600 text-white text-xs font-bold text-center transform rotate-45 absolute top-5 right-[-30px] w-[170px] py-1 shadow-md">
                          {subscription.durationDays} Days
                        </div>
                      </div>

                      <CardHeader className="pb-2 bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                        <CardTitle className="text-xl font-bold text-center text-blue-800">
                          {subscription.name}
                        </CardTitle>
                        <div className="text-center font-bold text-blue-600 text-xl">
                          <span className="text-2xl">
                            ${subscription.price}
                          </span>
                          <span className="text-sm opacity-70">/plan</span>
                        </div>
                      </CardHeader>

                      <CardContent className="px-6 pb-6 pt-4">
                        <div className="bg-blue-50/50 p-3 rounded-lg mb-4 text-center border border-blue-100">
                          <p className="font-medium text-blue-700">
                            {subscription.leadCoins} LeadCoins Included
                          </p>
                        </div>

                        <ul className="space-y-3 mb-5">
                          {subscription.description
                            .split("|")
                            .map((feature, index) => (
                              <li
                                key={index}
                                className="flex items-center gap-2"
                              >
                                <div className="flex-shrink-0 w-4 h-4 rounded-full bg-blue-600 flex items-center justify-center">
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 16 16"
                                    fill="none"
                                    className="w-3 h-3 text-white"
                                  >
                                    <path
                                      d="M3.33398 8.5L6.00065 11.1667L12.6673 4.5"
                                      stroke="currentColor"
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                    />
                                  </svg>
                                </div>
                                <span className="text-sm text-gray-600">
                                  {feature.trim()}
                                </span>
                              </li>
                            ))}
                        </ul>

                        <Button
                          className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 flex items-center gap-2 group rounded-md"
                          onClick={() =>
                            handlePurchaseSubscription(subscription.id)
                          }
                          disabled={
                            (purchasingSubscription === subscription.id) ||
                            (currentSubscription?.status === "active" &&
                            currentSubscription?.subscriptionId ===
                              subscription.id)
                          }
                        >
                          {purchasingSubscription === subscription.id ? (
                            <span className="flex items-center justify-center">
                              <span className="h-4 w-4 mr-2 rounded-full bg-white/20 animate-pulse"></span>
                              Processing
                            </span>
                          ) : (
                            <>
                              <span>
                                {currentSubscription?.status === "active" &&
                                currentSubscription?.subscriptionId ===
                                  subscription.id
                                  ? "Current Plan"
                                  : "Choose this plan"}
                              </span>
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 20 20"
                                fill="currentColor"
                                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                              >
                                <path
                                  fillRule="evenodd"
                                  d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z"
                                  clipRule="evenodd"
                                />
                              </svg>
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div> */}
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
              <TabsContent value="active_subs" className="space-y-8">
                <h2 className="text-xl font-semibold mb-4">
                  Your Active Subscription
                </h2>
                {isLoadingCurrentSubscription ? (
                  <CardSkeleton
                    count={1}
                    layout="list"
                    withImage={false}
                    withFooterAction={true}
                    withFeatures={true}
                    featureCount={4}
                  />
                ) : currentSubscription ? (
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Active Subscription
                      </CardTitle>
                      <CardDescription>
                        Your current active subscription plan
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50">
                        <div className="flex justify-between items-center">
                          <div>
                            <h4 className="font-medium text-blue-700 text-lg">
                              {subscriptions?.find(
                                (s) =>
                                  s.id === currentSubscription.subscriptionId,
                              )?.name || "Subscription"}
                            </h4>
                            <div className="mt-2 text-blue-600">
                              Status:{" "}
                              <span
                                className={cn(
                                  "font-medium",
                                  currentSubscription.status === "active" &&
                                  "text-green-600",
                                  currentSubscription.status === "pending" &&
                                  "text-amber-600",
                                  currentSubscription.status === "expired" &&
                                  "text-red-600",
                                )}
                              >
                                {currentSubscription.status
                                  .charAt(0)
                                  .toUpperCase() +
                                  currentSubscription.status.slice(1)}
                              </span>
                            </div>
                            <div className="mt-1 text-blue-600">
                              Purchase Date:{" "}
                              {formatDate(
                                new Date(currentSubscription.startDate),
                              )}
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="bg-green-50 text-green-700 border-green-200"
                          >
                            {currentSubscription.paymentVerified
                              ? "Payment Verified"
                              : "Pending Verification"}
                          </Badge>
                        </div>

                        <div className="mt-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-blue-700">
                              LeadCoins Usage
                            </span>
                            <span className="text-blue-700 font-medium">
                              {/* {currentSubscription.leadCoinsLeft} /{" "}
                              {subscriptions?.find(
                                (s) =>
                                  s.id === currentSubscription.subscriptionId,
                              )?.leadCoins || 0}{" "} */}
                              {totalLeadcoins}/{leftcoins}{" "}
                              remaining
                            </span>
                          </div>
                          {/* {console.log(use)} */}
                          <Progress
                            value={100 - usedpercentage}
                            className="h-2 bg-blue-100"
                          />
                          <div className="flex justify-between text-xs text-blue-600 mt-1">
                            <span>{0}%</span>
                            <span>
                              Used:{(100 - usedpercentage).toFixed(1)}
                              {/* {Math.round(
                                100 -
                                (currentSubscription.leadCoinsLeft /
                                  (subscriptions?.find(
                                    (s) =>
                                      s.id ===
                                      currentSubscription.subscriptionId,
                                  )?.leadCoins || 100)) *
                                100,
                              )} */}
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
                    <h3 className="text-lg font-medium text-blue-700">
                      No active subscriptions
                    </h3>
                    <p className="text-blue-600 mt-1">
                      You don't have any active subscription plans at the
                      moment. Visit the "Available Plans" tab to subscribe.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Pending Subscriptions Tab */}
              <TabsContent value="pending_subs" className="space-y-8">
                <h2 className="text-xl font-semibold mb-4">
                  Pending Subscriptions
                </h2>
                {isLoadingPendingSubscriptions ? (
                  <div className="space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Card key={i} className="shadow-sm">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-center">
                            <div className="space-y-2">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-48" />
                              <Skeleton className="h-4 w-40" />
                            </div>
                            <div className="space-x-2">
                              <Skeleton className="h-9 w-24 inline-block" />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : pendingSubscriptions && pendingSubscriptions.length > 0 ? (
                  <div className="space-y-4">
                    {pendingSubscriptions.map((subscription) => (
                      <Card
                        key={subscription.id}
                        className="shadow-sm border-blue-100"
                      >
                        <CardContent className="p-4">
                          <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
                            <div>
                              <h3 className="font-medium text-blue-800">
                                {subscriptions?.find(
                                  (s) => s.id === subscription.subscriptionId,
                                )?.name || "Subscription Plan"}
                              </h3>
                              <p className="text-blue-600 text-sm mt-1">
                                Purchase date:{" "}
                                {new Date(
                                  subscription.createdAt,
                                ).toLocaleDateString()}
                              </p>
                              <div className="flex items-center mt-1">
                                <Badge
                                  variant="outline"
                                  className="bg-yellow-50 text-yellow-700 border-yellow-200"
                                >
                                  {subscription.status}
                                </Badge>
                                {!subscription.paymentVerified && (
                                  <span className="ml-2 text-sm text-yellow-600">
                                    Payment verification pending
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <Button
                                size="sm"
                                onClick={() =>
                                  (window.location.href = `/api/subscriptions/verify-payment?sessionId=${subscription.paymentSessionId}`)
                                }
                                disabled={!subscription.paymentSessionId}
                              >
                                Verify Payment
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50 rounded-lg border border-blue-100">
                    <h3 className="text-lg font-medium text-blue-700">
                      No pending subscriptions
                    </h3>
                    <p className="text-blue-600 mt-1">
                      You don't have any pending subscription plans awaiting
                      payment verification.
                    </p>
                  </div>
                )}
              </TabsContent>

              {/* Subscription History Tab */}
              {/* <TabsContent value="history_subs" className="space-y-8">
                <h2 className="text-xl font-semibold mb-4">
                  Subscription History
                </h2>

                {isLoadingPendingSubscriptions ? (
                  <Card>
                    <CardContent className="p-5">
                      <div className="space-y-4">
                        <Skeleton className="h-10 w-full" />
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card>
                    <CardContent className="p-5">
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-blue-50 hover:bg-blue-50">
                              <TableHead className="text-blue-700">
                                Plan
                              </TableHead>
                              <TableHead className="text-blue-700">
                                Status
                              </TableHead>
                              <TableHead className="text-blue-700">
                                Payment
                              </TableHead>
                              <TableHead className="text-blue-700">
                                Created
                              </TableHead>
                              <TableHead className="text-blue-700">
                                LeadCoins
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {pendingSubscriptions &&
                            pendingSubscriptions.length > 0 ? (
                              pendingSubscriptions.map((item) => (
                                <TableRow key={item.id}>
                                  <TableCell className="font-medium">
                                    {subscriptions?.find(
                                      (s) => s.id === item.subscriptionId,
                                    )?.name || "Unknown Plan"}
                                  </TableCell>
                                  <TableCell>
                                    <Badge
                                      variant={
                                        item.status === "active"
                                          ? "default"
                                          : "outline"
                                      }
                                      className={
                                        item.status === "active"
                                          ? "bg-green-100 text-green-800 hover:bg-green-100"
                                          : item.status === "expired"
                                            ? "bg-gray-100 text-gray-800"
                                            : "bg-yellow-100 text-yellow-800"
                                      }
                                    >
                                      {item.status}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    {item.paymentVerified ? (
                                      <span className="text-green-600 flex items-center">
                                        <CheckCircle className="w-4 h-4 mr-1" />{" "}
                                        Verified
                                      </span>
                                    ) : (
                                      <span className="text-yellow-600 flex items-center">
                                        <XCircle className="w-4 h-4 mr-1" />{" "}
                                        Pending
                                      </span>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {new Date(
                                      item.createdAt,
                                    ).toLocaleDateString()}
                                  </TableCell>
                                  <TableCell>
                                    {item.leadCoinsLeft}/
                                    {subscriptions?.find(
                                      (s) => s.id === item.subscriptionId,
                                    )?.leadCoins || 0}
                                  </TableCell>
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell
                                  colSpan={5}
                                  className="text-center py-8 text-gray-500"
                                >
                                  No subscription history found
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent> */}

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
              {/* Support Tab */}
              {/* Buy LeadCoins Tab */}
              <TabsContent value="leadcoins" className="space-y-6">
                <Card className="shadow-sm border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                    <CardTitle className="text-blue-800">
                      Buy Additional LeadCoins
                    </CardTitle>
                    <CardDescription>
                      Purchase LeadCoins to view more lead details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between bg-blue-50 p-4 mb-4 rounded-md">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                          <i className="ri-coin-line text-lg text-blue-600"></i>
                        </div>
                        <div>
                          <p className="font-medium text-blue-800">
                            Your Current Balance
                          </p>
                          <p className="text-2xl font-bold text-blue-600">
                            {user?.leadCoins || 0} LeadCoins
                          </p>
                        </div>
                      </div>

                      <div className="text-sm text-blue-600">
                        Use LeadCoins to access lead details
                      </div>
                    </div>

                    <h3 className="text-lg font-medium mb-4 text-blue-800">
                      Select Package
                    </h3>

                    {isLoadingLeadCoinPackages ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <CardSkeleton
                          count={3}
                          layout="grid"
                          withImage={false}
                          withFeatures={false}
                          withFooterAction={true}
                        />
                      </div>
                    ) : leadCoinPackages && leadCoinPackages.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {leadCoinPackages
                          .filter(pkg => pkg.active) // Only show active packages
                          .map((pkg, index) => (
                            <Card key={pkg.id} className={`relative border-2 transition-all duration-200 ${pkg.active ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10' : 'border-border bg-white'
                              }`}>
                              <CardHeader className="pb-4">
                                <div className="flex items-center justify-between mb-2">
                                  <div className="flex items-center gap-2">
                                    {index === 1 && ( // Highlight middle package as "Best Value"
                                      <span className="px-2 py-1 text-xs font-medium bg-primary text-white rounded-full">
                                        Best Value
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <CardTitle className="text-xl font-bold text-text-primary">{pkg.name}</CardTitle>
                                <div className="flex items-baseline gap-1">
                                  <span className="text-3xl font-bold text-text-primary">${pkg.price}</span>
                                  <span className="text-sm text-text-secondary">/ {pkg.leadCoins} coins</span>
                                </div>
                                <CardDescription className="text-text-secondary mt-2">{pkg.description}</CardDescription>
                              </CardHeader>
                              <CardContent className="pb-4">
                                <div className="space-y-3">
                                  <div className="flex items-center gap-2">
                                    <i className="ri-coins-line text-primary"></i>
                                    <span className="text-sm">{pkg.leadCoins} LeadCoins included</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <i className="ri-money-dollar-circle-line text-primary"></i>
                                    <span className="text-sm">One-time purchase</span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <i className="ri-time-line text-primary"></i>
                                    <span className="text-sm">Instant activation</span>
                                  </div>
                                </div>
                              </CardContent>
                              <CardFooter>
                                <Button
                                  className={`w-full ${index === 1 ? 'bg-gradient-to-r from-primary to-primary/80' : ''}`}
                                  onClick={() => handleSubscribe(pkg?.id, pkg?.leadCoins)}
                                >
                                  Purchase
                                </Button>
                              </CardFooter>
                            </Card>
                          ))}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50 rounded-lg border border-blue-100">
                        <i className="ri-coins-line text-5xl text-blue-300 mb-3"></i>
                        <h3 className="text-lg font-medium text-blue-700">No LeadCoin packages available</h3>
                        <p className="text-blue-600 mt-1">
                          LeadCoin packages are currently not available for purchase.
                        </p>
                      </div>

                    )}
                    {/* // <div className="p-4 border-2 border-blue-300 rounded-md hover:shadow-md transition-all relative">
                      //   <div className="absolute -top-3 right-3 bg-blue-500 text-white text-xs py-1 px-2 rounded-full">
                      //     Best Value
                      //   </div>
                      //   <div className="text-center mb-3">
                      //     <div className="w-12 h-12 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-2">
                      //       <i className="ri-coin-line text-xl text-blue-600"></i>
                      //     </div>
                      //     <h4 className="font-medium text-blue-800">
                      //       Standard Pack
                      //     </h4>
                      //   </div>
                      //   <div className="text-center mb-3">
                      //     <p className="text-2xl font-bold text-blue-700">
                      //       125 LeadCoins
                      //     </p>
                      //     <p className="text-sm text-blue-500">$20.00</p>
                      //   </div>
                      //   <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-500">
                      //     Purchase
                      //   </Button>
                      // </div>

                      // <div className="p-4 border border-blue-100 rounded-md hover:shadow-md transition-all">
                      //   <div className="text-center mb-3">
                      //     <div className="w-12 h-12 mx-auto bg-blue-50 rounded-full flex items-center justify-center mb-2">
                      //       <i className="ri-coin-line text-xl text-blue-500"></i>
                      //     </div>
                      //     <h4 className="font-medium text-blue-800">
                      //       Premium Pack
                      //     </h4>
                      //   </div>
                      //   <div className="text-center mb-3">
                      //     <p className="text-2xl font-bold text-blue-700">
                      //       300 LeadCoins
                      //     </p>
                      //     <p className="text-sm text-blue-500">$40.00</p>
                      //   </div>
                      //   <Button className="w-full">Purchase</Button>
                      // </div> */}
                    {/* </div> */}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="support" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* New Ticket */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        New Support Ticket
                      </CardTitle>
                      <CardDescription>
                        Create a new support ticket for assistance
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-blue-700">
                            Subject
                          </label>
                          <Input
                            value={supportSubject}
                            onChange={(e) => setSupportSubject(e.target.value)}
                            className="border-blue-200 mt-1.5"
                            placeholder="Brief description of your issue"
                          />
                        </div>

                        <div>
                          <label className="text-sm font-medium text-blue-700">
                            Message
                          </label>
                          <Textarea
                            value={supportMessage}
                            onChange={(e) => setSupportMessage(e.target.value)}
                            className="border-blue-200 min-h-32 mt-1.5"
                            placeholder="Detailed explanation of your issue"
                          />
                        </div>

                        <div className="flex justify-end">
                          <Button
                            onClick={handleSubmitTicket}
                            disabled={isLoadingSupport}
                            className="bg-gradient-to-r from-blue-600 to-blue-500"
                          >
                            {isLoadingSupport ? (
                              <span className="flex items-center justify-center">
                                <span className="h-4 w-4 mr-2 rounded-full bg-white/20 animate-pulse"></span>
                                Submitting
                              </span>
                            ) : "Submit Ticket"}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Ticket List */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Your Support Tickets
                      </CardTitle>
                      <CardDescription>
                        View and manage your existing support tickets
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {isLoadingTickets ? (
                        <CardSkeleton
                          count={3}
                          layout="list"
                          withImage={false}
                          withFooterAction={true}
                        />
                      ) : supportTickets.length > 0 ? (
                        <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                          {supportTickets.map((ticket) => (
                            <div
                              key={ticket.id}
                              className={cn(
                                "p-4 border rounded-lg transition-colors cursor-pointer",
                                selectedTicketId === ticket.id
                                  ? "border-blue-400 bg-blue-50"
                                  : "border-blue-200 bg-white hover:bg-blue-50/50",
                              )}
                            >
                              <div className="flex justify-between items-start">
                                <div>
                                  <h4 className="font-medium text-blue-800">
                                    {ticket.subject}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <p className="text-xs text-blue-600">
                                      {formatDate(new Date(ticket.createdAt))}
                                    </p>
                                    <Badge
                                      className={cn(
                                        "text-white text-xs",
                                        ticket.status === "open" &&
                                        "bg-blue-500",
                                        ticket.status === "in_progress" &&
                                        "bg-amber-500",
                                        ticket.status === "closed" &&
                                        "bg-green-500",
                                      )}
                                    >
                                      {ticket.status.charAt(0).toUpperCase() +
                                        ticket.status
                                          .slice(1)
                                          .replace("_", " ")}
                                    </Badge>
                                  </div>
                                </div>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleSelectTicket(ticket.id)}
                                  className="text-xs px-2 py-1 h-auto border-blue-200 text-blue-600"
                                >
                                  View Details
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/50 text-center">
                          <p className="text-blue-600">
                            You don't have any tickets yet.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Selected ticket details */}
                {selectedTicketId && (
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Ticket Details
                      </CardTitle>
                      <CardDescription>
                        View conversation for ticket #{selectedTicketId}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      {isLoadingReplies ? (
                        <div className="space-y-4">
                          <CardSkeleton
                            count={1}
                            layout="list"
                            withImage={false}
                          />
                          <div className="space-y-3">
                            {Array.from({ length: 3 }).map((_, index) => (
                              <div key={index} className={`p-3 rounded-lg ${index % 2 === 0 ? 'ml-4' : 'mr-4'}`}>
                                <Skeleton className="h-4 w-24 mb-2" />
                                <Skeleton className="h-16 w-full" />
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {/* Original message */}
                          <div className="p-4 border border-blue-200 rounded-lg bg-blue-50/30">
                            <div className="font-medium text-blue-800 flex justify-between">
                              <span>
                                {
                                  supportTickets?.find(
                                    (t) => t.id === selectedTicketId,
                                  )?.subject
                                }
                              </span>
                              <span className="text-xs flex items-center text-blue-600">
                                {formatDate(
                                  new Date(
                                    supportTickets?.find(
                                      (t) => t.id === selectedTicketId,
                                    )?.createdAt || "",
                                  ),
                                )}
                              </span>
                            </div>
                            <p className="mt-2 text-blue-700">
                              {
                                supportTickets?.find(
                                  (t) => t.id === selectedTicketId,
                                )?.message
                              }
                            </p>
                          </div>

                          {/* Replies */}
                          {ticketReplies && ticketReplies.length > 0 ? (
                            <div className="space-y-3 max-h-64 overflow-y-auto p-1">
                              {ticketReplies.map((reply) => (
                                <div
                                  key={reply.id}
                                  className={cn(
                                    "p-3 rounded-lg text-sm",
                                    reply.isFromStaff
                                      ? "bg-blue-100 ml-4"
                                      : "bg-gray-100 mr-4",
                                  )}
                                >
                                  <div className="flex justify-between mb-1">
                                    <strong
                                      className={
                                        reply.isFromStaff
                                          ? "text-blue-700"
                                          : "text-gray-700"
                                      }
                                    >
                                      {reply.isFromStaff
                                        ? "Support Team"
                                        : "You"}
                                    </strong>
                                    <p className="text-xs text-gray-500">
                                      {formatDate(new Date(reply.createdAt))}
                                    </p>
                                  </div>
                                  <p className="text-sm">{reply.message}</p>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center p-2 bg-blue-50 rounded mb-3">
                              <p className="text-sm text-blue-600">
                                No replies yet.
                              </p>
                            </div>
                          )}

                          <div className="flex gap-2">
                            <Textarea
                              value={ticketReply}
                              onChange={(e) => setTicketReply(e.target.value)}
                              placeholder="Type your reply..."
                              className="text-sm border-blue-200"
                            />
                            <Button
                              onClick={handleSubmitReply}
                              disabled={isLoadingSupport}
                              className="shrink-0 self-end bg-gradient-to-r from-blue-600 to-blue-500"
                            >
                              {isLoadingSupport ? (
                                <span className="flex items-center justify-center">
                                  <span className="h-4 w-4 mr-2 rounded-full bg-white/20 animate-pulse"></span>
                                  Sending
                                </span>
                              ) : "Send"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
