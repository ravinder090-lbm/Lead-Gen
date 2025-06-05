import { useState } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { MultiStepLeadForm } from "@/components/leads/multi-step-lead-form";
import { useAuth } from "@/contexts/auth-context";
import { useParams, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { Loader2, AlertCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SubadminEditLead() {
  const { id } = useParams<{ id: string }>();
  const leadId = parseInt(id);
  const { user, isLoading: authLoading } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  // Check if user has permission
  const hasPermission = user?.permissions?.includes("leads_management");

  // Fetch lead data
  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    enabled: !!leadId && !!user && hasPermission,
  });

  const isLoading = authLoading || leadLoading;

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

  // Handle unauthorized access
  if (!hasPermission) {
    return (
      <MainLayout>
        <div className="space-y-4">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Access Denied</AlertTitle>
            <AlertDescription>
              You don't have permission to access the leads management module.
            </AlertDescription>
          </Alert>
        </div>
      </MainLayout>
    );
  }

  // Redirect after successful edit
  if (isSuccess) {
    return <Redirect to={`/leads/${leadId}`} />;
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-2">Lead Not Found</h2>
          <p className="text-text-secondary mb-4">
            The lead you are trying to edit does not exist or you don't have
            permission to edit it.
          </p>
          <Button asChild>
            <Link to="/subadmin/leads">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Leads
            </Link>
          </Button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="flex items-center mb-6">
        <Button variant="outline" size="sm" asChild className="mr-4">
          <Link to={`/leads/${leadId}`}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Lead
          </Link>
        </Button>
      </div>
      <div className="container py-6">
        <MultiStepLeadForm
          defaultValues={{
            ...Object.fromEntries(
              Object.entries(lead).filter(([_, value]) => value !== null && value !== undefined),
            ),
            // Ensure categoryId is properly set (even if it's 0)
            categoryId: lead.categoryId ?? undefined,
            // Ensure workType is properly set
            workType: lead.workType || "full_time",
            // Ensure duration is properly set
            duration: lead.duration || "",
            // Ensure skills is always an array
            skills: Array.isArray(lead.skills) ? lead.skills : [],
            // Ensure images is always an array
            images: Array.isArray(lead.images) ? lead.images : [],
          }}
          isEdit={true}
          leadId={leadId}
          onSuccess={() => setIsSuccess(true)}
        />
      </div>
    </MainLayout>
  );
}
