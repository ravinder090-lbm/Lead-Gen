import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Download, Eye, TrendingUp } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface AdminLeadViewReport {
  id: number;
  userId: number;
  leadId: number;
  coinsSpent: number;
  viewType: string;
  viewedAt: string;
  userName: string;
  userEmail: string;
  leadTitle: string;
  leadLocation: string;
}

export default function AdminLeadReports() {
  const [searchTerm, setSearchTerm] = useState("");
  const [viewTypeFilter, setViewTypeFilter] = useState<string>("all");

  // Fetch all lead views for admin
  const { data: leadViews = [], isLoading } = useQuery<AdminLeadViewReport[]>({
    queryKey: ["/api/lead-views/admin"],
  });

  const filteredViews = leadViews.filter((view) => {
    const matchesSearch = 
      view.leadTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.leadLocation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      view.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = viewTypeFilter === "all" || view.viewType === viewTypeFilter;
    
    return matchesSearch && matchesType;
  });

  const totalCoinsSpent = leadViews.reduce((sum, view) => sum + view.coinsSpent, 0);
  const uniqueUsers = new Set(leadViews.map(view => view.userId)).size;
  const uniqueLeads = new Set(leadViews.map(view => view.leadId)).size;

  const getViewTypeBadge = (viewType: string) => {
    switch (viewType) {
      case "contact_info":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Contact Info</Badge>;
      case "detailed_info":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Detailed Info</Badge>;
      case "full_access":
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Full Access</Badge>;
      default:
        return <Badge variant="outline">{viewType}</Badge>;
    }
  };

  const exportToCSV = () => {
    const headers = [
      "Date",
      "User Name",
      "User Email",
      "Lead Title",
      "Lead Location",
      "View Type",
      "Coins Spent"
    ];

    const csvData = filteredViews.map(view => [
      formatDate(new Date(view.viewedAt)),
      view.userName,
      view.userEmail,
      view.leadTitle,
      view.leadLocation,
      view.viewType,
      view.coinsSpent
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `lead_view_reports_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Lead View Reports</h1>
        <Button onClick={exportToCSV} className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{leadViews.length}</div>
            <p className="text-xs text-muted-foreground">All lead views</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCoinsSpent}</div>
            <p className="text-xs text-muted-foreground">LeadCoins collected</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <i className="ri-user-line text-lg text-muted-foreground"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueUsers}</div>
            <p className="text-xs text-muted-foreground">Users who viewed leads</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leads Viewed</CardTitle>
            <i className="ri-file-list-line text-lg text-muted-foreground"></i>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueLeads}</div>
            <p className="text-xs text-muted-foreground">Unique leads accessed</p>
          </CardContent>
        </Card>
      </div>

      {/* Lead Views Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Lead View Activity</CardTitle>
          <CardDescription>
            Comprehensive tracking of all lead views across the platform
          </CardDescription>
          <div className="flex items-center space-x-4">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search leads, users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            {/* <Select value={viewTypeFilter} onValueChange={setViewTypeFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="contact_info">Contact Info</SelectItem>
                <SelectItem value="detailed_info">Detailed Info</SelectItem>
                <SelectItem value="full_access">Full Access</SelectItem>
              </SelectContent>
            </Select> */}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredViews.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date & Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Lead</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>View Type</TableHead>
                    <TableHead>Coins</TableHead>
                    {/* <TableHead>Actions</TableHead> */}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredViews.map((view) => (
                    <TableRow key={view.id}>
                      <TableCell className="font-medium">
                        {formatDate(new Date(view.viewedAt))}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{view.userName}</div>
                          <div className="text-sm text-muted-foreground">{view.userEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{view.leadTitle}</TableCell>
                      <TableCell>{view.leadLocation}</TableCell>
                      <TableCell>{getViewTypeBadge(view.viewType)}</TableCell>
                      <TableCell>
                        <span className="font-medium text-green-600">+{view.coinsSpent}</span>
                      </TableCell>
                      <TableCell>
                        {/* <Button variant="outline" size="sm">
                          View Details
                        </Button> */}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center">
              <Eye className="h-12 w-12 text-gray-300 mb-3" />
              <h3 className="text-lg font-medium">No lead views found</h3>
              <p className="text-muted-foreground mt-1">
                {searchTerm || viewTypeFilter !== "all"
                  ? "No views match your filters"
                  : "No users have viewed any leads yet"}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </MainLayout>
  );
}