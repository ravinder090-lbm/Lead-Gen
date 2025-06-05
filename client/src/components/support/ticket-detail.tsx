import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { type SupportTicket, type SupportTicketReply } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getInitials } from "@/lib/utils";
import { confirmAction, showSuccess, showError } from "@/lib/sweet-alert";

interface TicketDetailProps {
  selectedTicketId?: number;
}

export function TicketDetail({ selectedTicketId }: TicketDetailProps = {}) {
  // Use URL param as fallback if not provided through props
  const params = useParams<{ id: string }>();
  const urlTicketId = params.id ? parseInt(params.id) : null;
  const ticketId = selectedTicketId || urlTicketId;
  const { user } = useAuth();
  const { toast } = useToast();

  const [replyMessage, setReplyMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string | undefined>(
    undefined,
  );
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const { data: ticket, isLoading: isLoadingTicket } = useQuery<SupportTicket>({
    queryKey: [`/api/support/${ticketId}`],
  });

  const { data: replies = [], isLoading: isLoadingReplies } = useQuery<
    SupportTicketReply[]
  >({
    queryKey: [`/api/support/${ticketId}/replies`],
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-yellow-100 text-yellow-800";
      case "in_progress":
        return "bg-blue-100 text-blue-800";
      case "resolved":
        return "bg-green-100 text-green-800";
      case "closed":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "open":
        return "Open";
      case "in_progress":
        return "In Progress";
      case "resolved":
        return "Resolved";
      case "closed":
        return "Closed";
      default:
        return status;
    }
  };

  const handleSubmitReply = async () => {
    if (!replyMessage.trim()) return;

    // We don't need a confirmation dialog for submitting a reply, as this is not a destructive action
    // and users expect immediate feedback when sending messages

    setIsSubmitting(true);
    try {
      await apiRequest("POST", `/api/support/${ticketId}/reply`, {
        message: replyMessage,
      });

      // Show success with SweetAlert2
      await showSuccess(
        "Reply Submitted",
        "Your response has been submitted successfully.",
      );

      // Also show toast notification
      toast({
        title: "Reply submitted",
        description: "Your response has been submitted successfully.",
      });

      // Clear the reply field
      setReplyMessage("");

      // Refresh replies data
      queryClient.invalidateQueries({
        queryKey: [`/api/support/${ticketId}/replies`],
      });
    } catch (error: any) {
      // Show error with SweetAlert2
      showError(
        "Error Submitting Reply",
        error.message || "Failed to submit reply. Please try again.",
      );

      // Also show toast notification
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to submit reply. Please try again.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async () => {
    if (!selectedStatus || selectedStatus === ticket?.status) return;

    // Ask for confirmation with SweetAlert2
    const confirmed = await confirmAction(
      "Update Ticket Status",
      `Are you sure you want to change the status to "${getStatusLabel(selectedStatus)}"?`,
      "Yes, Update Status",
    );

    if (!confirmed) return;

    setIsUpdatingStatus(true);
    try {
      await apiRequest("PATCH", `/api/support/${ticketId}/status`, {
        status: selectedStatus,
      });

      // Show success with SweetAlert2
      await showSuccess(
        "Status Updated",
        `Ticket status updated to ${getStatusLabel(selectedStatus)}.`,
      );

      // Also show toast notification
      toast({
        title: "Status updated",
        description: `Ticket status updated to ${getStatusLabel(selectedStatus)}.`,
      });

      // Refresh ticket data
      queryClient.invalidateQueries({ queryKey: [`/api/support/${ticketId}`] });
      queryClient.invalidateQueries({ queryKey: ["/api/support"] });
    } catch (error: any) {
      // Show error with SweetAlert2
      showError(
        "Error Updating Status",
        error.message || "Failed to update status. Please try again.",
      );

      // Also show toast notification
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update status. Please try again.",
      });
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoadingTicket) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!ticket) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Error</CardTitle>
          <CardDescription>Failed to load ticket details.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>There was an error loading the ticket. Please try again later.</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => window.history.back()}>Go Back</Button>
        </CardFooter>
      </Card>
    );
  }

  const isAdminOrSubadmin = user?.role === "admin" || user?.role === "subadmin";

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col md:flex-row justify-between md:items-center">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle>
                #{ticket.id} - {ticket.subject}
              </CardTitle>
              <Badge className={getStatusColor(ticket.status)}>
                {getStatusLabel(ticket.status)}
              </Badge>
            </div>
            <CardDescription>
              Created on {formatDate(ticket.createdAt)}
            </CardDescription>
          </div>

          {isAdminOrSubadmin && (
            <div className="flex space-x-2 mt-4 md:mt-0 items-center">
              <Select
                value={selectedStatus || ticket.status}
                onValueChange={setSelectedStatus}
                disabled={isUpdatingStatus}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Update Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Button
                onClick={handleUpdateStatus}
                disabled={
                  !selectedStatus ||
                  selectedStatus === ticket.status ||
                  isUpdatingStatus
                }
              >
                {isUpdatingStatus ? "Updating..." : "Update"}
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback>
                  {user ? getInitials(user.name) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex justify-between">
                  <p className="font-medium">{user?.name || "User"}</p>
                  <p className="text-sm text-text-secondary">
                    {formatDate(ticket.createdAt)}
                  </p>
                </div>
                <p className="mt-2 text-text-primary">{ticket.message}</p>
              </div>
            </div>
          </div>

          {/* Replies Section */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Responses</h3>

            {isLoadingReplies ? (
              Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="h-16 w-full mt-2" />
                    </div>
                  </div>
                </div>
              ))
            ) : replies.length > 0 ? (
              replies.map((reply) => (
                <div key={reply.id} className="border rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {getInitials("Support Agent")}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex justify-between">
                        <p className="font-medium">
                          {reply.userId === ticket.userId
                            ? "You"
                            : "Support Agent"}
                        </p>
                        <p className="text-sm text-text-secondary">
                          {formatDate(reply.createdAt)}
                        </p>
                      </div>
                      <p className="mt-2 text-text-primary">{reply.message}</p>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-text-secondary text-center py-4">
                No responses yet.
              </p>
            )}

            {/* Reply Form */}
            {ticket.status !== "closed" && (
              <div className="space-y-3 mt-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Add Response</h3>
                </div>
                <Textarea
                  placeholder="Type your response here..."
                  className="min-h-[100px]"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  disabled={isSubmitting}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={handleSubmitReply}
                    disabled={!replyMessage.trim() || isSubmitting}
                  >
                    {isSubmitting ? "Sending..." : "Send Response"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {/* <CardFooter>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </CardFooter> */}
      </Card>
    </div>
  );
}
