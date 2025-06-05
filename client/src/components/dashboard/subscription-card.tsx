// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { EnhancedProgress } from "@/components/ui/enhanced-progress";
// import { formatDate } from "@/lib/utils";
// import { useLocation } from "wouter";
// import { type UserSubscription } from "@shared/schema";
// import { useEffect, useState } from "react";
// import { useAuth } from "@/contexts/auth-context";

// interface SubscriptionCardProps {
//   subscription: UserSubscription & {
//     name: string;
//     description: string;
//   };
//   onUpgrade?: () => void;
//   onBuyCoins?: () => void;
// }

// export function SubscriptionCard({
//   subscription,
//   onUpgrade,
//   onBuyCoins,
// }: SubscriptionCardProps) {
//   const [, navigate] = useLocation();
//   const { user } = useAuth();

//   // Track both display percentage and previous coins for animation
//   const [progressValue, setProgressValue] = useState(0);
//   const [previousCoins, setPreviousCoins] = useState(
//     subscription.leadCoinsLeft,
//   );
//   const [isAnimating, setIsAnimating] = useState(false);

//   // Calculate subscription usage percentage
//   const remainingCoins = subscription.leadCoinsLeft;

//   // Get the total initial coins - use joined data if available or a reasonable default
//   // When working with the database, we need to account for different data shapes
//   let initialCoins = 100; // Default fallback

//   // Try to find the subscription's initial lead coins
//   if (subscription.name && typeof subscription.leadCoins === "number") {
//     // This is the subscription plan data directly
//     initialCoins = subscription.leadCoins;
//   } else if (
//     subscription.name &&
//     typeof subscription.name.leadCoins === "number"
//   ) {
//     // The subscription plan is a nested object
//     initialCoins = subscription.name.leadCoins;
//   } else if (typeof subscription.initialLeadCoins === "number") {
//     // If we have a property explicitly for initial coins
//     initialCoins = subscription.initialLeadCoins;
//   }

//   // Calculate the used percentage (coins used / total coins * 100)
//   // Make sure the value is between 0 and 100
//   const usedCoins = initialCoins - remainingCoins;
//   const usagePercentage = Math.max(
//     0,
//     Math.min(100, Math.round((usedCoins / initialCoins) * 100)),
//   );

//   // Animate progress bar when coins change
//   useEffect(() => {
//     if (previousCoins !== subscription.leadCoinsLeft) {
//       // Coin deduction detected
//       setIsAnimating(true);

//       // Animate the progress bar - calculate used percentages based on initial total coins
//       const prevUsedCoins = initialCoins - previousCoins;
//       const currentUsedCoins = initialCoins - subscription.leadCoinsLeft;

//       const startValue = Math.max(
//         0,
//         Math.min(100, Math.round((prevUsedCoins / initialCoins) * 100)),
//       );
//       const endValue = Math.max(
//         0,
//         Math.min(100, Math.round((currentUsedCoins / initialCoins) * 100)),
//       );

//       // Start from the previous value
//       setProgressValue(startValue);

//       // Animate to the new value
//       const duration = 1500; // Animation duration in ms
//       const startTime = Date.now();

//       const animateProgress = () => {
//         const elapsed = Date.now() - startTime;
//         const progress = Math.min(elapsed / duration, 1);

//         // Calculate current animation position (easing function)
//         const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
//         const currentValue =
//           startValue + (endValue - startValue) * easedProgress;

//         setProgressValue(Math.round(currentValue));

//         if (progress < 1) {
//           requestAnimationFrame(animateProgress);
//         } else {
//           // Animation complete
//           setIsAnimating(false);
//           setPreviousCoins(subscription.leadCoinsLeft);
//         }
//       };

//       requestAnimationFrame(animateProgress);
//     } else if (progressValue === 0 && usagePercentage > 0) {
//       // Initial load
//       setProgressValue(usagePercentage);
//     }
//   }, [
//     subscription.leadCoinsLeft,
//     previousCoins,
//     usagePercentage,
//     initialCoins,
//     progressValue,
//   ]);

//   // Calculate days remaining with safety checks
//   let endDate = null;
//   let daysRemaining = null;
  
//   try {
//     if (subscription.endDate) {
//       endDate = new Date(subscription.endDate);
//       const now = new Date();
//       daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
//       // Make sure it's a valid number
//       if (isNaN(daysRemaining)) {
//         daysRemaining = null;
//       }
//     }
//   } catch (error) {
//     console.error("Error calculating subscription end date:", error);
//     // Keep null values as defaults
//   }

//   return (
//     <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow hover:shadow-lg transition-all duration-300 overflow-hidden">
//       <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
//       <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-5 px-4 md:px-5">
//         <div className="flex items-center space-x-2">
//           <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
//             <i className="ri-vip-crown-line text-xl text-blue-600"></i>
//           </div>
//           <CardTitle className="text-sm md:text-base font-bold text-blue-700">
//             Current Subscription
//           </CardTitle>
//         </div>
//         <Button 
//           className="text-xs md:text-sm h-8 md:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
//           onClick={onUpgrade || (() => navigate("/user/subscriptions"))}
//         >
//           <i className="ri-arrow-up-line mr-1 hidden md:inline-block"></i>
//           Upgrade
//         </Button>
//       </CardHeader>
//       <CardContent className="p-4 md:p-5">
//         <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
//           <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
//             <div className="space-y-2">
//               <h4 className="font-bold text-base md:text-lg text-blue-800 flex items-center">
//                 {subscription.name}
//                 <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Active</span>
//               </h4>
//               <p className="text-xs md:text-sm text-blue-600 flex items-center">
//                 <i className="ri-time-line mr-1.5 text-blue-500"></i>
//                 {endDate
//                   ? `Valid until: ${formatDate(endDate)}`
//                   : "No expiration date"}
//               </p>
//               <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
//                 <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
//                   <i className="ri-coin-line mr-1.5 text-yellow-500"></i>
//                   <span className="text-blue-700 font-medium">
//                     {subscription.leadCoinsLeft} LeadCoins
//                   </span>
//                 </div>
//                 {daysRemaining !== null && (
//                   <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
//                     <i className="ri-calendar-line mr-1.5 text-blue-500"></i>
//                     <span className="text-blue-700 font-medium">
//                       Expires in {daysRemaining} days
//                     </span>
//                   </div>
//                 )}
//               </div>
//             </div>
//             <div className="mt-2 md:mt-0">
//               <Button
//                 variant="outline" 
//                 className="text-xs md:text-sm h-8 md:h-9 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-full"
//                 onClick={onBuyCoins || (() => navigate("/user/subscriptions"))}
//               >
//                 <i className="ri-add-circle-line mr-1.5"></i>
//                 Buy More LeadCoins
//               </Button>
//             </div>
//           </div>
          
//           <div className="mt-5">
//             <EnhancedProgress 
//               value={isAnimating ? progressValue : usagePercentage} 
//               className={`h-4 transition-all ${isAnimating ? 'animate-pulse' : ''}`}
//               showLabel={false}
//               animate={isAnimating}
//               title="Subscription Usage"
//               description="Track your subscription consumption over time"
//               available={subscription.leadCoinsLeft}
//               total={initialCoins}
//               showUsageIcons={true}
//             />
//           </div>
//         </div>
        
//         {/* Benefits */}
//         <div className="mt-4 grid grid-cols-2 gap-3">
//           <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
//             <div className="flex items-center mb-1">
//               <i className="ri-check-line text-green-500 mr-2"></i>
//               <span className="text-xs md:text-sm font-medium text-blue-700">Premium Leads</span>
//             </div>
//             <p className="text-xs text-blue-600">Access to exclusive leads</p>
//           </div>
//           <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
//             <div className="flex items-center mb-1">
//               <i className="ri-check-line text-green-500 mr-2"></i>
//               <span className="text-xs md:text-sm font-medium text-blue-700">Priority Support</span>
//             </div>
//             <p className="text-xs text-blue-600">Get faster response times</p>
//           </div>
//         </div>
//       </CardContent>
//     </Card>
//   );
// }


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EnhancedProgress } from "@/components/ui/enhanced-progress";
import { formatDate } from "@/lib/utils";
import { useLocation } from "wouter";
import { type UserSubscription } from "@shared/schema";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/auth-context";

interface SubscriptionCardProps {
  subscription: UserSubscription & {
    name: string;
    description: string;
  };
  onUpgrade?: () => void;
  onBuyCoins?: () => void;
}

export function SubscriptionCard({
  subscription,
  onUpgrade,
  onBuyCoins,
}: SubscriptionCardProps) {
  const [, navigate] = useLocation();
  const { user } = useAuth();

  // Track both display percentage and previous coins for animation
  const [progressValue, setProgressValue] = useState(0);
  const [previousCoins, setPreviousCoins] = useState(
    subscription.leadCoinsLeft,
  );
  const [isAnimating, setIsAnimating] = useState(false);

  // Calculate subscription usage percentage
  const remainingCoins = subscription.leadCoinsLeft;

  // Get the total initial coins - use joined data if available or a reasonable default
  // When working with the database, we need to account for different data shapes
  let initialCoins = 100; // Default fallback

  // Try to find the subscription's initial lead coins
  if (subscription.name && typeof subscription.leadCoins === "number") {
    // This is the subscription plan data directly
    initialCoins = subscription.leadCoins;
  } else if (
    subscription.name &&
    typeof subscription.name.leadCoins === "number"
  ) {
    // The subscription plan is a nested object
    initialCoins = subscription.name.leadCoins;
  } else if (typeof subscription.initialLeadCoins === "number") {
    // If we have a property explicitly for initial coins
    initialCoins = subscription.initialLeadCoins;
  }

  // Calculate the used percentage (coins used / total coins * 100)
  // Make sure the value is between 0 and 100
  const usedCoins = initialCoins - remainingCoins;
  const usagePercentage = Math.max(
    0,
    Math.min(100, Math.round((usedCoins / initialCoins) * 100)),
  );

  // Animate progress bar when coins change
  useEffect(() => {
    if (previousCoins !== subscription.leadCoinsLeft) {
      // Coin deduction detected
      setIsAnimating(true);

      // Animate the progress bar - calculate used percentages based on initial total coins
      const prevUsedCoins = initialCoins - previousCoins;
      const currentUsedCoins = initialCoins - subscription.leadCoinsLeft;

      const startValue = Math.max(
        0,
        Math.min(100, Math.round((prevUsedCoins / initialCoins) * 100)),
      );
      const endValue = Math.max(
        0,
        Math.min(100, Math.round((currentUsedCoins / initialCoins) * 100)),
      );

      // Start from the previous value
      setProgressValue(startValue);

      // Animate to the new value
      const duration = 1500; // Animation duration in ms
      const startTime = Date.now();

      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);

        // Calculate current animation position (easing function)
        const easedProgress = 1 - Math.pow(1 - progress, 3); // Cubic ease-out
        const currentValue =
          startValue + (endValue - startValue) * easedProgress;

        setProgressValue(Math.round(currentValue));

        if (progress < 1) {
          requestAnimationFrame(animateProgress);
        } else {
          // Animation complete
          setIsAnimating(false);
          setPreviousCoins(subscription.leadCoinsLeft);
        }
      };

      requestAnimationFrame(animateProgress);
    } else if (progressValue === 0 && usagePercentage > 0) {
      // Initial load
      setProgressValue(usagePercentage);
    }
  }, [
    subscription.leadCoinsLeft,
    previousCoins,
    usagePercentage,
    initialCoins,
    progressValue,
  ]);

  // Calculate days remaining with safety checks
  let endDate = null;
  let daysRemaining = null;
  
  try {
    if (subscription.endDate) {
      endDate = new Date(subscription.endDate);
      const now = new Date();
      daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      // Make sure it's a valid number
      if (isNaN(daysRemaining)) {
        daysRemaining = null;
      }
    }
  } catch (error) {
    console.error("Error calculating subscription end date:", error);
    // Keep null values as defaults
  }

  let percentage = ((subscription.leadCoinsLeft * 100) / (subscription.leadCoinsLeft + (user?.leadCoins || 0))).toFixed(1);

  return (
    <Card className="bg-gradient-to-br from-white to-blue-50 border border-blue-100 shadow hover:shadow-lg transition-all duration-300 overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600"></div>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 pt-5 px-4 md:px-5">
        <div className="flex items-center space-x-2">
          <div className="bg-blue-100 w-10 h-10 rounded-full flex items-center justify-center">
            <i className="ri-vip-crown-line text-xl text-blue-600"></i>
          </div>
          <CardTitle className="text-sm md:text-base font-bold text-blue-700">
            Current Subscription
          </CardTitle>
        </div>
        <Button 
          className="text-xs md:text-sm h-8 md:h-9 bg-blue-600 hover:bg-blue-700 text-white rounded-full"
          onClick={onUpgrade || (() => navigate("/user/subscriptions"))}
        >
          <i className="ri-arrow-up-line mr-1 hidden md:inline-block"></i>
          Upgrade
        </Button>
      </CardHeader>
      <CardContent className="p-4 md:p-5">
        <div className="bg-white rounded-xl p-4 shadow-sm border border-blue-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between">
            <div className="space-y-2">
              <h4 className="font-bold text-base md:text-lg text-blue-800 flex items-center">
                {subscription.name}
                <span className="ml-2 bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full">Active</span>
              </h4>
              <p className="text-xs md:text-sm text-blue-600 flex items-center">
                <i className="ri-time-line mr-1.5 text-blue-500"></i>
                {endDate
                  ? `Valid until: ${formatDate(endDate)}`
                  : "No expiration date"}
              </p>
              <div className="flex flex-wrap items-center gap-2 md:gap-4 mt-2">
                <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
                  <i className="ri-coin-line mr-1.5 text-yellow-500"></i>
                  <span className="text-blue-700 font-medium">
                    {subscription.leadCoinsLeft+ user?.leadCoins} LeadCoins
                  </span>
                </div>
                {daysRemaining !== null && (
                  <div className="flex items-center text-xs md:text-sm bg-blue-50 px-2 py-1 rounded-full">
                    <i className="ri-calendar-line mr-1.5 text-blue-500"></i>
                    <span className="text-blue-700 font-medium">
                      Expires in {daysRemaining} days
                    </span>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-2 md:mt-0">
              <Button
                variant="outline" 
                className="text-xs md:text-sm h-8 md:h-9 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-full"
                onClick={onBuyCoins || (() => navigate("/user/subscriptions"))}
              >
                <i className="ri-add-circle-line mr-1.5"></i>
                Buy More LeadCoins
              </Button>
            </div>
          </div>
          
          <div className="mt-5">
            <EnhancedProgress 
              value={percentage} 
              className={`h-4 transition-all ${isAnimating ? 'animate-pulse' : ''}`}
              showLabel={false}
              animate={isAnimating}
              title="Subscription Usage"
              description="Track your subscription consumption over time"
              available={user?.leadCoins}
              total={subscription.leadCoinsLeft+ user?.leadCoins}
              showUsageIcons={true}
            />
          </div>
        </div>
        
        {/* Benefits */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center mb-1">
              <i className="ri-check-line text-green-500 mr-2"></i>
              <span className="text-xs md:text-sm font-medium text-blue-700">Premium Leads</span>
            </div>
            <p className="text-xs text-blue-600">Access to exclusive leads</p>
          </div>
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
            <div className="flex items-center mb-1">
              <i className="ri-check-line text-green-500 mr-2"></i>
              <span className="text-xs md:text-sm font-medium text-blue-700">Priority Support</span>
            </div>
            <p className="text-xs text-blue-600">Get faster response times</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
