import { useState, useEffect } from "react";
import { useParams, useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest } from "@/lib/queryClient";
import { Lead, LeadCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  ArrowLeft,
  Edit2,
  Trash2,
  ExternalLink,
  MapPin,
  Calendar,
  Tag,
  User,
  Phone,
  Mail,
  Building,
  Info,
  BriefcaseBusiness,
  Clock,
  DollarSign,
  Users,
  Paperclip,
  FileText,
  Award,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { confirmDelete, showSuccess } from "@/lib/sweet-alert";
import { useToast } from "@/hooks/use-toast";

export default function LeadDetailPage() {
  const [_, navigate] = useLocation();
  const { id } = useParams<{ id: string }>();
  const leadId = parseInt(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isLeadViewed, setIsLeadViewed] = useState(false);
  const isAdmin = user?.role === "admin";
  const isSubAdmin = user?.role === "subadmin";
  const isRegularUser = user?.role === "user";
  const hasEditPermission =
    isAdmin || (isSubAdmin && user?.permissions?.includes("leads_management"));

  // Fetch lead details
  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["/api/leads", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to fetch lead");
      return res.json();
    },
    enabled: !!leadId && !!user,
  });

  // Fetch lead category
  const { data: category } = useQuery<LeadCategory>({
    queryKey: ["/api/lead-categories", lead?.categoryId],
    queryFn: async () => {
      const res = await fetch(`/api/lead-categories/${lead?.categoryId}`);
      if (!res.ok) throw new Error("Failed to fetch category");
      return res.json();
    },
    enabled: !!lead?.categoryId,
  });

  // Delete lead mutation
  const deleteLead = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/leads/${leadId}`);
      if (!res.ok) throw new Error("Failed to delete lead");
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });
      showSuccess("Lead deleted", "The lead has been successfully deleted");
      navigate(
        isAdmin
          ? "/admin/leads"
          : isSubAdmin
            ? "/subadmin/leads"
            : "/user/leads",
      );
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to delete lead: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  // Record viewed lead for regular users
  useEffect(() => {
    if (isRegularUser && lead && !isLeadViewed) {
      const viewLead = async () => {
        try {
          const res = await apiRequest("POST", `/api/leads/${leadId}/view`);
          if (res.ok) {
            setIsLeadViewed(true);
            // Refresh user data to update lead coins
            queryClient.invalidateQueries({ queryKey: ["/api/user"] });
          }
        } catch (error) {
          console.error("Error viewing lead:", error);
        }
      };
      viewLead();
    }
  }, [lead, leadId, isRegularUser, isLeadViewed, queryClient]);

  const handleDelete = async () => {
    const confirmed = await confirmDelete(
      "Delete Lead",
      "Are you sure you want to delete this lead? This action cannot be undone.",
    );
    if (confirmed) {
      deleteLead.mutate();
    }
  };

  // Back button link path
  const getBackPath = () => {
    if (isAdmin) return "/admin/leads";
    if (isSubAdmin) return "/subadmin/leads";
    return "/user/leads";
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </MainLayout>
    );
  }

  if (!lead) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
          <h2 className="text-2xl font-semibold mb-2">Lead Not Found</h2>
          <p className="text-text-secondary mb-4">
            The lead you are looking for does not exist or you don't have
            permission to view it.
          </p>
          <Button asChild>
            <Link to={getBackPath()}>
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
      <div className="max-w-[110rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="col-span-12">
            {/* Lead details - styled like the review page */}
            <Card className="mb-6 overflow-hidden">
              <div className="flex gap-2 justify-between md:gap-0 bg-gradient-to-r from-primary to-primary/70 p-4 ">
                <div className="text-white">
                  <h2 className="text-2xl font-semibold">Lead Details</h2>
                  <p className="text-white/80">
                    View complete information about this lead
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild className="mr-4">
                  <Link to={getBackPath()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Link>
                </Button>
              </div>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-8">
                  {/* Image section (optional) */}
                  {lead.images && lead.images.length > 0 && (
                    <div className="md:col-span-4">
                      <h3 className="text-lg font-medium mb-3">Images</h3>
                      <div className="rounded-md overflow-hidden">
                        <ImageCarousel images={lead.images} />
                      </div>
                    </div>
                  )}

                  {/* Info section (always show) */}
                  <div className={lead.images && lead.images.length > 0 ? "md:col-span-8" : "md:col-span-12"}>
                    {/* Basic Information */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3 border-b pb-2">Basic Information</h3>
                      <div className="space-y-4">
                        <div>
                          <p className="text-gray-500 text-sm">Title:</p>
                          <p className="font-medium">{lead.title}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Description:</p>
                          <p className="whitespace-pre-wrap">{lead.description}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Category:</p>
                          <p>{category?.name || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Skills Required */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3 border-b pb-2">Skills Required</h3>
                      {lead.skills && lead.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {lead.skills.map((skill: string, index: number) => (
                            <Badge key={index} variant="secondary">
                              {skill}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500">No skills specified</p>
                      )}
                    </div>

                    {/* Work Details */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3 border-b pb-2">Work Details</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-sm">Work Type:</p>
                          <p className="capitalize">{lead.workType.replace("_", " ")}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Duration:</p>
                          <p>{lead.duration || "Not specified"}</p>
                        </div>
                      </div>
                    </div>

                    {/* Contact Information */}
                    <div className="mb-8">
                      <h3 className="text-lg font-medium mb-3 border-b pb-2">Contact Information</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <p className="text-gray-500 text-sm">Location:</p>
                          <p>{lead.location}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Price:</p>
                          <p className="font-medium">{formatCurrency(lead.price)}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Total Members:</p>
                          <p>{lead.totalMembers || 1}</p>
                        </div>
                        <div>
                          <p className="text-gray-500 text-sm">Email:</p>
                          <p>
                            <a href={`mailto:${lead.email}`} className="text-primary hover:underline">
                              {lead.email}
                            </a>
                          </p>
                        </div>
                        {lead.contactNumber && (
                          <div>
                            <p className="text-gray-500 text-sm">Phone:</p>
                            <p>
                              <a href={`tel:${lead.contactNumber}`} className="text-primary hover:underline">
                                {lead.contactNumber}
                              </a>
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    {hasEditPermission && (
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            navigate(
                              isAdmin
                                ? `/admin/edit-lead/${leadId}`
                                : `/subadmin/edit-lead/${leadId}`
                            )
                          }
                        >
                          <Edit2 className="mr-2 h-4 w-4" />
                          Edit
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={handleDelete}
                          disabled={deleteLead.isPending}
                        >
                          {deleteLead.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="mr-2 h-4 w-4" />
                          )}
                          Delete
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>

            </Card>
          </div>

          {/* Right column - Status for regular users */}
        </div>
      </div>
    </MainLayout>
  );
}
