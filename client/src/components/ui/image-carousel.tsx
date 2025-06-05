import React, { useState, useEffect, useCallback, useMemo, memo } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageCarouselProps {
  images: string[];
  altText?: string;
  alt?: string; // Alternative alt text for backward compatibility
  className?: string;
  thumbnailPosition?: "bottom" | "left";
  showThumbnails?: boolean;
}

// Optimized image component to reduce re-renders
const OptimizedImage = memo(({ 
  src, 
  alt, 
  className,
  loading = "lazy" 
}: { 
  src: string; 
  alt: string; 
  className: string;
  loading?: "lazy" | "eager"
}) => {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading={loading}
    />
  );
});

OptimizedImage.displayName = "OptimizedImage";

// Memoized thumbnail button component
const ThumbnailButton = memo(({ 
  image, 
  index, 
  isActive, 
  onClick,
  thumbnailPosition 
}: { 
  image: string; 
  index: number; 
  isActive: boolean; 
  onClick: () => void;
  thumbnailPosition: "bottom" | "left";
}) => (
  <button
    onClick={onClick}
    className={cn(
      "relative overflow-hidden flex-shrink-0 border-2 transition-all",
      thumbnailPosition === "left" 
        ? "w-12 h-12 sm:w-16 sm:h-16"
        : "w-12 h-12 sm:w-16 sm:h-16",
      isActive 
        ? "border-blue-500 opacity-100" 
        : "border-transparent opacity-70 hover:opacity-100"
    )}
  >
    <OptimizedImage
      src={image}
      alt={`Thumbnail ${index + 1}`}
      className="w-full h-full object-cover"
    />
  </button>
));

ThumbnailButton.displayName = "ThumbnailButton";

export function ImageCarousel({
  images,
  altText = "Image",
  alt, // For backward compatibility
  className,
  thumbnailPosition = "bottom",
  showThumbnails = true,
}: ImageCarouselProps) {
  // Use alt prop if available, otherwise fall back to altText
  const imageAltText = alt || altText;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);
  
  // Memoize handlers to prevent recreation on each render
  const next = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === images.length - 1 ? 0 : prevIndex + 1));
  }, [images.length]);

  const prev = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? images.length - 1 : prevIndex - 1));
  }, [images.length]);

  const toggleZoom = useCallback(() => {
    setIsZoomed(prevZoomed => !prevZoomed);
  }, []);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") {
        prev();
      } else if (e.key === "ArrowRight") {
        next();
      } else if (e.key === "Escape") {
        setIsZoomed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [prev, next]);

  // Optimized touch handlers with useCallback
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setTouchStart(e.targetTouches[0].clientX);
  }, []);
  
  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  }, []);
  
  const handleTouchEnd = useCallback(() => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;
    
    if (isLeftSwipe) {
      next();
    } else if (isRightSwipe) {
      prev();
    }
    
    setTouchStart(null);
    setTouchEnd(null);
  }, [touchStart, touchEnd, next, prev]);

  // Optimized event handlers with useCallback
  const handleZoomButtonClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    toggleZoom();
  }, [toggleZoom]);

  const handlePrevClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    prev();
  }, [prev]);

  const handleNextClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    next();
  }, [next]);

  const handleCloseZoom = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIsZoomed(false);
  }, []);

  // Memoize the thumbnail click handlers
  const getThumbnailClickHandler = useCallback((index: number) => {
    return () => setCurrentIndex(index);
  }, []);

  // Early return for no images case
  if (!images || images.length === 0) {
    return (
      <div className={cn("relative rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center h-64", className)}>
        <span className="text-gray-400 text-sm">No images available</span>
      </div>
    );
  }

  // Memoize container classes
  const containerClasses = useMemo(() => cn(
    "relative rounded-lg overflow-hidden bg-gray-100",
    thumbnailPosition === "left" ? "flex flex-row gap-2" : "flex flex-col gap-2",
    className
  ), [thumbnailPosition, className]);

  // Memoize main image container classes
  const mainImageContainerClasses = useMemo(() => cn(
    "relative overflow-hidden",
    thumbnailPosition === "left" ? "flex-1" : "w-full",
    isZoomed ? "cursor-zoom-out" : "cursor-zoom-in"
  ), [thumbnailPosition, isZoomed]);

  // Memoize image wrapper classes
  const imageWrapperClasses = useMemo(() => cn(
    "transition-all duration-300 ease-in-out h-48 sm:h-64 relative flex items-center justify-center bg-white",
    isZoomed && "fixed inset-0 z-50 h-full w-full bg-black/90 flex items-center justify-center"
  ), [isZoomed]);

  // Memoize image classes
  const imageClasses = useMemo(() => cn(
    "object-contain max-h-full transition-transform duration-300",
    isZoomed ? "max-w-[95%] sm:max-w-[90%] max-h-[95%] sm:max-h-[90%]" : "max-w-full"
  ), [isZoomed]);

  // Memoize thumbnails container classes
  const thumbnailsContainerClasses = useMemo(() => cn(
    "flex gap-1 sm:gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent p-1",
    thumbnailPosition === "left" 
      ? "flex-col max-h-48 sm:max-h-64 w-14 sm:w-20" 
      : "flex-row max-w-full"
  ), [thumbnailPosition]);

  return (
    <div className={containerClasses}>
      {/* Main image container */}
      <div 
        className={mainImageContainerClasses}
        onClick={toggleZoom}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div className={imageWrapperClasses}>
          {isZoomed && (
            <button 
              onClick={handleCloseZoom}
              className="absolute top-2 sm:top-4 right-2 sm:right-4 bg-white/10 p-1.5 sm:p-2 rounded-full text-white hover:bg-white/20 transition-colors z-10"
              aria-label="Close zoom view"
            >
              <X className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          )}
          <OptimizedImage
            src={images[currentIndex]}
            alt={`${imageAltText} ${currentIndex + 1}`}
            className={imageClasses}
            loading="eager" // Load current image eagerly
          />
        </div>

        {!isZoomed && (
          <>
            {/* Zoom button */}
            <button
              onClick={handleZoomButtonClick}
              className="absolute bottom-2 sm:bottom-3 right-2 sm:right-3 bg-white/70 p-1 sm:p-1.5 rounded-full text-gray-700 hover:bg-white transition-colors"
              aria-label="Zoom image"
            >
              <ZoomIn className="h-3 w-3 sm:h-4 sm:w-4" />
            </button>

            {/* Navigation buttons */}
            {images.length > 1 && (
              <>
                <button
                  onClick={handlePrevClick}
                  className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 bg-white/70 p-1 sm:p-1.5 rounded-full text-gray-700 hover:bg-white transition-colors"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>
                <button
                  onClick={handleNextClick}
                  className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 bg-white/70 p-1 sm:p-1.5 rounded-full text-gray-700 hover:bg-white transition-colors"
                  aria-label="Next image"
                >
                  <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
                </button>

                {/* Image counter */}
                <div className="absolute bottom-2 sm:bottom-3 left-2 sm:left-3 bg-black/50 text-white text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md">
                  {currentIndex + 1} / {images.length}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {/* Thumbnails */}
      {showThumbnails && images.length > 1 && (
        <div className={thumbnailsContainerClasses}>
          {images.map((image, index) => (
            <ThumbnailButton
              key={index}
              image={image}
              index={index}
              isActive={index === currentIndex}
              onClick={getThumbnailClickHandler(index)}
              thumbnailPosition={thumbnailPosition}
            />
          ))}
        </div>
      )}
    </div>
  );
}