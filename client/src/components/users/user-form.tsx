import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { insertUserSchema, type InsertUser, type User } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<User>;
  isEdit?: boolean;
  userId?: number;
}

// Create a simplified schema for editing users that doesn't require password and email
const editUserSchema = z.object({
  name: z.string().min(2),
  status: z.string().min(1),
  email: z.string().optional(),
});

type EditUserData = z.infer<typeof editUserSchema>;

export function UserForm({
  onSuccess,
  defaultValues,
  isEdit = false,
  userId,
}: UserFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  // Use different form setup for edit vs create
  const form = useForm<EditUserData>({
    resolver: zodResolver(isEdit ? editUserSchema : insertUserSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      status: defaultValues?.status || "active",
      email: defaultValues?.email || "",
    },
  });

  async function onSubmit(data: EditUserData) {
    setIsLoading(true);

    try {
      if (isEdit && userId) {
        // Only send the fields that we want to update
        const updateData = {
          name: data.name,
          status: data.status,
        };
        
        // Create a new endpoint to handle user status updates
        const url = `/api/users/${userId}/update`;
        
        // Use a POST request with the sessionID to ensure authentication
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Failed to update user");
        }
        toast({
          title: "User updated",
          description: "The user has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/users", data as unknown as InsertUser);
        toast({
          title: "User created",
          description: "The user has been created successfully.",
        });
      }

      // Invalidate users queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });

      // Reset form if it's a new user
      if (!isEdit) {
        form.reset();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save user. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit User" : "Create New User"}</CardTitle>
        <CardDescription>
          {isEdit
            ? "Update the user details"
            : "Enter the details to create a new user"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="John Doe"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="john@example.com"
                      type="email"
                      {...field}
                      disabled={isLoading || isEdit}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{isEdit ? "New Password (leave empty to keep current)" : "Password"}</FormLabel>
                    <FormControl>
                      <Input placeholder="Password" type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm Password</FormLabel>
                    <FormControl>
                      <Input placeholder="Confirm password" type="password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div> */}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select
                      disabled={isLoading}
                      defaultValue={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="admin">Admin</SelectItem>
                        <SelectItem value="subadmin">Subadmin</SelectItem>
                        <SelectItem value="user">User</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              /> */}

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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Update User" : "Create User"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
