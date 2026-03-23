/**
 * SmartStartPM — Sidebar Navigation
 * Smooth accordion, animated active indicator, thin modern typography
 */

"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useMemo, useState, useCallback, memo } from "react";
import { useUserAvatar } from "@/components/providers/UserAvatarProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Building2,
  Users,
  FileText,
  CreditCard,
  Wrench,
  BarChart3,
  Settings,
  Home,
  UserPlus,
  Calendar,
  Bell,
  DollarSign,
  Key,
  Shield,
  ChevronLeft,
  ChevronRight,
  User,
  Palette,
  MessageSquare,
  Grid3X3,
  Bot,
  HelpCircle,
  ChevronDown,
  CalendarDays,
  ClipboardList,
  Send,
  ListChecks,
  Inbox,
  Cpu,
} from "lucide-react";
import { UserRole } from "@/types";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { useDashboardAppearance } from "@/components/providers/DashboardAppearanceProvider";
import { useSidebarCollapse } from "@/components/providers/SidebarCollapseProvider";
import {
  PastelIcon,
  pastelTintFromLegacyIconColor,
} from "@/components/ui/pastel-icon";

function safeTranslate(t: (key: string) => string, key: string): string {
  const result = t(key);
  if (/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)+$/i.test(result)) {
    const last = result.split(".").pop() || result;
    return last
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (s) => s.toUpperCase())
      .trim();
  }
  return result;
}

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: UserRole[];
  iconColor?: string;
  children?: NavItem[];
}

interface NavSection {
  title?: string;
  items: NavItem[];
}

const navigationSections: NavSection[] = [
  {
    items: [
      {
        title: "nav.dashboard",
        href: "/dashboard",
        icon: Home,
        iconColor: "text-sky-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
      },
    ],
  },
  {
    title: "nav.section.management",
    items: [
      {
        title: "nav.properties",
        href: "/dashboard/properties",
        icon: Building2,
        iconColor: "text-violet-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.properties.all", href: "/dashboard/properties", icon: Building2, iconColor: "text-violet-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.properties.new", href: "/dashboard/properties/new", icon: Building2, iconColor: "text-violet-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.properties.available", href: "/dashboard/properties/available", icon: Key, iconColor: "text-violet-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.properties.allUnits", href: "/dashboard/properties/units", icon: Grid3X3, iconColor: "text-violet-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.properties.calendar", href: "/dashboard/properties/calendar", icon: CalendarDays, iconColor: "text-violet-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
      {
        title: "nav.tenants",
        href: "/dashboard/tenants",
        icon: Users,
        iconColor: "text-emerald-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.tenants.all", href: "/dashboard/tenants", icon: Users, iconColor: "text-emerald-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.tenants.new", href: "/dashboard/tenants/new", icon: UserPlus, iconColor: "text-emerald-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.tenants.applications", href: "/dashboard/tenants/applications", icon: UserPlus, iconColor: "text-emerald-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
        ],
      },
      {
        title: "nav.owners",
        href: "/dashboard/owners",
        icon: User,
        iconColor: "text-amber-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER],
        children: [
          { title: "nav.owners.all", href: "/dashboard/owners", icon: User, iconColor: "text-amber-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.owners.new", href: "/dashboard/owners/new", icon: UserPlus, iconColor: "text-amber-200", roles: [UserRole.ADMIN] },
          { title: "nav.owners.properties", href: "/dashboard/owners/properties", icon: Building2, iconColor: "text-amber-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
        ],
      },
      {
        title: "nav.leases",
        href: "/dashboard/leases",
        icon: FileText,
        iconColor: "text-cyan-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.leases.all", href: "/dashboard/leases", icon: FileText, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.new", href: "/dashboard/leases/new", icon: UserPlus, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.leases.active", href: "/dashboard/leases/active", icon: FileText, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.expiring", href: "/dashboard/leases/expiring", icon: Calendar, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.invoices", href: "/dashboard/leases/invoices", icon: DollarSign, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.my", href: "/dashboard/leases/my-leases", icon: Home, iconColor: "text-cyan-200", roles: [UserRole.TENANT] },
          { title: "nav.leases.documents", href: "/dashboard/leases/documents", icon: FileText, iconColor: "text-cyan-200", roles: [UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.rentals",
    items: [
      {
        title: "nav.rentalRequests",
        href: "/dashboard/rental-requests",
        icon: ClipboardList,
        iconColor: "text-teal-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.rentalRequests.all", href: "/dashboard/rental-requests", icon: ListChecks, iconColor: "text-teal-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
      {
        title: "nav.rentals",
        href: "/dashboard/rentals",
        icon: Send,
        iconColor: "text-teal-200",
        roles: [UserRole.TENANT],
        children: [
          { title: "nav.rentals.request", href: "/dashboard/rentals/request", icon: Send, iconColor: "text-teal-200", roles: [UserRole.TENANT] },
          { title: "nav.rentals.myRequests", href: "/dashboard/rentals/my-requests", icon: ListChecks, iconColor: "text-teal-200", roles: [UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.operations",
    items: [
      {
        title: "nav.maintenance",
        href: "/dashboard/maintenance",
        icon: Wrench,
        iconColor: "text-orange-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.maintenance.all", href: "/dashboard/maintenance", icon: Wrench, iconColor: "text-orange-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.maintenance.emergency", href: "/dashboard/maintenance/emergency", icon: Bell, iconColor: "text-orange-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.maintenance.submit", href: "/dashboard/maintenance/new", icon: Wrench, iconColor: "text-orange-200", roles: [UserRole.TENANT] },
          { title: "nav.maintenance.mine", href: "/dashboard/maintenance/my-requests", icon: Wrench, iconColor: "text-orange-200", roles: [UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.financial",
    items: [
      {
        title: "nav.payments",
        href: "/dashboard/payments",
        icon: CreditCard,
        iconColor: "text-emerald-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.payments.all", href: "/dashboard/payments", icon: CreditCard, iconColor: "text-emerald-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.payments.overdue", href: "/dashboard/payments/overdue", icon: DollarSign, iconColor: "text-emerald-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.payments.payRent", href: "/dashboard/payments/pay-rent", icon: DollarSign, iconColor: "text-emerald-200", roles: [UserRole.TENANT] },
          { title: "nav.payments.history", href: "/dashboard/payments/history", icon: BarChart3, iconColor: "text-emerald-200", roles: [UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.analytics",
    items: [
      {
        title: "nav.analytics",
        href: "/dashboard/analytics",
        icon: BarChart3,
        iconColor: "text-purple-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.analytics.financial", href: "/dashboard/analytics/financial", icon: DollarSign, iconColor: "text-purple-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.analytics.occupancy", href: "/dashboard/analytics/occupancy", icon: Building2, iconColor: "text-purple-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.analytics.maintenance", href: "/dashboard/analytics/maintenance", icon: Wrench, iconColor: "text-purple-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
    ],
  },
  {
    title: "nav.section.automation",
    items: [
      {
        title: "nav.automation",
        href: "/dashboard/automation",
        icon: Cpu,
        iconColor: "text-rose-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER],
        children: [
          { title: "nav.automation.hub", href: "/dashboard/automation", icon: Cpu, iconColor: "text-rose-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.automation.luna", href: "/dashboard/automation/luna", icon: Bot, iconColor: "text-rose-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.automation.actions", href: "/dashboard/automation/actions", icon: Bot, iconColor: "text-rose-200", roles: [UserRole.ADMIN, UserRole.MANAGER] },
        ],
      },
    ],
  },
  {
    title: "nav.section.communication",
    items: [
      { title: "nav.messages", href: "/dashboard/messages", icon: MessageSquare, iconColor: "text-sky-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
      {
        title: "nav.aiHelp",
        href: "/dashboard/ai-help",
        icon: Bot,
        iconColor: "text-rose-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.aiHelp.luna", href: "/dashboard/ai-help?assistant=luna", icon: Bot, iconColor: "text-rose-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
          { title: "nav.aiHelp.faq", href: "/dashboard/ai-help/faq", icon: HelpCircle, iconColor: "text-rose-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.events",
    items: [
      { title: "nav.calendar", href: "/dashboard/calendar", icon: Calendar, iconColor: "text-cyan-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
    ],
  },
  {
    title: "nav.section.administration",
    items: [
      {
        title: "nav.admin",
        href: "/dashboard/admin",
        icon: Shield,
        iconColor: "text-rose-200",
        roles: [UserRole.ADMIN],
        children: [
          { title: "nav.admin.overview", href: "/dashboard/admin", icon: Shield, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
          { title: "nav.admin.users", href: "/dashboard/admin/users", icon: Users, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
          { title: "nav.admin.users.new", href: "/dashboard/admin/users/new", icon: UserPlus, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
          { title: "nav.admin.users.roles", href: "/dashboard/admin/users/roles", icon: Shield, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
          { title: "nav.admin.apiKeys", href: "/dashboard/admin/api-keys", icon: Key, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
          { title: "nav.admin.demoLeads", href: "/dashboard/admin/demo-leads", icon: Inbox, iconColor: "text-rose-200", roles: [UserRole.ADMIN] },
        ],
      },
      {
        title: "nav.settings",
        href: "/dashboard/settings",
        icon: Settings,
        iconColor: "text-slate-200",
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.settings.profile", href: "/dashboard/settings/profile", icon: User, iconColor: "text-slate-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
          { title: "nav.settings.display", href: "/dashboard/settings/display", icon: Palette, iconColor: "text-slate-200", roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
    ],
  },
];

interface SidebarProps {
  className?: string;
}

const NavItemComponent = memo(function NavItemComponent({
  item,
  level,
  isCollapsed,
  pathname,
  userRole,
  expandedItems,
  toggleExpanded,
  t,
  isLight,
}: {
  item: NavItem;
  level: number;
  isCollapsed: boolean;
  pathname: string;
  userRole: UserRole;
  expandedItems: string[];
  toggleExpanded: (href: string) => void;
  t: (key: string) => string;
  isLight: boolean;
}) {
  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const filteredChildren = item.children?.filter((child) => child.roles.includes(userRole));
  const hasActiveChild = hasChildren && filteredChildren?.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
  const isExpanded = expandedItems.includes(item.href) || hasActiveChild;
  const isParentActive = isActive || hasActiveChild;

  const sharedClassName = cn(
    "relative flex items-center gap-2.5 transition-all duration-300 w-full text-left",
    level === 0 ? (isCollapsed ? "rounded-lg" : "rounded-2xl") : "rounded-xl",
    "select-none outline-none",
    isLight
      ? "focus-visible:ring-2 focus-visible:ring-sky-500/35"
      : "focus-visible:ring-2 focus-visible:ring-white/25",
    level === 0 &&
      "min-h-11 px-3 py-2.5 text-base font-normal tracking-wide md:min-h-0 md:py-2",
    level > 0 &&
      "ml-5 min-h-10 py-2 pl-3 pr-3 text-sm font-light tracking-wide md:min-h-0 md:py-1.5",
    !isLight &&
      !isParentActive &&
      "border border-transparent text-white hover:border-white/[0.16] hover:bg-white/[0.06] active:scale-[0.98]",
    isLight &&
      !isParentActive &&
      "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-100 active:scale-[0.98]",
    !isLight &&
      isParentActive &&
      level === 0 &&
      "border border-white/[0.24] bg-white/[0.1] font-normal text-white hover:border-white/[0.3] hover:bg-white/[0.12]",
    isLight &&
      isParentActive &&
      level === 0 &&
      "border border-slate-200 bg-slate-100 font-normal text-slate-900 hover:border-slate-300 hover:bg-slate-100/90",
    !isLight && isActive && level > 0 && "border border-white/[0.2] bg-white/[0.08] font-normal text-white",
    isLight && isActive && level > 0 && "border border-slate-200 bg-slate-100 font-normal text-slate-900",
    !isLight &&
      !isActive &&
      level > 0 &&
      "border border-transparent text-white hover:border-white/[0.14] hover:bg-white/[0.06] active:scale-[0.98]",
    isLight &&
      !isActive &&
      level > 0 &&
      "border border-transparent text-slate-700 hover:border-slate-200 hover:bg-slate-50 active:scale-[0.98]",
    isCollapsed && level === 0 && "justify-center px-1",
  );

  const useButton = hasChildren && filteredChildren && filteredChildren.length > 0;

  return (
    <div>
      {useButton ? (
        <button
          type="button"
          onClick={() => toggleExpanded(item.href)}
          className={sharedClassName}
        >
          {/* Active indicator bar */}
          {isParentActive && level === 0 && (
            <span className="nav-active-indicator" />
          )}

          <PastelIcon
            icon={item.icon}
            tint={pastelTintFromLegacyIconColor(item.iconColor)}
            size={level === 0 ? "nav" : "sm"}
            className={cn(
              "transition-opacity duration-200",
              isParentActive ? "opacity-100" : "opacity-90",
            )}
          />

          {!isCollapsed && (
            <>
              <span className="flex-1 truncate tracking-[-0.01em]">
                {safeTranslate(t, item.title)}
              </span>
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-lg px-1 text-[10px] font-medium",
                    isLight ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {hasChildren && filteredChildren && filteredChildren.length > 0 && (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-250 ease-out",
                    isLight ? "text-slate-500" : "text-white/55",
                    isExpanded && "rotate-180",
                  )}
                />
              )}
            </>
          )}
        </button>
      ) : (
        <Link
          href={item.href}
          prefetch={true}
          className={sharedClassName}
        >
          {/* Active indicator bar */}
          {isParentActive && level === 0 && (
            <span className="nav-active-indicator" />
          )}

          <PastelIcon
            icon={item.icon}
            tint={pastelTintFromLegacyIconColor(item.iconColor)}
            size={level === 0 ? "nav" : "sm"}
            className={cn(
              "transition-opacity duration-200",
              isParentActive ? "opacity-100" : "opacity-90",
            )}
          />

          {!isCollapsed && (
            <>
              <span className="flex-1 truncate tracking-[-0.01em]">
                {safeTranslate(t, item.title)}
              </span>
              {item.badge && (
                <span
                  className={cn(
                    "ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-lg px-1 text-[10px] font-medium",
                    isLight ? "bg-slate-900 text-white" : "bg-white text-slate-900"
                  )}
                >
                  {item.badge}
                </span>
              )}
              {hasChildren && filteredChildren && filteredChildren.length > 0 && (
                <ChevronDown
                  className={cn(
                    "h-3.5 w-3.5 shrink-0 transition-transform duration-250 ease-out",
                    isLight ? "text-slate-500" : "text-white/55",
                    isExpanded && "rotate-180",
                  )}
                />
              )}
            </>
          )}
        </Link>
      )}

      {/* Smooth accordion using CSS grid */}
      {!isCollapsed && hasChildren && filteredChildren && filteredChildren.length > 0 && (
        <div className={cn("nav-accordion", isExpanded && "open")}>
          <div>
            <div className="pt-0.5 pb-1 space-y-0.5">
              {filteredChildren.map((child) => (
                <NavItemComponent
                  key={child.href}
                  item={child}
                  level={level + 1}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                  userRole={userRole}
                  expandedItems={expandedItems}
                  toggleExpanded={toggleExpanded}
                  t={t}
                  isLight={isLight}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export const Sidebar = memo(function Sidebar({ className }: SidebarProps) {
  const collapseCtx = useSidebarCollapse();
  const isCollapsed = collapseCtx?.isCollapsed ?? false;
  const setIsCollapsed = collapseCtx?.setIsCollapsed ?? (() => {});
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const pathname = usePathname();
  const { avatarUrl } = useUserAvatar();
  const { data: session } = useSession();
  const { t } = useLocalizationContext();
  const { isLight } = useDashboardAppearance();

  const userRole = session?.user?.role as UserRole;

  const dashboardLogoSrc = isLight ? "/images/logo-light.svg" : "/images/logo-dark.svg";

  const toggleExpanded = useCallback((href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]
    );
  }, []);

  const filteredSections = useMemo(() => {
    if (!userRole) return [];
    return navigationSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.roles.includes(userRole)),
      }))
      .filter((section) => section.items.length > 0);
  }, [userRole]);

  if (!session?.user) return null;

  const collapsedWidth = 56; // narrow rail — icons only

  return (
    <aside
      data-collapsed={isCollapsed}
      className={cn(
        "flex h-[100dvh] flex-col md:h-full dashboard-ui-surface flex-none flex-shrink-0 overflow-hidden",
        "border-y-0 border-l-0 border-r border-[var(--dashboard-glass-border)]",
        "transition-[width,min-width,max-width,flex-basis] duration-300 ease-out",
        "[font-family:var(--font-jakarta),var(--font-inter),system-ui,sans-serif] font-normal antialiased",
        !isCollapsed &&
          "w-[min(18rem,calc(100vw-0.75rem))] min-w-[min(18rem,calc(100vw-0.75rem))] max-w-[min(18rem,calc(100vw-0.75rem))] md:w-60 md:min-w-60 md:max-w-60",
        className,
      )}
      style={
        isCollapsed
          ? {
              width: collapsedWidth,
              minWidth: collapsedWidth,
              maxWidth: collapsedWidth,
              flexBasis: collapsedWidth,
            }
          : undefined
      }
    >
      {/* Header — slims when sidebar collapsed */}
      <div
        className={cn(
          "flex items-center shrink-0 justify-center border-b border-[var(--dashboard-glass-border)] bg-transparent transition-all duration-300 ease-out",
          isCollapsed ? "h-9 px-1" : "h-14 px-3 justify-between",
        )}
      >
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dashboardLogoSrc}
              alt="SmartStartPM"
              className="h-7 w-auto max-w-[130px] object-contain"
              loading="eager"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed((prev) => !prev)}
          className={cn(
            "shrink-0 transition-all duration-300",
            isCollapsed ? "h-7 w-7" : "h-7 w-7 ml-auto",
            isLight
              ? "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              : "text-white/50 hover:bg-white/[0.08] hover:text-white/80",
          )}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3.5 w-3.5" />
          ) : (
            <ChevronLeft className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "flex-1 min-h-0 overflow-y-auto space-y-4 scrollbar-thin transition-all duration-300",
          isCollapsed ? "px-1 py-2" : "px-2 py-3",
        )}
      >
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <p
                className={cn(
                  "px-3 pb-1 text-xs font-medium uppercase tracking-[0.12em]",
                  isLight ? "text-slate-500" : "text-white"
                )}
              >
                {safeTranslate(t, section.title)}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  level={0}
                  isCollapsed={isCollapsed}
                  pathname={pathname}
                  userRole={userRole}
                  expandedItems={expandedItems}
                  toggleExpanded={toggleExpanded}
                  t={t}
                  isLight={isLight}
                />
              ))}
            </div>
          </div>
        ))}
        <div className="h-4" />
      </nav>

      {/* User Profile */}
      {!isCollapsed && (
        <div className="shrink-0 border-t border-[var(--dashboard-glass-border)] bg-transparent px-3 py-3">
          <div className="dashboard-ui-surface flex cursor-default items-center gap-2.5 rounded-2xl p-2.5 transition-all duration-300">
            <Avatar
              className={cn(
                "h-7 w-7 shrink-0 ring-2",
                isLight ? "ring-slate-200" : "ring-white/20"
              )}
            >
              <AvatarImage src={avatarUrl || session.user?.avatar || ""} alt={session.user?.firstName || ""} />
              <AvatarFallback
                className={cn(
                  "text-xs font-light",
                  isLight ? "bg-slate-200 text-slate-700" : "bg-violet-500 text-white"
                )}
              >
                {session.user?.firstName?.[0]}
                {session.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "truncate text-xs font-light leading-tight tracking-tight",
                  isLight ? "text-slate-800" : "text-white"
                )}
              >
                {session.user?.firstName} {session.user?.lastName}
              </p>
              <p
                className={cn(
                  "mt-0.5 truncate text-xs font-light capitalize leading-tight",
                  isLight ? "text-slate-500" : "text-white"
                )}
              >
                {session.user?.role?.replace("_", " ")}
              </p>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
});

export default Sidebar;
