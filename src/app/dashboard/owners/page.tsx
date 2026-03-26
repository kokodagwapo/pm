"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  UserPlus,
  Search,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Building2,
  Phone,
  User,
  Grid3X3,
  List,
  ChevronRight,
} from "lucide-react";
import { InlinePreloader } from "@/components/ui/preloader";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Owner {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  isActive: boolean;
  createdAt: string;
  propertyCount: number;
  avatar?: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const VIEW_STORAGE_KEY = "smartstartpm-owners-view-mode";
type OwnersViewMode = "list" | "grid";

function loadSavedView(): OwnersViewMode {
  if (typeof window === "undefined") return "list";
  const v = sessionStorage.getItem(VIEW_STORAGE_KEY);
  return v === "grid" ? "grid" : "list";
}

const OwnerRowMenu = memo(function OwnerRowMenu({
  ownerId,
  onDelete,
}: {
  ownerId: string;
  onDelete: (id: string) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 shrink-0"
          aria-label="Owner actions"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/owners/${ownerId}`}>
            <Eye className="mr-2 h-4 w-4" />
            View details
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href={`/dashboard/owners/${ownerId}/edit`}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-destructive focus:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(ownerId);
          }}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
});

const OwnerListItem = memo(function OwnerListItem({
  owner,
  onDelete,
}: {
  owner: Owner;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const initials = `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();

  const openDetails = () => router.push(`/dashboard/owners/${owner._id}`);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${owner.firstName} ${owner.lastName}, view details`}
      data-slot="dashboard-list-row"
      className={cn(
        "flex cursor-pointer items-center gap-3 rounded-xl border border-border/80 bg-card p-3 transition-all backdrop-blur-sm",
        "hover:border-primary/20 hover:bg-accent/40 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      }}
    >
      <Avatar className="h-11 w-11 shrink-0 ring-2 ring-background">
        <AvatarImage src={owner.avatar} alt="" />
        <AvatarFallback className="text-sm font-medium">{initials}</AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-semibold text-foreground">
            {owner.firstName} {owner.lastName}
          </p>
          <Badge
            variant={owner.isActive ? "default" : "secondary"}
            className="h-5 text-[10px] uppercase tracking-wide"
          >
            {owner.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="truncate text-xs text-muted-foreground">{owner.email}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {owner.propertyCount} propert{owner.propertyCount === 1 ? "y" : "ies"}
          </span>
          {owner.phone && (
            <span className="inline-flex items-center gap-1">
              <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
              {owner.phone}
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-60" aria-hidden />

      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <OwnerRowMenu ownerId={owner._id} onDelete={onDelete} />
      </div>
    </div>
  );
});

const OwnerGridCard = memo(function OwnerGridCard({
  owner,
  onDelete,
}: {
  owner: Owner;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const initials = `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();

  const openDetails = () => router.push(`/dashboard/owners/${owner._id}`);

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${owner.firstName} ${owner.lastName}, view details`}
      data-slot="dashboard-list-row"
      className={cn(
        "group relative flex min-h-[200px] cursor-pointer flex-col rounded-xl border border-border/80 bg-card p-4 pt-5 transition-all backdrop-blur-sm",
        "hover:border-primary/25 hover:shadow-md",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      )}
      onClick={openDetails}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openDetails();
        }
      }}
    >
      <div
        className="absolute right-2 top-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
        role="presentation"
      >
        <OwnerRowMenu ownerId={owner._id} onDelete={onDelete} />
      </div>

      <div className="flex flex-col items-center text-center">
        <Avatar className="h-14 w-14 ring-2 ring-background">
          <AvatarImage src={owner.avatar} alt="" />
          <AvatarFallback className="text-base font-semibold">{initials}</AvatarFallback>
        </Avatar>
        <p className="mt-3 line-clamp-1 text-sm font-semibold text-foreground">
          {owner.firstName} {owner.lastName}
        </p>
        <Badge
          variant={owner.isActive ? "default" : "secondary"}
          className="mt-2 h-5 text-[10px] uppercase tracking-wide"
        >
          {owner.isActive ? "Active" : "Inactive"}
        </Badge>
        <p className="mt-2 line-clamp-2 w-full break-all text-xs text-muted-foreground">
          {owner.email}
        </p>
      </div>

      <div className="mt-auto flex flex-col gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
        <span className="flex items-center justify-center gap-1.5">
          <Building2 className="h-3.5 w-3.5 shrink-0 opacity-70" />
          {owner.propertyCount} propert{owner.propertyCount === 1 ? "y" : "ies"}
        </span>
        {owner.phone && (
          <span className="flex items-center justify-center gap-1.5">
            <Phone className="h-3.5 w-3.5 shrink-0 opacity-70" />
            {owner.phone}
          </span>
        )}
        <span className="flex items-center justify-center gap-1 pt-1 text-[11px] font-medium text-primary">
          View details
          <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
});

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [viewMode, setViewMode] = useState<OwnersViewMode>("list");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

  useEffect(() => {
    setViewMode(loadSavedView());
  }, []);

  const persistView = useCallback((mode: OwnersViewMode) => {
    setViewMode(mode);
    try {
      sessionStorage.setItem(VIEW_STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
  }, []);

  const fetchOwners = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);

      const response = await fetch(`/api/owners?${params}`);
      const data = await response.json();

      if (data.success) {
        setOwners(data.data.owners);
        setPagination((prev) => ({ ...prev, ...data.data.pagination }));
      }
    } catch (error) {
      console.error("Error fetching owners:", error);
      toast.error("Failed to fetch owners");
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, search, status]);

  useEffect(() => {
    const debounce = setTimeout(fetchOwners, 300);
    return () => clearTimeout(debounce);
  }, [fetchOwners]);

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this owner?")) return;

    try {
      const response = await fetch(`/api/owners/${id}`, { method: "DELETE" });
      const data = await response.json();

      if (data.success) {
        toast.success("Owner deleted successfully");
        fetchOwners();
      } else {
        toast.error(data.error || "Failed to delete owner");
      }
    } catch {
      toast.error("Failed to delete owner");
    }
  };

  const viewToggleBtn = (mode: OwnersViewMode, label: string, Icon: typeof List) => (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className={cn(
        "h-9 gap-1.5 px-3",
        viewMode === mode
          ? "bg-primary/12 text-primary hover:bg-primary/15 hover:text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
      aria-pressed={viewMode === mode}
      onClick={() => persistView(mode)}
    >
      <Icon className="h-4 w-4" />
      {label}
    </Button>
  );

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Property Owners</h1>
          <p className="text-sm text-muted-foreground">
            Manage property owner accounts — click a row or card to open details
          </p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/owners/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Owner
          </Link>
        </Button>
      </div>

      <Card className="overflow-hidden border-border/80 shadow-sm">
        <CardHeader className="space-y-1 border-b border-border/60 bg-muted/20 pb-4">
          <CardTitle className="text-base font-semibold">All Property Owners</CardTitle>
          <CardDescription className="text-xs">
            {pagination.total} owner{pagination.total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4 font-normal">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-0 flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search owners..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="h-10 pl-9"
              />
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
              >
                <SelectTrigger className="h-10 w-full sm:w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              <div
                className="inline-flex shrink-0 rounded-lg border border-border bg-muted/30 p-1"
                role="group"
                aria-label="Layout"
              >
                {viewToggleBtn("list", "List", List)}
                {viewToggleBtn("grid", "Grid", Grid3X3)}
              </div>
            </div>
          </div>

          {loading ? (
            <InlinePreloader />
          ) : owners.length === 0 ? (
            <div className="py-10 text-center">
              <User className="mx-auto h-10 w-10 text-muted-foreground/40" />
              <h3 className="mt-3 text-sm font-medium">No owners found</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {search || status !== "all"
                  ? "Try adjusting your filters"
                  : "Add your first property owner"}
              </p>
              {!search && status === "all" && (
                <Button asChild size="sm" className="mt-4">
                  <Link href="/dashboard/owners/new">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Owner
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              {viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {owners.map((owner) => (
                    <OwnerGridCard key={owner._id} owner={owner} onDelete={handleDelete} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {owners.map((owner) => (
                    <OwnerListItem key={owner._id} owner={owner} onDelete={handleDelete} />
                  ))}
                </div>
              )}

              {pagination.pages > 1 && (
                <div className="flex flex-col gap-2 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-center text-xs text-muted-foreground sm:text-left">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex justify-center gap-2 sm:justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                      }
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() =>
                        setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                      }
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
