import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { LeadCard } from "@/components/leads/lead-card";
import { LeadForm } from "@/components/leads/lead-form";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type Lead } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadDetail } from "@/components/leads/lead-detail";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { navigate } from "wouter/use-browser-location";

export default function SubadminLeads() {
  const { user } = useAuth();
  const [isCreateLeadOpen, setIsCreateLeadOpen] = useState(false);
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Check if user has permission
  const hasPermission = user?.permissions?.includes("leads_management");

  // Handle unauthorized access
  if (!hasPermission) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the leads management module.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // Fetch leads data
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  const handleLeadDetail = (leadId: number) => {
    setSelectedLeadId(leadId);
    // setIsLeadDetailOpen(true);
  };

  // Filter leads by search term and tab
  const filteredLeads = leads
    ? leads.filter((lead) => {
        const matchesSearch =
          lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.location.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === "all") return matchesSearch;

        // Add more filters based on tabs if needed
        return matchesSearch;
      })
    : [];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">
          Leads Management
        </h1>
        <div className="flex gap-2">
          {/* <ExportButton 
            endpoint="/api/export/leads" 
            label="Export Leads" 
            variant="outline"
            className="bg-white hover:bg-gray-100"
          /> */}
          <Button
            onClick={() => (window.location.href = "/subadmin/create-lead")}
            variant="default"
            className="bg-gradient-to-r from-blue-600 to-blue-500"
          >
            Lead Create
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search leads..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full sm:w-auto"
              >
                <TabsList>
                  <TabsTrigger value="all">All Leads</TabsTrigger>
                  <TabsTrigger value="recent">Recent</TabsTrigger>
                  <TabsTrigger value="popular">Popular</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="h-40 w-full" />
              <CardContent className="p-4 space-y-3">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-full" />
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-4 w-1/5" />
                </div>
                <Skeleton className="h-9 w-full mt-2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredLeads.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredLeads.map((lead) => (
            <div
              key={lead.id}
              onClick={() => handleLeadDetail(lead.id)}
              className="cursor-pointer"
            >
              <LeadCard lead={lead} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <i className="ri-file-search-line text-5xl text-gray-300 mb-3"></i>
          <h3 className="text-lg font-medium">No leads found</h3>
          <p className="text-text-secondary mt-1">
            Try adjusting your search or create a new lead
          </p>
          <Button
            onClick={() => navigate("/subadmin/create-lead")}
            className="mt-4"
          >
            Create New Lead
          </Button>
        </div>
      )}

      {/* Create Lead Sheet */}
      <Sheet open={isCreateLeadOpen} onOpenChange={setIsCreateLeadOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create New Lead</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <LeadForm onSuccess={() => setIsCreateLeadOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Lead Detail Sheet */}
      <Sheet open={isLeadDetailOpen} onOpenChange={setIsLeadDetailOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lead Details</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{selectedLeadId && <LeadDetail />}</div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
