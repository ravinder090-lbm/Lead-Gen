import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { cn } from "@/lib/utils";
import Logo from "@/lib/logo";
import { useAuth } from "@/contexts/auth-context";
import { confirmLogout } from "@/lib/sweet-alert";

export function Sidebar() {
  const [location, navigate] = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location]);

  // Admin navigation items
  const adminNavItems = [
    { path: "/admin/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { path: "/admin/users", label: "User Management", icon: "ri-user-line" },
    {
      path: "/admin/leads",
      label: "Leads Management",
      icon: "ri-bookmark-line",
    },
    {
      path: "/admin/lead-categories",
      label: "Lead Categories",
      icon: "ri-price-tag-3-line",
    },
    {
      path: "/admin/support",
      label: "Support Management",
      icon: "ri-customer-service-2-line",
    },
    {
      path: "/admin/subscriptions",
      label: "Subscriptions",
      icon: "ri-stack-line",
    },
    {
      path: "/admin/subadmins",
      label: "Subadmin Management",
      icon: "ri-user-settings-line",
    },
    {
      path: "/admin/leadcoins",
      label: "LeadCoin Management",
      icon: "ri-coin-line",
    },
    {
      path: "/admin/lead-reports",
      label: "Lead View Reports",
      icon: "ri-file-chart-line",
    },
    {
      path: "/admin/coupons",
      label: "Coupons Management",
      icon: "ri-file-chart-line",
    },
  ];

  // Subadmin navigation items
  const subadminNavItems = [
    {
      path: "/subadmin/dashboard",
      label: "Dashboard",
      icon: "ri-dashboard-line",
    },
    {
      path: "/subadmin/users",
      label: "User Management",
      icon: "ri-user-line",
      permission: "user_management",
    },
    {
      path: "/subadmin/leads",
      label: "Leads Management",
      icon: "ri-bookmark-line",
      permission: "leads_management",
    },
    {
      path: "/subadmin/support",
      label: "Support Management",
      icon: "ri-customer-service-2-line",
      permission: "support_management",
    },
    {
      path: "/subadmin/subscriptions",
      label: "Subscriptions",
      icon: "ri-stack-line",
      permission: "subscription_management",
    },
  ];

  // User navigation items
  const userNavItems = [
    { path: "/user/dashboard", label: "Dashboard", icon: "ri-dashboard-line" },
    { path: "/user/leads", label: "Leads", icon: "ri-bookmark-line" },
    {
      path: "/user/subscriptions",
      label: "Subscription Plans",
      icon: "ri-stack-line",
    },
    {
      path: "/user/support",
      label: "Support",
      icon: "ri-customer-service-2-line",
    },
    {
      path: "/user/lead-reports",
      label: "Lead View Reports",
      icon: "ri-file-chart-line",
    },
  ];

  // Account navigation items (common for all roles)
  // const accountNavItems = [
  //   {
  //     path: user?.role ? `/${user?.role}/profile` : "",
  //     label: "Profile",
  //     icon: "ri-user-settings-line",
  //   },
  //   {
  //     path: "/logout",
  //     label: "Logout",
  //     icon: "ri-logout-box-r-line",
  //   },
  // ];

  // Get navigation items based on user role
  const getNavItems = () => {
    if (!user) return [];

    switch (user.role) {
      case "admin":
        return adminNavItems;
      case "subadmin":
        return subadminNavItems.filter((item) => {
          if (!item.permission) return true;
          return (user.permissions as string[])?.includes(item.permission);
        });
      case "user":
        return userNavItems;
      default:
        return [];
    }
  };

  // Check if a nav item is active
  const isActive = (path: string) => {
    return location === path || location.startsWith(`${path}/`);
  };

  // Handle logout with confirmation
  const handleLogout = async (e: React.MouseEvent) => {
    e.preventDefault();
    const confirmed = await confirmLogout();

    if (confirmed) {
      logout();
    }
  };

  return (
    <>
      {/* Mobile Navigation Header */}
      <header className="bg-sky-50/90 backdrop-blur-sm border-b md:hidden flex items-center justify-between px-4 h-16 fixed top-0 left-0 right-0 z-30 shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="text-blue-600 hover:bg-blue-100 p-2 rounded-md transition-colors touch-target"
            aria-label="Open menu"
          >
            <i className="ri-menu-3-line text-xl"></i>
          </button>
          <div className="flex items-center">
            <div className="h-9 w-9 pulse-animation">
              <Logo />
            </div>
            <span className="font-bold text-gradient ml-2 text-lg">
              LeadGen Pro
            </span>
          </div>
        </div>
      </header>

      {/* Sidebar Navigation */}
      <aside
        className={cn(
          "bg-sky-50/95 backdrop-blur-sm border-r fixed inset-y-0 left-0 z-40 w-64 xs:w-72 sm:w-64 transform transition-transform duration-300 ease-in-out md:transform-none md:w-64 shadow-lg",
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Sidebar Header with Logo */}
        <div className="flex items-center justify-between h-16 border-b border-blue-100 bg-gradient-to-r from-blue-600 to-blue-500 px-4">
          <div className="flex items-center space-x-2">
            <div className="h-9 w-9 bg-white rounded-full p-1.5 shadow-md">
              <Logo />
            </div>
            <span className="font-bold text-white text-base sm:text-lg">
              LeadGen Pro
            </span>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="md:hidden text-white hover:bg-blue-700 p-2 rounded-full transition-colors"
            aria-label="Close menu"
          >
            <i className="ri-close-line text-xl"></i>
          </button>
        </div>

        {/* User Role Badge */}
        <div className="mt-4 px-4">
          <p className="text-xs text-blue-700 uppercase font-bold mb-2 tracking-wide">
            Role
          </p>
          <div className="flex items-center space-x-2 bg-gradient-to-r from-blue-100 to-blue-50 p-2 rounded-md border border-blue-100 shadow-sm">
            <div className="h-7 w-7 bg-blue-600 rounded-full flex items-center justify-center text-white shadow-sm">
              <i
                className={`${
                  user?.role === "admin"
                    ? "ri-admin-line"
                    : user?.role === "subadmin"
                      ? "ri-user-settings-line"
                      : "ri-user-line"
                } text-sm`}
              ></i>
            </div>
            <span className="font-bold capitalize text-blue-800 text-sm">
              {user?.role}
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="h-[calc(100vh-100px)] flex flex-col px-2 pt-3 pb-6">
          <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar sidebar-menu">
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider px-3 mb-2 mt-1">
              Main Menu
            </p>

            <div className="space-y-0.5">
              {getNavItems().map((item) => (
                <Link
                  key={item.path}
                  href={item.path}
                  className={cn(
                    "flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-2 sm:py-2.5 rounded-md transition-all duration-200 group",
                    isActive(item.path)
                      ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md font-medium"
                      : "text-blue-800 hover:text-blue-700 hover:bg-blue-100 hover:shadow-sm",
                  )}
                >
                  <i
                    className={cn(
                      item.icon,
                      "text-base transition-transform group-hover:scale-110 duration-200",
                      isActive(item.path)
                        ? "text-white"
                        : "text-blue-600 group-hover:text-blue-700",
                    )}
                  ></i>
                  <span className="text-xs sm:text-sm truncate">
                    {item.label}
                  </span>
                </Link>
              ))}
            </div>

            <div className="border-t border-blue-100 my-4"></div>
            {/* 
            <p className="text-xs font-bold text-blue-700 uppercase tracking-wider px-3 mb-2">
              Account
            </p>
            <div className="space-y-0.5">
              {accountNavItems.map((item) =>
                item.path === "/logout" ? (
                  <a
                    key={item.path}
                    href="#"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-2 rounded-md transition-all duration-200 text-blue-800 hover:text-red-600 hover:bg-red-50 group"
                  >
                    <i className={`${item.icon} text-base text-red-500 transition-transform group-hover:scale-110 duration-200`}></i>
                    <span className="text-xs sm:text-sm">Logout</span>
                  </a>
                ) : (
                  <Link
                    key={item.path}
                    href={item.path}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2.5 px-2 sm:px-3 py-2 rounded-md transition-all duration-200 group",
                      isActive(item.path)
                        ? "text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-md font-medium"
                        : "text-blue-800 hover:text-blue-700 hover:bg-blue-100 hover:shadow-sm",
                    )}
                  >
                    <i
                      className={cn(
                        item.icon,
                        "text-base transition-transform group-hover:scale-110 duration-200",
                        isActive(item.path) ? "text-white" : "text-blue-600 group-hover:text-blue-700"
                      )}
                    ></i>
                    <span className="text-xs sm:text-sm truncate">{item.label}</span>
                  </Link>
                ),
              )}
            </div> */}
          </div>
        </nav>
      </aside>

      {/* Mobile overlay with animation */}
      <div
        className={cn(
          "fixed inset-0 bg-black transition-opacity duration-300 md:hidden",
          mobileMenuOpen
            ? "opacity-50 z-30"
            : "opacity-0 pointer-events-none -z-10",
        )}
        onClick={() => setMobileMenuOpen(false)}
      />
    </>
  );
}
