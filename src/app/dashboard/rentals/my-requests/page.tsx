"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { GlobalPagination } from "@/components/ui/global-pagination";
import {
  ListChecks,
  Plus,
  Eye,
  X,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Loader2,
  Tag,
  RefreshCw,
  Moon,
} from "lucide-react";
import { UserRole, RentalRequestStatus } from "@/types";

interface RentalRequest {
  _id: string;
  propertyId: {
    _id: string;
    name: string;
    address?: { city: string; state: string };
    images?: string[];
  };
  unitId: string;
  requestedStartDate: string;
  requestedEndDate: string;
  status: RentalRequestStatus;
  basePrice: number;
  calculatedPrice: number;
  totalNights: number;
  discountsApplied: { type: string; label: string; percentage?: number; amount: number }[];
  tenantMessage?: string;
  adminResponse?: string;
  respondedBy?: { firstName: string; lastName: string };
  respondedAt?: string;
  approvedLeaseId?: any;
  expiresAt: string;
  createdAt: string;
}

const STATUS_BADGES: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
  pending: { variant: "default", label: "Pending" },
  approved: { variant: "secondary", label: "Approved" },
  rejected: { variant: "destructive", label: "Rejected" },
  expired: { variant: "outline", label: "Expired" },
  cancelled: { variant: "outline", label: "Cancelled" },
};

export default function MyRentalRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role as UserRole;

  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);

  useEffect(() => {
    if (userRole && userRole !== UserRole.TENANT) {
      router.push("/dashboard");
    }
  }, [userRole, router]);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: page.toString(), limit: "12" });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(`/api/rental-requests?${params}`);
      const data = await res.json();
      if (data.success) {
        setRequests(data.data?.requests || []);
        setTotal(data.pagination?.total || 0);
        setTotalPages(data.pagination?.pages || 1);
      }
    } catch {
      toast.error("Failed to load rental requests");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    if (session?.user) fetchRequests();
  }, [fetchRequests, session]);

  const handleCancel = async (id: string) => {
    try {
      setCancelling(id);
      const res = await fetch(`/api/rental-requests/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        toast.success("Request cancelled");
        fetchRequests();
      } else {
        toast.error(data.error || "Failed to cancel request");
      }
    } catch {
      toast.error("Failed to cancel request");
    } finally {
      setCancelling(null);
    }
  };

  const viewDetails = (request: RentalRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;
  const approvedCount = requests.filter((r) => r.status === "approved").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">My Rental Requests</h1>
          <p className="text-muted-foreground">
            View and manage your rental requests
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/rentals/request")}>
          <Plus className="mr-2 h-4 w-4" />
          New Request
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ListChecks className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{total}</p>
                <p className="text-xs text-muted-foreground">Total Requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                <Clock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <DollarSign className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{approvedCount}</p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Requests</CardTitle>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                  <SelectItem value="expired">Expired</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={fetchRequests}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <ListChecks className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No rental requests found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => router.push("/dashboard/rentals/request")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Request
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Property</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Nights</TableHead>
                    <TableHead>Price</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((req) => {
                    const statusInfo = STATUS_BADGES[req.status] || STATUS_BADGES.pending;
                    return (
                      <TableRow key={req._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">
                              {(req.propertyId as any)?.name || "Unknown Property"}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(req.requestedStartDate).toLocaleDateString()} –{" "}
                          {new Date(req.requestedEndDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{req.totalNights}</TableCell>
                        <TableCell className="font-medium">
                          ${req.calculatedPrice.toFixed(2)}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewDetails(req)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {req.status === "pending" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancel(req._id)}
                                disabled={cancelling === req._id}
                              >
                                {cancelling === req._id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <X className="h-3.5 w-3.5 text-destructive" />
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {totalPages > 1 && (
                <div className="mt-4">
                  <GlobalPagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={12}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Rental Request Details</DialogTitle>
            <DialogDescription>
              Request submitted on{" "}
              {selectedRequest && new Date(selectedRequest.createdAt).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">
                  {(selectedRequest.propertyId as any)?.name || "Unknown Property"}
                </span>
                <Badge variant={STATUS_BADGES[selectedRequest.status]?.variant || "default"}>
                  {STATUS_BADGES[selectedRequest.status]?.label || selectedRequest.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {new Date(selectedRequest.requestedStartDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {new Date(selectedRequest.requestedEndDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Nights</p>
                  <p className="font-medium">{selectedRequest.totalNights}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Expires</p>
                  <p className="font-medium">
                    {new Date(selectedRequest.expiresAt).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Base price</span>
                  <span>${selectedRequest.basePrice.toFixed(2)}</span>
                </div>
                {selectedRequest.discountsApplied?.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {d.label}
                    </span>
                    <span className="text-emerald-600">-${d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>${selectedRequest.calculatedPrice.toFixed(2)}</span>
                </div>
              </div>

              {selectedRequest.tenantMessage && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Your Message</p>
                  <p className="text-sm">{selectedRequest.tenantMessage}</p>
                </div>
              )}

              {selectedRequest.adminResponse && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-600 mb-1">
                    Response from{" "}
                    {selectedRequest.respondedBy
                      ? `${selectedRequest.respondedBy.firstName} ${selectedRequest.respondedBy.lastName}`
                      : "Admin"}
                  </p>
                  <p className="text-sm">{selectedRequest.adminResponse}</p>
                </div>
              )}

              {selectedRequest.approvedLeaseId && (
                <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 flex items-center justify-between">
                  <p className="text-sm text-emerald-700 dark:text-emerald-300">
                    Lease has been created
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const leaseId = typeof selectedRequest.approvedLeaseId === "object"
                        ? selectedRequest.approvedLeaseId._id
                        : selectedRequest.approvedLeaseId;
                      router.push(`/dashboard/leases/${leaseId}`);
                    }}
                  >
                    View Lease
                  </Button>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
