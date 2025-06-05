import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Category schema with validation
const categorySchema = z.object({
  name: z
    .string()
    .min(2, "Category name must be at least 2 characters")
    .max(50, "Category name must be less than 50 characters")
    .refine(
      (value) => /^[a-zA-Z0-9\s-]+$/.test(value),
      "Category name should only contain letters, numbers, spaces, and hyphens"
    ),
  description: z
    .string()
    .max(200, "Description must be less than 200 characters")
    .optional()
    .or(z.literal(''))
});

type CategoryFormData = z.infer<typeof categorySchema>;

interface CategoryData {
  id?: number;
  name: string;
  description?: string;
}

interface AddCategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (category: CategoryData) => void;
  existingCategories?: CategoryData[];
}

export function AddCategoryModal({ 
  isOpen, 
  onClose,
  onSuccess,
  existingCategories = [] 
}: AddCategoryModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: ""
    }
  });

  async function onSubmit(data: CategoryFormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      // Check if category already exists
      if (existingCategories.some(c => c.name.toLowerCase() === data.name.toLowerCase())) {
        setError("This category already exists");
        setIsSubmitting(false);
        return;
      }

      // No need to save to the database - we'll use this value in the lead form
      // When the lead is saved, it will include the category
      const newCategory: CategoryData = {
        name: data.name,
        description: data.description || ""
      };

      toast({
        title: "Category added",
        description: `${data.name} has been added to the categories list`,
      });

      if (onSuccess) {
        onSuccess(newCategory);
      }

      form.reset();
      onClose();
    } catch (err) {
      console.error("Error adding category:", err);
      setError("Failed to add category. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Category</DialogTitle>
          <DialogDescription>
            Create a new category to use in your leads.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category Name</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. Web Development"
                      {...field}
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
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="A short description of the category"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Adding..." : "Add Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}