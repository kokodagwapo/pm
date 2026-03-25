"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ArrowLeft,
  Building2,
  Calendar,
  RefreshCw,
  AlertTriangle,
  TrendingUp,
  Wrench,
  DollarSign,
  Save,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

interface SystemReplacementItem {
  systemType: string;
  installYear: number;
  systemAge: number;
  estimatedLifespanYears: number;
  remainingLifeYears: number;
  replacementYear: number;
  replacementCost: number;
  annualReserve: number;
  agePercent: number;
  urgency: "immediate" | "near-term" | "future";
  notes?: string;
}

interface PropertyCapex {
  id: string;
  name: string;
  yearBuilt: number | null;
  age: number;
  units: number;
  riskLevel: "low" | "medium" | "high" | "critical";
  annualBenchmark: number;
  annualHistorical: number;
  historicalCategories: string[];
  hasSystemData?: boolean;
  systemReplacementSchedule?: SystemReplacementItem[];
  totalAnnualReserve?: number;
  projectedYears: { year: number; projected: number; systemReplacements?: { systemType: string; cost: number }[] }[];
}

interface UrgentSystem extends SystemReplacementItem {
  propertyId: string;
  propertyName: string;
}

interface SystemEntry {
  systemType: string;
  lastReplacedYear?: number;
  estimatedLifespanYears: number;
  notes?: string;
}

const SYSTEM_TYPES = [
  "Roof", "HVAC", "Electrical", "Plumbing", "Water Heater",
  "Foundation", "Windows", "Exterior", "Flooring", "Appliances",
  "Elevators", "Other",
];

const DEFAULT_LIFESPANS: Record<string, number> = {
  "Roof": 25, "HVAC": 20, "Electrical": 30, "Plumbing": 40,
  "Water Heater": 12, "Foundation": 80, "Windows": 20,
  "Exterior": 15, "Flooring": 15, "Appliances": 10, "Elevators": 25, "Other": 20,
};

interface CategorySpend {
  category: string;
  total: number;
  count: number;
  annualAvg: number;
}

interface CapexData {
  properties: PropertyCapex[];
  projections: { year: number; amount: number }[];
  totalBudget: number;
  annualAvgBudget: number;
  highRiskCount: number;
  urgentSystems?: UrgentSystem[];
  categoryBreakdown: CategorySpend[];
  currentYear: number;
}

const RISK_BADGE: Record<PropertyCapex["riskLevel"], string> = {
  low: "bg-green-100 text-green-800 border-green-200",
  medium: "bg-yellow-100 text-yellow-800 border-yellow-200",
  high: "bg-orange-100 text-orange-800 border-orange-200",
  critical: "bg-red-100 text-red-800 border-red-200",
};

const RISK_BAR_COLOR: Record<PropertyCapex["riskLevel"], string> = {
  low: "#22c55e",
  medium: "#eab308",
  high: "#f97316",
  critical: "#ef4444",
};

const formatCurrency = (n: number) =>
  n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

export default function CapexPlanningPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<CapexData | null>(null);
  const [loading, setLoading] = useState(true);
  const [years, setYears] = useState("5");
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [propertyOptions, setPropertyOptions] = useState<{ id: string; name: string }[]>([]);

  // System ages state
  const [systemsPropertyId, setSystemsPropertyId] = useState<string>("");
  const [systemsData, setSystemsData] = useState<SystemEntry[]>([]);
  const [systemsMarketRent, setSystemsMarketRent] = useState<string>("");
  const [systemsLoading, setSystemsLoading] = useState(false);
  const [systemsSaving, setSystemsSaving] = useState(false);
  const [showSystemsPanel, setShowSystemsPanel] = useState(false);

  const fetchProperties = useCallback(async () => {
    try {
      const res = await fetch(
        "/api/properties?limit=100&sortBy=name&sortOrder=asc",
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) return;
      const raw = Array.isArray(json.data) ? json.data : [];
      setPropertyOptions(
        raw.map((p: { _id?: string; id?: string; name?: string }) => ({
          id: p._id ?? p.id ?? "",
          name: p.name ?? "Untitled",
        }))
      );
    } catch {
      /* silent */
    }
  }, []);

  const fetchSystems = useCallback(async (pid: string) => {
    if (!pid) return;
    setSystemsLoading(true);
    try {
      const res = await fetch(`/api/analytics/property-systems?propertyId=${pid}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      const existing: SystemEntry[] = (json.data?.systems ?? []);
      const loadedMarketRent = json.data?.marketRent;
      // Merge with defaults: add any missing system types
      const merged: SystemEntry[] = SYSTEM_TYPES.map((st) => {
        const found = existing.find((e) => e.systemType === st);
        return found ?? { systemType: st, estimatedLifespanYears: DEFAULT_LIFESPANS[st] ?? 20 };
      });
      setSystemsData(merged);
      setSystemsMarketRent(loadedMarketRent ? String(loadedMarketRent) : "");
    } catch {
      toast.error("Could not load system data");
    } finally {
      setSystemsLoading(false);
    }
  }, []);

  const saveSystems = useCallback(async () => {
    if (!systemsPropertyId) return;
    setSystemsSaving(true);
    try {
      const res = await fetch("/api/analytics/property-systems", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ propertyId: systemsPropertyId, systems: systemsData, marketRent: systemsMarketRent ? Number(systemsMarketRent) : null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      toast.success("System ages saved");
      fetchCapex();
    } catch {
      toast.error("Failed to save system data");
    } finally {
      setSystemsSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [systemsPropertyId, systemsData, systemsMarketRent]);

  const updateSystem = (index: number, field: keyof SystemEntry, value: string | number) => {
    setSystemsData((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const fetchCapex = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ years });
      if (selectedProperty !== "all") params.set("propertyId", selectedProperty);
      const res = await fetch(
        `/api/analytics/capex?${params.toString()}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      setData(json.data as CapexData);
    } catch (err) {
      toast.error("Unable to load CapEx data");
    } finally {
      setLoading(false);
    }
  }, [years, selectedProperty]);

  useEffect(() => {
    if (!session) return;
    fetchProperties();
  }, [session, fetchProperties]);

  useEffect(() => {
    if (!session) return;
    fetchCapex();
  }, [session, fetchCapex]);

  if (!session) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Link href="/dashboard/analytics" className="hover:underline">
              Analytics
            </Link>
            <span>/</span>
            <span>CapEx Planning</span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="h-8 w-8" />
            Capital Expenditure Planner
          </h1>
          <p className="text-muted-foreground">
            Property age-based maintenance projections and budget planning
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Select value={years} onValueChange={setYears}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">3-Year Plan</SelectItem>
              <SelectItem value="5">5-Year Plan</SelectItem>
              <SelectItem value="10">10-Year Plan</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger className="w-[200px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="All Properties" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Properties</SelectItem>
              {propertyOptions.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchCapex}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : data ? (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {years}-Year Budget
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.totalBudget)}
              </div>
              <p className="text-xs text-muted-foreground">
                Projected total CapEx
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Annual Average
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(data.annualAvgBudget)}
              </div>
              <p className="text-xs text-muted-foreground">
                Per year across portfolio
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Properties</CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {data.properties.length}
              </div>
              <p className="text-xs text-muted-foreground">In this analysis</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                High-Risk Properties
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  data.highRiskCount > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {data.highRiskCount}
              </div>
              <p className="text-xs text-muted-foreground">
                Age 30+ years (high/critical risk)
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Projection chart */}
      {!loading && data && data.projections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>{years}-Year CapEx Projection</CardTitle>
            <CardDescription>
              Annual capital expenditure forecast based on property age
              benchmarks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={data.projections}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <Tooltip
                  formatter={(v: number) => [formatCurrency(v), "Projected CapEx"]}
                />
                <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2">
        {/* Property breakdown table */}
        <Card>
          <CardHeader>
            <CardTitle>Property Risk Assessment</CardTitle>
            <CardDescription>
              Age-based capital expenditure risk per property
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : data && data.properties.length > 0 ? (
              <div className="space-y-3">
                {data.properties
                  .sort((a, b) => b.age - a.age)
                  .map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-sm truncate">
                            {p.name}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs shrink-0 ${RISK_BADGE[p.riskLevel]}`}
                          >
                            {p.riskLevel}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {p.yearBuilt ? `Built ${p.yearBuilt}` : "Year unknown"}{" "}
                          · {p.age} yrs · {p.units} unit
                          {p.units !== 1 ? "s" : ""}
                        </p>
                      </div>
                      <div className="text-right shrink-0 ml-3">
                        <p className="text-sm font-semibold">
                          {formatCurrency(p.annualBenchmark)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          /yr estimate
                        </p>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No property data available
              </p>
            )}
          </CardContent>
        </Card>

        {/* Urgent System Replacement Schedule */}
        {data && data.urgentSystems && data.urgentSystems.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-red-500 inline-block" />
                Urgent System Replacements
              </CardTitle>
              <CardDescription>
                Systems approaching or past end of estimated lifespan — based on building system ages entered
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.urgentSystems.slice(0, 10).map((sys, i) => (
                  <div key={i} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">{sys.systemType}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          sys.urgency === "immediate"
                            ? "bg-red-100 text-red-700"
                            : "bg-orange-100 text-orange-700"
                        }`}>
                          {sys.urgency === "immediate" ? "Immediate" : "Near-Term"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{sys.propertyName}</p>
                      <p className="text-xs text-muted-foreground">
                        Age: {sys.systemAge}yr / {sys.estimatedLifespanYears}yr lifespan
                        {sys.remainingLifeYears <= 0
                          ? " — Past due for replacement"
                          : ` — ${sys.remainingLifeYears}yr remaining`}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-4">
                      <p className="font-bold text-sm">{formatCurrency(sys.replacementCost)}</p>
                      <p className="text-xs text-muted-foreground">Replace by {sys.replacementYear}</p>
                      <p className="text-xs text-muted-foreground">{formatCurrency(sys.annualReserve)}/yr reserve</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Category spend breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Historical Spend by Category</CardTitle>
            <CardDescription>
              Maintenance and vendor costs over the last 3 years
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : data && data.categoryBreakdown.length > 0 ? (
              <div className="space-y-3">
                {data.categoryBreakdown.map((cat) => {
                  const max = data.categoryBreakdown[0].total;
                  const pct = max > 0 ? (cat.total / max) * 100 : 0;
                  return (
                    <div key={cat.category}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm">{cat.category}</span>
                        <div className="flex gap-3 text-xs text-muted-foreground">
                          <span>{cat.count} jobs</span>
                          <span className="font-medium text-foreground">
                            {formatCurrency(cat.total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8 text-sm">
                No maintenance history in the last 3 years
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* System Ages Panel */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setShowSystemsPanel((v) => !v)}
        >
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="h-5 w-5" />
                Building System Ages
              </CardTitle>
              <CardDescription>
                Enter when each major system was last replaced to improve CapEx forecasts
              </CardDescription>
            </div>
            {showSystemsPanel ? (
              <ChevronUp className="h-5 w-5 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-5 w-5 text-muted-foreground" />
            )}
          </div>
        </CardHeader>

        {showSystemsPanel && (
          <CardContent className="space-y-4">
            {/* Property selector */}
            <div className="flex items-center gap-3 flex-wrap">
              <Select
                value={systemsPropertyId}
                onValueChange={(pid) => {
                  setSystemsPropertyId(pid);
                  fetchSystems(pid);
                }}
              >
                <SelectTrigger className="w-[240px]">
                  <Building2 className="h-4 w-4 mr-2" />
                  <SelectValue placeholder="Select a property…" />
                </SelectTrigger>
                <SelectContent>
                  {propertyOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {systemsPropertyId && (
                <Button
                  size="sm"
                  onClick={saveSystems}
                  disabled={systemsSaving || systemsLoading}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  {systemsSaving ? "Saving…" : "Save Systems"}
                </Button>
              )}
            </div>

            {/* Market rent override for this property */}
            {systemsPropertyId && (
              <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/30 p-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Market Rent Override (per unit/month)</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                    Used by the Rent Gap Alerts feature to compare active leases against a known market benchmark for this property.
                    Leave blank to use the portfolio average.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    step={50}
                    placeholder="e.g. 1800"
                    value={systemsMarketRent}
                    onChange={(e) => setSystemsMarketRent(e.target.value)}
                    className="w-28 h-8 text-sm"
                  />
                  <span className="text-xs text-muted-foreground">/mo</span>
                </div>
              </div>
            )}

            {/* System rows */}
            {systemsLoading ? (
              <div className="space-y-2">
                {[...Array(6)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : systemsPropertyId && systemsData.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-muted-foreground">
                      <th className="text-left py-2 pr-4 font-medium">System</th>
                      <th className="text-left py-2 pr-4 font-medium">Last Replaced (Year)</th>
                      <th className="text-left py-2 pr-4 font-medium">Lifespan (yrs)</th>
                      <th className="text-left py-2 font-medium">Age / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {systemsData.map((sys, i) => {
                      const currentYear = new Date().getFullYear();
                      const age = sys.lastReplacedYear ? currentYear - sys.lastReplacedYear : null;
                      const pctLife = age !== null ? (age / sys.estimatedLifespanYears) * 100 : null;
                      const statusColor = pctLife === null ? "text-gray-400"
                        : pctLife >= 90 ? "text-red-600 font-semibold"
                        : pctLife >= 70 ? "text-orange-600"
                        : pctLife >= 50 ? "text-yellow-600"
                        : "text-green-600";

                      return (
                        <tr key={sys.systemType}>
                          <td className="py-2 pr-4 font-medium">{sys.systemType}</td>
                          <td className="py-2 pr-4">
                            <Input
                              type="number"
                              min={1900}
                              max={currentYear}
                              placeholder="e.g. 2015"
                              value={sys.lastReplacedYear ?? ""}
                              onChange={(e) => updateSystem(i, "lastReplacedYear", parseInt(e.target.value) || 0)}
                              className="w-28 h-8 text-sm"
                            />
                          </td>
                          <td className="py-2 pr-4">
                            <Input
                              type="number"
                              min={1}
                              max={100}
                              value={sys.estimatedLifespanYears}
                              onChange={(e) => updateSystem(i, "estimatedLifespanYears", parseInt(e.target.value) || 20)}
                              className="w-20 h-8 text-sm"
                            />
                          </td>
                          <td className={`py-2 text-sm ${statusColor}`}>
                            {age !== null ? (
                              <>
                                {age} yr{age !== 1 ? "s" : ""} old
                                {pctLife !== null && (
                                  <span className="text-xs ml-1">({Math.round(pctLife)}% of life)</span>
                                )}
                              </>
                            ) : (
                              <span className="text-muted-foreground">Not recorded</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : systemsPropertyId ? (
              <p className="text-sm text-muted-foreground">Select a property to manage its system ages.</p>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                Select a property above to view and edit its building system ages.
              </p>
            )}
          </CardContent>
        )}
      </Card>

      {/* Benchmark note */}
      <Card className="border-dashed">
        <CardContent className="p-4">
          <div className="flex gap-3 items-start">
            <AlertTriangle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">
                CapEx Benchmark Reference
              </p>
              <p>
                Projections use industry benchmarks: $300/unit/yr (0–10 yrs),
                $700 (11–20 yrs), $1,200 (21–30 yrs), $2,000 (31–50 yrs),
                $3,000+ (50+ yrs). Actual costs vary based on property
                condition, region, and system upgrades. Enter system ages above to enable per-system replacement forecasting.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
