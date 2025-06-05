import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { FileUpload } from "@/components/ui/file-upload";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn, formatDate } from "@/lib/utils";
import { updateUserProfileSchema, changePasswordSchema } from "@shared/schema";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";

export default function SubadminProfile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);

  const profileForm = useForm({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      name: user?.name || "",
      profileImage: user?.profileImage || "",
    },
  });
//  console.log("====>>>", user?.profileImage)
  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  async function onProfileSubmit(values: any) {
    setIsLoadingProfile(true);

    try {
      await apiRequest("PATCH", "/api/auth/profile", values);

      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });

      // Refresh user data
      refreshUser();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to update profile. Please try again.",
      });
    } finally {
      setIsLoadingProfile(false);
    }
  }

  async function onPasswordSubmit(values: any) {
    setIsLoadingPassword(true);

    try {
      // Only process the response as successful if it's actually successful
      const response = await apiRequest("POST", "/api/auth/change-password", values);
      
      // If we get here, the request was successful
      toast({
        title: "Password changed",
        description: "Your password has been changed successfully."
      });

      // Reset form
      passwordForm.reset();
    } catch (error: any) {
      // Handle specific error for incorrect current password
      if (error.message === "Current password is incorrect" || 
          error.message.includes("Current password is incorrect")) {
        // Set the error directly on the field
        passwordForm.setError("currentPassword", {
          type: "manual",
          message: "Current password is incorrect"
        });
      } else {
        // Show general error toast
        toast({
          variant: "destructive",
          title: "Error",
          description: error.message || "Failed to change password. Please try again."
        });
      }
    } finally {
      setIsLoadingPassword(false);
    }
  }

  return (
    <MainLayout>
      <div className="max-w-full mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-semibold text-blue-800">My Profile</h1>
          <div className="flex items-center gap-3">
            <Badge
              variant="outline"
              className="bg-blue-50 text-blue-700 border-blue-200 py-2"
            >
              Role: {user?.role || "Subadmin"}
            </Badge>
            {user?.permissions && user.permissions.length > 0 && (
              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200 py-2"
              >
                {user.permissions.length} Permission
                {user.permissions.length !== 1 ? "s" : ""}
              </Badge>
            )}
            {user?.verified && (
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 py-2"
              >
                Verified
              </Badge>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm overflow-hidden mb-8">
          <div className="relative">
            <div className="h-32 w-full bg-gradient-to-r from-blue-500 to-blue-600"></div>
            <div className="absolute -bottom-16 left-8">
              <Avatar className="h-32 w-32 border-4 border-white shadow-lg">
                {user?.profileImage ? (
                  <AvatarImage src={user.profileImage} alt={user?.name || ""} />
                ) : (
                  <AvatarFallback className="text-4xl bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    {user?.name ? getInitials(user.name) : "S"}
                  </AvatarFallback>
                )}
              </Avatar>
            </div>
            <div className="absolute bottom-3 right-8">
              <h2 className="text-2xl font-semibold text-white">
                {user?.name}
              </h2>
              <p className="text-blue-100">{user?.email}</p>
            </div>
          </div>
          <div className="mt-20 px-8 pb-6">
            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid grid-cols-2 w-full max-w-2xl mb-6">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  Profile & Password
                </TabsTrigger>
                <TabsTrigger
                  value="permissions"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  Permissions
                </TabsTrigger>
              </TabsList>

              {/* Profile Details Tab */}
              <TabsContent value="profile" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Edit Profile */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Edit Profile
                      </CardTitle>
                      <CardDescription>
                        Update your personal information
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Form {...profileForm}>
                        <form
                          onSubmit={profileForm.handleSubmit(onProfileSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={profileForm.control}
                            name="name"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Full Name
                                </FormLabel>
                                <FormControl>
                                  <Input
                                    {...field}
                                    disabled={isLoadingProfile}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={profileForm.control}
                            name="profileImage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Profile Image
                                </FormLabel>
                                <FormControl>
                                  <FileUpload
                                    value={field.value}
                                    onChange={field.onChange}
                                    disabled={isLoadingProfile}
                                    accept="image/*"
                                    maxSize={2}
                                  />
                                </FormControl>
                                <FormDescription>
                                  Click to upload or drag and drop your profile
                                  image (max 2MB)
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end pt-3">
                            <Button
                              type="submit"
                              disabled={isLoadingProfile}
                              className="bg-gradient-to-r from-blue-600 to-blue-500"
                            >
                              {isLoadingProfile ? "Saving..." : "Save Changes"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>

                  {/* Change Password */}
                  <Card className="shadow-sm border-blue-100">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                      <CardTitle className="text-blue-800">
                        Change Password
                      </CardTitle>
                      <CardDescription>
                        Update your account password
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <Form {...passwordForm}>
                        <form
                          onSubmit={passwordForm.handleSubmit(onPasswordSubmit)}
                          className="space-y-4"
                        >
                          <FormField
                            control={passwordForm.control}
                            name="currentPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Current Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  New Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={passwordForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel className="text-blue-700">
                                  Confirm New Password
                                </FormLabel>
                                <FormControl>
                                  <PasswordInput
                                    {...field}
                                    disabled={isLoadingPassword}
                                    className="border-blue-200"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="flex justify-end pt-3">
                            <Button
                              type="submit"
                              disabled={isLoadingPassword}
                              className="bg-gradient-to-r from-blue-600 to-blue-500"
                            >
                              {isLoadingPassword
                                ? "Changing..."
                                : "Change Password"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Permissions Tab */}
              <TabsContent value="permissions">
                <Card className="shadow-sm border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                    <CardTitle className="text-blue-800">
                      Your Permissions
                    </CardTitle>
                    <CardDescription>
                      Your assigned permissions in the system
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      {user?.permissions && user.permissions.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-blue-700 font-medium">
                            You have access to the following features:
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {user.permissions.map((permission, index) => (
                              <Badge
                                key={index}
                                className="bg-blue-100 text-blue-700 hover:bg-blue-200"
                              >
                                {permission}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-blue-700">
                          You don't have any specific permissions assigned.
                          Contact an administrator for access to additional
                          features.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
