import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { type User } from "@shared/schema";
import { Coins } from "lucide-react";

const sendCoinsSchema = z.object({
  amount: z.number().min(1, { message: "Amount must be at least 1 coin" }),
  description: z.string().min(1, { message: "Description is required" }).default("Admin Top-up"),
});

type SendCoinsForm = z.infer<typeof sendCoinsSchema>;

interface SendCoinsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
}

export function SendCoinsModal({ isOpen, onClose, user }: SendCoinsModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<SendCoinsForm>({
    resolver: zodResolver(sendCoinsSchema),
    defaultValues: {
      amount: 1,
      description: "Admin Top-up",
    },
  });

  const sendCoinsMutation = useMutation({
    mutationFn: async (data: SendCoinsForm) => {
      if (!user) throw new Error("No user selected");
      return apiRequest("POST", `/api/users/${user.id}/send-coins`, data);
    },
    onSuccess: (response: any) => {
      toast({
        title: "Coins Sent Successfully",
        // description: `${response.amount} coins have been sent to ${response.recipient}`,
      });
      
      // Invalidate users query to refresh the table
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
      
      // Reset form and close modal
      form.reset();
      onClose();
    },
    onError: (error: any) => {
      toast({
        variant: "destructive",
        title: "Error Sending Coins",
        description: error.message || "Failed to send coins. Please try again.",
      });
    },
  });

  const handleSubmit = (data: SendCoinsForm) => {
    sendCoinsMutation.mutate(data);
  };

  const handleClose = () => {
    form.reset();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-yellow-500" />
            Send Coins to {user?.name}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center text-sm">
                <span className="text-gray-600">Recipient:</span>
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex justify-between items-center text-sm mt-2">
                <span className="text-gray-600">Current Balance:</span>
                <span className="font-medium">{user?.leadCoins} coins</span>
              </div>
            </div>

            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount of Coins</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="1"
                      placeholder="Enter number of coins"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
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
                      placeholder="Enter description for this transaction"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={sendCoinsMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={sendCoinsMutation.isPending}
                className="bg-yellow-500 hover:bg-yellow-600"
              >
                {sendCoinsMutation.isPending ? "Sending..." : "Send Coins"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}