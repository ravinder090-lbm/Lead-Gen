import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useRef, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { insertLeadSchema, type InsertLead, type LeadCategory } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { X, Upload, Image as ImageIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";

interface LeadFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<InsertLead>;
  isEdit?: boolean;
  leadId?: number;
}

export function LeadForm({ onSuccess, defaultValues, isEdit = false, leadId }: LeadFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  // Initialize previewImages with default values if editing an existing lead
  const [previewImages, setPreviewImages] = useState<string[]>(() => {
    if (isEdit && defaultValues?.images && Array.isArray(defaultValues.images)) {
      return defaultValues.images as string[];
    }
    return [];
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Fetch lead categories
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<LeadCategory[]>({
    queryKey: ['/api/lead-categories/active'],
  });

  const form = useForm<InsertLead>({
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
      ...defaultValues,
    },
  });

  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const files = Array.from(e.target.files);
    const newImageUrls: string[] = [];
    
    files.forEach(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
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
        form.setValue('images', [...currentImages, base64String]);
      };
      reader.readAsDataURL(file);
    });
    
    // Update preview images
    setPreviewImages(prev => [...prev, ...newImageUrls]);
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
    form.setValue('images', newImages);
  };

  async function onSubmit(data: InsertLead) {
    setIsLoading(true);

    try {
      if (isEdit && leadId) {
        await apiRequest("PATCH", `/api/leads/${leadId}`, data);
        toast({
          title: "Lead updated",
          description: "The lead has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/leads", data);
        toast({
          title: "Lead created",
          description: "The lead has been created successfully.",
        });
      }

      // Invalidate leads queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/leads'] });
      
      // Reset form if it's a new lead
      if (!isEdit) {
        form.reset();
        setPreviewImages([]);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>{isEdit ? "Edit Lead" : "Create New Lead"}</CardTitle>
        <CardDescription>
          {isEdit 
            ? "Update the details of this lead" 
            : "Enter the details of the new lead"
          }
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Lead title" {...field} disabled={isLoading} />
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
                      className="min-h-[100px]" 
                      {...field} 
                      disabled={isLoading} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input placeholder="City, Country" {...field} disabled={isLoading} />
                    </FormControl>
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
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        disabled={isLoading} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      disabled={isLoading || isCategoriesLoading}
                      onValueChange={(value) => field.onChange(Number(value))}
                      value={field.value ? String(field.value) : undefined}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories?.map((category) => (
                          <SelectItem key={category.id} value={String(category.id)}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Categorize this lead to help users find it easily
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="contact@example.com" {...field} disabled={isLoading} />
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
                          const value = e.target.value.replace(/\D/g, '');
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
                          isLoading ? "opacity-50 cursor-not-allowed" : ""
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
                            <span className="font-medium text-primary">Click to upload</span> or drag
                            and drop
                          </p>
                          <p className="text-xs text-muted-foreground">
                            PNG, JPG or GIF (max 5MB)
                          </p>
                        </div>
                      </div>
                    </div>
                  </FormControl>
                  <FormDescription>
                    Upload images to showcase this lead. This will help attract more interest.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onSuccess?.()}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? "Saving..." : isEdit ? "Update Lead" : "Create Lead"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
