
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { type Lead, type LeadCategory } from "@shared/schema";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/auth-context";
import { ImageCarousel } from "@/components/ui/image-carousel";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  MapPin,
  DollarSign,
  Users,
  Calendar,
  Mail,
  Phone,
  Tag,
  Eye
} from "lucide-react";

interface LeadDetailProps {
  leadId?: number;
}

export function LeadDetail({ leadId: propLeadId }: LeadDetailProps) {
  const params = useParams<{ id: string }>();
  const leadId = propLeadId || (params.id ? parseInt(params.id) : 0);
  const { user, refreshUser, login: setUser } = useAuth();
  const { toast } = useToast();

  const [isContactInfoViewed, setIsContactInfoViewed] = useState(false);
  const [hasAlreadyViewed, setHasAlreadyViewed] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [leadCoinSettings, setLeadCoinSettings] = useState({
    contactInfoCost: 5,
  });
  const [isCheckingViewStatus, setIsCheckingViewStatus] = useState(true);

  // Fetch lead details
  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: [`/api/leads/${leadId}`],
    enabled: !!leadId,
  });

  // Fetch category data if lead has a categoryId
  const { data: category } = useQuery<LeadCategory>({
    queryKey: [`/api/lead-categories/${lead?.categoryId}`],
    enabled: !!lead?.categoryId,
  });

  // Initialize component and check view status
  useEffect(() => {
    if (!leadId) return;
  
    const initializeComponent = async () => {
      try {
        const settingsResponse = await apiRequest("GET", "/api/leadcoins/settings");
        const settings = await settingsResponse.json();
        setLeadCoinSettings(settings);
  
        if (user) {
          if (user.role === "admin" || user.role === "subadmin") {
            setIsContactInfoViewed(true);
            setHasAlreadyViewed(true);
          } else {
            try {
              const response = await apiRequest("POST", `/api/leads/${leadId}/view`, {
                viewType: "contact_info",
              });
              const data = await response.json();
  
              if (data.success) {
                setIsContactInfoViewed(true);
  
                const updatedUser = {
                  ...user,
                  leadCoins: data.remainingCoins,
                };
                setUser?.(updatedUser);
                queryClient.setQueryData(["/api/auth/me"], updatedUser);
                queryClient.setQueryData(["/api/user"], updatedUser);
  
                toast({
                  title: "LeadCoins Deducted",
                  description: `${data.coinsSpent} LeadCoins were deducted to view this lead's contact information.`,
                });
  
                refreshUser();
              }
            } catch (error: any) {
              console.error("Error viewing lead:", error);
  
              let errorMessage = "Failed to view lead";
              try {
                const errorData = await error.response?.json();
                errorMessage = errorData?.message || errorMessage;
              } catch (e) {
                // Fallback to default error message
              }
  
              if (errorMessage.includes("Insufficient")) {
                toast({
                  variant: "destructive",
                  title: "Insufficient LeadCoins",
                  description: "You don't have enough LeadCoins to view this lead. Please purchase more coins.",
                });
              }
            }
          }
        }
  
        setIsCheckingViewStatus(false);
      } catch (error) {
        console.error("Error initializing LeadDetail:", error);
        setIsCheckingViewStatus(false);
      }
    };
  
    initializeComponent();
  }, [leadId, user]);
  

  // Handle viewing contact info and coin deduction
  const handleViewContactInfo = async () => {
    if (!user) return;
    
    // Show loading state with skeleton
    setIsProcessingPayment(true);

    try {
      const response = await apiRequest("POST", `/api/leads/${leadId}/view`, {
        viewType: "contact_info"
      });
      const data = await response.json();

      if (data.success) {
        setIsContactInfoViewed(true);
        setHasAlreadyViewed(true);

        const updatedUser = {
          ...user,
          leadCoins: data.remainingCoins,
        };
        setUser?.(updatedUser);
        queryClient.setQueryData(["/api/auth/me"], updatedUser);
        toast({
          title: "LeadCoins Deducted",
          description: `${data.coinsSpent} LeadCoins were deducted to view this lead.`,
        });
        refreshUser();
      }
    } catch (error: any) {
      console.error("Error viewing contact info:", error);
      
      // Check if this is an insufficient coins error
      let errorMessage = "Failed to view contact information";
      try {
        const errorData = await error.response?.json();
        errorMessage = errorData?.message || errorMessage;
      } catch (e) {
        // Use default error message
      }
      
      if (errorMessage.includes("Insufficient")) {
        toast({
          variant: "destructive",
          title: "Insufficient LeadCoins",
          description: "You don't have enough LeadCoins to view this contact. Purchase more coins from the subscriptions page."
        });
        
        // Show a helpful follow-up message after a delay
        // setTimeout(() => {
        //   toast({
        //     title: "Need More Coins?",
        //     description: "Visit the subscriptions page to purchase additional LeadCoins.",
        //   });
        // }, 1500);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: errorMessage
        });
      }
    } finally {
      // Always hide the loading state
      setIsProcessingPayment(false);
    }
  };

  if (isLoading || !lead) {
    return (
      <div className="space-y-4">
        <Card className="border-blue-100">
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-20 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-blue-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-white border-b border-blue-100 p-4">
          <div>
            <h1 className="text-2xl font-bold text-blue-800">{lead.title}</h1>
            <div className="flex flex-wrap gap-2 mt-2">
              <Badge
                variant="outline"
                className="bg-blue-50 text-blue-700 border-blue-200"
              >
                <Calendar className="h-3 w-3 mr-1" />
                {formatDate(new Date(lead.createdAt))}
              </Badge>

              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200"
              >
                <DollarSign className="h-3 w-3 mr-1" />
                {formatCurrency(lead.price)}
              </Badge>

              <Badge
                variant="outline"
                className="bg-purple-50 text-purple-700 border-purple-200"
              >
                <MapPin className="h-3 w-3 mr-1" />
                {lead.location}
              </Badge>

              {category && (
                <Badge
                  variant="outline"
                  className="bg-indigo-50 text-indigo-700 border-indigo-200"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {category.name}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <CardContent className="p-6 space-y-6">
          {/* Images section */}
          {lead.images && lead.images.length > 0 && (
            <div className="aspect-video overflow-hidden rounded-lg border border-blue-100 shadow-sm">
              <ImageCarousel
                images={lead.images}
                alt={lead.title}
                className="w-full h-full"
              />
            </div>
          )}

          {/* Description */}
          <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100">
            <h3 className="text-lg font-medium text-blue-800 mb-2">
              Description
            </h3>
            <p className="text-gray-700 whitespace-pre-line leading-relaxed">
              {lead.description}
            </p>
          </div>

          {/* Work Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-blue-100 bg-white">
              <h3 className="text-lg font-medium text-blue-800 mb-3">
                Work Details
              </h3>
              <div className="space-y-2">
                <p className="text-gray-600">
                  <span className="font-medium">Duration:</span> {lead.duration}
                </p>
                <p className="text-gray-600">
                  <span className="font-medium">Team Size:</span>{" "}
                  {lead.totalMembers} members
                </p>
              </div>
            </div>

            {/* Skills Required */}
            <div className="p-4 rounded-lg border border-blue-100 bg-white">
              <h3 className="text-lg font-medium text-blue-800 mb-3">
                Skills Required
              </h3>
              <div className="flex flex-wrap gap-2">
                {lead.skills?.map((skill, index) => (
                  <Badge
                    key={index}
                    variant="secondary"
                    className="bg-blue-50 text-blue-700"
                  >
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>
          </div>

          {/* Contact Information */}
          <Card className="border-blue-100">
            <CardHeader>
              <CardTitle className="text-lg text-blue-800">
                Contact Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isContactInfoViewed || hasAlreadyViewed || user?.role === "admin" || user?.role === "subadmin" ? (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-blue-600" />
                    <a
                      href={`mailto:${lead.email}`}
                      className="text-blue-600 hover:underline"
                    >
                      {lead.email}
                    </a>
                  </div>
                  {lead.contactNumber && (
                    <div className="flex items-center space-x-2">
                      <Phone className="h-5 w-5 text-blue-600" />
                      <a
                        href={`tel:${lead.contactNumber}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.contactNumber}
                      </a>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-yellow-700 flex items-center justify-between">
                    <span>Viewing contact information costs {leadCoinSettings.contactInfoCost} LeadCoins.</span>
                    <button
                      onClick={handleViewContactInfo}
                      className="ml-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-sm flex items-center transition-colors"
                      disabled={isProcessingPayment}
                    >
                      {isProcessingPayment ? (
                        <div className="flex items-center">
                          <div className="flex space-x-1 mr-2">
                            <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/30" />
                            <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/50" />
                            <Skeleton className="h-1.5 w-1.5 rounded-full bg-white/70" />
                          </div>
                          <span>Processing...</span>
                        </div>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5 mr-1" />
                          View Contact Info
                        </>
                      )}
                    </button>
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}
