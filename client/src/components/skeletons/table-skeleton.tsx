import { Skeleton } from "@/components/ui/skeleton";

interface TableSkeletonProps {
  rowCount?: number;
  columnCount?: number;
  showHeader?: boolean;
  showActions?: boolean;
}

export function TableSkeleton({
  rowCount = 5,
  columnCount = 4,
  showHeader = true,
  showActions = true
}: TableSkeletonProps) {
  return (
    <div className="w-full space-y-4">
      {/* Search and filters area */}
      <div className="flex justify-between items-center mb-4">
        <Skeleton className="h-10 w-[250px]" />
        <div className="flex space-x-2">
          <Skeleton className="h-10 w-[100px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
      </div>
      
      {/* Table */}
      <div className="rounded-md border">
        <div className="w-full">
          {/* Table header */}
          {showHeader && (
            <div className="border-b bg-muted px-4 py-3 grid" 
              style={{ gridTemplateColumns: showActions 
                ? `repeat(${columnCount}, 1fr) 80px` 
                : `repeat(${columnCount}, 1fr)` }}>
              {Array(columnCount).fill(0).map((_, i) => (
                <Skeleton key={`header-${i}`} className="h-6 w-full max-w-[120px]" />
              ))}
              {showActions && <Skeleton className="h-6 w-[60px]" />}
            </div>
          )}
          
          {/* Table rows */}
          <div>
            {Array(rowCount).fill(0).map((_, rowIndex) => (
              <div 
                key={`row-${rowIndex}`} 
                className="border-b px-4 py-4 grid items-center" 
                style={{ gridTemplateColumns: showActions 
                  ? `repeat(${columnCount}, 1fr) 80px` 
                  : `repeat(${columnCount}, 1fr)` }}>
                {Array(columnCount).fill(0).map((_, colIndex) => (
                  <Skeleton 
                    key={`cell-${rowIndex}-${colIndex}`} 
                    className={`h-6 w-${colIndex === 0 ? 'full' : '[80%]'}`} />
                ))}
                {showActions && (
                  <div className="flex space-x-2 justify-end">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Pagination */}
      <div className="flex items-center justify-between py-2">
        <Skeleton className="h-8 w-[100px]" />
        <div className="flex items-center space-x-2">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
      </div>
    </div>
  );
}