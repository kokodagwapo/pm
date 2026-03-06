"use client";

import { useState, useEffect, useCallback, memo } from "react";
import Link from "next/link";
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
  Mail,
  Phone,
  User,
} from "lucide-react";
import { InlinePreloader } from "@/components/ui/preloader";
import { toast } from "sonner";

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

const OwnerCard = memo(function OwnerCard({
  owner,
  onDelete,
}: {
  owner: Owner;
  onDelete: (id: string) => void;
}) {
  const initials = `${owner.firstName?.[0] || ""}${owner.lastName?.[0] || ""}`.toUpperCase();

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarImage src={owner.avatar} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">
            {owner.firstName} {owner.lastName}
          </p>
          <Badge variant={owner.isActive ? "default" : "secondary"} className="text-[10px] h-5">
            {owner.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground truncate">{owner.email}</p>
        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            {owner.propertyCount}
          </span>
          {owner.phone && (
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3" />
              {owner.phone}
            </span>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/owners/${owner._id}`}>
              <Eye className="mr-2 h-4 w-4" />
              View
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href={`/dashboard/owners/${owner._id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="text-destructive" onClick={() => onDelete(owner._id)}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
});

export default function OwnersPage() {
  const [owners, setOwners] = useState<Owner[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });

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
    } catch (error) {
      toast.error("Failed to delete owner");
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold">Property Owners</h1>
          <p className="text-sm text-muted-foreground">Manage property owner accounts</p>
        </div>
        <Button asChild size="sm" className="w-full sm:w-auto">
          <Link href="/dashboard/owners/new">
            <UserPlus className="mr-2 h-4 w-4" />
            Add Owner
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">All Property Owners</CardTitle>
          <CardDescription className="text-xs">
            {pagination.total} owner{pagination.total !== 1 ? "s" : ""} total
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search owners..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPagination((prev) => ({ ...prev, page: 1 }));
                }}
                className="pl-9 h-9"
              />
            </div>
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
            >
              <SelectTrigger className="w-full sm:w-[140px] h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Content */}
          {loading ? (
            <InlinePreloader />
          ) : owners.length === 0 ? (
            <div className="text-center py-8">
              <User className="mx-auto h-10 w-10 text-muted-foreground/50" />
              <h3 className="mt-3 text-sm font-medium">No owners found</h3>
              <p className="text-xs text-muted-foreground mt-1">
                {search || status !== "all" ? "Try adjusting your filters" : "Add your first property owner"}
              </p>
              {!search && status === "all" && (
                <Button asChild size="sm" className="mt-3">
                  <Link href="/dashboard/owners/new">
                    <UserPlus className="mr-2 h-4 w-4" />
                    Add Owner
                  </Link>
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2">
                {owners.map((owner) => (
                  <OwnerCard key={owner._id} owner={owner} onDelete={handleDelete} />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    Page {pagination.page} of {pagination.pages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === 1}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page - 1 }))}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={pagination.page === pagination.pages}
                      onClick={() => setPagination((prev) => ({ ...prev, page: prev.page + 1 }))}
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
