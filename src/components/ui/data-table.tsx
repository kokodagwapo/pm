"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useOptionalDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";

// Column definition type
export interface DataTableColumn<T> {
  id: string;
  header: React.ReactNode;
  cell: (row: T, index: number) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  /** Responsive visibility: 'always' | 'sm' | 'md' | 'lg' | 'xl' */
  visibility?: "always" | "sm" | "md" | "lg" | "xl";
  /** Width class e.g., 'w-12', 'w-[200px]', 'min-w-[120px]' */
  width?: string;
  /** Text alignment */
  align?: "left" | "center" | "right";
}

// Selection configuration
export interface DataTableSelection<T> {
  enabled: boolean;
  selectedIds: string[];
  onSelectAll: (checked: boolean) => void;
  onSelectRow: (id: string, checked: boolean) => void;
  getRowId: (row: T) => string;
  isRowDisabled?: (row: T) => boolean;
  selectAllLabel?: string;
  selectRowLabel?: (row: T) => string;
}

// Pagination configuration
export interface DataTablePagination {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  showingText?: string; // e.g., "Showing 1-10 of 100"
  previousLabel?: string;
  nextLabel?: string;
}

// Empty state configuration
export interface DataTableEmptyState {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

// Error state configuration
export interface DataTableErrorState {
  message: string;
  icon?: React.ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
}

// Loading skeleton configuration
export interface DataTableLoadingConfig {
  rows?: number;
  /** Custom skeleton for each column, or use default */
  columnSkeletons?: Record<string, React.ReactNode>;
}

// Main DataTable props
export interface DataTableProps<T> {
  columns: DataTableColumn<T>[];
  data: T[];
  loading?: boolean;
  error?: DataTableErrorState | null;
  emptyState?: DataTableEmptyState;
  selection?: DataTableSelection<T>;
  pagination?: DataTablePagination;
  loadingConfig?: DataTableLoadingConfig;
  /** Container class for the table wrapper */
  containerClassName?: string;
  /** Class for the table element */
  tableClassName?: string;
  /** Enable zebra striping */
  striped?: boolean;
  /** Row key extractor */
  getRowKey: (row: T, index: number) => string;
  /** Custom row class */
  getRowClassName?: (row: T, index: number) => string;
  /** On row click handler */
  onRowClick?: (row: T) => void;
}

function DataTable<T>({
  columns,
  data,
  loading = false,
  error = null,
  emptyState,
  selection,
  pagination,
  loadingConfig = { rows: 8 },
  containerClassName,
  tableClassName,
  striped = true,
  getRowKey,
  getRowClassName,
  onRowClick,
}: DataTableProps<T>) {
  const dash = useOptionalDashboardAppearance();
  const isLight = dash?.isLight ?? false;

  // Helper to get visibility class
  const getVisibilityClass = (visibility?: string) => {
    switch (visibility) {
      case "sm":
        return "hidden sm:table-cell";
      case "md":
        return "hidden md:table-cell";
      case "lg":
        return "hidden lg:table-cell";
      case "xl":
        return "hidden xl:table-cell";
      default:
        return "";
    }
  };

  // Helper to get alignment class
  const getAlignClass = (align?: string) => {
    switch (align) {
      case "center":
        return "text-center";
      case "right":
        return "text-right";
      default:
        return "text-left";
    }
  };

  // Check if all visible rows are selected
  const isAllSelected = React.useMemo(() => {
    if (!selection) return false;
    const selectableRows = data.filter(
      (row) => !selection.isRowDisabled?.(row)
    );
    if (selectableRows.length === 0) return false;
    return selectableRows.every((row) =>
      selection.selectedIds.includes(selection.getRowId(row))
    );
  }, [data, selection]);

  // Render loading skeleton
  const renderLoadingSkeleton = () => (
    <>
      {Array.from({ length: loadingConfig.rows || 8 }).map((_, rowIndex) => (
        <TableRow key={`skeleton-${rowIndex}`}>
          {selection?.enabled && (
            <TableCell className="py-4 px-4 w-12">
              <Skeleton className="h-4 w-4" />
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell
              key={`skeleton-${rowIndex}-${column.id}`}
              className={cn(
                "py-4 px-4",
                getVisibilityClass(column.visibility),
                column.className
              )}
            >
              {loadingConfig.columnSkeletons?.[column.id] || (
                <Skeleton className="h-4 w-full max-w-[120px]" />
              )}
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  // Render error state
  const renderError = () => (
    <TableRow>
      <TableCell
        colSpan={columns.length + (selection?.enabled ? 1 : 0)}
        className="py-16"
      >
        <div className="flex flex-col items-center justify-center text-center">
          {error?.icon}
          <span
            className={cn(
              "mt-2",
              isLight ? "text-red-700" : "text-red-300"
            )}
          >
            {error?.message}
          </span>
          {error?.onRetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={error.onRetry}
              className={cn(
                "mt-4",
                isLight
                  ? "border-slate-200 bg-white text-black hover:bg-slate-50"
                  : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              )}
            >
              {error.retryLabel || "Try Again"}
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Render empty state
  const renderEmpty = () => (
    <TableRow>
      <TableCell
        colSpan={columns.length + (selection?.enabled ? 1 : 0)}
        className="py-16"
      >
        <div className="flex flex-col items-center justify-center text-center">
          {emptyState?.icon}
          <span
            className={cn(
              "mt-2 font-medium",
              isLight ? "text-black" : "text-white"
            )}
          >
            {emptyState?.title}
          </span>
          {emptyState?.description && (
            <span
              className={cn(
                "mt-1 text-sm",
                isLight ? "text-black" : "text-white/75"
              )}
            >
              {emptyState.description}
            </span>
          )}
          {emptyState?.action && (
            <div className="mt-4">{emptyState.action}</div>
          )}
        </div>
      </TableCell>
    </TableRow>
  );

  // Render data rows
  const renderDataRows = () =>
    data.map((row, index) => {
      const rowKey = getRowKey(row, index);
      const isSelected = selection
        ? selection.selectedIds.includes(selection.getRowId(row))
        : false;
      const isDisabled = selection?.isRowDisabled?.(row) ?? false;

      return (
        <TableRow
          key={rowKey}
          className={cn(
            "border-b transition-colors",
            isLight
              ? cn(
                  "border-slate-100 hover:bg-slate-50/90",
                  striped &&
                    (index % 2 === 0 ? "bg-white" : "bg-slate-50/50"),
                  isSelected && "bg-sky-50"
                )
              : cn(
                  "border-white/10 hover:bg-white/[0.07]",
                  striped &&
                    (index % 2 === 0
                      ? "bg-white/[0.03]"
                      : "bg-white/[0.06]"),
                  isSelected && "bg-white/12"
                ),
            onRowClick && "cursor-pointer",
            getRowClassName?.(row, index)
          )}
          onClick={() => onRowClick?.(row)}
          data-state={isSelected ? "selected" : undefined}
        >
          {selection?.enabled && (
            <TableCell className="py-4 px-4 w-12">
              <Checkbox
                checked={isSelected}
                onCheckedChange={(checked) =>
                  selection.onSelectRow(
                    selection.getRowId(row),
                    checked as boolean
                  )
                }
                disabled={isDisabled}
                aria-label={selection.selectRowLabel?.(row) || "Select row"}
                onClick={(e) => e.stopPropagation()}
              />
            </TableCell>
          )}
          {columns.map((column) => (
            <TableCell
              key={`${rowKey}-${column.id}`}
              className={cn(
                "py-4 px-4",
                getVisibilityClass(column.visibility),
                getAlignClass(column.align),
                column.className
              )}
            >
              {column.cell(row, index)}
            </TableCell>
          ))}
        </TableRow>
      );
    });

  return (
    <div className={cn("space-y-4", containerClassName)}>
      <div
        className={cn(
          "overflow-hidden rounded-lg border backdrop-blur-sm [-webkit-backdrop-filter:blur(8px)]",
          isLight
            ? "border-slate-200/90 bg-white/70"
            : "border-white/15 bg-white/[0.03]"
        )}
      >
        <Table className={tableClassName}>
          <TableHeader
            className={cn(
              "border-b",
              isLight
                ? "border-slate-200 bg-slate-50/95"
                : "border-white/12 bg-white/[0.06]"
            )}
          >
            <TableRow
              className={cn(
                "border-b hover:bg-transparent",
                isLight ? "border-slate-200" : "border-white/12"
              )}
            >
              {selection?.enabled && (
                <TableHead
                  className={cn(
                    "w-12 px-4 py-3 font-medium",
                    isLight ? "text-black" : "text-white/90"
                  )}
                >
                  <Checkbox
                    checked={isAllSelected}
                    onCheckedChange={selection.onSelectAll}
                    aria-label={selection.selectAllLabel || "Select all"}
                  />
                </TableHead>
              )}
              {columns.map((column) => (
                <TableHead
                  key={column.id}
                  className={cn(
                    "px-4 py-3 font-medium",
                    isLight ? "text-black" : "text-white/90",
                    getVisibilityClass(column.visibility),
                    getAlignClass(column.align),
                    column.width,
                    column.headerClassName
                  )}
                >
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading
              ? renderLoadingSkeleton()
              : error
              ? renderError()
              : data.length === 0
              ? renderEmpty()
              : renderDataRows()}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {pagination && !loading && !error && data.length > 0 && (
        <div className="flex items-center justify-between px-2">
          <div
            className={cn(
              "text-sm",
              isLight ? "text-black" : "text-white/70"
            )}
          >
            {pagination.showingText}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage - 1)
              }
              disabled={pagination.currentPage <= 1}
              className={cn(
                isLight
                  ? "border-slate-200 bg-white text-black hover:bg-slate-50"
                  : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              )}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {pagination.previousLabel || "Previous"}
            </Button>
            <span
              className={cn(
                "text-sm",
                isLight ? "text-black" : "text-white/75"
              )}
            >
              {pagination.currentPage} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                pagination.onPageChange(pagination.currentPage + 1)
              }
              disabled={pagination.currentPage >= pagination.totalPages}
              className={cn(
                isLight
                  ? "border-slate-200 bg-white text-black hover:bg-slate-50"
                  : "border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white"
              )}
            >
              {pagination.nextLabel || "Next"}
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export { DataTable };
