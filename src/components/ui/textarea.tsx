import * as React from "react";

import { cn } from "@/lib/utils";

interface TextareaProps extends React.ComponentProps<"textarea"> {
  error?: string;
}

function Textarea({ className, error, ...props }: TextareaProps) {
  return (
    <div className="space-y-1">
      <textarea
        className={cn(
          "placeholder:text-muted-foreground",
          "flex min-h-16 w-full resize-y rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm",
          "transition-[color,box-shadow,border-color] outline-none",
          "focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error &&
            "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/25",
          className
        )}
        aria-invalid={!!error}
        {...props}
        data-slot="textarea"
      />
      {error && <p className="text-sm text-red-600 mt-1">{error}</p>}
    </div>
  );
}

export { Textarea };
