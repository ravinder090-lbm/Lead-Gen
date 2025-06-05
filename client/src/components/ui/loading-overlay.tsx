import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface LoadingOverlayProps {
  isVisible: boolean;
  className?: string;
}

export function LoadingOverlay({ isVisible, className }: LoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className={cn(
            "fixed inset-0 z-50 flex items-center justify-center",
            "bg-gradient-to-br from-white via-blue-50 to-blue-100",
            className
          )}
        >
          <div className="flex flex-col items-center space-y-4">
            {/* Morphing Square Loader */}
            <motion.div
              animate={{
                borderRadius: ["20%", "50%", "20%"],
                rotate: [0, 180, 360],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut",
              }}
              className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600"
            />
            
            {/* Loading text with typing animation */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.3 }}
              className="text-blue-600 font-medium"
            >
              Loading...
            </motion.div>
            
            {/* Animated dots */}
            <div className="flex space-x-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.5, 1, 0.5]
                  }}
                  transition={{
                    duration: 1.2,
                    repeat: Infinity,
                    delay: i * 0.2,
                    ease: "easeInOut"
                  }}
                  className="w-2 h-2 rounded-full bg-blue-400"
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// Global page transition wrapper
interface PageTransitionWrapperProps {
  children: React.ReactNode;
  isLoading?: boolean;
}

export function PageTransitionWrapper({ children, isLoading = false }: PageTransitionWrapperProps) {
  return (
    <div className="relative min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50">
      <LoadingOverlay isVisible={isLoading} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ 
          duration: 0.4, 
          ease: "easeOut"
        }}
        className="relative z-10"
      >
        {children}
      </motion.div>
    </div>
  );
}