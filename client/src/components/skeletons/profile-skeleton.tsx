import { Skeleton } from "@/components/ui/skeleton";

export function ProfileSkeleton() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header with avatar */}
      <div className="flex items-center space-x-4">
        <Skeleton className="h-20 w-20 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-[200px]" />
          <Skeleton className="h-5 w-[150px]" />
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 border rounded-lg">
            <Skeleton className="h-4 w-[80px] mb-2" />
            <Skeleton className="h-6 w-[60px]" />
          </div>
        ))}
      </div>
      
      {/* Profile details */}
      <div className="space-y-6">
        <Skeleton className="h-7 w-[150px]" />
        <div className="space-y-4 mt-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex justify-between border-b pb-3">
              <Skeleton className="h-5 w-[120px]" />
              <Skeleton className="h-5 w-[180px]" />
            </div>
          ))}
        </div>
      </div>
      
      {/* Actions */}
      <div className="flex justify-end space-x-3">
        <Skeleton className="h-10 w-[120px]" />
        <Skeleton className="h-10 w-[120px]" />
      </div>
    </div>
  );
}