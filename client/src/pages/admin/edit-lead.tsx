import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { MultiStepLeadForm } from "@/components/leads/multi-step-lead-form";
import { useAuth } from "@/contexts/auth-context";
import { useParams, Redirect } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Lead } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function AdminEditLead() {
  const { id } = useParams<{ id: string }>();
  const leadId = parseInt(id);
  const { user, isLoading: authLoading } = useAuth();
  const [isSuccess, setIsSuccess] = useState(false);

  // Fetch lead data
  const { data: lead, isLoading: leadLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    enabled: !!leadId && !!user,
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

  // Check if user is an admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/login" />;
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
            <Link to="/admin/leads">
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
