import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { UserTable } from "@/components/users/user-table";
import { useAuth } from "@/contexts/auth-context";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export default function SubadminUsers() {
  const { user } = useAuth();
  
  // Check if user has permission
  const hasPermission = user?.permissions?.includes('user_management');
  
  // Handle unauthorized access
  if (!hasPermission) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the user management module.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }
  
  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">User Management</h1>
      </div>
      
      <UserTable />
    </MainLayout>
  );
}
