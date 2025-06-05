import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Eye, Calendar, Coins, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { MainLayout } from "@/components/layout/main-layout";

interface LeadView {
  id: number;
  userId: number;
  leadId: number;
  coinsSpent: number;
  viewType: string;
  viewedAt: string;
  leadTitle: string;
  leadLocation?: string;
  userName: string;
}

export default function UserLeadReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedViewType, setSelectedViewType] = useState("all");

  const { data: leadViews = [], isLoading, error } = useQuery({
    queryKey: ["/api/lead-views/user"],
  });

  const filteredViews = leadViews?.filter((view: LeadView) => {
    const matchesSearch = view.leadTitle?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         view.leadLocation?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesViewType = selectedViewType === "all" || view.viewType === selectedViewType;
    return matchesSearch && matchesViewType;
  });

  const totalCoinsSpent = filteredViews.reduce((sum: number, view: LeadView) => sum + view.coinsSpent, 0);
  const totalViews = filteredViews.length;

  const getViewTypeBadge = (viewType: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      contact_info: "default",
      detailed_info: "secondary", 
      full_access: "destructive"
    };
    
    const labels: Record<string, string> = {
      contact_info: "Contact Info",
      detailed_info: "Detailed Info",
      full_access: "Full Access"
    };

    return (
      <Badge variant={variants[viewType] || "outline"}>
        {labels[viewType] || viewType}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading your lead viewing history...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-red-600">
              <p>Failed to load lead viewing history. Please try again later.</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
        <MainLayout>
<div className="w-[110rem] mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-2">
        <Eye className="h-6 w-6 text-blue-600" />
        <h1 className="text-2xl font-bold text-gray-900">My Lead View Reports</h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Leads you've viewed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Coins Spent</CardTitle>
            <Coins className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoinsSpent}</div>
            <p className="text-xs text-muted-foreground">
              LeadCoins used for viewing
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Cost</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalViews > 0 ? Math.round(totalCoinsSpent / totalViews) : 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Coins per view
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>View History</CardTitle>
          <CardDescription>
            Complete history of all leads you've viewed with costs and timestamps
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-3" />
              <Input
                placeholder="Search by lead title or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            {/* <div className="flex gap-2">
              <Button
                variant={selectedViewType === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedViewType("all")}
              >
                All Types
              </Button>
              <Button
                variant={selectedViewType === "contact_info" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedViewType("contact_info")}
              >
                Contact Info
              </Button>
              <Button
                variant={selectedViewType === "detailed_info" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedViewType("detailed_info")}
              >
                Detailed Info
              </Button>
              <Button
                variant={selectedViewType === "full_access" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedViewType("full_access")}
              >
                Full Access
              </Button>
            </div> */}
          </div>

          {filteredViews.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lead views found</h3>
              <p className="text-gray-600">
                {searchTerm || selectedViewType !== "all" 
                  ? "No views match your current filters."
                  : "You haven't viewed any leads yet. Start browsing leads to see your viewing history here."
                }
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead Title</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>View Type</TableHead>
                    <TableHead>Coins Spent</TableHead>
                    <TableHead>Date & Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViews.map((view: LeadView) => (
                    <TableRow key={view.id}>
                      <TableCell className="font-medium">
                        {view.leadTitle || `Lead #${view.leadId}`}
                      </TableCell>
                      <TableCell>
                        {view.leadLocation || "Not specified"}
                      </TableCell>
                      <TableCell>
                        {getViewTypeBadge(view.viewType)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Coins className="h-4 w-4 text-yellow-600" />
                          <span className="font-medium">{view.coinsSpent}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span>{format(new Date(view.viewedAt), "MMM d, yyyy 'at' h:mm a")}</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
        </MainLayout>
    
  );
}