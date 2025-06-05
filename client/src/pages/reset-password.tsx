import { useLocation, useSearch } from "wouter";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { SetNewPasswordForm } from "@/components/auth/set-new-password-form";
import Logo from "@/lib/logo";
import { Button } from "@/components/ui/button";

export default function ResetPassword() {
  const [, navigate] = useLocation();
  const search = useSearch();
  const params = new URLSearchParams(search);
  const token = params.get("token") || "";
  const email = params.get("email") || "";

  // Determine which form to show based on URL parameters
  const showSetNewPasswordForm = token && email;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center auth-gradient-bg p-4">
      <div className="slide-in-animation auth-split-layout">
        {/* Left panel */}
        <div className="auth-left-panel">
          <div className="flex items-center gap-3 mb-8">
            <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center">
              <Logo />
            </div>
            <h2 className="text-2xl font-bold">LeadGen Pro</h2>
          </div>

          <h1 className="auth-title text-4xl">
            {showSetNewPasswordForm ? "New Password" : "Password Reset"}
          </h1>
          <p className="auth-subtitle text-center">
            {showSetNewPasswordForm
              ? "Create a new secure password for your account."
              : "Forgot your password? No worries, we'll help you reset it."}
          </p>

          <div className="mt-6 text-center">
            <p className="text-center mb-4">Remember your password?</p>
            <Button
              className="bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 font-medium"
              onClick={() => navigate("/login")}
            >
              Back to Login
            </Button>
          </div>
        </div>

        {/* Right panel with form */}
        <div className="auth-right-panel">
          {showSetNewPasswordForm ? (
            <SetNewPasswordForm email={email} token={token} />
          ) : (
            <ResetPasswordForm />
          )}
        </div>
      </div>
    </div>
  );
}
