import { Skeleton } from "@/components/ui/skeleton";

export function LoginSkeleton() {
  return (
    <div className="mx-auto max-w-md space-y-6 p-6 border rounded-lg shadow-md">
      {/* Logo/Header */}
      <div className="text-center space-y-2">
        <Skeleton className="h-12 w-12 mx-auto rounded-full" />
        <Skeleton className="h-7 w-[200px] mx-auto" />
        <Skeleton className="h-4 w-[250px] mx-auto" />
      </div>
      
      {/* Login form */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-5 w-[80px]" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="space-y-2">
          <Skeleton className="h-5 w-[100px]" />
          <Skeleton className="h-10 w-full" />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-[100px]" />
          </div>
          <Skeleton className="h-4 w-[120px]" />
        </div>
        
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Divider */}
      <div className="relative my-6">
        <Skeleton className="h-px w-full absolute top-1/2" />
        <div className="relative flex justify-center">
          <Skeleton className="h-6 w-10 bg-background" />
        </div>
      </div>
      
      {/* Social login buttons */}
      <div className="space-y-3">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
      
      {/* Footer */}
      <div className="text-center">
        <Skeleton className="h-4 w-[200px] mx-auto" />
      </div>
    </div>
  );
}