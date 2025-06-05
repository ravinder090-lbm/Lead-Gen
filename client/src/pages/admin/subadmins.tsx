import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { SubadminForm } from "@/components/subadmins/subadmin-form";
import { PermissionForm } from "@/components/subadmins/permission-form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { type User } from "@shared/schema";

export default function AdminSubadmins() {
  const { toast } = useToast();
  const [isCreateSubadminOpen, setIsCreateSubadminOpen] = useState(false);
  const [isEditPermissionsOpen, setIsEditPermissionsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState(searchTerm);
  const [selectedSubadmin, setSelectedSubadmin] = useState<User | null>(null);
  
  // Update debounced value after 500ms of no changes
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchTerm]);
  
  // Fetch subadmins data with debounced search functionality
  const { data: subadmins = [], isLoading } = useQuery({
    queryKey: ['/api/subadmins', debouncedSearchTerm],
    queryFn: async (): Promise<User[]> => {
      const response = await fetch(`/api/subadmins?search=${encodeURIComponent(debouncedSearchTerm)}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Failed to fetch subadmins');
      }
      return response.json();
    }
  });
  
  const handleEditPermissions = (subadmin: User) => {
    setSelectedSubadmin(subadmin);
    setIsEditPermissionsOpen(true);
  };
  
  const handleDeleteSubadmin = async (id: number) => {
    // Use SweetAlert2 for confirmation
    const Swal = (await import('sweetalert2')).default;
    
    const result = await Swal.fire({
      title: 'Delete Subadmin',
      text: 'Are you sure you want to delete this subadmin? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!'
    });
    
    // If user confirms deletion
    if (result.isConfirmed) {
      try {
        await apiRequest("DELETE", `/api/subadmins/${id}`, {});
        
        // Show success message with SweetAlert
        await Swal.fire({
          title: 'Deleted!',
          text: 'The subadmin has been deleted successfully.',
          icon: 'success',
          timer: 1500
        });
        
        // Invalidate all subadmins queries to refresh data with current search term
        queryClient.invalidateQueries({ queryKey: ['/api/subadmins'] });
      } catch (error: any) {
        // Show error with SweetAlert
        Swal.fire({
          title: 'Error!',
          text: error.message || "Failed to delete subadmin. Please try again.",
          icon: 'error'
        });
      }
    }
  };
  
  // We're now using server-side search instead of filtering on client side
  const filteredSubadmins = subadmins;
  
  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Subadmin Management</h1>
        <Button onClick={() => setIsCreateSubadminOpen(true)}>
          <i className="ri-user-add-line mr-1"></i>
          Add Subadmin
        </Button>
      </div>
      
      <div className="mb-6">
        <Card>
          <CardContent className="p-4">
            <Input
              placeholder="Search subadmins by name or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-md"
            />
          </CardContent>
        </Card>
      </div>
      
      <Card>
        <CardContent className="p-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Permissions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableSkeleton 
                  rowCount={5}
                  columnCount={5}
                  showHeader={false}
                  showActions={true}
                />
              ) : filteredSubadmins.length > 0 ? (
                filteredSubadmins.map((subadmin) => (
                  <TableRow key={subadmin.id}>
                    <TableCell className="font-medium">{subadmin.name}</TableCell>
                    <TableCell>{subadmin.email}</TableCell>
                    <TableCell>
                      <Badge 
                        className={
                          subadmin.status === "active" 
                            ? "bg-green-100 text-green-800" 
                            : "bg-gray-100 text-gray-800"
                        }
                      >
                        {subadmin.status.charAt(0).toUpperCase() + subadmin.status.slice(1)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {Array.isArray(subadmin.permissions) && subadmin.permissions.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {subadmin.permissions.map((permission, index) => (
                            <Badge key={index} variant="outline" className="capitalize">
                              {permission.split('_').join(' ')}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-secondary text-sm">No permissions</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <i className="ri-more-2-fill text-lg"></i>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleEditPermissions(subadmin)}>
                            Edit Permissions
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteSubadmin(subadmin.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    No subadmins found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      
      {/* Create Subadmin Sheet */}
      <Sheet open={isCreateSubadminOpen} onOpenChange={setIsCreateSubadminOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Subadmin</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <SubadminForm onSuccess={() => setIsCreateSubadminOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>
      
      {/* Edit Permissions Sheet */}
      <Sheet open={isEditPermissionsOpen} onOpenChange={setIsEditPermissionsOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Permissions</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            {selectedSubadmin && (
              <PermissionForm 
                subadmin={selectedSubadmin} 
                onSuccess={() => setIsEditPermissionsOpen(false)} 
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
