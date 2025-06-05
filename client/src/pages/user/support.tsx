import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { TicketCard } from "@/components/support/ticket-card";
import { TicketForm } from "@/components/support/ticket-form";
import { TicketDetail } from "@/components/support/ticket-detail";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type SupportTicket } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserSupport() {
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);
  const [isTicketDetailOpen, setIsTicketDetailOpen] = useState(false);
  const [selectedTicketId, setSelectedTicketId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  // Fetch tickets data
  const {
    data: tickets,
    isLoading,
    refetch,
  } = useQuery<SupportTicket[]>({
    queryKey: ["/api/support/user"],
  });

  useEffect(() => {
    refetch();
  }, [isNewTicketOpen]);

  const handleTicketDetail = (ticketId: number) => {
    setSelectedTicketId(ticketId);
    setIsTicketDetailOpen(true);
  };

  // Filter tickets by tab
  const filteredTickets = tickets
    ? tickets.filter((ticket) => {
        if (activeTab === "all") return true;
        if (activeTab === "open")
          return ticket.status === "open" || ticket.status === "in_progress";
        if (activeTab === "resolved")
          return ticket.status === "resolved" || ticket.status === "closed";
        return true;
      })
    : [];

  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Support</h1>
        <Button onClick={() => setIsNewTicketOpen(true)}>
          <i className="ri-add-line mr-1"></i>
          New Ticket
        </Button>
      </div>

      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All Tickets</TabsTrigger>
                <TabsTrigger value="open">Open</TabsTrigger>
                <TabsTrigger value="resolved">Resolved</TabsTrigger>
              </TabsList>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
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
          <p className="text-text-secondary mt-1 mb-4">
            Create a new ticket to get help from our team
          </p>
          <Button onClick={() => setIsNewTicketOpen(true)}>
            Create Support Ticket
          </Button>
        </div>
      )}

      {/* New Ticket Sheet */}
      <Sheet open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Support Ticket</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <TicketForm onSuccess={() => setIsNewTicketOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      {/* Ticket Detail Sheet */}
      <Sheet open={isTicketDetailOpen} onOpenChange={setIsTicketDetailOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Support Ticket</SheetTitle>
          </SheetHeader>
          <div className="mt-6">{selectedTicketId && <TicketDetail selectedTicketId={selectedTicketId} />}</div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
