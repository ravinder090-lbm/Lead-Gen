import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { type User } from "@shared/schema";

interface PermissionFormProps {
  subadmin: User;
  onSuccess?: () => void;
}

const permissionItems = [
  { id: "user_management", label: "User Management", description: "View and manage user accounts" },
  { id: "leads_management", label: "Leads Management", description: "Create, view, edit and delete leads" },
  { id: "support_management", label: "Support Management", description: "Handle customer support tickets" },
  { id: "subscription_management", label: "Subscription Management", description: "Manage subscription plans" },
];

export function PermissionForm({ subadmin, onSuccess }: PermissionFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [permissions, setPermissions] = useState<string[]>(subadmin.permissions as string[] || []);

  const handlePermissionChange = (permissionId: string, checked: boolean) => {
    setPermissions(prev => 
      checked
        ? [...prev, permissionId]
        : prev.filter(p => p !== permissionId)
    );
  };

  async function onSubmit() {
    setIsLoading(true);

    try {
      await apiRequest("PATCH", `/api/subadmins/${subadmin.id}/permissions`, { permissions });
      
      toast({
        title: "Permissions updated",
        description: "The subadmin permissions have been updated successfully.",
      });
      
      // Invalidate subadmins queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/subadmins'] });
      queryClient.invalidateQueries({ queryKey: [`/api/subadmins/${subadmin.id}`] });
      
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update permissions. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Edit Permissions</CardTitle>
        <CardDescription>
          Update module access permissions for {subadmin.name}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-4">
          {permissionItems.map((item) => (
            <div key={item.id} className="flex items-start space-x-3 p-3 border rounded-md">
              <Checkbox 
                id={item.id}
                checked={permissions.includes(item.id)}
                onCheckedChange={(checked) => handlePermissionChange(item.id, !!checked)}
                disabled={isLoading}
              />
              <div className="space-y-1">
                <Label htmlFor={item.id} className="font-medium cursor-pointer">{item.label}</Label>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onSuccess?.()}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={isLoading}
        >
          {isLoading ? "Saving..." : "Update Permissions"}
        </Button>
      </CardFooter>
    </Card>
  );
}
