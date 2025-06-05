import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { MultiStepLeadForm } from "@/components/leads/multi-step-lead-form";
import { useAuth } from "@/contexts/auth-context";
import { Redirect } from "wouter";
import { PageHeader } from "@/components/ui/page-header";
import { Loader2 } from "lucide-react";

export default function AdminCreateLead() {
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

  // Check if user is an admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/login" />;
  }

  // Redirect after successful creation
  if (isSuccess) {
    return <Redirect to="/admin/leads" />;
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