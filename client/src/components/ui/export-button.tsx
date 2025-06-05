import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ExportButtonProps {
  endpoint: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary" | "ghost" | "link" | "destructive";
}

export function ExportButton({
  endpoint,
  label = "Export CSV",
  className,
  variant = "default",
}: ExportButtonProps) {
  const { toast } = useToast();

  const handleExport = async () => {
    try {
      // Show loading toast
      toast({
        title: "Exporting data",
        description: "Preparing your export...",
      });

      // Make a direct request to the endpoint
      const response = await fetch(endpoint);
      
      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }
      
      // Check if response is CSV
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("text/csv")) {
        // Get the filename from Content-Disposition header or use a default
        const contentDisposition = response.headers.get("content-disposition") || "";
        const filenameMatch = contentDisposition.match(/filename="?([^"]+)"?/);
        const filename = filenameMatch ? filenameMatch[1] : "export.csv";
        
        // Convert response to blob
        const blob = await response.blob();
        
        // Create a download link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success toast
        toast({
          title: "Export successful",
          description: "Your data has been exported successfully",
          variant: "default",
        });
      } else {
        // Handle JSON error response
        const errorData = await response.json();
        throw new Error(errorData.message || "Export failed");
      }
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export failed",
        description: error instanceof Error ? error.message : "Failed to export data",
        variant: "destructive",
      });
    }
  };

  return (
    <Button 
      onClick={handleExport} 
      variant={variant}
      className={cn("flex items-center gap-1", className)}
    >
      <Download className="w-4 h-4" />
      {label}
    </Button>
  );
}