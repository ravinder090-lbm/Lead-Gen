import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Location schema with validation
const locationSchema = z.object({
  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(100, "Location must be less than 100 characters")
    .refine(
      (value) => /^[a-zA-Z\s,.-]+$/.test(value),
      "Location should only contain letters, spaces, commas, periods, and hyphens"
    ),
});

type LocationFormData = z.infer<typeof locationSchema>;

interface AddLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (location: string) => void;
  existingLocations?: string[];
}

export function AddLocationModal({ 
  isOpen, 
  onClose,
  onSuccess,
  existingLocations = [] 
}: AddLocationModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      location: "",
    },
  });

  async function onSubmit(data: LocationFormData) {
    setError(null);
    setIsSubmitting(true);

    try {
      // Check if location already exists (case-insensitive)
      const locationLower = data.location.toLowerCase();
      if (existingLocations.some(loc => loc.toLowerCase() === locationLower)) {
        setError("This location already exists");
        setIsSubmitting(false);
        return;
      }

      // No need to save to the database - we'll use this value in the lead form
      // When the lead is saved, the location will be saved with it

      toast({
        title: "Location added",
        description: `${data.location} has been added to the locations list`,
      });

      if (onSuccess) {
        onSuccess(data.location);
      }

      form.reset();
      onClose();
    } catch (err) {
      console.error("Error adding location:", err);
      setError("Failed to add location. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Location</DialogTitle>
          <DialogDescription>
            Create a new location to use in your leads.
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
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g. New York, USA"
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
                {isSubmitting ? "Adding..." : "Add Location"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}