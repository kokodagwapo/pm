import * as React from "react";

import { cn } from "@/lib/utils";

interface InputProps extends React.ComponentProps<"input"> {
  error?: string;
}

function Input({ className, type, error, ...props }: InputProps) {
  return (
    <div className="space-y-1">
      <input
        type={type}
        className={cn(
          "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground",
          "flex h-10 w-full min-w-0 rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25",
          className
        )}
        aria-invalid={!!error}
        {...props}
        data-slot="input"
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export { Input };
