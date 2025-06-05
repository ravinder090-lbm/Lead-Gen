import { useState, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { zodResolver } from "@hookform/resolvers/zod";
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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { loginUserSchema, type LoginUser } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import Logo from "@/lib/logo";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize the form
  const form = useForm<LoginUser>({
    resolver: zodResolver(loginUserSchema),
    defaultValues: {
      email: "",
      password: "",
      rememberMe: false,
    },
  });

  // Track if a submission is already in progress to prevent double-clicks
  const [submitLock, setSubmitLock] = useState(false);

  // const onSubmit = useCallback(
  //   async (values: LoginUser) => {
  //     // Prevent multiple submissions
  //     if (submitLock || isLoading) return;

  //     setSubmitLock(true);
  //     setIsLoading(true);
  //     setError(null);

  //     try {
  //       console.log("Attempting login with:", {
  //         email: values.email,
  //         rememberMe: values.rememberMe,
  //       });

  //       const res = await apiRequest("POST", "/api/auth/login", values);

  //       let data;
  //       try {
  //         // Parse the response body as JSON
  //         data = await res.json();

  //         // Log the raw response for debugging
  //         console.log("Login response:", data);

  //         if (!res.ok) {
  //           // Handle non-200 responses with proper error message
  //           throw new Error(
  //             data.message || `Login failed with status: ${res.status}`,
  //           );
  //         }

  //         if (!data || typeof data !== "object") {
  //           console.error("Invalid response data:", data);
  //           throw new Error("Invalid response from server");
  //         }

  //         if (!data.id || !data.email) {
  //           console.error("Missing user data in response:", data);
  //           throw new Error("Invalid user data received");
  //         }
  //       } catch (parseError) {
  //         console.error("Error parsing login response:", parseError);
  //         if (parseError instanceof SyntaxError) {
  //           throw new Error("Server returned invalid data. Please try again.");
  //         }
  //         throw parseError;
  //       }

  //       // Enhanced error handling for specific server responses
  //       if (data.needsVerification) {
  //         setError("Please verify your account before logging in");
  //         navigate("/verify?email=" + encodeURIComponent(values.email));
  //         return;
  //       }

  //       // Handle the user data directly (not wrapped in a user field)
  //       if (!data || !data.id) {
  //         console.error("Login response missing user data:", data);
  //         throw new Error(
  //           data.message || "Login failed. Invalid response from server",
  //         );
  //       }

  //       console.log("Login successful, received user data:", {
  //         id: data.id,
  //         role: data.role,
  //         email: data.email,
  //       });

  //       // Pass user data to the auth context
  //       login(data);

  //       toast({
  //         title: "Login successful",
  //         description: "You have been logged in successfully",
  //       });

  //       // // Redirect based on user role with a short delay to ensure state updates first
  //       // setTimeout(() => {
  //         switch (data?.role) {
  //           case "admin":
  //             navigate("/admin/dashboard");
  //             break;
  //           case "subadmin":
  //             navigate("/subadmin/dashboard");
  //             break;
  //           case "user":
  //             navigate("/user/leads");
  //             break;
  //           default:
  //             navigate("/user/dashboard");
  //         }
  //       // }, 300); // Increased delay to ensure state propagation
  //     } catch (err: any) {
  //       console.error("Login error:", err);
  //       setError(err.message || "Failed to login. Please try again.");
  //       toast({
  //         variant: "destructive",
  //         title: "Login failed",
  //         description: err.message || "Failed to login. Please try again.",
  //       });
  //     } finally {
  //       setIsLoading(false);
  //       // Release the submission lock after a short delay to prevent rapid re-submissions
  //       // setTimeout(() => setSubmitLock(false), 1000);
  //     }
  //   },
  //   [login, navigate, toast, isLoading, submitLock],
  // );

  const onSubmit = useCallback(
    async (values: LoginUser) => {
      if (submitLock || isLoading) return;
  
      setSubmitLock(true);
      setIsLoading(true);
      setError(null);
  
      try {
        console.log("Attempting login with:", {
          email: values.email,
          rememberMe: values.rememberMe,
        });
  
        const res = await apiRequest("POST", "/api/auth/login", values);
  
        let data;
        try {
          data = await res.json();
          console.log("Login response:", data);
  
          if (!res.ok) {
            throw new Error(data.message || `Login failed with status: ${res.status}`);
          }
  
          if (!data || typeof data !== "object") {
            throw new Error("Invalid response from server");
          }
  
          if (!data.id || !data.email) {
            throw new Error("Invalid user data received");
          }
        } catch (parseError) {
          console.error("Error parsing login response:", parseError);
          if (parseError instanceof SyntaxError) {
            throw new Error("Server returned invalid data. Please try again.");
          }
          throw parseError;
        }
  
        if (data.needsVerification) {
          setError("Please verify your account before logging in");
          navigate("/verify?email=" + encodeURIComponent(values.email));
          return;
        }
  
        console.log("Login successful, received user data:", {
          id: data.id,
          role: data.role,
          email: data.email,
        });
  
        login(data);
  
        toast({
          title: "Login successful",
          description: "You have been logged in successfully",
        });
  
        switch (data?.role) {
          case "admin":
            navigate("/admin/dashboard");
            break;
          case "subadmin":
            navigate("/subadmin/dashboard");
            break;
          case "user":
            navigate("/user/leads");
            break;
          default:
            navigate("/user/dashboard");
        }
      } catch (err: any) {
        console.error("Login error:", err);
        setError(err.message || "Failed to login. Please try again.");
        toast({
          variant: "destructive",
          title: "Login failed",
          description: err.message || "Failed to login. Please try again.",
        });
      } finally {
        setIsLoading(false);
        setTimeout(() => setSubmitLock(false), 500); // ✅ Reset the submitLock
      }
    },
    [login, navigate, toast, isLoading, submitLock],
  );
  

  return (
    <div className="w-full xl:p-6">
      <h1 className="text-2xl font-bold text-blue-600 mb-1">SIGN IN</h1>

      {error && (
        <Alert
          variant="destructive"
          className="mb-4 bg-red-50 border-red-200 text-red-600"
        >
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-500 text-sm">Email</FormLabel>
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
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <div className="flex justify-between">
                    <FormLabel className="text-gray-500 text-sm">
                      Password
                    </FormLabel>
                    <Button
                      variant="link"
                      className="text-blue-400 p-0 h-auto text-xs font-normal hover:text-blue-600"
                      onClick={() => navigate("/reset-password")}
                      type="button"
                      disabled={isLoading}
                    >
                      Forgot Password?
                    </Button>
                  </div>
                  <FormControl>
                    <PasswordInput
                      placeholder="Enter your password"
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

          <FormField
            control={form.control}
            name="rememberMe"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    id="remember-me"
                  />
                </FormControl>
                <label
                  htmlFor="remember-me"
                  className="text-sm text-gray-600 cursor-pointer"
                >
                  Keep me logged in
                </label>
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
                Signing In...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Form>

      {/* <div className="mt-8">
        <div className="relative flex items-center">
          <div className="flex-grow border-t border-gray-200"></div>
          <span className="mx-3 flex-shrink text-sm text-gray-400">
            Or, Use social media to sign in
          </span>
          <div className="flex-grow border-t border-gray-200"></div>
        </div>

        <div className="mt-4 flex justify-center space-x-4">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 bg-blue-100 border-none text-blue-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 bg-blue-100 border-none text-blue-400"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
            </svg>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="rounded-full h-10 w-10 bg-blue-100 border-none text-blue-700"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              fill="currentColor"
              viewBox="0 0 16 16"
            >
              <path d="M0 1.146C0 .513.526 0 1.175 0h13.65C15.474 0 16 .513 16 1.146v13.708c0 .633-.526 1.146-1.175 1.146H1.175C.526 16 0 15.487 0 14.854V1.146zm4.943 12.248V6.169H2.542v7.225h2.401zm-1.2-8.212c.837 0 1.358-.554 1.358-1.248-.015-.709-.52-1.248-1.342-1.248-.822 0-1.359.54-1.359 1.248 0 .694.521 1.248 1.327 1.248h.016zm4.908 8.212V9.359c0-.216.016-.432.08-.586.173-.431.568-.878 1.232-.878.869 0 1.216.662 1.216 1.634v3.865h2.401V9.25c0-2.22-1.184-3.252-2.764-3.252-1.274 0-1.845.7-2.165 1.193v.025h-.016a5.54 5.54 0 0 1 .016-.025V6.169h-2.4c.03.678 0 7.225 0 7.225h2.4z" />
            </svg>
          </Button>
        </div>
      </div> */}
    </div>
  );
}
