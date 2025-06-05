import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { type LeadCategory } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MainLayout } from "@/components/layout/main-layout";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { showSuccess, showError, confirmDelete } from "@/lib/sweet-alert";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const categoryFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(50, "Name cannot exceed 50 characters"),
  description: z
    .string()
    .min(5, "Description must be at least 5 characters")
    .max(500, "Description cannot exceed 500 characters"),
  active: z.boolean().default(true),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

export default function LeadCategoriesPage() {
  const { toast } = useToast();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<LeadCategory | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch all categories
  const {
    data: categories,
    isLoading,
    error,
    refetch,
  } = useQuery<LeadCategory[]>({
    queryKey: ["/api/lead-categories"],
  });

  // Form for adding new category
  const addForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  // Form for editing existing category
  const editForm = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      active: true,
    },
  });

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const response = await apiRequest("POST", "/api/lead-categories", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-categories"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/active"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/used"],
      });
      setIsAddDialogOpen(false);
      addForm.reset();
      showSuccess(
        "Category Created",
        "The category has been created successfully.",
      );
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (data: CategoryFormValues & { id: number }) => {
      const { id, ...categoryData } = data;
      const response = await apiRequest(
        "PATCH",
        `/api/lead-categories/${id}`,
        categoryData,
      );
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to update category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-categories"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/active"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/used"],
      });
      setIsEditDialogOpen(false);
      editForm.reset();
      showSuccess(
        "Category Updated",
        "The category has been updated successfully.",
      );
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/lead-categories/${id}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete category");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/lead-categories"] });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/active"],
      });
      queryClient.invalidateQueries({
        queryKey: ["/api/lead-categories/used"],
      });
      showSuccess(
        "Category Deleted",
        "The category has been deleted successfully.",
      );
    },
    onError: (error: Error) => {
      showError("Error", error.message);
    },
    onSettled: () => {
      setIsDeleting(false);
    },
  });

  // Handle adding a new category
  const onAddSubmit = (data: CategoryFormValues) => {
    createMutation.mutate(data);
  };

  // Handle editing a category
  const onEditSubmit = (data: CategoryFormValues) => {
    if (!selectedCategory) return;
    updateMutation.mutate({
      id: selectedCategory.id,
      ...data,
    });
  };

  // Open edit dialog and populate form with category data
  const handleEditClick = (category: LeadCategory) => {
    setSelectedCategory(category);
    editForm.reset({
      name: category.name,
      description: category.description || "",
      active: category.active,
    });
    setIsEditDialogOpen(true);
  };

  // Handle category deletion
  const handleDeleteClick = async (category: LeadCategory) => {
    const confirmed = await confirmDelete(
      "Delete Category",
      `Are you sure you want to delete "${category.name}"? This action cannot be undone.`,
    );

    if (confirmed) {
      setIsDeleting(true);
      deleteMutation.mutate(category.id);
    }
  };

  // Toggle category active status
  const handleToggleActive = (category: LeadCategory) => {
    updateMutation.mutate({
      id: category.id,
      name: category.name,
      description: category.description || "",
      active: !category.active,
    });
  };

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-6 p-6">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-blue-800">Lead Categories</h1>
            <div className="w-[120px] h-10"></div> {/* Placeholder for button */}
          </div>
          
          <TableSkeleton 
            rowCount={5}
            columnCount={4}
            showHeader={true}
            showActions={true}
          />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <div className="space-y-4 p-6">
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">
              Error Loading Categories
            </CardTitle>
            <CardDescription>
              There was an error loading the lead categories. Please try again
              later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6 p-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-blue-800">Lead Categories</h1>
          <Button
            onClick={() => setIsAddDialogOpen(true)}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Category
          </Button>
        </div>

        <Card className="border-blue-100 shadow-sm">
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-blue-50">
                <TableRow>
                  <TableHead className="text-blue-800">Name</TableHead>
                  <TableHead className="text-blue-800">Description</TableHead>
                  <TableHead className="text-blue-800 text-center">
                    Status
                  </TableHead>
                  <TableHead className="text-blue-800 text-right">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories && categories.length > 0 ? (
                  categories.map((category) => (
                    <TableRow key={category.id} className="hover:bg-blue-50/40">
                      <TableCell className="font-medium">
                        {category.name}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <p className="truncate">{category.description}</p>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex justify-center items-center">
                          <Switch
                            checked={category.active}
                            onCheckedChange={() => handleToggleActive(category)}
                            className="data-[state=checked]:bg-green-500"
                          />
                          <span className="ml-2 text-sm">
                            {category.active ? (
                              <span className="text-green-600">Active</span>
                            ) : (
                              <span className="text-gray-500">Inactive</span>
                            )}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditClick(category)}
                            className="border-blue-200 text-blue-700 hover:bg-blue-50"
                          >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit</span>
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteClick(category)}
                            className="border-red-200 text-red-700 hover:bg-red-50"
                            disabled={isDeleting}
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={4}
                      className="text-center py-10 text-gray-500"
                    >
                      No categories found. Create your first category by
                      clicking the "Add Category" button.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Add Category Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-blue-800">
                Add New Category
              </DialogTitle>
              <DialogDescription>
                Create a new lead category. Categories help organize and filter
                leads.
              </DialogDescription>
            </DialogHeader>
            <Form {...addForm}>
              <form
                onSubmit={addForm.handleSubmit(onAddSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={addForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Category name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Category description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={addForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <CardDescription className="text-xs mt-1">
                          Set whether this category is active and available for
                          leads
                        </CardDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddDialogOpen(false)}
                    className="border-blue-200 text-blue-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={createMutation.isPending}
                  >
                    {createMutation.isPending
                      ? "Creating..."
                      : "Create Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Category Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="text-blue-800">Edit Category</DialogTitle>
              <DialogDescription>
                Update the category details.
              </DialogDescription>
            </DialogHeader>
            <Form {...editForm}>
              <form
                onSubmit={editForm.handleSubmit(onEditSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={editForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Category name" />
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
                        <Input {...field} placeholder="Category description" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={editForm.control}
                  name="active"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                      <div className="space-y-0.5">
                        <FormLabel>Active Status</FormLabel>
                        <CardDescription className="text-xs mt-1">
                          Set whether this category is active and available for
                          leads
                        </CardDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsEditDialogOpen(false)}
                    className="border-blue-200 text-blue-700"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending
                      ? "Updating..."
                      : "Update Category"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>
    </MainLayout>
  );
}
