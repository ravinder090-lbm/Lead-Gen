import { useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/lib/logo";
import { PasswordInput } from "@/components/ui/password-input";

// Set new password schema
const setNewPasswordSchema = z
  .object({
    resetToken: z.string().min(4, {
      message: "Reset token is required",
    }),
    email: z.string().email({
      message: "Please enter a valid email address",
    }),
    password: z.string().min(8, {
      message: "Password must be at least 8 characters",
    }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type SetNewPasswordForm = z.infer<typeof setNewPasswordSchema>;

interface SetNewPasswordFormProps {
  email?: string;
  token?: string;
}

export function SetNewPasswordForm({
  email = "",
  token = "",
}: SetNewPasswordFormProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<SetNewPasswordForm>({
    resolver: zodResolver(setNewPasswordSchema),
    defaultValues: {
      email: email,
      resetToken: token,
      password: "",
      confirmPassword: "",
    },
  });

  async function onSubmit(values: SetNewPasswordForm) {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/set-new-password", values);

      setIsSuccess(true);

      toast({
        title: "Password updated successfully",
        description:
          "Your password has been updated. You can now log in with your new password.",
      });

      // Redirect to login after 2 seconds
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (err: any) {
      setError(err.message || "Failed to update password. Please try again.");
      toast({
        variant: "destructive",
        title: "Password update failed",
        description:
          err.message || "Failed to update password. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full xl:p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-1">
        SET NEW PASSWORD
      </h1>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-50 border-red-200 text-red-600"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSuccess ? (
        <div className="text-center">
          <div className="bg-green-50 text-green-600 p-4 rounded-md mb-6 border border-green-200">
            <svg
              className="mx-auto h-12 w-12 text-green-500 mb-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <p className="font-bold text-lg mb-2">Password Updated!</p>
            <p className="text-gray-700">
              Your password has been successfully changed. Please use your new
              password to log in.
            </p>
          </div>
          <Button
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-300"
            onClick={() => navigate("/login")}
          >
            Go to Login
          </Button>
        </div>
      ) : (
        <>
          <p className="text-gray-500 mb-6">
            Create a new password for your account. Make sure it's at least 8
            characters and includes a mix of letters, numbers, and symbols.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                {!email && (
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-500 text-sm">
                          Email Address
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="youremail@example.com"
                            type="email"
                            {...field}
                            disabled={isLoading || !!email}
                            className="border border-blue-200 focus:border-blue-400 rounded-md h-12 text-gray-700"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                {!token && (
                  <FormField
                    control={form.control}
                    name="resetToken"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-gray-500 text-sm">
                          Reset Token
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter token from your email"
                            {...field}
                            disabled={isLoading || !!token}
                            className="border border-blue-200 focus:border-blue-400 rounded-md h-12 text-gray-700"
                          />
                        </FormControl>
                        <FormMessage className="text-red-500 text-xs" />
                      </FormItem>
                    )}
                  />
                )}

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 text-sm">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Create a strong password"
                          {...field}
                          disabled={isLoading}
                          className="border border-blue-200 focus:border-blue-400 rounded-md h-12 text-gray-700"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-gray-500 text-sm">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <PasswordInput
                          placeholder="Re-enter your new password"
                          {...field}
                          disabled={isLoading}
                          className="border border-blue-200 focus:border-blue-400 rounded-md h-12 text-gray-700"
                        />
                      </FormControl>
                      <FormMessage className="text-red-500 text-xs" />
                    </FormItem>
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-300"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg
                      className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    Updating Password...
                  </span>
                ) : (
                  "Update Password"
                )}
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
