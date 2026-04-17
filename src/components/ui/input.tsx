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
          "flex h-11 w-full min-w-0 rounded-xl border border-input/75 bg-[color:var(--form-field-bg)] px-3.5 py-2.5 text-sm shadow-[0_1px_2px_rgb(15_23_42/0.04),0_0_0_1px_rgb(255_255_255/0.45)_inset]",
          "transition-[color,box-shadow,border-color,background-color] outline-none",
          "hover:border-input hover:bg-[color:var(--form-field-bg-hover)] focus-visible:border-ring/65 focus-visible:bg-[color:var(--form-field-bg-focus)] focus-visible:ring-4 focus-visible:ring-ring/12",
          "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
          "file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium",
          error &&
            "border-destructive/80 focus-visible:border-destructive focus-visible:ring-destructive/12",
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
