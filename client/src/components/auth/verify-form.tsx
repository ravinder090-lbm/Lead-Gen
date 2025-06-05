import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { verifyUserSchema, type VerifyUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import Logo from "@/lib/logo";

export function VerifyForm() {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";

  const form = useForm<VerifyUser>({
    resolver: zodResolver(verifyUserSchema),
    defaultValues: {
      email,
      code: "",
    },
  });

  useEffect(() => {
    if (!canResend && countdown > 0) {
      const interval = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [countdown, canResend]);

  async function onSubmit(values: VerifyUser) {
    setIsLoading(true);
    setError(null);

    // Make sure code is properly formatted (trimmed with no spaces)
    const code = values.code.trim();

    console.log("Submitting OTP:", { email, code });

    try {
      const response = await fetch("/api/auth/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData?.message || "Verification failed");
      }

      const data = await response.json();
      console.log("Verification successful", data);

      toast({
        title: "Verification successful",
        description: "Your account has been verified. You can now login.",
      });

      navigate("/login");
    } catch (err: any) {
      console.error(err);
      const message = err?.message || "Failed to verify. Please try again.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Verification failed",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleResendCode = async () => {
    if (!canResend) return;

    setIsLoading(true);
    setError(null);

    try {
      await apiRequest("POST", "/api/auth/resend-code", { email });

      toast({
        title: "Code resent",
        description: "A new verification code has been sent to your email.",
      });

      setCountdown(60);
      setCanResend(false);
    } catch (err: any) {
      const message =
        err?.message || "Failed to resend code. Please try again.";
      setError(message);
      toast({
        variant: "destructive",
        title: "Failed to resend code",
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full text-center p-3 xl:p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-1">
        VERIFY YOUR ACCOUNT
      </h1>
      <p className="text-gray-500 mb-6">
        Please enter the 4-digit verification code we sent to{" "}
        {email || "your email address"}.
      </p>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-50 border-red-200 text-red-600"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem className="mx-auto">
                <div className="flex flex-col items-center">
                  <FormControl>
                    <InputOTP
                      maxLength={4}
                      {...field}
                      className="justify-center"
                    >
                      <InputOTPGroup className="gap-4">
                        <InputOTPSlot
                          index={0}
                          className="w-14 h-14 text-2xl border-blue-200"
                        />
                        <InputOTPSlot
                          index={1}
                          className="w-14 h-14 text-2xl border-blue-200"
                        />
                        <InputOTPSlot
                          index={2}
                          className="w-14 h-14 text-2xl border-blue-200"
                        />
                        <InputOTPSlot
                          index={3}
                          className="w-14 h-14 text-2xl border-blue-200"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </FormControl>
                  <FormMessage className="text-red-500 mt-2" />
                </div>
              </FormItem>
            )}
          />

          <div className="flex flex-col gap-4">
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
                  Verifying...
                </span>
              ) : (
                "Verify Account"
              )}
            </Button>
          </div>
        </form>
      </Form>

      <div className="mt-8 text-center space-y-3">
        <div className="text-gray-600">
          Didn't receive a code?{" "}
          <Button
            variant="link"
            className="p-0 text-blue-600 font-semibold"
            onClick={handleResendCode}
            disabled={!canResend || isLoading}
          >
            {canResend ? "Resend Code" : `Resend in ${countdown}s`}
          </Button>
        </div>
      </div>
    </div>
  );
}
