import { Skeleton } from "@/components/ui/skeleton";

interface CardSkeletonProps {
  count?: number;
  layout?: "grid" | "list" | "vertical";
  withImage?: boolean;
  withActions?: boolean;
  withFeatures?: boolean;
  featureCount?: number;
  withFooterAction?: boolean;
}

export function CardSkeleton({
  count = 3,
  layout = "grid",
  withImage = false,
  withActions = true,
  withFeatures = false,
  featureCount = 3,
  withFooterAction = false
}: CardSkeletonProps) {
  // Determine the container layout class
  const containerClass = 
    layout === "grid" 
      ? "grid gap-4 md:grid-cols-2 lg:grid-cols-3" 
      : layout === "vertical" 
        ? "max-w-md mx-auto space-y-4"
        : "space-y-4";
  
  return (
    <div className={containerClass}>
      
      {Array(count).fill(0).map((_, i) => (
        <div key={i} className="rounded-lg border shadow-sm p-5 space-y-4">
          {/* Card Header */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <Skeleton className="h-6 w-[150px]" />
              <Skeleton className="h-4 w-[100px]" />
            </div>
            {withActions && (
              <Skeleton className="h-8 w-8 rounded-full" />
            )}
          </div>
          
          {/* Card Content */}
          <div className="space-y-3">
            {withImage && (
              <Skeleton className="h-[120px] w-full rounded-md" />
            )}
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-[80%]" />
            <Skeleton className="h-4 w-[60%]" />
            
            {/* Features list for subscription cards */}
            {withFeatures && (
              <div className="space-y-2 mt-4">
                {Array(featureCount).fill(0).map((_, i) => (
                  <div key={i} className="flex items-center">
                    <Skeleton className="h-4 w-4 mr-2 rounded-full" />
                    <Skeleton className="h-4 flex-1" />
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Card Footer */}
          <div className="flex justify-between items-center pt-2">
            <Skeleton className="h-6 w-[80px]" />
            {withActions && (
              <div className="flex space-x-2">
                <Skeleton className="h-9 w-[80px]" />
                <Skeleton className="h-9 w-[80px]" />
              </div>
            )}
            {withFooterAction && !withActions && (
              <Skeleton className="h-9 w-full" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
}