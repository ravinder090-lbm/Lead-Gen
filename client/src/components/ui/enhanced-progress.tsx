"use client"

import * as React from "react"
import * as ProgressPrimitive from "@radix-ui/react-progress"

import { cn } from "@/lib/utils"

interface EnhancedProgressProps extends React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> {
  value?: number
  showLabel?: boolean
  indicatorClassName?: string
  animate?: boolean
  showUsageIcons?: boolean
  title?: string
  description?: string
  available?: number
  total?: number
}

const EnhancedProgress = React.forwardRef<
  React.ElementRef<typeof ProgressPrimitive.Root>,
  EnhancedProgressProps
>(({ 
  className, 
  value = 0, 
  showLabel = false, 
  indicatorClassName, 
  animate = false, 
  showUsageIcons = false,
  title,
  description,
  available,
  total,
  ...props 
}, ref) => {
  const [displayValue, setDisplayValue] = React.useState(value);
  
  // Animate value changes
  React.useEffect(() => {
    if (animate && displayValue !== value) {
      // Animate to new value
      const duration = 1000; // ms
      const startTime = Date.now();
      const startValue = displayValue;
      
      const animateProgress = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease out cubic: (1-t)^3
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = startValue + (value - startValue) * easedProgress;
        
        setDisplayValue(Math.round(currentValue));
        
        if (progress < 1) {
          requestAnimationFrame(animateProgress);
        }
      };
      
      requestAnimationFrame(animateProgress);
    } else if (!animate) {
      setDisplayValue(value);
    }
  }, [value, animate]);

  // Determine color based on percentage
  const getColorClass = (percent: number) => {
    if (percent < 30) return "bg-gradient-to-r from-green-400 to-green-500"; // Low usage - green
    if (percent < 70) return "bg-gradient-to-r from-blue-400 to-blue-500";  // Medium usage - blue
    if (percent < 90) return "bg-gradient-to-r from-orange-400 to-orange-500"; // High usage - orange
    return "bg-gradient-to-r from-red-400 to-red-500"; // Critical usage - red
  };
  
  const getStatusText = (percent: number) => {
    if (percent < 30) return "Excellent"; 
    if (percent < 70) return "Good";
    if (percent < 90) return "Low";
    return "Critical";
  };
  
  const getStatusIcon = (percent: number) => {
    if (percent < 30) return "ri-emotion-laugh-line"; 
    if (percent < 70) return "ri-emotion-normal-line";
    if (percent < 90) return "ri-emotion-unhappy-line";
    return "ri-emotion-sad-line";
  };
  
  const getStatusColor = (percent: number) => {
    if (percent < 30) return "text-green-500"; 
    if (percent < 70) return "text-blue-500";
    if (percent < 90) return "text-orange-500";
    return "text-red-500";
  };
  
  const colorClass = getColorClass(displayValue);
  const statusText = getStatusText(displayValue);
  const statusIcon = getStatusIcon(displayValue);
  const statusColor = getStatusColor(displayValue);

  return (
    <div className="space-y-3">
      {(title || description) && (
        <div className="mb-2">
          {title && <h4 className="text-sm font-medium text-blue-700">{title}</h4>}
          {description && <p className="text-xs text-blue-600 mt-0.5">{description}</p>}
        </div>
      )}
      
      {/* Available/Total Display */}
      {(typeof available !== 'undefined' && typeof total !== 'undefined') && (
        <div className="flex justify-between items-center mb-2">
          <div className="flex items-center">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center mr-2">
              <i className="ri-coin-line text-blue-500"></i>
            </div>
            <div>
              <p className="text-sm font-medium text-blue-700">
                Available: <span className="font-bold">{available}</span>
              </p>
              <p className="text-xs text-blue-600">
                Total: {total}
              </p>
            </div>
          </div>
          
          <div className={`${statusColor} flex items-center`}>
            <i className={`${statusIcon} text-lg mr-1`}></i>
            <span className="text-sm font-medium">{statusText}</span>
          </div>
        </div>
      )}
      
      {/* Progress Bar */}
      <div className="relative">
        <ProgressPrimitive.Root
          ref={ref}
          className={cn(
            "relative h-5 w-full overflow-hidden rounded-full bg-secondary/20 shadow-inner",
            className
          )}
          {...props}
        >
          <ProgressPrimitive.Indicator
            className={cn(
              "h-full w-full flex-1 transition-all shadow-sm",
              colorClass,
              indicatorClassName
            )}
            style={{ transform: `translateX(-${100 - (displayValue || 0)}%)` }}
          />
          
          {/* Value inside progress bar */}
          <div className="absolute inset-0 flex items-center justify-center z-10">
            <span className="text-xs font-bold text-white drop-shadow-md">{displayValue}% Used</span>
          </div>
        </ProgressPrimitive.Root>
        
        {/* Icons showing meaning */}
        {showUsageIcons && (
          <div className="flex justify-between text-xs mt-1 px-1">
            <div className="flex flex-col items-center">
              <i className="ri-emotion-laugh-line text-green-500 text-sm"></i>
              <span className="text-xs text-green-500">0-30%</span>
            </div>
            <div className="flex flex-col items-center">
              <i className="ri-emotion-normal-line text-blue-500 text-sm"></i>
              <span className="text-xs text-blue-500">30-70%</span>
            </div>
            <div className="flex flex-col items-center">
              <i className="ri-emotion-unhappy-line text-orange-500 text-sm"></i>
              <span className="text-xs text-orange-500">70-90%</span>
            </div>
            <div className="flex flex-col items-center">
              <i className="ri-emotion-sad-line text-red-500 text-sm"></i>
              <span className="text-xs text-red-500">90-100%</span>
            </div>
          </div>
        )}
        
        {showLabel && !showUsageIcons && (
          <div className="flex justify-between text-xs text-blue-600 mt-1.5">
            <span>0%</span>
            <span className="font-medium">
              {displayValue}% Used
            </span>
            <span>100%</span>
          </div>
        )}
      </div>
    </div>
  )
});

EnhancedProgress.displayName = "EnhancedProgress"

export { EnhancedProgress }