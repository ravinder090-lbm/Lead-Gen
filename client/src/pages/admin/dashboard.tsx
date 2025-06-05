import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ActivityItem } from "@/components/dashboard/activity-item";
import { LeadGenerationChart } from "@/components/dashboard/charts";
import { SubscriptionDistributionChart } from "@/components/dashboard/charts";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatTimeAgo, cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { AlertCircle, Send, Users, Mail } from "lucide-react";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { DashboardSkeleton } from "@/components/skeletons/dashboard-skeleton";

export default function AdminDashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activitiesDialogOpen, setActivitiesDialogOpen] = useState(false);
  const [activitiesPage, setActivitiesPage] = useState(1);
  const itemsPerPage = 10;

  console.log("AdminDashboard component rendered");
  console.log("Current user:", user);

  // Define the dashboard data type
  interface DashboardData {
    users: {
      total: number;
      growth: number;
      recent: Array<{
        id: number;
        name: string;
        email: string;
        role: string;
        createdAt: string;
      }>;
    };
    leads: {
      total: number;
      growth: number;
      recent: Array<{
        id: number;
        title: string;
        location: string;
        price: number;
        createdAt: string;
      }>;
    };
    tickets: {
      total: number;
      growth: number;
      recent: Array<{
        id: number;
        title: string;
        status: string;
        createdAt: string;
      }>;
    };
    subscriptions: {
      total: number;
      growth: number;
      distribution: Array<{
        name: string;
        value: number;
      }>;
    };
    leadCoins: {
      total: number;
      spentThisMonth: number;
      viewedToday: number;
    };
    leadGenerationData: Array<{
      date: string;
      value: number;
    }>;
    activities: Array<{
      type: string;
      title: string;
      time: string;
      id: number;
    }>;
  }

  // Fetch dashboard data
  const {
    data: dashboardData,
    isLoading,
    error,
  } = useQuery<DashboardData>({
    queryKey: ["/api/admin/dashboard"],
    retry: 1,
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  console.log("Dashboard data state:", {
    isLoading,
    error,
    data: dashboardData,
  });

  // Handle error if present
  useEffect(() => {
    if (error) {
      console.error("Dashboard fetch error:", error);
      toast({
        title: "Error fetching dashboard data",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // For inactive user notifications
  const [inactiveDays, setInactiveDays] = useState(3);
  const [notificationSending, setNotificationSending] = useState(false);

  // Mutation for triggering inactive user notifications
  const notifyInactiveUsersMutation = useMutation({
    mutationFn: async (days: number) => {
      const response = await apiRequest(
        "POST",
        "/api/admin/notify-inactive-users",
        { days },
      );
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Notification process started",
        description: `Sending emails to users inactive for ${inactiveDays} days`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Notification failed",
        description: error.message || "Failed to send notifications",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setNotificationSending(false);
    },
  });

  const handleNotifyInactiveUsers = () => {
    setNotificationSending(true);
    notifyInactiveUsersMutation.mutate(inactiveDays);
  };

  // Handle export functionality
  const handleExport = () => {
    if (!dashboardData) {
      toast({
        title: "Export failed",
        description: "No data available to export",
        variant: "destructive",
      });
      return;
    }

    try {
      // Create CSV content
      const csvData = [
        // Headers
        ["Dashboard Report", new Date().toLocaleDateString(), ""],
        ["", "", ""],
        ["Stats", "Value", "Growth"],
        [
          "Total Users",
          dashboardData.users.total,
          `${dashboardData.users.growth}%`,
        ],
        [
          "Total Leads",
          dashboardData.leads.total,
          `${dashboardData.leads.growth}%`,
        ],
        [
          "Support Tickets",
          dashboardData.tickets.total,
          `${dashboardData.tickets.growth}%`,
        ],
        [
          "Active Subscriptions",
          dashboardData.subscriptions.total,
          `${dashboardData.subscriptions.growth}%`,
        ],
        ["", "", ""],
        ["Lead Coins", "", ""],
        ["Total Coins in Circulation", dashboardData.leadCoins.total, ""],
        ["Coins Spent This Month", dashboardData.leadCoins.spentThisMonth, ""],
        ["Leads Viewed Today", dashboardData.leadCoins.viewedToday, ""],
        ["", "", ""],
        ["Subscription Distribution", "", ""],
        ...dashboardData.subscriptions.distribution.map((s) => [
          s.name,
          s.value,
          "",
        ]),
        ["", "", ""],
        ["Lead Generation", "", ""],
        ...dashboardData.leadGenerationData.map((d) => [d.date, d.value, ""]),
      ];

      // Convert to CSV string
      const csvContent = csvData.map((row) => row.join(",")).join("\n");

      // Create and download file
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `dashboard-report-${new Date().toISOString().split("T")[0]}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast({
        title: "Export successful",
        description: "Dashboard data has been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Failed to generate export file",
        variant: "destructive",
      });
    }
  };

  return (
    <MainLayout>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0 mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Admin Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
            onClick={handleExport}
          >
            <i className="ri-download-line"></i>
            <span>Export</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1"
          >
            <i className="ri-calendar-line"></i>
            <span>Last 30 days</span>
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        {isLoading ? (
          <div className="col-span-full">
            <DashboardSkeleton />
          </div>
        ) : (
          <>
            <StatsCard
              title="Total Users"
              value={dashboardData?.users.total || 0}
              icon={<i className="ri-user-line text-xl"></i>}
              trend={{
                value: `${dashboardData?.users.growth || 0}%`,
                positive: (dashboardData?.users.growth || 0) >= 0,
              }}
              description="from last month"
            />

            <StatsCard
              title="Total Leads"
              value={dashboardData?.leads.total || 0}
              icon={<i className="ri-bookmark-line text-xl"></i>}
              trend={{
                value: `${dashboardData?.leads.growth || 0}%`,
                positive: (dashboardData?.leads.growth || 0) >= 0,
              }}
              description="from last month"
            />

            <StatsCard
              title="Support Tickets"
              value={dashboardData?.tickets.total || 0}
              icon={<i className="ri-customer-service-2-line text-xl"></i>}
              trend={{
                value: `${dashboardData?.tickets.growth || 0}%`,
                positive: (dashboardData?.tickets.growth || 0) >= 0,
              }}
              description="from last month"
            />

            <StatsCard
              title="Active Subscriptions"
              value={dashboardData?.subscriptions.total || 0}
              icon={<i className="ri-stack-line text-xl"></i>}
              trend={{
                value: `${dashboardData?.subscriptions.growth || 0}%`,
                positive: (dashboardData?.subscriptions.growth || 0) >= 0,
              }}
              description="from last month"
            />
          </>
        )}
      </div>

      {/* Lead Coin Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400 opacity-80"></div>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-12 w-12 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md bg-gradient-to-br from-blue-50 to-white border border-blue-100">
              {/* Top decorative accent */}
              <div className="h-1 w-full bg-gradient-to-r from-blue-500 to-blue-400 opacity-80"></div>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl text-white mr-3 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide"
                    >
                      <circle cx="12" cy="12" r="8" />
                      <path d="M12 6v12" />
                      <path d="M8 10h8" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-700 mb-1">
                      Total Coins in Circulation
                    </h3>
                    <p className="text-3xl font-bold text-blue-900 tracking-tight">
                      {dashboardData?.leadCoins.total.toLocaleString() || 0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-blue-100 to-white w-full mt-1"></div>
                <div className="text-xs text-blue-600 mt-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                  <span>Available to users across the platform</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md bg-gradient-to-br from-emerald-50 to-white border border-emerald-100">
              {/* Top decorative accent */}
              <div className="h-1 w-full bg-gradient-to-r from-emerald-500 to-emerald-400 opacity-80"></div>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-3 rounded-xl text-white mr-3 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide"
                    >
                      <path d="M17 2h-4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"></path>
                      <path d="M7 2H3a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"></path>
                      <path d="M17 8h4"></path>
                      <path d="M17 12h4"></path>
                      <path d="M3 8h4"></path>
                      <path d="M3 12h4"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-emerald-700 mb-1">
                      Coins Spent This Month
                    </h3>
                    <p className="text-3xl font-bold text-emerald-900 tracking-tight">
                      {dashboardData?.leadCoins.spentThisMonth.toLocaleString() ||
                        0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-emerald-100 to-white w-full mt-1"></div>
                <div className="text-xs text-emerald-600 mt-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <rect
                      x="2"
                      y="7"
                      width="20"
                      height="14"
                      rx="2"
                      ry="2"
                    ></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                  <span>Monthly spending tracked automatically</span>
                </div>
              </CardContent>
            </Card>

            <Card className="group overflow-hidden transition-all duration-300 hover:shadow-md bg-gradient-to-br from-amber-50 to-white border border-amber-100">
              {/* Top decorative accent */}
              <div className="h-1 w-full bg-gradient-to-r from-amber-500 to-amber-400 opacity-80"></div>
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <div className="bg-gradient-to-br from-amber-500 to-amber-600 p-3 rounded-xl text-white mr-3 shadow-md group-hover:shadow-lg transition-all duration-300 transform group-hover:scale-105">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide"
                    >
                      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-amber-700 mb-1">
                      Leads Viewed Today
                    </h3>
                    <p className="text-3xl font-bold text-amber-900 tracking-tight">
                      {dashboardData?.leadCoins.viewedToday.toLocaleString() ||
                        0}
                    </p>
                  </div>
                </div>
                <div className="h-1 bg-gradient-to-r from-amber-100 to-white w-full mt-1"></div>
                <div className="text-xs text-amber-600 mt-2 flex items-center">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="mr-1"
                  >
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M12 6v6l4 2"></path>
                  </svg>
                  <span>Daily lead views reset at midnight</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 lg:gap-x-8">
        {isLoading ? (
          <>
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                </CardHeader>
                <CardContent>
                  <div className="h-[300px] w-full flex items-center justify-center">
                    <Skeleton className="h-full w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            <LeadGenerationChart
              data={dashboardData?.leadGenerationData || []}
            />
            <SubscriptionDistributionChart
              data={dashboardData?.subscriptions.distribution || []}
            />
          </>
        )}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* User Management Tools */}
        <div className="lg:col-span-4">
          {/* Inactive User Notifications */}
          <Card className="overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
            {/* Glass effect top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>

            <CardHeader className="px-6 pt-6 pb-2 flex flex-col">
              <div className="flex items-center mb-2">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <Mail className="w-5 h-5" />
                </div>
                <CardTitle className="text-lg font-bold text-blue-800">
                  Inactive User Notifications
                </CardTitle>
              </div>
              <CardDescription className="text-blue-600">
                Send reminder emails to users who haven't logged in recently
              </CardDescription>
            </CardHeader>

            <CardContent className="px-6 py-4">
              <div className="space-y-4">
                <div className="flex items-center">
                  <Users className="h-5 w-5 text-blue-600 mr-2" />
                  <span className="text-sm text-gray-600">
                    Notify users who haven't logged in for:
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <Input
                    type="number"
                    min="1"
                    max="30"
                    value={inactiveDays}
                    onChange={(e) =>
                      setInactiveDays(parseInt(e.target.value) || 3)
                    }
                    className="max-w-[80px] border-blue-200"
                  />
                  <Label className="text-sm text-gray-600">days</Label>
                </div>

                <div className="flex items-center text-sm text-gray-500">
                  <AlertCircle className="h-4 w-4 mr-2 text-blue-600" />
                  <p>
                    This will send personalized reminder emails to inactive
                    users
                  </p>
                </div>
              </div>
            </CardContent>

            <CardFooter className="bg-gradient-to-r from-blue-50 to-transparent border-t border-blue-100 py-3 px-6">
              <Button
                onClick={handleNotifyInactiveUsers}
                disabled={notificationSending || inactiveDays < 1}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
              >
                {notificationSending ? (
                  <>
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Sending Notifications...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Notifications
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-8">
          <Card className="chart-card  overflow-hidden bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow-sm">
            {/* Glass effect top accent */}
            <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>

            <CardHeader className="px-6 pt-6 pb-0 flex md:flex-row items-center justify-between">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center mr-3">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                  </svg>
                </div>
                <CardTitle className="text-lg font-bold text-blue-800">
                  Recent Activity
                </CardTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                onClick={() => setActivitiesDialogOpen(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="mr-1"
                >
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                  <polyline points="14 2 14 8 20 8"></polyline>
                  <line x1="16" y1="13" x2="8" y2="13"></line>
                  <line x1="16" y1="17" x2="8" y2="17"></line>
                  <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                View All
              </Button>
            </CardHeader>

            <CardContent className="p-6 space-y-1">
              <div className="bg-white/50 rounded-lg p-1">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-start p-3 space-x-3 border-b border-blue-50 last:border-0"
                    >
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-28" />
                      </div>
                    </div>
                  ))
                ) : dashboardData?.activities &&
                  dashboardData.activities.length > 0 ? (
                  <div className="divide-y divide-blue-50">
                    {dashboardData.activities
                      .slice(0, 3)
                      .map((activity, index) => (
                        <ActivityItem
                          key={index}
                          type={activity.type}
                          title={activity.title}
                          time={formatTimeAgo(new Date(activity.time))}
                        />
                      ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-blue-400 bg-blue-50/50 rounded-md">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-10 w-10 mx-auto mb-2 opacity-60"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className="font-medium">No recent activities found</p>
                    <p className="text-xs mt-1">
                      New activities will appear here
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      {/* Activities Dialog */}
      <Dialog
        open={activitiesDialogOpen}
        onOpenChange={setActivitiesDialogOpen}
      >
        <DialogContent className="max-w-4xl bg-gradient-to-br from-white to-blue-50">
          <DialogHeader className="border-b border-blue-100 pb-4">
            <div className="flex items-center mb-1">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg mr-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                </svg>
              </div>
              <DialogTitle className="text-xl text-blue-900 font-bold">
                Activity History
              </DialogTitle>
            </div>
            {/* <p className="text-blue-600 text-sm">
              Review all platform activities
            </p> */}
          </DialogHeader>

          {dashboardData?.activities && dashboardData.activities.length > 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-blue-50">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-blue-50/50">
                      <TableHead className="text-blue-700 font-medium">
                        Type
                      </TableHead>
                      <TableHead className="text-blue-700 font-medium">
                        Activity
                      </TableHead>
                      <TableHead className="text-blue-700 font-medium">
                        Time
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.activities
                      .slice(
                        (activitiesPage - 1) * itemsPerPage,
                        activitiesPage * itemsPerPage,
                      )
                      .map((activity, index) => (
                        <TableRow
                          key={index}
                          className="hover:bg-blue-50/30 transition-colors"
                        >
                          <TableCell className="py-3">
                            <div className="flex items-center">
                              <div
                                className={cn(
                                  "p-1.5 rounded-full mr-2 flex items-center justify-center",
                                  activity.type === "user" &&
                                    "bg-blue-100 text-blue-600",
                                  activity.type === "lead" &&
                                    "bg-emerald-100 text-emerald-600",
                                  activity.type === "support" &&
                                    "bg-amber-100 text-amber-600",
                                  activity.type === "subscription" &&
                                    "bg-purple-100 text-purple-600",
                                )}
                              >
                                {activity.type === "user" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                                    <circle cx="9" cy="7" r="4"></circle>
                                  </svg>
                                )}
                                {activity.type === "lead" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                                  </svg>
                                )}
                                {activity.type === "support" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"></path>
                                  </svg>
                                )}
                                {activity.type === "subscription" && (
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="16"
                                    height="16"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                  >
                                    <rect
                                      x="2"
                                      y="3"
                                      width="20"
                                      height="14"
                                      rx="2"
                                    ></rect>
                                    <line x1="8" y1="21" x2="16" y2="21"></line>
                                    <line
                                      x1="12"
                                      y1="17"
                                      x2="12"
                                      y2="21"
                                    ></line>
                                  </svg>
                                )}
                              </div>
                              <span className="text-blue-900 font-medium">
                                {activity.type.charAt(0).toUpperCase() +
                                  activity.type.slice(1)}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-gray-700">
                            {activity.title}
                          </TableCell>
                          <TableCell className="text-gray-500 text-sm">
                            <div className="flex items-center">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="14"
                                height="14"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="mr-1"
                              >
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                              </svg>
                              {formatTimeAgo(new Date(activity.time))}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>

              {/* <div className="border-t border-blue-50 p-4">
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "border-blue-200 text-blue-700",
                          activitiesPage === 1 &&
                            "opacity-50 cursor-not-allowed",
                        )}
                        onClick={() =>
                          setActivitiesPage((p) => Math.max(1, p - 1))
                        }
                        disabled={activitiesPage === 1}
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="mr-1"
                        >
                          <path d="m15 18-6-6 6-6" />
                        </svg>
                        Previous
                      </Button>
                    </PaginationItem>

                    <div className="mx-4 flex items-center">
                      <span className="text-sm text-blue-700">
                        Page {activitiesPage} of{" "}
                        {Math.ceil(
                          dashboardData.activities.length / itemsPerPage,
                        )}
                      </span>
                    </div>

                    <PaginationItem>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "border-blue-200 text-blue-700",
                          activitiesPage ===
                            Math.ceil(
                              dashboardData.activities.length / itemsPerPage,
                            ) && "opacity-50 cursor-not-allowed",
                        )}
                        onClick={() =>
                          setActivitiesPage((p) =>
                            Math.min(
                              Math.ceil(
                                dashboardData.activities.length / itemsPerPage,
                              ),
                              p + 1,
                            ),
                          )
                        }
                        disabled={
                          activitiesPage ===
                          Math.ceil(
                            dashboardData.activities.length / itemsPerPage,
                          )
                        }
                      >
                        Next
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="ml-1"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div> */}
            </div>
          ) : (
            <div className="text-center py-12 bg-blue-50/30 rounded-lg border border-blue-100">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-16 w-16 mx-auto mb-4 text-blue-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-blue-700 font-medium text-lg">
                No activities found
              </p>
              <p className="text-blue-500 mt-2 max-w-md mx-auto">
                There are no recorded activities at the moment. Activities will
                appear here as users interact with the platform.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </MainLayout>
  );
}
