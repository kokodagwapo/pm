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
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { GlobalPagination } from "@/components/ui/global-pagination";
import {
  ClipboardList,
  Eye,
  Check,
  X,
  Calendar,
  DollarSign,
  Building2,
  Clock,
  Loader2,
  Tag,
  RefreshCw,
  User,
  FileText,
  Moon,
} from "lucide-react";
import { UserRole, RentalRequestStatus } from "@/types";

interface RentalRequest {
  _id: string;
  propertyId: {
    _id: string;
    name: string;
    address?: { city: string; state: string };
  };
  unitId: string;
  tenantId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
  };
  requestedStartDate: string;
  requestedEndDate: string;
  status: RentalRequestStatus;
  basePrice: number;
  calculatedPrice: number;
  totalNights: number;
  discountsApplied: { type: string; label: string; percentage?: number; amount: number }[];
  priceBreakdown?: any;
  tenantMessage?: string;
  adminResponse?: string;
  respondedBy?: { firstName: string; lastName: string; email: string };
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

export default function AdminRentalRequestsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const userRole = session?.user?.role as UserRole;

  const [requests, setRequests] = useState<RentalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<RentalRequest | null>(null);
  const [adminResponse, setAdminResponse] = useState("");
  const [autoCreateLease, setAutoCreateLease] = useState(true);
  const [processing, setProcessing] = useState(false);

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailRequest, setDetailRequest] = useState<RentalRequest | null>(null);

  useEffect(() => {
    if (userRole && ![UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER].includes(userRole)) {
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

  const openAction = (request: RentalRequest, type: "approve" | "reject") => {
    setSelectedRequest(request);
    setActionType(type);
    setAdminResponse("");
    setAutoCreateLease(type === "approve");
    setActionDialogOpen(true);
  };

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return;

    try {
      setProcessing(true);
      const res = await fetch(`/api/rental-requests/${selectedRequest._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: actionType,
          adminResponse: adminResponse || undefined,
          autoCreateLease: actionType === "approve" ? autoCreateLease : false,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Request ${actionType}d successfully`);
        setActionDialogOpen(false);
        fetchRequests();
      } else {
        toast.error(data.error || `Failed to ${actionType} request`);
      }
    } catch {
      toast.error(`Failed to ${actionType} request`);
    } finally {
      setProcessing(false);
    }
  };

  const viewDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/rental-requests/${id}`);
      const data = await res.json();
      if (data.success) {
        setDetailRequest(data.data?.request);
        setDetailsOpen(true);
      } else {
        toast.error("Failed to load request details");
      }
    } catch {
      toast.error("Failed to load request details");
    }
  };

  const pendingCount = requests.filter((r) => r.status === "pending").length;

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Rental Requests</h1>
          <p className="text-muted-foreground">
            Review and manage tenant rental requests
          </p>
        </div>
        <Button variant="outline" onClick={fetchRequests}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
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
                <p className="text-xs text-muted-foreground">Pending Review</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                <Check className="h-5 w-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "approved").length}
                </p>
                <p className="text-xs text-muted-foreground">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                <X className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {requests.filter((r) => r.status === "rejected").length}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>All Requests</CardTitle>
            <Select value={statusFilter} onValueChange={(val) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Filter status" />
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
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-12">
              <ClipboardList className="h-12 w-12 mx-auto text-muted-foreground/40 mb-4" />
              <p className="text-muted-foreground">No rental requests found</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
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
                    const tenant = req.tenantId as any;
                    const property = req.propertyId as any;
                    return (
                      <TableRow key={req._id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            <div>
                              <p className="font-medium text-sm">
                                {tenant?.firstName} {tenant?.lastName}
                              </p>
                              <p className="text-xs text-muted-foreground">{tenant?.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm">{property?.name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {new Date(req.requestedStartDate).toLocaleDateString()} –{" "}
                          {new Date(req.requestedEndDate).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{req.totalNights}</TableCell>
                        <TableCell className="font-medium">
                          ${req.calculatedPrice.toFixed(2)}
                          {req.discountsApplied?.length > 0 && (
                            <span className="text-xs text-emerald-600 ml-1">
                              ({req.discountsApplied.length} discount{req.discountsApplied.length !== 1 ? "s" : ""})
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(req.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => viewDetails(req._id)}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            {req.status === "pending" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-emerald-600 hover:text-emerald-700"
                                  onClick={() => openAction(req, "approve")}
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700"
                                  onClick={() => openAction(req, "reject")}
                                >
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
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

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve" : "Reject"} Rental Request
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Approve this rental request and optionally create a lease."
                : "Reject this rental request with an optional response message."}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <User className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {(selectedRequest.tenantId as any)?.firstName}{" "}
                    {(selectedRequest.tenantId as any)?.lastName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>{(selectedRequest.propertyId as any)?.name}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>
                    {new Date(selectedRequest.requestedStartDate).toLocaleDateString()} –{" "}
                    {new Date(selectedRequest.requestedEndDate).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>${selectedRequest.calculatedPrice.toFixed(2)}</span>
                  <span className="text-muted-foreground font-normal">
                    ({selectedRequest.totalNights} nights)
                  </span>
                </div>
              </div>

              {selectedRequest.tenantMessage && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tenant Message</p>
                  <p className="text-sm">{selectedRequest.tenantMessage}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium mb-1.5 block">
                  Response Message (optional)
                </label>
                <Textarea
                  placeholder={
                    actionType === "approve"
                      ? "Welcome! We look forward to hosting you..."
                      : "Unfortunately, we cannot accommodate this request because..."
                  }
                  value={adminResponse}
                  onChange={(e) => setAdminResponse(e.target.value)}
                  rows={3}
                />
              </div>

              {actionType === "approve" && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Auto-create lease</p>
                      <p className="text-xs text-muted-foreground">
                        Automatically create a draft lease upon approval
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={autoCreateLease}
                    onCheckedChange={setAutoCreateLease}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAction}
              disabled={processing}
              variant={actionType === "approve" ? "default" : "destructive"}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : actionType === "approve" ? (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </>
              ) : (
                <>
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Request Details</DialogTitle>
          </DialogHeader>
          {detailRequest && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_BADGES[detailRequest.status]?.variant || "default"}>
                  {STATUS_BADGES[detailRequest.status]?.label || detailRequest.status}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  Submitted {new Date(detailRequest.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">Tenant</p>
                  <p className="font-medium">
                    {(detailRequest.tenantId as any)?.firstName}{" "}
                    {(detailRequest.tenantId as any)?.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {(detailRequest.tenantId as any)?.email}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Property</p>
                  <p className="font-medium">{(detailRequest.propertyId as any)?.name}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-in</p>
                  <p className="font-medium">
                    {new Date(detailRequest.requestedStartDate).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Check-out</p>
                  <p className="font-medium">
                    {new Date(detailRequest.requestedEndDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <p className="text-sm font-medium">Price Breakdown</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">
                    Base ({detailRequest.totalNights} nights)
                  </span>
                  <span>${detailRequest.basePrice.toFixed(2)}</span>
                </div>
                {detailRequest.discountsApplied?.map((d, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-emerald-600 flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {d.label}
                      {d.percentage ? ` (${d.percentage}%)` : ""}
                    </span>
                    <span className="text-emerald-600">-${d.amount.toFixed(2)}</span>
                  </div>
                ))}
                <div className="flex justify-between font-semibold border-t pt-2">
                  <span>Total</span>
                  <span>${detailRequest.calculatedPrice.toFixed(2)}</span>
                </div>
              </div>

              {detailRequest.tenantMessage && (
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs font-medium text-muted-foreground mb-1">Tenant Message</p>
                  <p className="text-sm">{detailRequest.tenantMessage}</p>
                </div>
              )}

              {detailRequest.adminResponse && (
                <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3">
                  <p className="text-xs font-medium text-blue-600 mb-1">
                    Admin Response
                    {detailRequest.respondedBy &&
                      ` by ${(detailRequest.respondedBy as any).firstName} ${(detailRequest.respondedBy as any).lastName}`}
                  </p>
                  <p className="text-sm">{detailRequest.adminResponse}</p>
                </div>
              )}

              {detailRequest.approvedLeaseId && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    const leaseId = typeof detailRequest.approvedLeaseId === "object"
                      ? detailRequest.approvedLeaseId._id
                      : detailRequest.approvedLeaseId;
                    router.push(`/dashboard/leases/${leaseId}`);
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  View Created Lease
                </Button>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Close
            </Button>
            {detailRequest?.status === "pending" && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={() => {
                    setDetailsOpen(false);
                    openAction(detailRequest, "approve");
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Approve
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    setDetailsOpen(false);
                    openAction(detailRequest, "reject");
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Reject
                </Button>
              </div>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
