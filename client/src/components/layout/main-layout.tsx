import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { useAuth } from "@/contexts/auth-context";
import { Toaster } from "@/components/ui/toaster";
import { useLocation } from "wouter";

interface MainLayoutProps {
  children: ReactNode;
  title?: string;
}

export function MainLayout({ children, title }: MainLayoutProps) {
  const { user, isLoading } = useAuth();
  const [location, navigate] = useLocation();
  // Removed state to improve performance
  
  // Handle auth check without causing blank screens - immediate content visibility
  // useEffect(() => {
  //   // Only attempt to redirect if not loading and no user
  //   // Don't block initial render, let content display first
  //   if (!isLoading && !user) {
  //     // Use requestAnimationFrame to ensure UI renders first
  //     // This prevents blank screen by ensuring DOM is painted before redirect
  //     requestAnimationFrame(() => {
  //       requestAnimationFrame(() => {
  //         navigate("/login");
  //       });
  //     });
  //   }
  // }, [isLoading, user, navigate]);

  // Always show the sidebar if there's a user and their role isn't "user"
  // Default to false (no sidebar) if user is null to prevent layout shift
  const showSidebar = !!user && user.role !== "user";

  return (
    <div className="min-h-screen h-screen flex flex-col md:flex-row dashboard-gradient-bg overflow-hidden">
      {/* Only show sidebar for admin and subadmin roles */}
      {showSidebar && <Sidebar />}

      {/* Main content area with flexible layout */}
      <div
        className={`flex-1 flex flex-col h-screen w-full pt-14 md:pt-0 ${showSidebar ? "md:pl-64" : ""}`}
      >
        <Header />

        {/* Scrollable main content */}
        <main className="flex-1 overflow-y-auto overscroll-contain px-2 py-2 sm:px-3 sm:py-3 md:p-4 lg:p-5 pb-20 sm:pb-16 md:pb-5 custom-scrollbar relative 2xl:py-20">
          {/* Page title without animation to avoid black screen */}
          {title && (
            <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-blue-800 mb-2 sm:mb-3 md:mb-4 lg:mb-5 break-words">
              {title}
            </h1>
          )}

          {/* Main content without animation to prevent black screen */}
          <div className="safe-area-bottom w-full max-w-full overflow-hidden">
            {children}
          </div>

          {/* Extra padding at bottom for mobile scrolling */}
          <div className="h-10 sm:h-6 md:h-2"></div>

          {/* Toast notifications */}
          <Toaster />
        </main>
      </div>
    </div>
  );
}
