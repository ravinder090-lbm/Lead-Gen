import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type SupportTicket } from "@shared/schema";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/auth-context";
interface TicketCardProps {
  ticket: SupportTicket;
  onView?: (id: number) => void;
}

export function TicketCard({ ticket, onView }: TicketCardProps) {
  const [pathname, navigate] = useLocation();
  const { user, refreshUser } = useAuth();

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
        return "Pending";
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

  const handleView = (e: React.MouseEvent) => {
    // Prevent event bubbling
    e.stopPropagation();
    e.preventDefault();
    
    // Use the ticket ID directly from the ticket object
    const ticketId = ticket.id;
    
    // If onView prop is provided, call it with the ticket ID
    if (onView) {
      onView(ticketId);
    } else {
      // Otherwise navigate based on user role
      if (user?.role === "admin") {
        navigate(`/admin/support/${ticketId}`);
      } else if (user?.role === "subadmin") {
        navigate(`/subadmin/support/${ticketId}`);
      } else if (user?.role === "user") {
        navigate(`/user/support/${ticketId}`);
      }
    }
  };

  return (
    <Card 
      className="border border-blue-50 rounded-lg hover:shadow-lg transition-all duration-300"
      onClick={(e) => e.stopPropagation()} // Prevent clicks on the card itself
    >
      <CardContent className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-2 sm:gap-4">
          <div className="flex-1 min-w-0"> {/* min-w-0 prevents flex children from overflowing */}
            <h4 className="font-bold text-blue-800 truncate">
              #{ticket.id} - {ticket.subject}
            </h4>
            <p className="text-sm text-gray-600 mt-1.5 line-clamp-2">
              {ticket.message}
            </p>
          </div>
          <Badge className={`text-xs px-2 py-1 ${getStatusColor(ticket.status)} whitespace-nowrap`}>
            {getStatusLabel(ticket.status)}
          </Badge>
        </div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mt-4 gap-2 sm:gap-0">
          <span className="text-xs sm:text-sm text-blue-600">
            <i className="ri-time-line mr-1"></i>
            {formatDate(ticket.createdAt)}
          </span>
          {pathname !== "/user/dashboard" && (
            <Button 
              variant="link" 
              className="p-0 h-auto text-blue-600 font-medium hover:text-blue-800 flex items-center" 
              onClick={handleView}
            >
              <span>View Details</span>
              <i className="ri-arrow-right-line ml-1"></i>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
