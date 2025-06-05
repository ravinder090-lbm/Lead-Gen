import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
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
  insertSupportTicketSchema,
  type InsertSupportTicket,
} from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface TicketFormProps {
  onSuccess?: () => void;
  defaultValues?: Partial<InsertSupportTicket>;
  isEdit?: boolean;
  ticketId?: number;
}

export function TicketForm({
  onSuccess,
  defaultValues,
  isEdit = false,
  ticketId,
}: TicketFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<InsertSupportTicket>({
    resolver: zodResolver(insertSupportTicketSchema),
    defaultValues: {
      subject: "",
      message: "",
      ...defaultValues,
    },
  });

  async function onSubmit(data: InsertSupportTicket) {
    setIsLoading(true);

    try {
      if (isEdit && ticketId) {
        await apiRequest("PATCH", `/api/support/${ticketId}`, data);
        toast({
          title: "Ticket updated",
          description: "The support ticket has been updated successfully.",
        });
      } else {
        await apiRequest("POST", "/api/support", data);
        toast({
          title: "Ticket created",
          description: "Your support ticket has been submitted successfully.",
        });
      }

      // Invalidate support queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/support"] });

      // Reset form if it's a new ticket
      if (!isEdit) {
        form.reset();
      }

      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description:
          error.message || "Failed to save support ticket. Please try again.",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {isEdit ? "Edit Support Ticket" : "Create Support Ticket"}
        </CardTitle>
        <CardDescription>
          {isEdit
            ? "Update your support ticket"
            : "Submit a new support ticket to get help from our team"}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the issue"
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
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Message</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Detailed description of the issue you're facing"
                      className="min-h-[150px]"
                      {...field}
                      disabled={isLoading}
                    />
                  </FormControl>
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
            <Button type="submit" disabled={isLoading}>
              {isLoading
                ? "Submitting..."
                : isEdit
                  ? "Update Ticket"
                  : "Submit Ticket"}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
