import React, { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  gradient?: boolean;
  backButton?: boolean;
  onBack?: () => void;
}

/**
 * PageHeader component with optimized rendering and flexible design
 * Designed to be used across the application for consistent page headers
 */
export function PageHeader({
  title,
  subtitle,
  icon,
  actions,
  className,
  gradient = true,
  backButton = false,
  onBack,
}: PageHeaderProps) {
  // Handle back button click
  const handleBackClick = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  return (
    <div
      className={cn(
        "px-4 md:px-6 py-4 md:py-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 rounded-lg mb-6",
        gradient
          ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md"
          : "bg-white border border-gray-100 shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-3">
        {backButton && (
          <button
            onClick={handleBackClick}
            className="p-1.5 rounded-full hover:bg-blue-700/20 transition-colors"
            aria-label="Go back"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-chevron-left"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
        )}
        {icon && <div className="flex-shrink-0">{icon}</div>}
        <div>
          <h1 className={cn(
            "text-xl md:text-2xl font-bold",
            !gradient && "text-blue-800"
          )}>
            {title}
          </h1>
          {subtitle && (
            <p className={cn(
              "text-sm md:text-base mt-0.5 opacity-90",
              !gradient && "text-gray-600"
            )}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
      {actions && (
        <div className="flex-shrink-0 flex items-center gap-2 w-full md:w-auto">
          {actions}
        </div>
      )}
    </div>
  );
}