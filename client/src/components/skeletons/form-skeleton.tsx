import { Skeleton } from "@/components/ui/skeleton";

interface FormSkeletonProps {
  fields?: number;
  showButtons?: boolean;
  showTitle?: boolean;
}

export function FormSkeleton({
  fields = 4,
  showButtons = true,
  showTitle = true
}: FormSkeletonProps) {
  return (
    <div className="space-y-6 py-4 max-w-3xl mx-auto">
      {showTitle && (
        <div className="space-y-2 mb-6">
          <Skeleton className="h-8 w-[200px]" />
          <Skeleton className="h-4 w-[300px]" />
        </div>
      )}
      
      <div className="space-y-6">
        {Array(fields).fill(0).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-[120px]" />
            <Skeleton className="h-10 w-full" />
            {i % 3 === 0 && <Skeleton className="h-4 w-[250px]" />}
          </div>
        ))}
      </div>
      
      {showButtons && (
        <div className="flex justify-end space-x-2 pt-4">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      )}
    </div>
  );
}