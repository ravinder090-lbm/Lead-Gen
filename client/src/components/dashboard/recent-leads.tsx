import { useQuery } from "@tanstack/react-query";
import { LeadCard } from "@/components/leads/lead-card";
import { type Lead } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface RecentLeadsProps {
  userId?: number;
  limit?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

export function RecentLeads({
  userId,
  limit = 2,
  showViewAll = true,
  onViewAll,
}: RecentLeadsProps) {
  const { data: leads, isLoading } = useQuery<Lead[]>({
    queryKey: [userId ? `/api/leads/user/${userId}` : "/api/leads", { limit }],
  });

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: limit }).map((_, i) => (
          <div key={i} className="border rounded-lg overflow-hidden bg-white">
            <Skeleton className="h-40 w-full" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <div className="flex justify-between items-center mt-3">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
              </div>
              <Skeleton className="h-9 w-full mt-3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {leads
          ?.slice(0, limit)
          .map((lead) => <LeadCard key={lead.id} lead={lead} />)}
      </div>

      {showViewAll && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={onViewAll}>
            View All Leads
          </Button>
        </div>
      )}
    </div>
  );
}
