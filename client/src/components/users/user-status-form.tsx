import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { z } from "zod";
import { type User } from "@shared/schema";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserStatusFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<User>;
  userId?: number;
}

// Simple schema specifically for updating user status
const statusUpdateSchema = z.object({
  status: z.enum(["active", "inactive", "pending"]),
});

type StatusUpdateData = z.infer<typeof statusUpdateSchema>;

export function UserStatusForm({
  onSuccess,
  defaultValues,
  userId,
}: UserStatusFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<StatusUpdateData>({
    resolver: zodResolver(statusUpdateSchema),
    defaultValues: {
      status: defaultValues?.status as "active" | "inactive" | "pending" || "active",
    },
  });

  async function onSubmit(data: StatusUpdateData) {
    if (!userId) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "User ID is required to update status",
      });
      return;
    }

    setIsLoading(true);

    try {
      // Specifically use patch for status update with minimal data
      const response = await fetch(`/api/users/${userId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ status: data.status })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to update user status");
      }
      
      // Get the updated user data
      const updatedUser = await response.json();

      // Display success message
      toast({
        title: "Status updated",
        description: `User status changed to ${data.status}`,
      });

      // Invalidate users queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Status Update Failed",
        description: error.message || "Could not update user status. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Update User Status</CardTitle>
        <CardDescription>
          Change the active status of this user
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent>
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select
                    disabled={isLoading}
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Updating..." : "Update Status"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}