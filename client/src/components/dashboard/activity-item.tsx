import { cn } from "@/lib/utils";

type ActivityType = "user" | "subscription" | "support" | "lead";

interface ActivityItemProps {
  type: ActivityType;
  title: string;
  time: string;
}

export function ActivityItem({ type, title, time }: ActivityItemProps) {
  return (
    <div className="flex items-start space-x-4 p-3 hover:bg-blue-50/50 transition-colors duration-200 rounded-md">
      <div className={cn(
        "p-2.5 rounded-full shadow-sm relative",
        type === "user" && "bg-gradient-to-br from-blue-500 to-blue-600 text-white",
        type === "subscription" && "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white",
        type === "support" && "bg-gradient-to-br from-amber-500 to-amber-600 text-white",
        type === "lead" && "bg-gradient-to-br from-blue-500 to-blue-600 text-white"
      )}>
        {/* Glass highlight effect */}
        <div className="absolute inset-0 rounded-full bg-white/20 opacity-40 h-1/2"></div>
        <Icon type={type} />
      </div>
      
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <p className="font-medium text-blue-900">{title}</p>
          <span className={cn(
            "text-xs rounded-full px-2 py-0.5 font-medium",
            type === "user" && "bg-blue-100 text-blue-700",
            type === "subscription" && "bg-emerald-100 text-emerald-700",
            type === "support" && "bg-amber-100 text-amber-700",
            type === "lead" && "bg-blue-100 text-blue-700"
          )}>
            {type}
          </span>
        </div>
        <p className="text-xs text-gray-500 mt-1 flex items-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 mr-1">
            <circle cx="12" cy="12" r="10"></circle>
            <polyline points="12 6 12 12 16 14"></polyline>
          </svg>
          {time}
        </p>
      </div>
    </div>
  );
}

function Icon({ type }: { type: ActivityType }) {
  switch (type) {
    case "user":
      return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
    case "subscription":
      return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></svg>;
    case "support":
      return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></svg>;
    case "lead":
      return <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" /></svg>;
  }
}
