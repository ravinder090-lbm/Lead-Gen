
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { MainLayout } from "@/components/layout/main-layout";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Switch } from "@/components/ui/switch";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { getInitials, cn, formatDate } from "@/lib/utils";
import { updateUserProfileSchema, changePasswordSchema, insertSmtpSettingsSchema, type SmtpSettings } from "@shared/schema";
import { PasswordInput } from "@/components/ui/password-input";
import { Badge } from "@/components/ui/badge";
import { Settings, Mail, TestTube } from "lucide-react";

export default function AdminProfile() {
  const { user, refreshUser } = useAuth();
  const { toast } = useToast();
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isLoadingPassword, setIsLoadingPassword] = useState(false);
  const [isLoadingSmtp, setIsLoadingSmtp] = useState(false);
  const [isTestingSmtp, setIsTestingSmtp] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const profileForm = useForm({
    resolver: zodResolver(updateUserProfileSchema),
    defaultValues: {
      name: user?.name || "",
      profileImage: user?.profileImage || "",
    },
  });

  const passwordForm = useForm({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });
  const smtpForm = useForm({
    resolver: zodResolver(insertSmtpSettingsSchema),
    defaultValues: {
      host: "",
      port: 587,
      secure: false,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
    },
  });
  // Fetch SMTP settings
  const { data: smtpSettings, isLoading: isLoadingSmtpSettings } = useQuery<SmtpSettings>({
    queryKey: ["/api/smtp-settings"],
  });
  // Update SMTP form when settings are loaded
  useEffect(() => {
    if (smtpSettings && !smtpForm.formState.isDirty) {
      smtpForm.reset({
        host: smtpSettings.host,
        port: smtpSettings.port,
        secure: smtpSettings.secure,
        username: smtpSettings.username,
        password: smtpSettings.password,
        fromEmail: smtpSettings.fromEmail,
        fromName: smtpSettings.fromName,
      });
    }
  }, [smtpSettings, smtpForm]);
  // SMTP settings mutation
  const smtpMutation = useMutation({
    mutationFn: async (data: any) => {
      if (smtpSettings?.id) {
        return apiRequest("PATCH", `/api/smtp-settings/${smtpSettings.id}`, data);
      } else {
        return apiRequest("POST", "/api/smtp-settings", data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/smtp-settings"] });
      toast({
        title: "Success",
        description: "SMTP settings saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save SMTP settings",
      });
    },
  });
  // Test SMTP mutation
  const testSmtpMutation = useMutation({
    mutationFn: async (email: string) => {
      return apiRequest("POST", "/api/smtp-settings/test", { email });
    },
    onSuccess: () => {
      toast({
        title: "Test Successful",
        description: "Test email sent successfully! Check your inbox.",
      });
      setTestEmail("");
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Test Failed",
        description: error.message || "Failed to send test email",
      });
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
      await apiRequest("POST", "/api/auth/change-password", values);
      
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
  async function onSmtpSubmit(values: any) {
    setIsLoadingSmtp(true);
    try {
      await smtpMutation.mutateAsync(values);
    } finally {
      setIsLoadingSmtp(false);
    }
  }
  async function handleTestSmtp() {
    if (!testEmail) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Please enter an email address for testing",
      });
      return;
    }
    setIsTestingSmtp(true);
    try {
      await testSmtpMutation.mutateAsync(testEmail);
    } finally {
      setIsTestingSmtp(false);
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
              Role: {user?.role || "Admin"}
            </Badge>
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
                    {user?.name ? getInitials(user.name) : "A"}
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
          <TabsList className="grid grid-cols-2 w-full max-w-3xl mb-6">
                <TabsTrigger
                  value="profile"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  Profile & Password
                </TabsTrigger>

                <TabsTrigger
                  value="smtp"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  SMTP Settings
                </TabsTrigger>
                {/* <TabsTrigger
                  value="admin"
                  className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
                >
                  Admin Settings
                </TabsTrigger> */}
              </TabsList>

              <TabsContent value="profile" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Edit Profile */}
              <Card className="shadow-sm border-blue-100">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                  <CardTitle className="text-blue-800">Edit Profile</CardTitle>
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

              <TabsContent value="smtp" className="space-y-6">
                <Card className="shadow-sm border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                    <CardTitle className="text-blue-800 flex items-center">
                      <Settings className="mr-2 h-5 w-5" />
                      SMTP Configuration
                    </CardTitle>
                    <CardDescription>
                      Configure email settings for the platform
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    {isLoadingSmtpSettings ? (
                      <div className="flex items-center justify-center py-8">
                        <div className="animate-pulse text-blue-600">Loading SMTP settings...</div>
                      </div>
                    ) : (
                      <Form {...smtpForm}>
                        <form
                          onSubmit={smtpForm.handleSubmit(onSmtpSubmit)}
                          className="space-y-4"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={smtpForm.control}
                              name="host"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">SMTP Host</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="smtp.gmail.com"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smtpForm.control}
                              name="port"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Port</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="number"
                                      value={field.value || 587}
                                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                                      placeholder="587"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={smtpForm.control}
                              name="username"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Username</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="your-email@gmail.com"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smtpForm.control}
                              name="password"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">Password</FormLabel>
                                  <FormControl>
                                    <PasswordInput
                                      {...field}
                                      placeholder="App password or SMTP password"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField
                              control={smtpForm.control}
                              name="fromEmail"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">From Email</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      type="email"
                                      placeholder="noreply@yourcompany.com"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={smtpForm.control}
                              name="fromName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-blue-700">From Name</FormLabel>
                                  <FormControl>
                                    <Input
                                      {...field}
                                      placeholder="Lead Generation Platform"
                                      disabled={isLoadingSmtp}
                                      className="border-blue-200"
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormField
                            control={smtpForm.control}
                            name="secure"
                            render={({ field }) => (
                              <FormItem className="flex flex-row items-center justify-between rounded-lg border border-blue-200 p-3">
                                <div className="space-y-0.5">
                                  <FormLabel className="text-blue-700">Secure Connection (SSL/TLS)</FormLabel>
                                  <FormDescription>
                                    Enable if your SMTP server requires a secure connection
                                  </FormDescription>
                                </div>
                                <FormControl>
                                  <Switch
                                    checked={field.value}
                                    onCheckedChange={field.onChange}
                                    disabled={isLoadingSmtp}
                                  />
                                </FormControl>
                              </FormItem>
                            )}
                          />
                          <div className="flex gap-4 pt-4">
                            <Button
                              type="submit"
                              disabled={isLoadingSmtp}
                              className="bg-blue-600 hover:bg-blue-700"
                            >
                              {isLoadingSmtp ? "Saving..." : "Save SMTP Settings"}
                            </Button>
                          </div>
                        </form>
                      </Form>
                    )}
                    <Separator className="my-6" />
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium text-blue-800 flex items-center">
                        <TestTube className="mr-2 h-5 w-5" />
                        Test Configuration
                      </h3>
                      <p className="text-sm text-gray-600">
                        Send a test email to verify your SMTP configuration is working correctly.
                      </p>
                      <div className="flex gap-4">
                        <Input
                          type="email"
                          placeholder="Enter test email address"
                          value={testEmail}
                          onChange={(e) => setTestEmail(e.target.value)}
                          className="border-blue-200 flex-1"
                        />
                        <Button
                          onClick={handleTestSmtp}
                          disabled={isTestingSmtp || !testEmail || !smtpSettings}
                          variant="outline"
                          className="border-blue-200 text-blue-700 hover:bg-blue-50"
                        >
                          {isTestingSmtp ? "Sending..." : "Send Test Email"}
                        </Button>
                      </div>
                      {!smtpSettings && (
                        <p className="text-sm text-amber-600">
                          Please save SMTP settings first before testing.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              {/* <TabsContent value="admin">
                <Card className="shadow-sm border-blue-100">
                  <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100/50 border-b border-blue-100">
                    <CardTitle className="text-blue-800">
                      Admin Information
                    </CardTitle>
                    <CardDescription>
                      Information about your admin account
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
                      <p className="text-blue-700">
                        You have full administrative privileges for this
                        application.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent> */}
            </Tabs>
          
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
