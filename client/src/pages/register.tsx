import { useLocation } from "wouter";
import { RegisterForm } from "@/components/auth/register-form";
import Logo from "@/lib/logo";
import { Button } from "@/components/ui/button";

export default function Register() {
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

          <h1 className="auth-title text-4xl">Join Us!</h1>
          <p className="auth-subtitle text-center">
            Create an account to <br />
            access valuable leads.
          </p>

          <div className="mt-6 text-center">
            <p className="text-center mb-4">Already have an account?</p>
            <Button
              className="bg-white text-blue-600 hover:bg-blue-50 border border-blue-100 font-medium"
              onClick={() => navigate("/login")}
            >
              Sign In
            </Button>
          </div>
        </div>

        {/* Right panel with form */}
        <div className="auth-right-panel">
          <RegisterForm />
        </div>
      </div>
    </div>
  );
}
