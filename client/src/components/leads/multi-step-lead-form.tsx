import { useState, useRef, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  insertLeadSchema,
  type InsertLead,
  type LeadCategory,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Send,
  Plus,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { AddCategoryModal } from "./add-category-modal";
import { AddLocationModal } from "./add-location-modal";

interface MultiStepLeadFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<InsertLead>;
  isEdit?: boolean;
  leadId?: number;
}

// Category data type similar to the one in add-category-modal
interface CategoryData {
  id?: number;
  name: string;
  description?: string;
}

// Type for our step indicator
interface StepProps {
  title: string;
  description: string;
  isActive: boolean;
  isCompleted: boolean;
  onClick: () => void;
}

// Step indicator component
const StepIndicator = ({
  title,
  description,
  isActive,
  isCompleted,
  onClick,
}: StepProps) => (
  <div
    className={cn(
      "flex items-center gap-3 p-3 rounded-lg transition-all cursor-pointer",
      isActive ? "bg-blue-50 shadow-sm" : "hover:bg-gray-50",
      isCompleted ? "border-l-4 border-blue-500" : "",
    )}
    onClick={onClick}
  >
    <div
      className={cn(
        "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
        isActive
          ? "bg-blue-500 text-white"
          : isCompleted
            ? "bg-green-100 text-green-600"
            : "bg-gray-100 text-gray-500",
      )}
    >
      {isCompleted ? (
        <CheckCircle2 size={16} />
      ) : isActive ? (
        <span className="text-sm font-medium">★</span>
      ) : (
        <span className="text-sm font-medium">•</span>
      )}
    </div>
    <div className="flex-1">
      <h4
        className={cn(
          "text-sm font-medium",
          isActive
            ? "text-blue-700"
            : isCompleted
              ? "text-green-700"
              : "text-gray-700",
        )}
      >
        {title}
      </h4>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  </div>
);

export function MultiStepLeadForm({
  onSuccess,
  defaultValues,
  isEdit = false,
  leadId,
}: MultiStepLeadFormProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [previewImages, setPreviewImages] = useState<string[]>(() => {
    if (
      isEdit &&
      defaultValues?.images &&
      Array.isArray(defaultValues.images)
    ) {
      return defaultValues.images as string[];
    }
    return [];
  });

  // New state for multi-step form
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [skill, setSkill] = useState(""); // For inputting a single skill
  const [skills, setSkills] = useState<string[]>(
    Array.isArray(defaultValues?.skills) ? defaultValues.skills : [],
  );

  // State for new category and location modals
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  // State for dropdown locations and categories
  const [locations, setLocations] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>(
    defaultValues?.location || "",
  );
  
  // Local categories storage (similar to locations)
  const [localCategories, setLocalCategories] = useState<Array<{id?: number, name: string, description?: string}>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>(
    defaultValues?.categoryId ? String(defaultValues.categoryId) : ""
  );

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Only admin or subadmin can add categories
  const canAddCategory = user?.role === "admin" || user?.role === "subadmin";

  // Function to handle new category added
  const handleCategoryAdded = (category: CategoryData) => {
    console.log("New category added:", category.name);

    // Check if the category already exists in server categories (case-insensitive)
    const existingServerCategory = serverCategories.find(
      sc => sc.name.toLowerCase() === category.name.toLowerCase()
    );
    
    if (existingServerCategory) {
      // If it exists on server, use the existing category instead
      console.log("Found existing category on server:", existingServerCategory.name);
      
      // Set as selected category
      setSelectedCategory(existingServerCategory.id.toString());
      
      // Update form value with existing ID
      form.setValue("categoryId", existingServerCategory.id, {
        shouldValidate: true, 
        shouldDirty: true,
      });
      
      return; // Exit early - no need to create a new category
    }
    
    // Check if the category already exists in local categories (case-insensitive)
    const existingLocalCategory = localCategories.find(
      lc => lc.name.toLowerCase() === category.name.toLowerCase()
    );
    
    if (existingLocalCategory && existingLocalCategory.id !== undefined) {
      // If it exists locally, use the existing local category
      console.log("Found existing local category:", existingLocalCategory.name);
      
      // Set as selected category
      setSelectedCategory(String(existingLocalCategory.id));
      
      // Update form value with existing local ID
      form.setValue("categoryId", existingLocalCategory.id, {
        shouldValidate: true,
        shouldDirty: true,
      });
      
      return; // Exit early - no need to create a new category
    }
    
    // If we get here, this is truly a new category
    // Generate a temporary local ID for the category (negative to avoid conflicts with real IDs)
    const tempId = category.id || (-(localCategories.length + 1));
    
    // Add to local categories array
    const newCategory = { ...category, id: tempId };
    setLocalCategories(prev => [...prev, newCategory]);
    
    // Set as selected category
    setSelectedCategory(tempId.toString());
    
    // Update form value
    form.setValue("categoryId", tempId, {
      shouldValidate: true,
      shouldDirty: true,
    });
    
    // Also update categoryName field for storing the text name
    form.setValue("categoryName", category.name as any, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Function to handle new location added
  const handleLocationAdded = (location: string) => {
    console.log("New location added:", location);
    
    // Check if location already exists (case-insensitive)
    const locationExists = locations.some(
      existingLocation => existingLocation.toLowerCase() === location.toLowerCase()
    );
    
    if (!locationExists) {
      // Add to locations array if it doesn't exist
      setLocations((prev) => [...prev, location]);
    }
    
    // Set as selected location
    setSelectedLocation(location);
    form.setValue("location", location, {
      shouldValidate: true,
      shouldDirty: true,
    });
  };

  // Steps for our form
  const steps = [
    {
      title: "Basic Information",
      description: "Title, description, and category",
    },
    {
      title: "Skills Required",
      description: "Add required skills for this lead",
    },
    { title: "Work Details", description: "Work type and duration" },
    { title: "Contact Information", description: "Contact details and images" },
    { title: "Review", description: "Review and submit your lead" },
  ];

  // Fetch all lead categories from server
  const { data: serverCategories = [], isLoading: isCategoriesLoading } = useQuery<
    LeadCategory[]
  >({
    queryKey: ["/api/lead-categories"],
  });
  
  // Combine server categories with locally added ones
  const categories = useMemo(() => {
    // Create a map for case-insensitive category tracking
    const categoryMap = new Map<string, any>();
    
    // First add all server categories to the map
    serverCategories.forEach(category => {
      const lowerName = category.name.toLowerCase();
      categoryMap.set(lowerName, category);
    });
    
    // Then add local categories that don't exist by name (case insensitive)
    localCategories.forEach(localCat => {
      const lowerName = localCat.name.toLowerCase();
      if (!categoryMap.has(lowerName)) {
        categoryMap.set(lowerName, localCat);
      }
    });
    
    // Convert map values back to array
    return Array.from(categoryMap.values());
  }, [serverCategories, localCategories]);

  // Fetch all leads to extract locations
  const { data: leads } = useQuery<any[]>({
    queryKey: ["/api/leads"],
  });

  // Extract locations from leads data when it changes
  useEffect(() => {
    if (leads && Array.isArray(leads)) {
      // Create a map for case-insensitive location deduplication
      const locationMap = new Map<string, string>();
      
      // Add locations to map with lowercase key for case-insensitive comparison
      leads.forEach(lead => {
        if (lead.location) {
          const lowerLocation = lead.location.toLowerCase();
          // Keep the original casing of the first occurrence
          if (!locationMap.has(lowerLocation)) {
            locationMap.set(lowerLocation, lead.location);
          }
        }
      });
      
      // Extract unique locations
      const uniqueLocations = Array.from(locationMap.values());
      setLocations(uniqueLocations);
    }
  }, [leads]);

  // Extend the schema with categoryName
  type ExtendedInsertLead = InsertLead & {
    categoryName?: string; // Store category name for custom categories
  };

  const form = useForm<ExtendedInsertLead>({
    resolver: zodResolver(insertLeadSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      price: 0,
      totalMembers: 1,
      email: "",
      contactNumber: "",
      images: [],
      skills: [],
      workType: "full_time",
      duration: "",
      categoryId: undefined,
      categoryName: "",
      ...defaultValues,
    },
    mode: "onChange", // Validate on change for better step validation
  });

  // Ensure form is properly initialized with defaultValues when in edit mode
  useEffect(() => {
    if (isEdit && defaultValues) {
      // Log the initial default values for debugging
      console.log("Initializing form with default values:", defaultValues);

      // Reset form with the defaultValues (omit null values)
      const cleanValues = Object.fromEntries(
        Object.entries(defaultValues).filter(
          ([_, value]) => value !== null && value !== undefined,
        ),
      );

      form.reset(cleanValues);

      // Explicitly set categoryId (even if it's 0)
      if (
        defaultValues.categoryId !== undefined &&
        defaultValues.categoryId !== null
      ) {
        console.log("Setting categoryId:", defaultValues.categoryId);
        form.setValue("categoryId", defaultValues.categoryId, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      // Explicitly set workType
      if (defaultValues.workType) {
        console.log("Setting workType:", defaultValues.workType);
        form.setValue("workType", defaultValues.workType, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      // Update skills state from defaultValues
      if (defaultValues.skills) {
        const skillsArray = Array.isArray(defaultValues.skills)
          ? defaultValues.skills
          : [];
        console.log("Setting skills:", skillsArray);
        setSkills(skillsArray);
        form.setValue("skills", skillsArray, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      // Update images state from defaultValues
      if (defaultValues.images) {
        const imagesArray = Array.isArray(defaultValues.images)
          ? defaultValues.images
          : [];
        console.log("Setting images:", imagesArray);
        setPreviewImages(imagesArray);
        form.setValue("images", imagesArray, {
          shouldValidate: true,
          shouldDirty: true,
        });
      }

      // Mark all steps as completed in edit mode
      const allSteps = Array.from({ length: steps.length - 1 }, (_, i) => i);
      setCompletedSteps(allSteps);
    }
  }, [defaultValues, isEdit, form, steps.length]);

  // Update the skills in the form when the skills array changes
  useEffect(() => {
    form.setValue("skills", skills, {
      shouldValidate: true,
      shouldDirty: true,
      shouldTouch: true,
    });
  }, [skills, form]);

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const newImageUrls: string[] = [];

    files.forEach((file) => {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast({
          variant: "destructive",
          title: "Invalid file type",
          description: "Please upload only image files (JPEG, PNG, etc.).",
        });
        return;
      }

      // Create a preview URL
      const fileUrl = URL.createObjectURL(file);
      newImageUrls.push(fileUrl);

      // Convert image to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;

        // Update form data with the new image
        const currentImages = form.getValues().images || [];
        form.setValue("images", [...currentImages, base64String]);
      };
      reader.readAsDataURL(file);
    });

    // Update preview images
    setPreviewImages((prev) => [...prev, ...newImageUrls]);
  };

  // Remove an image
  const removeImage = (index: number) => {
    // Remove from preview
    const newPreviews = [...previewImages];
    newPreviews.splice(index, 1);
    setPreviewImages(newPreviews);

    // Remove from form data
    const currentImages = form.getValues().images || [];
    const newImages = [...currentImages];
    newImages.splice(index, 1);
    form.setValue("images", newImages);
  };

  // Add a skill
  const addSkill = () => {
    if (!skill.trim()) return;

    // Prevent duplicate skills
    if (skills.includes(skill.trim())) {
      toast({
        variant: "destructive",
        title: "Duplicate skill",
        description: "This skill has already been added.",
      });
      return;
    }

    setSkills((prev) => [...prev, skill.trim()]);
    setSkill("");
  };

  // Remove a skill
  const removeSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove));
  };

  // Check if current step is valid
  const isStepValid = async () => {
    let valid = true;

    switch (currentStep) {
      case 0: // Basic Information
        valid = await form.trigger(["title", "description", "categoryId"]);
        break;
      case 1: // Skills
        // Skills step is always valid, as skills are optional
        valid = true;
        break;
      case 2: // Work Details
        valid = await form.trigger(["workType", "duration"]);
        break;
      case 3: // Contact Information
        valid = await form.trigger([
          "location",
          "price",
          "totalMembers",
          "email",
          "contactNumber",
        ]);
        break;
      case 4: // Review
        valid = await form.trigger(); // Validate all fields
        break;
    }

    return valid;
  };

  // Move to next step
  const nextStep = async () => {
    const isValid = await isStepValid();

    if (!isValid) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Please fill out all required fields correctly.",
      });
      return;
    }

    // Mark current step as completed
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps((prev) => [...prev, currentStep]);
    }

    // Move to next step if not at the end
    if (currentStep < steps.length - 1) {
      setCurrentStep((prev) => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  // Move to previous step
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
      window.scrollTo(0, 0);
    }
  };

  // Navigate to a specific step
  const goToStep = (step: number) => {
    // Only allow navigating to completed steps or the current step + 1
    if (
      completedSteps.includes(step) ||
      step === currentStep ||
      step === Math.min(currentStep + 1, steps.length - 1)
    ) {
      setCurrentStep(step);
      window.scrollTo(0, 0);
    }
  };

  // Handle form submission
  // We're typing this as any to avoid TypeScript errors with react-hook-form
  // This is a workaround for the complex form type
  async function onSubmit(data: any) {
    setIsLoading(true);

    try {
      // Process the form data before submission
      const processedData: any = { ...data };
      
      // If we're using a custom category (negative ID), send the name as a property
      // The server will check for this and create a new category if needed
      if (data.categoryId && data.categoryId < 0 && data.categoryName) {
        // Since the server doesn't know about our custom categories yet,
        // we'll attach the category name to the description temporarily
        // The server will extract this and create a new category
        processedData.categoryName = data.categoryName;
      }
      
      if (isEdit && leadId) {
        await apiRequest("PATCH", `/api/leads/${leadId}`, processedData);
        toast({
          title: "Lead updated",
          description: "The lead has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/leads", processedData);
        toast({
          title: "Lead created",
          description: "The lead has been created successfully.",
        });
      }

      // Invalidate leads queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/leads"] });

      // Reset form if it's a new lead
      if (!isEdit) {
        form.reset();
        setPreviewImages([]);
        setSkills([]);
        setCurrentStep(0);
        setCompletedSteps([]);
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to save lead. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Handle special case for "other" option in location dropdown
  useEffect(() => {
    if (selectedLocation === "other") {
      setIsLocationModalOpen(true);
      // Reset to previous selection to avoid "other" appearing as the selected location
      setSelectedLocation("");
    }
  }, [selectedLocation]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* Modals */}
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategoryAdded}
      />

      <AddLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={handleLocationAdded}
        existingLocations={locations}
      />

      {/* Left sidebar for steps */}
      <div className="lg:col-span-1 mb-4 lg:mb-0">
        <Card className="sticky top-20">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Create Lead</CardTitle>
            <CardDescription>
              Step {currentStep + 1} of {steps.length}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 pt-0">
            {steps.map((step, index) => (
              <StepIndicator
                key={index}
                title={step.title}
                description={step.description}
                isActive={currentStep === index}
                isCompleted={completedSteps.includes(index)}
                onClick={() => goToStep(index)}
              />
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Main form area */}
      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>{steps[currentStep].title}</CardTitle>
            <CardDescription>{steps[currentStep].description}</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-4">
                {/* Step 1: Basic Information */}
                {currentStep === 0 && (
                  <>
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Lead title"
                              {...field}
                              disabled={isLoading}
                            />
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
                              placeholder="Detailed description of the lead"
                              className="min-h-[150px]"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="categoryId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <div className="space-y-2">
                            <Select
                              disabled={isLoading || isCategoriesLoading}
                              /* onValueChange={(value) =>
                                field.onChange(Number(value))
                              } */
                              onValueChange={(value) => {
                                if (value === "other") {
                                  // Open the location modal when "Add New Location..." is selected
                                  setIsCategoryModalOpen(true);
                                } else {
                                  // setSelectedLocation(value);
                                  field.onChange(Number(value));
                                }
                              }}
                              value={
                                field.value ? String(field.value) : undefined
                              }
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select a category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {categories?.map((category) => (
                                  <SelectItem
                                    key={category.id}
                                    value={String(category.id)}
                                  >
                                    {category.name}
                                  </SelectItem>
                                ))}
                                <SelectItem value="other">
                                  Add New Categories...
                                </SelectItem>
                              </SelectContent>
                            </Select>

                            {/* {canAddCategory && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="mt-1 text-xs"
                                onClick={() => setIsCategoryModalOpen(true)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add New Category
                              </Button>
                            )} */}
                          </div>
                          <FormDescription>
                            Categorize this lead to help users find it easily
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 2: Skills */}
                {currentStep === 1 && (
                  <div className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter a skill"
                        value={skill}
                        onChange={(e) => setSkill(e.target.value)}
                        onKeyDown={(e) =>
                          e.key === "Enter" && (e.preventDefault(), addSkill())
                        }
                        disabled={isLoading}
                      />
                      <Button
                        type="button"
                        onClick={addSkill}
                        disabled={isLoading || !skill.trim()}
                      >
                        Add
                      </Button>
                    </div>

                    <FormDescription>
                      Press Enter or click Add to add a skill. Add as many
                      skills as required for this lead.
                    </FormDescription>

                    {skills.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-medium mb-2">
                          Added Skills:
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((skill, index) => (
                            <Badge
                              key={index}
                              variant="secondary"
                              className="py-1 px-3"
                            >
                              {skill}
                              <X
                                className="ml-1 h-3 w-3 cursor-pointer"
                                onClick={() => removeSkill(skill)}
                              />
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {skills.length === 0 && (
                      <div className="p-8 text-center border border-dashed rounded-md">
                        <p className="text-muted-foreground">
                          No skills added yet. Add skills to help users
                          understand the requirements.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Step 3: Work Type & Duration */}
                {currentStep === 2 && (
                  <>
                    <FormField
                      control={form.control}
                      name="workType"
                      render={({ field }) => (
                        <FormItem className="space-y-3">
                          <FormLabel>Work Type</FormLabel>
                          <FormControl>
                            <RadioGroup
                              onValueChange={field.onChange}
                              value={field.value}
                              className="flex flex-col space-y-1"
                            >
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="full_time"
                                  id="full_time"
                                />
                                <label
                                  htmlFor="full_time"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Full-Time
                                </label>
                              </div>
                              <div className="flex items-center space-x-2">
                                <RadioGroupItem
                                  value="part_time"
                                  id="part_time"
                                />
                                <label
                                  htmlFor="part_time"
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                >
                                  Part-Time
                                </label>
                              </div>
                            </RadioGroup>
                          </FormControl>
                          <FormDescription>
                            Select the type of work required for this lead.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="duration"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Work Duration</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 3 months, 1 year, Ongoing"
                              {...field}
                              disabled={isLoading}
                            />
                          </FormControl>
                          <FormDescription>
                            Specify how long the work is expected to last.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 4: Contact Information */}
                {currentStep === 3 && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="location"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Location</FormLabel>
                            <div className="space-y-2">
                              {locations.length > 0 ? (
                                <Select
                                  disabled={isLoading}
                                  onValueChange={(value) => {
                                    if (value === "other") {
                                      // Open the location modal when "Add New Location..." is selected
                                      setIsLocationModalOpen(true);
                                    } else {
                                      setSelectedLocation(value);
                                      field.onChange(value);
                                    }
                                  }}
                                  value={field.value || selectedLocation}
                                >
                                  <FormControl>
                                    <SelectTrigger>
                                      <SelectValue placeholder="Select a location" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    {locations.map((location) => (
                                      <SelectItem
                                        key={location}
                                        value={location}
                                      >
                                        {location}
                                      </SelectItem>
                                    ))}
                                    <SelectItem value="other">
                                      Add New Location...
                                    </SelectItem>
                                  </SelectContent>
                                </Select>
                              ) : (
                                <FormControl>
                                  <Input
                                    placeholder="City, Country"
                                    {...field}
                                    disabled={isLoading}
                                  />
                                </FormControl>
                              )}

                              {/* <Button 
                                type="button" 
                                variant="outline" 
                                size="sm"
                                className="mt-1 text-xs"
                                onClick={() => setIsLocationModalOpen(true)}
                              >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Add New Location
                              </Button> */}
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="price"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Price</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="0"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="totalMembers"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total Members</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                placeholder="1"
                                {...field}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value))
                                }
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Email</FormLabel>
                            <FormControl>
                              <Input
                                type="email"
                                placeholder="contact@example.com"
                                {...field}
                                disabled={isLoading}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="contactNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Contact Phone</FormLabel>
                            <FormControl>
                              <Input
                                type="tel"
                                placeholder="10 digit number"
                                maxLength={10}
                                {...field}
                                disabled={isLoading}
                                onKeyPress={(e) => {
                                  // Allow only numeric input
                                  if (!/[0-9]/.test(e.key)) {
                                    e.preventDefault();
                                  }
                                }}
                                onChange={(e) => {
                                  // Remove any non-numeric characters
                                  const value = e.target.value.replace(
                                    /\D/g,
                                    "",
                                  );
                                  field.onChange(value);
                                }}
                              />
                            </FormControl>
                            <FormDescription>
                              Phone number must be exactly 10 digits
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="images"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Lead Images</FormLabel>
                          <FormControl>
                            <div className="space-y-4">
                              {/* Image Preview Area */}
                              {previewImages.length > 0 && (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                  {previewImages.map((image, index) => (
                                    <div
                                      key={index}
                                      className="relative group border rounded-md overflow-hidden"
                                    >
                                      <img
                                        src={image}
                                        alt={`Lead image ${index + 1}`}
                                        className="w-full h-32 object-cover"
                                      />
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        className="absolute top-2 right-2 h-6 w-6 opacity-80 hover:opacity-100"
                                        onClick={() => removeImage(index)}
                                        disabled={isLoading}
                                      >
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Upload Button */}
                              <div
                                onClick={() => fileInputRef.current?.click()}
                                className={`border-2 border-dashed rounded-md p-6 text-center cursor-pointer transition-colors hover:border-primary ${
                                  isLoading
                                    ? "opacity-50 cursor-not-allowed"
                                    : ""
                                }`}
                              >
                                <input
                                  type="file"
                                  ref={fileInputRef}
                                  accept="image/*"
                                  multiple
                                  onChange={handleImageUpload}
                                  disabled={isLoading}
                                  className="hidden"
                                />
                                <div className="flex flex-col items-center gap-2">
                                  <Upload className="h-8 w-8 text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">
                                    <span className="font-medium text-primary">
                                      Click to upload
                                    </span>{" "}
                                    or drag and drop
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    PNG, JPG or GIF (max 5MB)
                                  </p>
                                </div>
                              </div>
                            </div>
                          </FormControl>
                          <FormDescription>
                            Upload images to showcase this lead. This will help
                            attract more interest.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {/* Step 5: Review */}
                {currentStep === 4 && (
                  <div className="space-y-6">
                    <div className="text-center mb-4">
                      <h3 className="text-lg font-medium">Review Your Lead</h3>
                      <p className="text-muted-foreground">
                        Please review all details before submitting
                      </p>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Basic Information
                        </h4>
                        <div className="bg-muted/50 rounded-md p-3">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Title:
                            </span>
                            <span className="text-sm col-span-2 font-medium">
                              {form.getValues().title}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Description:
                            </span>
                            <p className="text-sm col-span-2">
                              {form.getValues().description}
                            </p>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-xs text-muted-foreground">
                              Category:
                            </span>
                            <span className="text-sm col-span-2">
                              {categories?.find(
                                (c) => c.id === form.getValues().categoryId,
                              )?.name || "Not specified"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Skills Required
                        </h4>
                        <div className="bg-muted/50 rounded-md p-3">
                          {skills.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {skills.map((skill, index) => (
                                <Badge key={index} variant="outline">
                                  {skill}
                                </Badge>
                              ))}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">
                              No skills specified
                            </span>
                          )}
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Work Details
                        </h4>
                        <div className="bg-muted/50 rounded-md p-3">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Work Type:
                            </span>
                            <span className="text-sm col-span-2 capitalize">
                              {form.getValues().workType === "full_time"
                                ? "Full-Time"
                                : "Part-Time"}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-xs text-muted-foreground">
                              Duration:
                            </span>
                            <span className="text-sm col-span-2">
                              {form.getValues().duration}
                            </span>
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <h4 className="text-sm font-medium mb-2">
                          Contact Information
                        </h4>
                        <div className="bg-muted/50 rounded-md p-3">
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Location:
                            </span>
                            <span className="text-sm col-span-2">
                              {form.getValues().location}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Price:
                            </span>
                            <span className="text-sm col-span-2">
                              ${form.getValues().price}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Total Members:
                            </span>
                            <span className="text-sm col-span-2">
                              {form.getValues().totalMembers}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 mb-2">
                            <span className="text-xs text-muted-foreground">
                              Email:
                            </span>
                            <span className="text-sm col-span-2">
                              {form.getValues().email}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2">
                            <span className="text-xs text-muted-foreground">
                              Phone:
                            </span>
                            <span className="text-sm col-span-2">
                              {form.getValues().contactNumber}
                            </span>
                          </div>
                        </div>
                      </div>

                      {previewImages.length > 0 && (
                        <>
                          <Separator />
                          <div>
                            <h4 className="text-sm font-medium mb-2">Images</h4>
                            <div className="grid grid-cols-3 gap-2">
                              {previewImages.map((image, index) => (
                                <div
                                  key={index}
                                  className="border rounded-md overflow-hidden"
                                >
                                  <img
                                    src={image}
                                    alt={`Lead image ${index + 1}`}
                                    className="w-full h-20 object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-between">
                <div>
                  {currentStep > 0 && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={prevStep}
                      disabled={isLoading}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                  )}
                </div>
                <div>
                  {currentStep < steps.length - 1 ? (
                    <Button
                      type="button"
                      onClick={nextStep}
                      disabled={isLoading}
                      className="gap-1"
                    >
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button" // Changed from "submit" to "button" to prevent automatic submission
                      onClick={form.handleSubmit(onSubmit)} // Manually trigger submission on click
                      disabled={isLoading}
                      className="gap-1 bg-green-600 hover:bg-green-700"
                    >
                      {isLoading
                        ? "Submitting..."
                        : isEdit
                          ? "Update Lead"
                          : "Create Lead"}
                      <Send className="h-4 w-4 ml-1" />
                    </Button>
                  )}
                </div>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>

      {/* Add Category Modal */}
      <AddCategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSuccess={handleCategoryAdded}
      />

      {/* Add Location Modal */}
      <AddLocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSuccess={handleLocationAdded}
        existingLocations={locations}
      />
    </div>
  );
}
