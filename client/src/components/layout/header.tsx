import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getInitials, cn } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { Link, useLocation } from "wouter";
import LogoPath from "@assets/logoLG.png";

export function Header() {
  const { user, logout } = useAuth();
  const [location] = useLocation();
  const showSidebar = user?.role !== "user";
  // Check if current path is one of the active paths
  const isActivePath = (path: string) => {
    return location === path;
  };

  return (
    <div
      className={`border-b border-blue-100 bg-sky-50/95 backdrop-blur-md h-14 sm:h-16 px-1 sm:px-3 md:px-5 flex items-center justify-between shadow-sm fixed top-0 left-0 right-0 z-20 transition-all duration-300 safe-area-top ${showSidebar && "left-0 right-0 md:left-64"}`}
    >
      {/* Page title with role-based text / or Navigation for users */}
      <div className="flex items-center flex-wrap overflow-hidden">
        {user?.role !== "user" ? (
          <h1 className="text-xs sm:text-sm md:text-base lg:text-lg font-bold heading-gradient truncate max-w-[140px] xs:max-w-[200px] sm:max-w-none">
            {user?.role === "admin" && "Admin Dashboard"}
            {user?.role === "subadmin" && "Subadmin Dashboard"}
          </h1>
        ) : (
          <div className="flex items-center flex-wrap gap-0.5 xs:gap-1 sm:gap-2 md:gap-3 lg:gap-4">
            {/* Logo for user panel */}
            <Link href="/user/dashboard">
              <div className="flex items-center mr-0.5 xs:mr-1 sm:mr-2">
                <img
                  src={LogoPath}
                  alt="LeadGen Logo"
                  className="h-6 xs:h-7 sm:h-8 md:h-9 lg:h-10 object-contain"
                />
              </div>
            </Link>

            <Link href="/user/dashboard">
              <div
                className={cn(
                  "flex items-center gap-0.5 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-200 hover:bg-blue-100/70",
                  isActivePath("/user/dashboard") &&
                    "bg-blue-100 text-blue-700 font-medium",
                )}
              >
                <i className="ri-dashboard-line text-blue-600 text-sm sm:text-base"></i>
                <span className="hidden xs:inline text-xs sm:text-sm">Dashboard</span>
              </div>
            </Link>

            <Link href="/user/leads">
              <div
                className={cn(
                  "flex items-center gap-0.5 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-200 hover:bg-blue-100/70",
                  isActivePath("/user/leads") &&
                    "bg-blue-100 text-blue-700 font-medium",
                )}
              >
                <i className="ri-bookmark-line text-blue-600 text-sm sm:text-base"></i>
                <span className="hidden xs:inline text-xs sm:text-sm">Leads</span>
              </div>
            </Link>

            <Link href="/user/profile">
              <div
                className={cn(
                  "flex items-center gap-0.5 px-1 sm:px-2 py-1 sm:py-1.5 rounded-lg transition-all duration-200 hover:bg-blue-100/70",
                  isActivePath("/user/profile") &&
                    "bg-blue-100 text-blue-700 font-medium",
                )}
              >
                <i className="ri-user-settings-line text-blue-600 text-sm sm:text-base"></i>
                <span className="hidden xs:inline text-xs sm:text-sm">Profile</span>
              </div>
            </Link>
          </div>
        )}
      </div>

      {/* Right-side user actions */}
      <div className="flex items-center gap-0.5 xs:gap-1 sm:gap-2 md:gap-4 flex-shrink-0">
        {/* LeadCoins badge for user role only */}
        {user?.role === "user" && (
          <div className="flex px-1.5 xs:px-2 sm:px-3 md:px-4 py-0.5 xs:py-1 sm:py-1.5 bg-gradient-to-r from-blue-600 to-blue-500 text-white rounded-full items-center shadow-sm hover:shadow-md transition-all duration-300 group">
            <i className="ri-coin-line mr-0.5 xs:mr-1 text-yellow-300 group-hover:animate-pulse text-xs sm:text-sm"></i>
            <span className="text-[10px] xs:text-xs font-medium hidden xs:inline">
              Coins:{" "}
            </span>
            <span className="font-bold text-[10px] xs:text-xs">
              {user?.leadCoins || 0}
            </span>
          </div>
        )}

        {/* User profile dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="relative h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 rounded-full hover:bg-blue-100 transition-colors duration-200 p-0"
              aria-label="User menu"
            >
              <Avatar className="h-6 w-6 xs:h-7 xs:w-7 sm:h-8 sm:w-8 md:h-9 md:w-9 border-2 border-blue-300 shadow-sm">
                {user?.profileImage ? (
                  <AvatarImage
                    src={user.profileImage}
                    alt={user?.name || "User"}
                  />
                ) : (
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white text-[10px] xs:text-xs font-bold">
                    {user?.name ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                )}
              </Avatar>
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            className="w-48 sm:w-56 sky-glass-card border-blue-100 shadow-lg animate-in fade-in-80 slide-in-from-top-5"
            align="end"
            forceMount
          >
            <DropdownMenuLabel className="font-normal py-2">
              <div className="flex flex-col space-y-1">
                <p className="text-xs sm:text-sm font-bold text-blue-700 truncate">{user?.name}</p>
                <p className="text-xs leading-none text-blue-500 truncate">
                  {user?.email}
                </p>
              </div>
            </DropdownMenuLabel>

            {/* User role specific items */}
            {user?.role === "user" && (
              <>
                <DropdownMenuSeparator className="bg-blue-100" />
                <DropdownMenuItem className="py-1.5">
                  <div className="flex items-center gap-2 w-full text-blue-700">
                    <i className="ri-coin-line text-yellow-500"></i>
                    <span className="text-xs sm:text-sm">
                      LeadCoins:{" "}
                      <span className="font-bold">{user?.leadCoins || 0}</span>
                    </span>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="py-1.5">
                  <Link href="/user/lead-reports" className="cursor-pointer">
                    <span className="flex items-center gap-2 w-full text-blue-700 hover:text-blue-800 transition-colors text-xs sm:text-sm">
                      <i className="ri-file-chart-line text-blue-600"></i>
                      Lead View Reports
                    </span>
                  </Link>
                </DropdownMenuItem>
              </>
            )}

            <DropdownMenuSeparator className="bg-blue-100" />

            {/* Profile link */}
            <DropdownMenuItem asChild className="py-1.5">
              <Link href={`/${user?.role}/profile`} className="cursor-pointer">
                <span className="flex items-center gap-2 w-full text-blue-700 hover:text-blue-800 transition-colors text-xs sm:text-sm">
                  <i className="ri-user-settings-line text-blue-600"></i>
                  Profile
                </span>
              </Link>
            </DropdownMenuItem>

            {/* Logout button */}
            <DropdownMenuItem
              onClick={logout}
              className="text-blue-700 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer py-1.5"
            >
              <span className="flex items-center gap-2 text-xs sm:text-sm">
                <i className="ri-logout-box-r-line text-red-500"></i>
                Log out
              </span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
