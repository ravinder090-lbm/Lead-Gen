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

// Reset password schema
const resetPasswordSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address",
  }),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  async function onSubmit(values: ResetPasswordForm) {
    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/reset-password", values);

      setIsSubmitted(true);

      toast({
        title: "Reset password email sent",
        description: "Please check your email for reset password instructions",
      });
    } catch (err: any) {
      setError(
        err.message || "Failed to send reset password email. Please try again.",
      );
      toast({
        variant: "destructive",
        title: "Reset password failed",
        description:
          err.message ||
          "Failed to send reset password email. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full xl:p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-1">RESET PASSWORD</h1>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-50 border-red-200 text-red-600"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isSubmitted ? (
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
            <p className="font-bold text-lg mb-2">Email Sent!</p>
            <p className="text-gray-700">
              Please check your email for instructions to reset your password.
            </p>
          </div>
          <Button
            className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full transition-all duration-300"
            onClick={() => navigate("/login")}
          >
            Return to Login
          </Button>
        </div>
      ) : (
        <>
          <p className="text-gray-500 mb-6">
            Enter your email address and we'll send you instructions to reset
            your password.
          </p>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                        disabled={isLoading}
                        className="border border-blue-200 focus:border-blue-400 rounded-md h-12 text-gray-700"
                      />
                    </FormControl>
                    <FormMessage className="text-red-500 text-xs" />
                  </FormItem>
                )}
              />

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
                    Sending Instructions...
                  </span>
                ) : (
                  "Send Reset Link"
                )}
              </Button>
            </form>
          </Form>
        </>
      )}
    </div>
  );
}
