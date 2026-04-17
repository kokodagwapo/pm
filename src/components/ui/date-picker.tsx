"use client";

import * as React from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DatePickerProps {
  date?: Date;
  onSelect?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  align?: "start" | "center" | "end";
  fromYear?: number;
  toYear?: number;
  id?: string;
}

export function DatePicker({
  date,
  onSelect,
  placeholder = "Pick a date",
  disabled,
  className,
  align = "start",
  fromYear,
  toYear,
  id,
}: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          className={cn(
            "h-11 w-full justify-start rounded-xl border border-input/75 bg-[color:var(--form-field-bg)] text-left font-normal shadow-[0_1px_2px_rgb(15_23_42/0.04),0_0_0_1px_rgb(255_255_255/0.45)_inset] transition-[color,box-shadow,border-color,background-color] duration-200 hover:border-input hover:bg-[color:var(--form-field-bg-hover)] focus:border-primary/60 focus:bg-[color:var(--form-field-bg-focus)] focus:ring-4 focus:ring-primary/12",
            !date && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? format(date, "PPP") : <span>{placeholder}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align={align}>
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          disabled={disabled}
          initialFocus
          captionLayout="dropdown"
          fromYear={fromYear}
          toYear={toYear}
        />
      </PopoverContent>
    </Popover>
  );
}

interface FormDatePickerProps {
  value?: Date;
  onChange?: (date: Date | undefined) => void;
  placeholder?: string;
  disabled?: (date: Date) => boolean;
  className?: string;
  align?: "start" | "center" | "end";
  fromYear?: number;
  toYear?: number;
  id?: string;
}

export function FormDatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  disabled,
  className,
  align = "start",
  fromYear,
  toYear,
  id,
}: FormDatePickerProps) {
  return (
    <DatePicker
      date={value}
      onSelect={onChange}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
      align={align}
      fromYear={fromYear}
      toYear={toYear}
      id={id}
    />
  );
}
