import { useEffect, useState } from "react";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { type Lead } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { navigate } from "wouter/use-browser-location";
import { useLocation } from "wouter";
import { RefreshCw } from "lucide-react";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";

interface LeadListProps {
  searchTerm: string;
  activeTab: string;
  onSelectLead: (leadId: number) => void;
}

export function LeadList({ searchTerm, activeTab, onSelectLead }: LeadListProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [location] = useLocation();

  // Function to fetch leads data
  const fetchLeads = async (showFullLoading = true) => {
    if (showFullLoading) {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);
    
    try {
      // Fetch leads data with a cache-busting parameter to prevent caching
      const timestamp = new Date().getTime();
      console.log(`Fetching leads with timestamp: ${timestamp}`);
      
      const leadsResponse = await fetch(`/api/leads?t=${timestamp}`, {
        method: 'GET',
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        },
        credentials: 'include'
      });
      
      if (!leadsResponse.ok) {
        // Handle specific error cases
        if (leadsResponse.status === 401) {
          throw new Error("You need to be logged in to view leads");
        } else {
          const errorData = await leadsResponse.json().catch(() => ({}));
          throw new Error(errorData.message || "Failed to fetch leads");
        }
      }
      
      const data = await leadsResponse.json();
      console.log(`Fetched ${data.length} leads successfully`);
      
      // Filter out any invalid data
      const validLeads = Array.isArray(data) ? data.filter(lead => lead && lead.id) : [];
      
      // Set leads data
      setLeads(validLeads);
    } catch (err: any) {
      console.error("Error fetching leads:", err);
      setError(err.message || "Failed to load leads");
      
      toast({
        variant: "destructive",
        title: "Error Loading Leads",
        description: err.message || "Could not load leads data. Please try again."
      });
      
      // Set empty leads array if there was an error
      setLeads([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Refresh data when the location changes (navigating back from create/edit)
  useEffect(() => {
    fetchLeads();
  }, [location, toast]);
  
  // Manual refresh function
  const handleRefresh = () => {
    fetchLeads(false);
    toast({
      title: "Refreshing leads",
      description: "Getting the latest lead data..."
    });
  };
  
  // Filter leads by search term and tab
  const filteredLeads = leads
    ? leads.filter((lead) => {
        const matchesSearch =
          lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          lead.location.toLowerCase().includes(searchTerm.toLowerCase());

        if (activeTab === "all") return matchesSearch;

        // Add more filters based on tabs if needed
        if (activeTab === "recent") {
          // Filter for recent leads (within last 7 days)
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          return matchesSearch && new Date(lead.createdAt) >= sevenDaysAgo;
        }
        
        if (activeTab === "popular") {
          // For popular leads, we can use price as a proxy for popularity
          // Leads with higher prices might be considered premium/popular
          return matchesSearch && (lead.price > 1000);
        }
        
        return matchesSearch;
      })
    : [];

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CardSkeleton 
          count={6} 
          layout="grid" 
          withImage={true} 
          withActions={true} 
        />
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <i className="ri-error-warning-line text-5xl text-red-500 mb-3"></i>
        <h3 className="text-lg font-medium">Could not load leads</h3>
        <p className="text-text-secondary mt-1">
          {error}
        </p>
        <Button 
          onClick={() => window.location.reload()}
          className="mt-4"
        >
          Try Again
        </Button>
      </div>
    );
  }

  if (filteredLeads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-10 text-center">
        <i className="ri-file-search-line text-5xl text-gray-300 mb-3"></i>
        <h3 className="text-lg font-medium">No leads found</h3>
        <p className="text-text-secondary mt-1">
          Try adjusting your search or create a new lead
        </p>
        <div className="flex gap-2 mt-4">
          <Button
            onClick={handleRefresh}
            variant="outline"
            className="flex items-center gap-2"
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
          <Button
            onClick={() => navigate("/admin/create-lead")}
          >
            Create New Lead
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button
          onClick={handleRefresh}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          disabled={isRefreshing}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          {isRefreshing ? "Refreshing..." : "Refresh Leads"}
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredLeads.map((lead) => (
          <div
            key={lead.id}
            onClick={() => onSelectLead(lead.id)}
            className="cursor-pointer"
          >
            <LeadCard lead={lead} />
          </div>
        ))}
      </div>
    </div>
  );
}