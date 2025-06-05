import React, { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface FileUploadProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  accept?: string;
  maxSize?: number; // in MB
}

export function FileUpload({
  value,
  onChange,
  disabled = false,
  accept = "image/*",
  maxSize = 5, // 5MB default
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    e.dataTransfer.dropEffect = "copy";
    setIsDragging(true);
  };

  const processFile = (file: File) => {
    setError(null);

    // Check file size
    if (file.size > maxSize * 1024 * 1024) {
      setError(`File size exceeds ${maxSize}MB limit`);
      return;
    }

    // Check file type
    if (accept && !file.type.match(accept.replace("*", "."))) {
      setError(`File type not supported. Please upload ${accept} file`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        onChange(e.target.result.toString());
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
    setError(null);
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  };

  return (
    <div className="relative w-full">
      <div
        onClick={handleClick}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          "relative flex flex-col items-center justify-center w-full rounded-md transition-all duration-200 cursor-pointer border-2 border-dashed min-h-[100px] sm:min-h-[120px] p-2 sm:p-4",
          isDragging && !disabled
            ? "border-blue-500 bg-blue-50"
            : disabled
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-blue-200 hover:border-blue-300 bg-blue-50/50 hover:bg-blue-50",
          error && "border-red-300 bg-red-50/50"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={handleFileChange}
          accept={accept}
          disabled={disabled}
        />

        {value ? (
          <div className="relative w-full flex items-center justify-center">
            {value.startsWith("data:image/") || value.match(/\.(jpeg|jpg|gif|png)$/) ? (
              <div className="relative rounded-md overflow-hidden max-h-[150px] sm:max-h-[200px] flex items-center justify-center">
                <img 
                  src={value} 
                  alt="Preview" 
                  className="max-h-[150px] sm:max-h-[200px] max-w-full object-contain"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-1 sm:right-2 top-1 sm:top-2 bg-white/80 p-1 rounded-full hover:bg-white"
                    aria-label="Clear image"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                  </button>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-2 text-blue-600 max-w-full">
                <ImageIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <span className="truncate max-w-[calc(100%-2.5rem)] text-xs sm:text-sm">{value}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="p-1 rounded-full hover:bg-white flex-shrink-0"
                    aria-label="Clear image"
                  >
                    <X className="h-3 w-3 sm:h-4 sm:w-4 text-gray-700" />
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-2 sm:p-3">
            <Upload className={cn("h-8 w-8 sm:h-10 sm:w-10 mb-1 sm:mb-2", disabled ? "text-gray-300" : "text-blue-400")} />
            <div className={cn("text-xs sm:text-sm", disabled ? "text-gray-400" : "text-blue-600 font-medium")}>
              Click to upload or drag and drop
            </div>
            <p className={cn("text-[10px] sm:text-xs mt-0.5 sm:mt-1", disabled ? "text-gray-400" : "text-blue-400")}>
              {accept === "image/*" ? "PNG, JPG, GIF up to " : "File up to "}
              {maxSize}MB
            </p>
          </div>
        )}
      </div>
      
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  );
}