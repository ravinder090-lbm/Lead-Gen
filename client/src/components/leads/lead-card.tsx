import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { type Lead, type LeadCategory } from "@shared/schema";
import { useLocation } from "wouter";
import { useState, useMemo, useCallback, memo } from "react";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { TagIcon } from "lucide-react";

interface LeadCardProps {
  lead: Lead;
  showView?: boolean;
}

// Memoized Image component to prevent unnecessary re-renders
const LeadImage = memo(({ 
  imageUrl, 
  title, 
  price 
}: { 
  imageUrl: string; 
  title: string; 
  price: number;
}) => {
  return (
    <div className="h-32 sm:h-40 overflow-hidden relative group">
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
        loading="lazy"
      />
      <div className="absolute top-1 sm:top-2 right-1 sm:right-2 bg-blue-600 text-white px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-bold">
        {formatCurrency(price)}
      </div>
    </div>
  );
});

LeadImage.displayName = "LeadImage";

// Memoized category badge component
const CategoryBadge = memo(({ 
  categoryId, 
  categoryName 
}: { 
  categoryId: number | null;
  categoryName: string;
}) => {
  return (
    <div
      className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-medium flex items-center gap-1 whitespace-nowrap"
      style={{
        backgroundColor: categoryId
          ? "rgba(79, 70, 229, 0.1)"
          : "rgba(59, 130, 246, 0.1)",
        color: categoryId ? "#4f46e5" : "#3b82f6",
      }}
    >
      <TagIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
      {categoryName}
    </div>
  );
});

CategoryBadge.displayName = "CategoryBadge";

// Optimized LeadCard function component
export function LeadCard({ lead, showView = true }: LeadCardProps) {
  const [location, navigate] = useLocation();
  const { toast } = useToast();
  const { user, refreshUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // Fetch category data if lead has a categoryId - with optimized query settings
  const { data: category } = useQuery<LeadCategory>({
    queryKey: [`/api/lead-categories/${lead.categoryId}`],
    enabled: !!lead.categoryId, // Only fetch if the lead has a categoryId
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes since categories rarely change
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
  });

  // Memoized values to avoid unnecessary calculations
  const isDashboard = useMemo(() => location.startsWith("/user/dashboard"), [location]);
  
  // Check user role once and memoize results
  const isAdmin = useMemo(() => user?.role === "admin", [user?.role]);
  const isSubadmin = useMemo(() => user?.role === "subadmin", [user?.role]);
  const isRegularUser = useMemo(() => user?.role === "user", [user?.role]);
  const hasEnoughCoins = useMemo(() => 
    user?.leadCoins !== undefined && user.leadCoins > 0, 
    [user?.leadCoins]
  );

  // Memoized image URL to avoid recalculating on every render
  const imageUrl = useMemo(() => {
    // Check if lead has images array and if it's not empty
    if (
      lead.images &&
      Array.isArray(lead.images) &&
      lead.images.length > 0 &&
      lead.images[0]
    ) {
      return lead.images[0];
    }

    // Fallback to a placeholder image based on the theme color
    return (
      "https://placehold.co/600x400/1a73e8/ffffff?text=" +
      encodeURIComponent((category?.name || "Lead") + " Image")
    );
  }, [lead.images, category?.name]);

  // Category name calculation (memoized)
  const categoryName = useMemo(() => 
    lead.categoryId && category ? category.name : "General", 
    [lead.categoryId, category]
  );

  // Optimized handler with useCallback to prevent recreation on every render
  const handleViewDetails = useCallback(async () => {
    // Navigate directly for admin and subadmin roles
    if (isAdmin || isSubadmin) {
      navigate(`/leads/${lead.id}`);
      return;
    }
    
    // Check if user has 0 lead coins - automatically redirect to subscriptions page
    if (isRegularUser && !hasEnoughCoins) {
      toast({
        variant: "destructive",
        title: "No LeadCoins Available",
        description:
          "You need to purchase a subscription to get LeadCoins. Redirecting to subscription page...",
      });

      // Automatically navigate to subscriptions page after short delay
      setTimeout(() => {
        navigate("/user/subscriptions");
      }, 1500);

      return;
    }

    // If user has lead coins, attempt to view the lead
    setIsLoading(true);
    
    // Use AbortController for cancellable requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    
    try {
      const response = await apiRequest("POST", `/api/leads/${lead.id}/view`, undefined, {
        abortSignal: controller.signal
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to check lead view eligibility.",
        );
      }

      if (data.success) {
        // Refresh user data to update leadCoins in UI immediately
        await refreshUser();

        // Also invalidate any dashboard queries to force refresh
        queryClient.invalidateQueries({ queryKey: ["/api/user/dashboard"] });

        navigate(`/leads/${lead.id}`);
      } else {
        // This handles the case where user has some coins but not enough
        toast({
          variant: "destructive",
          title: "Cannot view lead",
          description:
            data.message ||
            "You don't have enough LeadCoins to view this lead. Redirecting to subscription page...",
        });

        // Automatically navigate to subscriptions page after short delay
        setTimeout(() => {
          navigate("/user/subscriptions");
        }, 1500);
      }
    } catch (error: any) {
      // Don't log if this was an abort error (intentional cancellation)
      if (error.name !== 'AbortError') {
        console.error("Failed to view lead details:", error);
        toast({
          variant: "destructive",
          title: "Error",
          description:
            error.message || "Something went wrong while viewing lead details.",
        });
      }
    } finally {
      clearTimeout(timeoutId);
      setIsLoading(false);
    }
  }, [
    isAdmin, 
    isSubadmin, 
    isRegularUser, 
    hasEnoughCoins, 
    lead.id, 
    navigate, 
    refreshUser, 
    toast
  ]);

  // Button text is memoized to avoid recreating strings on re-render
  const buttonText = useMemo(() => 
    isLoading ? "Loading..." : "View Details", 
    [isLoading]
  );

  return (
    <Card className="border border-blue-50 rounded-lg overflow-hidden bg-white hover:shadow-lg transition-all duration-300 h-full flex flex-col">
      {/* Memoized image component */}
      <LeadImage 
        imageUrl={imageUrl}
        title={lead.title}
        price={lead.price}
      />
      
      <CardContent className="p-3 sm:p-4 md:p-5 flex-1 flex flex-col">
        <h4 className="font-bold text-blue-800 text-sm sm:text-base truncate">
          {lead.title}
        </h4>
        <p className="text-xs sm:text-sm text-gray-600 mt-1 sm:mt-2 line-clamp-2">
          {lead.description}
        </p>
        <div className="flex flex-wrap justify-between items-center gap-1 mt-3 sm:mt-4 mt-auto">
          <div className="flex items-center text-xs sm:text-sm text-blue-600">
            <i className="ri-map-pin-line mr-1"></i>
            <span className="truncate max-w-[100px] sm:max-w-[150px]">
              {lead.location}
            </span>
          </div>
          
          {/* Memoized category badge */}
          <CategoryBadge 
            categoryId={lead.categoryId} 
            categoryName={categoryName} 
          />
        </div>
        
        {/* Only render button when needed */}
        {showView && !isDashboard && (
          <Button
            className="mt-3 sm:mt-4 w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors text-xs sm:text-sm py-1.5 sm:py-2 h-auto"
            onClick={handleViewDetails}
            disabled={isLoading}
          >
            <i className="ri-eye-line mr-1 sm:mr-1.5"></i>
            {buttonText}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
