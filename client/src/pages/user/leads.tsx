import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { LeadCard } from "@/components/leads/lead-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { type Lead, type LeadCategory } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { LeadDetail } from "@/components/leads/lead-detail";
import { useToast } from "@/hooks/use-toast";
import { cn, formatDate, formatCurrency } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/auth-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  LayoutGrid,
  List,
  Search,
  Filter,
  SlidersHorizontal,
  RefreshCw,
  MapPin,
  Calendar,
  DollarSign,
  ChevronDown,
  X,
  Check,
  TrendingUp,
} from "lucide-react";
import { navigate } from "wouter/use-browser-location";
import PageLoader from "@/components/ui/pageLoader";

export default function UserLeads() {
  const [loading, setLoading] = useState(false)
  const [isLeadDetailOpen, setIsLeadDetailOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [priceRange, setPriceRange] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [category, setCategory] = useState<string>("all");
  const [viewType, setViewType] = useState<"grid" | "list">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedLocations, setSelectedLocations] = useState<string[]>([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState<string[]>([]);
  // For pricing model checkboxes
  const [monthlyRetainer, setMonthlyRetainer] = useState<boolean>(false);
  const [hourlyPayment, setHourlyPayment] = useState<boolean>(false);
  const [projectBased, setProjectBased] = useState<boolean>(false);
  const [customQuote, setCustomQuote] = useState<boolean>(false);
  // For revenue cost checkboxes
  const [price0to50, setPrice0to50] = useState<boolean>(false);
  const [price50to150, setPrice50to150] = useState<boolean>(false);
  const [price150to250, setPrice150to250] = useState<boolean>(false);
  const [price250to350, setPrice250to350] = useState<boolean>(false);
  const [price350to1050, setPrice350to1050] = useState<boolean>(false);
  const [priceOver1050, setPriceOver1050] = useState<boolean>(false);
  const [selectedPriceRange, setSelectedPriceRange] = useState("");
  const [gridCols, setGridCols] = useState(3);

  // Safe grid class to prevent Tailwind purge issues
  const getGridClass = (cols) => {
    switch (cols) {
      case 2:
        return "grid-cols-2";
      case 3:
        return "grid-cols-3";
      case 4:
        return "grid-cols-4";
      case 5:
        return "grid-cols-5";
      default:
        return "grid-cols-3";
    }
  };

  const gridClass = `${getGridClass(gridCols)} gap-4`;
  // Fetch leads data
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/leads"],
  });

  // Fetch only categories that are used in leads (for filtering)
  const { data: categories } = useQuery<LeadCategory[]>({
    queryKey: ["/api/lead-categories/used"],
  });

  // Auth and toast hooks
  const { user, refreshUser, login: setUser } = useAuth();
  const { toast } = useToast();

  const handleLeadDetail = async (leadId: number) => {
    // If the user is a regular user, deduct lead coins before showing details
    if (user && user.role === "user") {
      try {
        // Attempt to track lead view (deduct lead coins)
        const response = await fetch(`/api/leads/${leadId}/view?check=true`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include'
        });

        // Handle non-success responses properly
        if (!response.ok) {
          const errorData = await response.json();
          if (response.status === 400 && errorData.message === "Insufficient lead coins") {
            toast({
              title: "Insufficient LeadCoins",
              description: `You need ${errorData.requiredCoins} lead coins to view this information. You currently have ${errorData.availableCoins} lead coins.`,
              variant: "destructive",
            });
            return; // Exit early
          }
          throw new Error(errorData.message || "Failed to view lead details");
        }

        const data = await response.json();

        if (data.success) {
          // Update user's lead coins in the local state immediately
          if (
            !data.alreadyViewed &&
            data.remainingCoins !== undefined &&
            user
          ) {
            // Create a new user object with updated lead coins
            const updatedUser = {
              ...user,
              leadCoins: data.remainingCoins,
            };

            // Update the auth context with the new user data
            setUser(updatedUser);

            // Also update the query cache to ensure consistent state across the app
            queryClient.setQueryData(["/api/auth/me"], updatedUser);
            queryClient.setQueryData(["/api/user"], updatedUser);

            // Show toast notification about deducted coins
            toast({
              title: "LeadCoins Deducted",
              description: `Lead coins were deducted to view this lead's information.`,
              variant: "default",
            });
          }

          // Also refresh user data from server as well
          refreshUser();

          // Open the lead detail
          setSelectedLeadId(leadId);
          // setIsLeadDetailOpen(true);
          navigate(`/leads/${leadId}`);
        }
      } catch (error: any) {
        console.error("Error tracking lead view:", error);

        // Check if the error is due to insufficient coins
        if (
          error.toString().includes("Insufficient") ||
          (error.toString().includes("400") &&
            error.toString().includes("coins"))
        ) {
          toast({
            title: "Insufficient LeadCoins",
            description:
              "You don't have enough LeadCoins to view this lead's details. Please purchase more coins.",
            variant: "destructive",
          });
          navigate(`/user/profile`);
        } else {
          toast({
            title: "Error",
            description:
              "There was an error viewing the lead. Please try again.",
            variant: "destructive",
          });
        }
      }
    } else {
      // Admins and subadmins can view leads without deducting coins
      setSelectedLeadId(leadId);
      setIsLeadDetailOpen(true);
    }
  };

  // Handle location selection with LIKE search instead of exact match
  const handleLocationSearch = (input: string) => {
    setSelectedLocations(input ? [input] : []);
  };

  // Handle price range selection
  const togglePriceRange = (range: string) => {
    setSelectedPriceRanges((prev) =>
      prev.includes(range) ? prev.filter((r) => r !== range) : [...prev, range],
    );
  };
  // Get unique locations from leads
  const uniqueLocations = leads
    ? Array.from(new Set(leads.map((lead) => lead.location)))
    : [];

  // Filter leads by search term, price range, locations, and category
  const filteredLeads = leads
    ? leads.filter((lead) => {
      // Search with LIKE functionality - case insensitive partial match
      const matchesSearch = !searchTerm
        ? true
        : lead.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        lead.location.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesPrice =
        priceRange === "all" ||
        (priceRange === "under1000" && lead.price < 1000) ||
        (priceRange === "1000to5000" &&
          lead.price >= 1000 &&
          lead.price <= 5000) ||
        (priceRange === "over5000" && lead.price > 5000);

      // Filter by locations using LIKE search instead of exact match
      const matchesLocation =
        selectedLocations.length === 0 ||
        (selectedLocations[0] &&
          lead.location
            .toLowerCase()
            .includes(selectedLocations[0].toLowerCase()));

      // Filter by selected category
      const matchesCategory =
        category === "all" ||
        (lead.categoryId &&
          category &&
          lead.categoryId.toString() === category);

      // Additional filter by selected price ranges
      const matchesSelectedPrices =
        selectedPriceRanges.length === 0 ||
        (selectedPriceRanges.includes("low") && lead.price < 1000) ||
        (selectedPriceRanges.includes("medium") &&
          lead.price >= 1000 &&
          lead.price <= 5000) ||
        (selectedPriceRanges.includes("high") && lead.price > 5000);

      // Filter by pricing model checkboxes
      // This is a workaround since pricingModel doesn't exist in the lead type
      // In a real app, you would have this field in your database
      const matchesPricingModel =
        (!monthlyRetainer &&
          !hourlyPayment &&
          !projectBased &&
          !customQuote) ||
        monthlyRetainer ||
        hourlyPayment ||
        projectBased ||
        customQuote;

      // Filter by revenue cost checkboxes
      const matchesRevenueCost =
        (!price0to50 &&
          !price50to150 &&
          !price150to250 &&
          !price250to350 &&
          !price350to1050 &&
          !priceOver1050) ||
        (price0to50 && lead.price >= 0 && lead.price <= 50) ||
        (price50to150 && lead.price > 50 && lead.price <= 150) ||
        (price150to250 && lead.price > 150 && lead.price <= 250) ||
        (price250to350 && lead.price > 250 && lead.price <= 350) ||
        (price350to1050 && lead.price > 350 && lead.price <= 1050) ||
        (priceOver1050 && lead.price > 1050);

      return (
        matchesSearch &&
        matchesPrice &&
        matchesCategory &&
        matchesLocation &&
        matchesSelectedPrices &&
        matchesPricingModel &&
        matchesRevenueCost
      );
    })
    : [];

  // Sort leads
  const sortedLeads = [...filteredLeads].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    } else if (sortBy === "priceLow") {
      return a.price - b.price;
    } else if (sortBy === "priceHigh") {
      return b.price - a.price;
    }
    return 0;
  });

  const priceRanges = [
    { value: "0-50", label: "$0 - $50" },
    { value: "50-150", label: "$50 - $150" },
    { value: "150-250", label: "$150 - $250" },
    { value: "250-350", label: "$250 - $350" },
    { value: "350-1050", label: "$350 - $1050" },
    { value: "over-1050", label: "Over $1050" },
  ];

  // Reset all filters
  const resetFilters = () => {
    setSearchTerm("");
    setPriceRange("all");
    setCategory("all");
    setSelectedLocations([]);
    setSelectedPriceRanges([]);
    setActiveTab("all");

    setMonthlyRetainer(false);
    setHourlyPayment(false);
    setProjectBased(false);
    setCustomQuote(false);

    setPrice0to50(false);
    setPrice50to150(false);
    setPrice150to250(false);
    setPrice250to350(false);
    setPrice350to1050(false);
    setPriceOver1050(false);
  };

  // Generate list of active filters for display
  const activeFilters = [
    ...(searchTerm ? [`Search: ${searchTerm}`] : []),
    ...(priceRange !== "all" ? [`Price: ${priceRange}`] : []),
    ...(category !== "all" ? [`Category: ${category}`] : []),
    ...selectedLocations.map((loc) => `Location: ${loc}`),
    ...selectedPriceRanges.map((range) => {
      if (range === "low") return "Price: Under $1,000";
      if (range === "medium") return "Price: $1,000 - $5,000";
      if (range === "high") return "Price: Over $5,000";
      return "";
    }),
  ];

  return (
    <MainLayout>

      {/* Two-column layout with filters on left and content on right */}
      <div className="max-w-[110rem] mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Left sidebar with filters - similar to the screenshot */}
        <div className="">
          <h1 className="text-2xl font-semibold text-blue-800 mb-4">
            Available Leads
          </h1>
          <Card className="bg-white mb-4 shadow-sm border-blue-100 sticky top-0">
            <CardHeader className="pb-3 border-b mb-4 border-blue-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-blue-800">
                  Filters
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 h-8 px-2"
                  onClick={resetFilters}
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Reset Filters
                </Button>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col lg:flex-row gap-4">
              {/* Job Title / Search */}
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-medium text-blue-800">Job Title</h3>
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search here"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 border-blue-200 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-medium text-blue-800">
                  Categories
                </h3>
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value);
                  }}
                >
                  <SelectTrigger className="border-blue-200 h-9 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories && categories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Location */}
              <div className="space-y-2 w-full">
                <h3 className="text-sm font-medium text-blue-800">Location</h3>
                <Select
                  value={selectedLocations[0] || "all_locations"}
                  onValueChange={(value) => {
                    if (value === "all_locations") {
                      setSelectedLocations([]);
                    } else {
                      setSelectedLocations([value]);
                    }
                  }}
                >
                  <SelectTrigger className="border-blue-200 h-9 text-sm">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all_locations">All Locations</SelectItem>
                    {uniqueLocations.map((location) => (
                      <SelectItem key={location} value={location}>
                        {location}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>


              <div className="space-y-2 w-full">
                <h3 className="text-sm font-medium text-blue-800">
                  Revenue Cost
                </h3>
                <Select
                  value={selectedPriceRange}
                  onValueChange={(value) => {
                    setSelectedPriceRange(value);
                    // Reset all and set only selected
                    setPrice0to50(false);
                    setPrice50to150(false);
                    setPrice150to250(false);
                    setPrice250to350(false);
                    setPrice350to1050(false);
                    setPriceOver1050(false);

                    switch (value) {
                      case "0-50":
                        setPrice0to50(true);
                        break;
                      case "50-150":
                        setPrice50to150(true);
                        break;
                      case "150-250":
                        setPrice150to250(true);
                        break;
                      case "250-350":
                        setPrice250to350(true);
                        break;
                      case "350-1050":
                        setPrice350to1050(true);
                        break;
                      case "over-1050":
                        setPriceOver1050(true);
                        break;
                    }
                  }}
                >
                  <SelectTrigger className="border-blue-200 h-9 text-sm">
                    <SelectValue placeholder="Select price range" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceRanges.map(({ value, label }) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>



            </CardContent>
          </Card>
        </div>

        {/* Right side - main content */}
        <div className="flex-1">
          {/* View toggle and count */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-blue-800">
              {isLoading ? (
                <Skeleton className="h-5 w-20" />
              ) : (
                <span>Showing {sortedLeads.length} leads</span>
              )}
            </div>

            <div className="flex items-center space-x-2">
              {/* Grid size dropdown */}
              {viewType === "grid" && (
                <select
                  value={gridCols}
                  onChange={(e) => setGridCols(Number(e.target.value))}
                  className="text-sm border border-blue-200 rounded p-2 px-4 focus:outline-none"
                >
                  <option value={2}>2 Grid</option>
                  <option value={3}>3 Grid</option>
                  <option value={4}>4 Grid</option>
                  <option value={5}>5 Grid</option>
                </select>
              )}

              <Button
                variant={viewType === "grid" ? "default" : "outline"}
                size="sm"
                className={`px-3 transition-all ${viewType === "grid" ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-blue-100"
                  }`}
                onClick={() => setViewType("grid")}
              >
                <LayoutGrid className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Grid</span>
              </Button>

              <Button
                variant={viewType === "list" ? "default" : "outline"}
                size="sm"
                className={`px-3 transition-all ${viewType === "list" ? "bg-blue-500 hover:bg-blue-600" : "hover:bg-blue-100"
                  }`}
                onClick={() => setViewType("list")}
              >
                <List className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">List</span>
              </Button>
            </div>
          </div>

          {/* Main content */}
          {isLoading ? (
            viewType === "grid" ? (
              <div className={`grid ${gridClass}`}>
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-blue-100">
                    <Skeleton className="h-40 w-full rounded-t-lg" />
                    <CardContent className="p-4 space-y-3">
                      <Skeleton className="h-6 w-3/4" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-1/3" />
                        <Skeleton className="h-4 w-1/5" />
                      </div>
                      <Skeleton className="h-9 w-full mt-2" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i} className="border-blue-100">
                    <CardContent className="p-4">
                      <div className="flex flex-col md:flex-row gap-4">
                        <Skeleton className="h-24 w-24 rounded-lg flex-shrink-0" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-6 w-3/4" />
                          <Skeleton className="h-4 w-full" />
                          <div className="flex flex-wrap gap-2">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-4 w-32" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <div className="flex flex-col justify-between items-end">
                          <Skeleton className="h-6 w-20" />
                          <Skeleton className="h-9 w-24 mt-2" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : sortedLeads.length > 0 ? (
            viewType === "grid" ? (
              <div className={`grid ${gridClass}`}>
                {sortedLeads.map((lead) => (
                  <div
                    key={lead.id}
                    onClick={() => handleLeadDetail(lead.id)}
                    className="cursor-pointer"
                  >
                    <LeadCard lead={lead} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {sortedLeads.map((lead) => (
                  <Card
                    key={lead.id}
                    className="border border-blue-100 overflow-hidden hover:shadow-md transition-all duration-200"
                  >
                    <CardContent className="p-0">
                      <div className="flex">
                        <div className="p-4 flex-shrink-0">
                          <div className="w-16 h-16 rounded-full overflow-hidden bg-blue-100 border border-blue-200 flex items-center justify-center">
                            {lead.images && lead.images[0] ? (
                              <img
                                src={lead.images[0]}
                                alt={lead.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl">
                                {lead.title.charAt(0).toUpperCase()}
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="py-4 pr-4 flex-1">
                          <h3 className="text-lg font-semibold text-blue-800">{lead.title}</h3>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                            {lead.description}
                          </p>

                          <div className="flex flex-wrap items-center gap-4 mt-3">
                            <div className="flex items-center text-blue-700 text-sm">
                              <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                              {lead.location}
                            </div>

                            <div className="flex items-center text-blue-700 text-sm">
                              <DollarSign className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                              Revenue Cost: ${lead.price}
                            </div>

                            <div className="flex items-center text-blue-700 text-sm">
                              <i className="ri-user-line mr-1"></i>
                              Team member: {lead.totalMembers || 0}
                            </div>

                            <div className="flex items-center text-blue-700 text-sm">
                              <i className="ri-calendar-line mr-1"></i>
                              Monthly Retainer
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center p-4">
                          <Button
                            size="sm"
                            className="bg-blue-500 hover:bg-blue-600"
                            onClick={() => handleLeadDetail(lead.id)}
                          >
                            <i className="ri-eye-line mr-1"></i>   View Details
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          ) : (
            <div className="flex flex-col items-center justify-center p-10 text-center bg-blue-50/50 rounded-lg border border-blue-100">
              <Search className="h-12 w-12 text-blue-300 mb-3" />
              <h3 className="text-lg font-medium text-blue-800">No leads found</h3>
              <p className="text-blue-600 mt-1 max-w-md">
                We couldn't find any leads matching your current filters. Try adjusting your search
                criteria or check back later for new leads.
              </p>
              {activeFilters.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={resetFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Clear all filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>


    </MainLayout>
  );
}
