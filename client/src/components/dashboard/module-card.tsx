import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  active?: boolean;
}

export function ModuleCard({ title, description, icon, active = false }: ModuleCardProps) {
  return (
    <Card className={cn(
      "border rounded-lg p-4",
      active ? "bg-blue-50" : ""
    )}>
      <CardContent className="p-0">
        <div className={cn(
          "flex items-center space-x-2",
          active ? "text-primary" : "text-text-secondary"
        )}>
          {icon}
          <span className="font-medium">{title}</span>
        </div>
        <p className="text-sm text-text-secondary mt-2">{description}</p>
      </CardContent>
    </Card>
  );
}
