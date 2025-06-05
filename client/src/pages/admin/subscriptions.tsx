import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MainLayout } from "@/components/layout/main-layout";
import { PlanCard } from "@/components/subscriptions/plan-card";
import { Button } from "@/components/ui/button";
import { ExportButton } from "@/components/ui/export-button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { type Subscription, insertSubscriptionSchema, type LeadCoinPackage, insertLeadCoinPackageSchema } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { CardSkeleton } from "@/components/skeletons/card-skeleton";

export default function AdminSubscriptions() {
  const { toast } = useToast();
  const [mainTab, setMainTab] = useState("subscription-plans");
  const [isCreatePlanOpen, setIsCreatePlanOpen] = useState(false);
  const [isEditPlanOpen, setIsEditPlanOpen] = useState(false);
  const [isCreateCoinPackageOpen, setIsCreateCoinPackageOpen] = useState(false);
  const [isEditCoinPackageOpen, setIsEditCoinPackageOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [currentPlan, setCurrentPlan] = useState<Subscription | null>(null);
  const [currentCoinPackage, setCurrentCoinPackage] = useState<LeadCoinPackage | null>(null);
  
  // Fetch subscriptions data
  const { data: subscriptions, isLoading: isLoadingSubscriptions } = useQuery<Subscription[]>({
    queryKey: ['/api/subscriptions'],
  });

  // Fetch LeadCoin packages data
  const { data: coinPackages, isLoading: isLoadingCoinPackages } = useQuery<LeadCoinPackage[]>({
    queryKey: ['/api/leadcoin-packages'],
  });
  
  const form = useForm({
    resolver: zodResolver(insertSubscriptionSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationDays: 30,
      leadCoins: 0,
      features: [],
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertSubscriptionSchema),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      durationDays: 30,
      leadCoins: 0,
      features: [],
    },
  });

  const coinPackageForm = useForm({
    resolver: zodResolver(insertLeadCoinPackageSchema),
    defaultValues: {
      name: "",
      description: "",
      leadCoins: 0,
      price: 0,
      active: true,
    },
  });

  const editCoinPackageForm = useForm({
    resolver: zodResolver(insertLeadCoinPackageSchema),
    defaultValues: {
      name: "",
      description: "",
      leadCoins: 0,
      price: 0,
      active: true,
    },
  });

  // Function to handle editing a plan
  const handleEditPlan = (plan: Subscription) => {
    setCurrentPlan(plan);
    editForm.reset({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      durationDays: plan.durationDays,
      leadCoins: plan.leadCoins,
      features: (plan.features as string[]) || [],
    });
    setIsEditPlanOpen(true);
  };

  const handleEditCoinPackage = (coinPackage: LeadCoinPackage) => {
    setCurrentCoinPackage(coinPackage);
    editCoinPackageForm.reset({
      name: coinPackage.name,
      description: coinPackage.description || "",
      leadCoins: coinPackage.leadCoins,
      price: coinPackage.price,
      active: coinPackage.active,
    });
    setIsEditCoinPackageOpen(true);
  };
  
  async function onSubmit(values: any) {
    setIsLoading(true);
    
    try {
      // Make sure all expected fields are properly named
      const subscriptionData = {
        name: values.name,
        description: values.description,
        price: values.price,
        durationDays: values.durationDays,
        leadCoins: values.leadCoins,
        features: values.features,
      };
      
      await apiRequest("POST", "/api/subscriptions", subscriptionData);
      
      toast({
        title: "Subscription plan created",
        description: "The subscription plan has been created successfully.",
      });
      
      // Invalidate subscriptions query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      
      // Close modal and reset form
      setIsCreatePlanOpen(false);
      form.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create subscription plan. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitEdit(values: any) {
    if (!currentPlan) return;
    
    setIsLoading(true);
    
    try {
      // Make sure all expected fields are properly named
      const subscriptionData = {
        name: values.name,
        description: values.description,
        price: values.price,
        durationDays: values.durationDays,
        leadCoins: values.leadCoins,
        features: values.features,
      };
      
      await apiRequest("PATCH", `/api/subscriptions/${currentPlan.id}`, subscriptionData);
      
      toast({
        title: "Subscription plan updated",
        description: "The subscription plan has been updated successfully.",
      });
      
      // Invalidate subscriptions query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/subscriptions'] });
      
      // Close modal and reset form
      setIsEditPlanOpen(false);
      setCurrentPlan(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update subscription plan. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitCoinPackage(values: any) {
    setIsLoading(true);
    
    try {
      const packageData = {
        name: values.name,
        description: values.description,
        leadCoins: values.leadCoins,
        price: values.price,
        active: values.active,
      };
      
      await apiRequest("POST", "/api/leadcoin-packages", packageData);
      
      toast({
        title: "LeadCoin package created",
        description: "The LeadCoin package has been created successfully.",
      });
      
      // Invalidate packages query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leadcoin-packages'] });
      
      // Close modal and reset form
      setIsCreateCoinPackageOpen(false);
      coinPackageForm.reset();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create LeadCoin package. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  async function onSubmitEditCoinPackage(values: any) {
    if (!currentCoinPackage) return;
    
    setIsLoading(true);
    
    try {
      const packageData = {
        name: values.name,
        description: values.description,
        leadCoins: values.leadCoins,
        price: values.price,
        active: values.active,
      };
      
      await apiRequest("PATCH", `/api/leadcoin-packages/${currentCoinPackage.id}`, packageData);
      
      toast({
        title: "LeadCoin package updated",
        description: "The LeadCoin package has been updated successfully.",
      });
      
      // Invalidate packages query to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leadcoin-packages'] });
      
      // Close modal and reset form
      setIsEditCoinPackageOpen(false);
      setCurrentCoinPackage(null);
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update LeadCoin package. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }
  
  return (
    <MainLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary">Subscription Management</h1>
        <div className="flex gap-2">
          <ExportButton 
            endpoint="/api/export/subscriptions" 
            label="Export Subscriptions" 
            variant="outline"
            className="bg-white hover:bg-gray-100"
          />
        </div>
      </div>
      
      <div className="mb-6">
        <Tabs value={mainTab} onValueChange={setMainTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="subscription-plans">Subscription Plans</TabsTrigger>
            <TabsTrigger value="leadcoin-packages">Additional LeadCoins</TabsTrigger>
          </TabsList>
          
          <TabsContent value="subscription-plans" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-text-primary">Subscription Plans</h2>
                <p className="text-sm text-text-secondary">Manage subscription plans for users</p>
              </div>
              <Button onClick={() => setIsCreatePlanOpen(true)}>
                <i className="ri-add-line mr-1"></i>
                Add Subscription Plan
              </Button>
            </div>
            
            <div className="mb-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">All Plans</TabsTrigger>
                  <TabsTrigger value="active">Active</TabsTrigger>
                  <TabsTrigger value="inactive">Inactive</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {isLoadingSubscriptions ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CardSkeleton 
                  count={3} 
                  layout="grid" 
                  withImage={false} 
                  withFeatures={true}
                  withFooterAction={true}
                  featureCount={4}
                />
              </div>
            ) : subscriptions && subscriptions.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {subscriptions
                  .filter(plan => 
                    activeTab === "all" || 
                    (activeTab === "active" && plan.active) ||
                    (activeTab === "inactive" && !plan.active)
                  )
                  .map((plan) => (
                    <PlanCard 
                      key={plan.id} 
                      plan={plan} 
                      onEdit={handleEditPlan}
                    />
                  ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <i className="ri-stack-line text-5xl text-gray-300 mb-3"></i>
                <h3 className="text-lg font-medium">No subscription plans found</h3>
                <p className="text-text-secondary mt-1">Create a new subscription plan to get started</p>
                <Button onClick={() => setIsCreatePlanOpen(true)} className="mt-4">
                  Create New Plan
                </Button>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="leadcoin-packages" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-medium text-text-primary">Additional LeadCoins</h2>
                <p className="text-sm text-text-secondary">Manage additional LeadCoin packages for purchase</p>
              </div>
              <Button onClick={() => setIsCreateCoinPackageOpen(true)}>
                <i className="ri-add-line mr-1"></i>
                Add Additional LeadCoins
              </Button>
            </div>
            
            {isLoadingCoinPackages ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CardSkeleton 
                  count={3} 
                  layout="grid" 
                  withImage={false} 
                  withFeatures={false}
                  withFooterAction={true}
                />
              </div>
            ) : coinPackages && coinPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {coinPackages.map((pkg) => (
                  <Card key={pkg.id} className={`relative border-2 transition-all duration-200 ${
                    pkg.active ? 'border-primary bg-gradient-to-br from-primary/5 to-primary/10' : 'border-border bg-white'
                  }`}>
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {pkg.active ? (
                            <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
                              Active
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">
                              Inactive
                            </span>
                          )}
                        </div>
                      </div>
                      <CardTitle className="text-xl font-bold text-text-primary">{pkg.name}</CardTitle>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-text-primary">${pkg.price}</span>
                        <span className="text-sm text-text-secondary">/ {pkg.leadCoins} coins</span>
                      </div>
                      <CardDescription className="text-text-secondary mt-2">{pkg.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <i className="ri-coins-line text-primary"></i>
                          <span className="text-sm">{pkg.leadCoins} LeadCoins included</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="ri-money-dollar-circle-line text-primary"></i>
                          <span className="text-sm">One-time purchase</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <i className="ri-time-line text-primary"></i>
                          <span className="text-sm">Instant activation</span>
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full"
                        onClick={() => handleEditCoinPackage(pkg)}
                      >
                        Edit Package
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-10 text-center">
                <i className="ri-coins-line text-5xl text-gray-300 mb-3"></i>
                <h3 className="text-lg font-medium">No LeadCoin packages found</h3>
                <p className="text-text-secondary mt-1">Create a new LeadCoin package to get started</p>
                <Button onClick={() => setIsCreateCoinPackageOpen(true)} className="mt-4">
                  Create New Package
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Create Subscription Plan Sheet */}
      <Sheet open={isCreatePlanOpen} onOpenChange={setIsCreatePlanOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create Subscription Plan</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Premium Plan" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What's included in this plan?" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="99.99" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="leadCoins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Coins</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (one per line)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Access to premium leads
Dedicated support
Weekly reports" 
                          value={field.value?.join('\n') || ''}
                          onChange={(e) => field.onChange(e.target.value.split('\n'))}
                          disabled={isLoading} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreatePlanOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Plan"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit Subscription Plan Sheet */}
      <Sheet open={isEditPlanOpen} onOpenChange={setIsEditPlanOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit Subscription Plan</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...editForm}>
              <form onSubmit={editForm.handleSubmit(onSubmitEdit)} className="space-y-4">
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Plan Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Premium Plan" {...field} disabled={isLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="What's included in this plan?" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="99.99" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editForm.control}
                    name="durationDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Duration (days)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="30" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editForm.control}
                  name="leadCoins"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Lead Coins</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="100" 
                          {...field}
                          onChange={(e) => field.onChange(Number(e.target.value))}
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editForm.control}
                  name="features"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Features (one per line)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Access to premium leads
Dedicated support
Weekly reports" 
                          value={field.value?.join('\n') || ''}
                          onChange={(e) => field.onChange(e.target.value.split('\n'))}
                          disabled={isLoading} 
                          className="min-h-[100px]"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsEditPlanOpen(false);
                      setCurrentPlan(null);
                    }}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Plan"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create LeadCoin Package Sheet */}
      <Sheet open={isCreateCoinPackageOpen} onOpenChange={setIsCreateCoinPackageOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Create LeadCoin Package</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...coinPackageForm}>
              <form onSubmit={coinPackageForm.handleSubmit(onSubmitCoinPackage)} className="space-y-6">
                <FormField
                  control={coinPackageForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Starter Pack" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={coinPackageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Package description..." 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={coinPackageForm.control}
                    name="leadCoins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LeadCoins</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={coinPackageForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="9.99" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={coinPackageForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-text-secondary">
                          Make this package available for purchase
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsCreateCoinPackageOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Creating..." : "Create Package"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>

      {/* Edit LeadCoin Package Sheet */}
      <Sheet open={isEditCoinPackageOpen} onOpenChange={setIsEditCoinPackageOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Edit LeadCoin Package</SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <Form {...editCoinPackageForm}>
              <form onSubmit={editCoinPackageForm.handleSubmit(onSubmitEditCoinPackage)} className="space-y-6">
                <FormField
                  control={editCoinPackageForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Package Name</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="e.g., Starter Pack" 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={editCoinPackageForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Package description..." 
                          {...field} 
                          disabled={isLoading} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={editCoinPackageForm.control}
                    name="leadCoins"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>LeadCoins</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="100" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={editCoinPackageForm.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            placeholder="9.99" 
                            {...field}
                            onChange={(e) => field.onChange(Number(e.target.value))}
                            disabled={isLoading} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={editCoinPackageForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Active</FormLabel>
                        <p className="text-sm text-text-secondary">
                          Make this package available for purchase
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isLoading}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditCoinPackageOpen(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isLoading}
                  >
                    {isLoading ? "Updating..." : "Update Package"}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </SheetContent>
      </Sheet>
    </MainLayout>
  );
}
