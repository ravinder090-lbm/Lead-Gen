import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { StatsCard } from "@/components/dashboard/stats-card";
import { ModuleCard } from "@/components/dashboard/module-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";

export default function SubadminDashboard() {
  const { user } = useAuth();

  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ["/api/subadmin/dashboard"],
  });

  const { data: tickets, isLoading: isTicketsLoading } = useQuery<
    SupportTicket[]
  >({
    queryKey: ["/api/support"],
  });

  // Get permissions
  const permissions = (user?.permissions as string[]) || [];

  // Check if user has a specific permission
  const hasPermission = (permission: string) => {
    return permissions.includes(permission);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Subadmin Dashboard
        </h1>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {isLoading ? (
          <>
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <Skeleton className="h-4 w-20 mb-2" />
                      <Skeleton className="h-8 w-24" />
                    </div>
                    <Skeleton className="h-10 w-10 rounded-lg" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </>
        ) : (
          <>
            {hasPermission("user_management") && (
              <StatsCard
                title="Managed Users"
                value={dashboardData?.users?.total || 0}
                icon={<i className="ri-user-line text-xl"></i>}
              />
            )}

            {hasPermission("leads_management") && (
              <StatsCard
                title="Active Leads"
                value={dashboardData?.leads?.total || 0}
                icon={<i className="ri-bookmark-line text-xl"></i>}
              />
            )}

            {hasPermission("support_management") && (
              <StatsCard
                title="Open Tickets"
                value={
                  tickets?.filter((ticket) => ticket.status === "open")
                    .length || 0
                }
                icon={<i className="ri-customer-service-2-line text-xl"></i>}
              />
            )}
          </>
        )}
      </div>

      {/* Assigned Modules */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Your Assigned Modules</CardTitle>
        </CardHeader>
        <CardContent className="p-5">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <ModuleCard
                title="User Management"
                description="Manage user accounts and profiles"
                icon={<i className="ri-user-line text-xl"></i>}
                active={hasPermission("user_management")}
              />

              <ModuleCard
                title="Leads Management"
                description="Create and manage leads"
                icon={<i className="ri-bookmark-line text-xl"></i>}
                active={hasPermission("leads_management")}
              />

              <ModuleCard
                title="Support Management"
                description="Handle customer support tickets"
                icon={<i className="ri-customer-service-2-line text-xl"></i>}
                active={hasPermission("support_management")}
              />

              <ModuleCard
                title="Subscription Management"
                description="Manage subscription plans"
                icon={<i className="ri-stack-line text-xl"></i>}
                active={hasPermission("subscription_management")}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Support Tickets */}
      {hasPermission("support_management") && (
        <Card>
          <CardHeader className="flex items-center flex-row justify-between pb-2">
            <CardTitle>Recent Support Tickets</CardTitle>
            <Button
              variant="link"
              size="sm"
              onClick={() => (window.location.href = "/subadmin/support")}
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-5">
                <Skeleton className="h-72 w-full" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Subject
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Description
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Created
                      </th>
                      {/* <th
                        scope="col"
                        className="px-6 py-3 text-right text-xs font-medium text-text-secondary uppercase tracking-wider"
                      >
                        Action
                      </th> */}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {tickets?.slice(0, 5)?.map((ticket: any, i: any) => (
                      <tr key={ticket.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          #{i + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          {ticket?.subject}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-primary">
                          {ticket?.message?.substring(0, 10)}...
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              ticket?.status === "open"
                                ? "bg-yellow-100 text-yellow-800"
                                : ticket?.status === "in_progress"
                                  ? "bg-blue-100 text-blue-800"
                                  : ticket?.status === "resolved"
                                    ? "bg-green-100 text-green-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {ticket?.status === "in_progress"
                              ? "In Progress"
                              : ticket?.status.charAt(0).toUpperCase() +
                                ticket?.status.slice(1)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-text-secondary">
                          {ticket?.createdAt}
                        </td>
                        {/* <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Button
                            variant="link"
                            size="sm"
                            onClick={() =>
                              (window.location.href = `/subadmin/dashboard/${ticket.id}`)
                            }
                          >
                            View
                          </Button>
                        </td> */}
                      </tr>
                    )) || (
                      <tr>
                        <td
                          colSpan={6}
                          className="px-6 py-4 text-center text-sm text-text-secondary"
                        >
                          No recent tickets
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </MainLayout>
  );
}
