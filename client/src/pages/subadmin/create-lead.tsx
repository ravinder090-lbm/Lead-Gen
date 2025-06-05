import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { MultiStepLeadForm } from "@/components/leads/multi-step-lead-form";
import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "wouter";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2 } from "lucide-react";

export default function SubadminCreateLead() {
  const { user, isLoading } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  // Show loading state
  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  // Check if user is a subadmin
  if (!user || user.role !== "subadmin") {
    return <Redirect to="/login" />;
  }

  // Check if subadmin has permission to create leads
  const hasPermission =
    Array.isArray(user.permissions) &&
    user.permissions.includes("leads.create");

  if (hasPermission) {
    return (
      <MainLayout>
        <div className="container py-8">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <h2 className="text-red-800 text-lg font-medium mb-2">
              Permission Denied
            </h2>
            <p className="text-red-600">
              You don't have permission to create leads. Please contact the
              administrator.
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Redirect after successful creation
  if (isSuccess) {
    return <Redirect to="/subadmin/leads" />;
  }

  return (
    <MainLayout>
      <PageHeader
        title="Create New Lead"
        description="Create a new lead with our multi-step form"
      />
      <div className="container py-6">
        <MultiStepLeadForm onSuccess={() => setIsSuccess(true)} />
      </div>
    </MainLayout>
  );
}
