import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: string;
    positive: boolean;
  };
  description?: string;
}

export function StatsCard({ title, value, icon, trend, description }: StatsCardProps) {
  return (
    <Card className="dashboard-card group overflow-hidden relative bg-gradient-to-br from-white to-blue-50 hover:shadow-lg transform hover:-translate-y-1 transition-all duration-300 border border-blue-100">
      {/* Animated decorative elements */}
      <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-blue-500/10 group-hover:bg-blue-500/20 transition-all duration-500"></div>
      <div className="absolute -left-6 -bottom-6 h-24 w-24 rounded-full bg-blue-500/5 group-hover:bg-blue-500/10 transition-all duration-500"></div>
      
      {/* Glass effect top accent */}
      <div className="h-1 w-full bg-gradient-to-r from-blue-600 via-blue-400 to-blue-500 opacity-80"></div>
      
      <CardContent className="p-5 relative z-10">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-2.5 rounded-lg shadow-md transform group-hover:scale-110 transition-all duration-300">
              {icon}
            </div>
            <p className="text-sm font-semibold text-blue-700 ml-3 opacity-90">{title}</p>
          </div>
        </div>
        
        <div className="mt-2">
          <h3 className="text-2xl md:text-3xl font-bold text-blue-800 tracking-tight">{value}</h3>
          
          {trend && (
            <div className={cn(
              "flex items-center mt-2 text-sm font-medium",
              trend.positive ? "text-emerald-600" : "text-rose-500"
            )}>
              <div className={cn(
                "flex items-center justify-center p-1 rounded-full mr-2",
                trend.positive ? "bg-emerald-100" : "bg-rose-100"
              )}>
                {trend.positive ? (
                  <i className="ri-arrow-up-line"></i>
                ) : (
                  <i className="ri-arrow-down-line"></i>
                )}
              </div>
              <span>{trend.value}</span>
              {description && (
                <span className="text-gray-500 ml-1 text-xs md:text-sm">{description}</span>
              )}
            </div>
          )}
        </div>
        
        {/* Decorative bottom line with gradient */}
        <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-gradient-to-r from-blue-500 to-blue-300 group-hover:w-full transition-all duration-700"></div>
      </CardContent>
    </Card>
  );
}
