import Link from "next/link";
import { Bot, Zap, FileText, Settings } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata = {
  title: "Automation | SmartStartPM",
  description: "Intelligent automation hub for property management operations",
};

const automationModules = [
  {
    title: "Luna Autonomous Agent",
    description:
      "AI-driven autonomous operations: payment reminders, maintenance triage, lease renewals, and more — handled by Luna with configurable autonomy.",
    href: "/dashboard/automation/luna",
    icon: Bot,
    iconColor: "text-rose-500",
    bg: "bg-rose-50 dark:bg-rose-950/30",
    badge: "AI-Powered",
    badgeColor: "bg-rose-100 text-rose-700 dark:bg-rose-900/60 dark:text-rose-300",
  },
  {
    title: "Payment Automation",
    description:
      "Configure automated rent generation, reminders, late fees, and overdue notices across all active leases.",
    href: "/dashboard/payments",
    icon: Zap,
    iconColor: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/30",
    badge: "Rules-Based",
    badgeColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300",
  },
  {
    title: "Document Automation",
    description:
      "Auto-generate lease documents, invoices, receipts, and compliance reports on a schedule.",
    href: "/dashboard/settings",
    icon: FileText,
    iconColor: "text-green-500",
    bg: "bg-green-50 dark:bg-green-950/30",
    badge: "Templates",
    badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/60 dark:text-green-300",
  },
  {
    title: "System Settings",
    description:
      "Configure global automation preferences, notification channels, and system-wide defaults.",
    href: "/dashboard/settings",
    icon: Settings,
    iconColor: "text-slate-500",
    bg: "bg-slate-50 dark:bg-slate-800/30",
    badge: "Configuration",
    badgeColor: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  },
];

export default function AutomationPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Automation Hub</h1>
        <p className="text-muted-foreground mt-1">
          Intelligent, AI-driven automation across your entire property portfolio
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {automationModules.map((mod) => {
          const Icon = mod.icon;
          return (
            <Link key={mod.href + mod.title} href={mod.href}>
              <Card className="h-full hover:shadow-md transition-shadow cursor-pointer group border-border/60">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className={`p-2.5 rounded-xl ${mod.bg} mb-3`}>
                      <Icon className={`h-6 w-6 ${mod.iconColor}`} />
                    </div>
                    <span
                      className={`text-xs font-medium px-2.5 py-1 rounded-full ${mod.badgeColor}`}
                    >
                      {mod.badge}
                    </span>
                  </div>
                  <CardTitle className="text-base group-hover:text-rose-600 transition-colors">
                    {mod.title}
                  </CardTitle>
                  <CardDescription className="text-sm leading-relaxed">
                    {mod.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
