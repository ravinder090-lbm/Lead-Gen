import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { type User } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  confirmDelete,
  showSuccess,
  showError,
  confirmAction,
} from "@/lib/sweet-alert";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { SendCoinsModal } from "./send-coins-modal";
import { useAuth } from "@/contexts/auth-context";

interface UserTableProps {
  onEdit?: (user: User) => void;
  onView?: (user: User) => void;
}

interface UserResponse {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export function UserTable({ onEdit, onView }: UserTableProps) {
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [currentPage, setCurrentPage] = useState(1);
  const limit = 10; // Items per page
  const [isSendCoinsModalOpen, setIsSendCoinsModalOpen] = useState(false);
  const [selectedUserForCoins, setSelectedUserForCoins] = useState<User | null>(null);


  // Update debounced search term with a delay to prevent excessive API calls
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Set page back to 1 when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearchTerm]);

  const { data, isLoading, refetch } = useQuery<UserResponse>({
    queryKey: ["/api/users", { page: currentPage, limit, search: debouncedSearchTerm }],
    queryFn: async () => {
      const res = await fetch(`/api/users?page=${currentPage}&limit=${limit}&search=${encodeURIComponent(debouncedSearchTerm)}`);
      if (!res.ok) {
        throw new Error("Failed to fetch users");
      }
      return res.json();
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "inactive":
        return "bg-gray-100 text-gray-800";
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-blue-100 text-blue-800";
      case "subadmin":
        return "bg-purple-100 text-purple-800";
      case "user":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleStatusChange = async (userId: number, newStatus: string) => {
    // Define status-specific confirmation messages
    const statusMessages = {
      active: "activate this user",
      inactive: "deactivate this user",
      pending: "mark this user as pending",
    };

    const confirmMessage = `Are you sure you want to ${statusMessages[newStatus as keyof typeof statusMessages]}?`;

    // Ask for confirmation
    const confirmed = await confirmAction(
      "Change User Status",
      confirmMessage,
      "Yes, Update Status",
    );

    if (!confirmed) return;

    try {
      // Use more reliable fetch with credentials approach
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user status");
      }

      // Show success with SweetAlert2
      await showSuccess(
        "Status Updated",
        "User status has been updated successfully.",
      );

      // Also show toast notification
      toast({
        title: "Status updated",
        description: "User status has been updated successfully.",
      });

      // Refresh users data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error: any) {
      // Show error with SweetAlert2
      showError(
        "Error Updating Status",
        error.message || "Failed to update user status. Please try again.",
      );

      // Also show toast notification
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update user status. Please try again.",
      });
    }
  };

  const handleDeleteUser = async (userId: number, userName: string) => {
    const confirmed = await confirmDelete(
      "Delete User?",
      `Are you sure you want to delete ${userName}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    try {
      await apiRequest("DELETE", `/api/users/${userId}`, {});

      // Show success with SweetAlert2
      await showSuccess(
        "User Deleted",
        "The user has been deleted successfully.",
      );

      // Also show toast notification
      toast({
        title: "User deleted",
        description: "The user has been deleted successfully.",
      });

      // Refresh users data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    } catch (error: any) {
      // Show error with SweetAlert2
      showError(
        "Error Deleting User",
        error.message || "Failed to delete the user. Please try again.",
      );

      // Also show toast notification
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to delete the user. Please try again.",
      });
    }
  };

  const handlePageChange = (page: number) => {
    if (page < 1) return;
    if (data?.pagination && page > data.pagination.totalPages) return;
    setCurrentPage(page);
  };

  // No longer need client-side filtering since we're using server-side search
  const filteredUsers = data?.users || [];

  // Generate page numbers for pagination
  const renderPaginationItems = () => {
    if (!data?.pagination) return null;

    const { page, totalPages } = data.pagination;
    const items = [];

    // Always show first page
    items.push(
      <PaginationItem key="first">
        <PaginationLink
          onClick={() => handlePageChange(1)}
          isActive={page === 1}
        >
          1
        </PaginationLink>
      </PaginationItem>,
    );

    // Show ellipsis if needed
    if (page > 3) {
      items.push(
        <PaginationItem key="ellipsis1">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Show current page and surrounding pages
    for (
      let i = Math.max(2, page - 1);
      i <= Math.min(totalPages - 1, page + 1);
      i++
    ) {
      if (i <= 1 || i >= totalPages) continue; // Skip first and last pages as they're shown separately
      items.push(
        <PaginationItem key={i}>
          <PaginationLink
            onClick={() => handlePageChange(i)}
            isActive={page === i}
          >
            {i}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    // Show ellipsis if needed
    if (page < totalPages - 2) {
      items.push(
        <PaginationItem key="ellipsis2">
          <PaginationEllipsis />
        </PaginationItem>,
      );
    }

    // Always show last page if there's more than one page
    if (totalPages > 1) {
      items.push(
        <PaginationItem key="last">
          <PaginationLink
            onClick={() => handlePageChange(totalPages)}
            isActive={page === totalPages}
          >
            {totalPages}
          </PaginationLink>
        </PaginationItem>,
      );
    }

    return items;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search users..."
          className="max-w-sm"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>So</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="p-0">
                  <TableSkeleton
                    rowCount={8}
                    columnCount={6}
                    showHeader={false}
                  />
                </TableCell>
              </TableRow>
            ) : filteredUsers.length > 0 ? (
              filteredUsers.map((user, i) => (
                <TableRow key={user.id}>
                  <TableCell>{(currentPage - 1) * limit + i + 1}</TableCell>
                  <TableCell>{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge className={getRoleBadge(user.role)}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(user.status)}>
                      {user.status.charAt(0).toUpperCase() +
                        user.status.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {user.verified ? (
                      <Badge className="bg-green-100 text-green-800">Yes</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800">No</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          Actions
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {onView && (
                          <DropdownMenuItem onClick={() => onView(user)}>
                            View
                          </DropdownMenuItem>
                        )}
                        {onEdit && (
                          <DropdownMenuItem onClick={() => onEdit(user)}>
                            Edit
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() =>
                            handleStatusChange(
                              user.id,
                              user.status === "active" ? "inactive" : "active",
                            )
                          }
                        >
                          {user.status === "active" ? "Deactivate" : "Activate"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleStatusChange(user.id, "pending")}
                        >
                          Mark as Pending
                        </DropdownMenuItem>
                        {/* Only show send coin option for admin users */}
                        {currentUser?.role == "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedUserForCoins(user);
                                setIsSendCoinsModalOpen(true);
                              }}
                              className="text-yellow-600 focus:text-yellow-600"
                            >
                              Send Coins
                            </DropdownMenuItem>
                          </>
                        )}
                        {/* Only show delete option for non-admin users */}
                        {user.role !== "admin" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                handleDeleteUser(user.id, user.name)
                              }
                              className="text-red-600 focus:text-red-600"
                            >
                              Delete User
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center">
                  No users found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {data?.pagination && data.pagination.totalPages > 1 && (
        <Pagination className="mt-4">
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => handlePageChange(currentPage - 1)}
                className={
                  currentPage === 1
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>

            {renderPaginationItems()}

            <PaginationItem>
              <PaginationNext
                onClick={() => handlePageChange(currentPage + 1)}
                className={
                  currentPage === data.pagination.totalPages
                    ? "pointer-events-none opacity-50"
                    : "cursor-pointer"
                }
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}

      {/* Pagination information */}
      {data?.pagination && (
        <div className="text-sm text-muted-foreground text-center">
          Showing {(currentPage - 1) * limit + 1} to{" "}
          {Math.min(currentPage * limit, data.pagination.total)} of{" "}
          {data.pagination.total} users
        </div>
      )}
     {/* Send Coins Modal */}
     <SendCoinsModal
     isOpen={isSendCoinsModalOpen}
     onClose={() => {
       setIsSendCoinsModalOpen(false);
       setSelectedUserForCoins(null);
     }}
     user={selectedUserForCoins}
   />
    </div>
  );
}
