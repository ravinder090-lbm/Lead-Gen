import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { createSubadminSchema, type CreateSubadmin } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { PasswordInput } from "@/components/ui/password-input";

interface SubadminFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<CreateSubadmin>;
  isEdit?: boolean;
  subadminId?: number;
}

const permissionItems = [
  { id: "user_management", label: "User Management" },
  { id: "leads_management", label: "Leads Management" },
  { id: "support_management", label: "Support Management" },
  { id: "subscription_management", label: "Subscription Management" },
];

export function SubadminForm({ onSuccess, defaultValues, isEdit = false, subadminId }: SubadminFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CreateSubadmin>({
    resolver: zodResolver(createSubadminSchema),
    defaultValues: {
      email: "",
      name: "",
      password: "",
      permissions: [],
      ...defaultValues,
    },
  });

  async function onSubmit(data: CreateSubadmin) {
    setIsLoading(true);

    try {
      if (isEdit && subadminId) {
        await apiRequest("PATCH", `/api/subadmins/${subadminId}`, data);
        toast({
          title: "Subadmin updated",
          description: "The subadmin has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/subadmins", data);
        toast({
          title: "Subadmin created",
          description: "The subadmin has been created successfully.",
        });
      }

      // Invalidate subadmins queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/subadmins'] });
      
      // Reset form if it's a new subadmin
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
        description: error.message || "Failed to save subadmin. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Subadmin" : "Create New Subadmin"}</CardTitle>
        <CardDescription>
          {isEdit 
            ? "Update the subadmin details and permissions" 
            : "Enter the details to create a new subadmin and assign permissions"
          }
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
                    <Input placeholder="John Doe" {...field} disabled={isLoading} />
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
                    <Input placeholder="john@example.com" type="email" {...field} disabled={isLoading || isEdit} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {!isEdit && (
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Password</FormLabel>
                    <FormControl>
                      <PasswordInput placeholder="Password" {...field} disabled={isLoading} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <div className="space-y-2">
              <FormLabel>Module Permissions</FormLabel>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {permissionItems.map((item) => (
                  <FormField
                    key={item.id}
                    control={form.control}
                    name="permissions"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center space-x-3 space-y-0 p-3 border rounded-md">
                        <FormControl>
                          <Checkbox
                            checked={field.value?.includes(item.id)}
                            onCheckedChange={(checked) => {
                              const currentPerms = field.value || [];
                              return checked
                                ? field.onChange([...currentPerms, item.id])
                                : field.onChange(currentPerms.filter((p) => p !== item.id));
                            }}
                          />
                        </FormControl>
                        <FormLabel className="cursor-pointer font-normal">
                          {item.label}
                        </FormLabel>
                      </FormItem>
                    )}
                  />
                ))}
              </div>
              <FormMessage />
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
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : isEdit ? "Update Subadmin" : "Create Subadmin"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
