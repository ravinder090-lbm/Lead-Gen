import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TicketCard } from "@/components/support/ticket-card";
import { TicketDetail } from "@/components/support/ticket-detail";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { type SupportTicket } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SubadminSupport() {
  const { user } = useAuth();
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("all");
  
  // Check if user has permission
  const hasPermission = user?.permissions?.includes('support_management');
  
  // Handle unauthorized access
  if (!hasPermission) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the support management module.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
  
  // Fetch tickets data
  const { data: tickets, isLoading } = useQuery<SupportTicket[]>({
    queryKey: ['/api/support'],
  });
  
  const handleTicketDetail = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setIsTicketDetailOpen(true);
  };
  
  // Filter tickets by search term, status, and tab
  const filteredTickets = tickets
    ? tickets.filter(ticket => {
        const matchesSearch = 
          ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
          ticket.message.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
        
        const matchesTab = 
          activeTab === "all" || 
          (activeTab === "open" && (ticket.status === "open" || ticket.status === "in_progress")) ||
          (activeTab === "resolved" && (ticket.status === "resolved" || ticket.status === "closed"));
        
        return matchesSearch && matchesStatus && matchesTab;
      })
    : [];
  
  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Support Management</h1>
      </div>
      
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search tickets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-1"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="open">Active</TabsTrigger>
                  <TabsTrigger value="resolved">Resolved</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
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
            </Card>
          ))}
        </div>
      ) : filteredTickets.length > 0 ? (
        <div className="space-y-4">
          {filteredTickets.map((ticket) => (
            <div key={ticket.id}>
              <TicketCard ticket={ticket} onView={handleTicketDetail} />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center p-10 text-center">
          <i className="ri-customer-service-2-line text-5xl text-gray-300 mb-3"></i>
          <h3 className="text-lg font-medium">No support tickets found</h3>
          <p className="text-text-secondary mt-1">There are no tickets matching your criteria</p>
        </div>
      )}
      
      {/* Ticket Detail Sheet */}
      <Sheet open={isTicketDetailOpen} onOpenChange={setIsTicketDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Support Ticket</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedTicketId && (
              <TicketDetail selectedTicketId={selectedTicketId} />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
