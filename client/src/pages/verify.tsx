import { useLocation } from "wouter";
import { VerifyForm } from "@/components/auth/verify-form";
import Logo from "@/lib/logo";
import { Button } from "@/components/ui/button";

export default function Verify() {
  const [, navigate] = useLocation();

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

          <h1 className="auth-title text-4xl">Verify Account</h1>
          <p className="auth-subtitle text-center">
            Please enter the verification code <br />
            sent to your email address.
          </p>

          <div className="mt-6 text-center">
            <p className="text-center mb-4">Already verified your account?</p>
            <Button
              className="bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 font-medium"
              onClick={() => navigate("/login")}
            >
              Go to Login
            </Button>
          </div>
        </div>

        {/* Right panel with form */}
        <div className="auth-right-panel">
          <VerifyForm />
        </div>
      </div>
    </div>
  );
}
