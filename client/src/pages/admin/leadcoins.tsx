import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";
import { FormSkeleton } from "@/components/skeletons/form-skeleton";
import { type LeadCoinSetting, type User } from "@shared/schema";

// Define the stats type to match the backend data
interface LeadCoinStats {
  totalCoins: number;
  coinsSpentThisMonth: number;
  leadsViewedToday: number;
  topUsers: {
    name: string;
    email: string;
    currentBalance: number;
    totalSpent: number;
  }[];
}

export default function AdminLeadcoins() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [contactInfoCost, setContactInfoCost] = useState<number>(5);
  const [detailedInfoCost, setDetailedInfoCost] = useState<number>(10);
  const [fullAccessCost, setFullAccessCost] = useState<number>(15);

  // Handle settings data when received
  const handleSettingsData = useCallback((data: LeadCoinSetting) => {
    if (data) {
      setContactInfoCost(data.contactInfoCost);
      setDetailedInfoCost(data.detailedInfoCost);
      setFullAccessCost(data.fullAccessCost);
    }
  }, []);

  // Fetch lead coin settings
  const { data: settings, isLoading: isLoadingSettings } =
    useQuery<LeadCoinSetting>({
      queryKey: ["/api/leadcoins/settings"],
    });

  // Update form when settings change
  useEffect(() => {
    if (settings) {
      handleSettingsData(settings);
    }
  }, [settings, handleSettingsData]);

  const handleSaveSettings = async () => {
    setIsLoading(true);

    try {
      await apiRequest("PUT", "/api/leadcoins/settings", {
        contactInfoCost,
        detailedInfoCost,
        fullAccessCost,
      });

      toast({
        title: "Settings updated",
        description: "LeadCoin settings have been updated successfully.",
      });

      // Invalidate settings query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leadcoins/settings"] });
      queryClient.invalidateQueries({ queryKey: ["/api/leadcoins/stats"] });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update settings. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch lead coin statistics
  const { data: stats, isLoading: isLoadingStats } = useQuery<LeadCoinStats>({
    queryKey: ["/api/leadcoins/stats"],
  });

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          LeadCoin Management
        </h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* LeadCoin Settings */}
        <Card>
          <CardHeader>
            <CardTitle>LeadCoin Settings</CardTitle>
            <CardDescription>
              Configure how LeadCoins are charged when users view lead details
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSettings ? (
              <FormSkeleton 
                fields={3}
                showButtons={false}
                showTitle={false}
              />
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="contact-info-cost">Contact Info Cost</Label>
                  <Input
                    id="contact-info-cost"
                    type="number"
                    min="1"
                    value={contactInfoCost}
                    onChange={(e) => setContactInfoCost(Number(e.target.value))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    LeadCoins charged when a user views a lead's contact details
                  </p>
                </div>

                {/* <div className="space-y-2">
                  <Label htmlFor="detailed-info-cost">Detailed Info Cost</Label>
                  <Input
                    id="detailed-info-cost"
                    type="number"
                    min="1"
                    value={detailedInfoCost}
                    onChange={(e) => setDetailedInfoCost(Number(e.target.value))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    LeadCoins charged when a user views detailed information
                  </p>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="full-access-cost">Full Access Cost</Label>
                  <Input
                    id="full-access-cost"
                    type="number"
                    min="1"
                    value={fullAccessCost}
                    onChange={(e) => setFullAccessCost(Number(e.target.value))}
                    disabled={isLoading}
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    LeadCoins charged for full access to a lead
                  </p>
                </div> */}
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleSaveSettings}
              disabled={isLoading || isLoadingSettings}
            >
              {isLoading ? "Saving..." : "Save Settings"}
            </Button>
          </CardFooter>
        </Card>

        {/* LeadCoin Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>LeadCoin Statistics</CardTitle>
            <CardDescription>
              Overview of LeadCoin usage across the platform
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingStats ? (
              <div className="py-2">
                <CardSkeleton 
                  count={1}
                  layout="list"
                  withImage={false}
                  withActions={false}
                  withFooterAction={false}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">
                    Total Coins in Circulation
                  </span>
                  <span className="text-xl font-semibold">
                    {stats?.totalCoins || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">
                    Coins Spent This Month
                  </span>
                  <span className="text-xl font-semibold">
                    {stats?.coinsSpentThisMonth || 0}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-text-secondary">
                    Leads Viewed Today
                  </span>
                  <span className="text-xl font-semibold">
                    {stats?.leadsViewedToday || 0}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* User LeadCoin Tracking */}
      <Card>
        <CardHeader>
          <CardTitle>Top LeadCoin Users</CardTitle>
          <CardDescription>
            Users with highest LeadCoin balance and usage
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingStats ? (
            <TableSkeleton 
              rowCount={5}
              columnCount={4}
              showHeader={true}
              showActions={false}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr>
                    <th className="text-left font-medium py-2">User</th>
                    <th className="text-left font-medium py-2">Email</th>
                    <th className="text-left font-medium py-2">
                      Current Balance
                    </th>
                    <th className="text-left font-medium py-2">Total Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {stats?.topUsers && stats.topUsers.length > 0 ? (
                    stats.topUsers.map((user, index) => (
                      <tr key={index}>
                        <td className="py-2">{user.name}</td>
                        <td className="py-2">{user.email}</td>
                        <td className="py-2">{user.currentBalance}</td>
                        <td className="py-2">{user.totalSpent}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-text-secondary"
                      >
                        No data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}
