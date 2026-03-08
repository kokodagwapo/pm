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
import { useEffect, useMemo, useState, useCallback, memo } from "react";
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
} from "lucide-react";
import { UserRole } from "@/types";
import { useTheme } from "next-themes";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  roles: UserRole[];
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
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.properties.all", href: "/dashboard/properties", icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.properties.new", href: "/dashboard/properties/new", icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.properties.available", href: "/dashboard/properties/available", icon: Key, roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.properties.allUnits", href: "/dashboard/properties/units", icon: Grid3X3, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.properties.calendar", href: "/dashboard/properties/calendar", icon: CalendarDays, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
      {
        title: "nav.tenants",
        href: "/dashboard/tenants",
        icon: Users,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.tenants.all", href: "/dashboard/tenants", icon: Users, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.tenants.new", href: "/dashboard/tenants/new", icon: UserPlus, roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.tenants.applications", href: "/dashboard/tenants/applications", icon: UserPlus, roles: [UserRole.ADMIN, UserRole.MANAGER] },
        ],
      },
      {
        title: "nav.owners",
        href: "/dashboard/owners",
        icon: User,
        roles: [UserRole.ADMIN, UserRole.MANAGER],
        children: [
          { title: "nav.owners.all", href: "/dashboard/owners", icon: User, roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.owners.new", href: "/dashboard/owners/new", icon: UserPlus, roles: [UserRole.ADMIN] },
          { title: "nav.owners.properties", href: "/dashboard/owners/properties", icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER] },
        ],
      },
      {
        title: "nav.leases",
        href: "/dashboard/leases",
        icon: FileText,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.leases.all", href: "/dashboard/leases", icon: FileText, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.new", href: "/dashboard/leases/new", icon: UserPlus, roles: [UserRole.ADMIN, UserRole.MANAGER] },
          { title: "nav.leases.active", href: "/dashboard/leases/active", icon: FileText, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.expiring", href: "/dashboard/leases/expiring", icon: Calendar, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.invoices", href: "/dashboard/leases/invoices", icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.leases.my", href: "/dashboard/leases/my-leases", icon: Home, roles: [UserRole.TENANT] },
          { title: "nav.leases.documents", href: "/dashboard/leases/documents", icon: FileText, roles: [UserRole.TENANT] },
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
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.rentalRequests.all", href: "/dashboard/rental-requests", icon: ListChecks, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
      {
        title: "nav.rentals",
        href: "/dashboard/rentals",
        icon: Send,
        roles: [UserRole.TENANT],
        children: [
          { title: "nav.rentals.request", href: "/dashboard/rentals/request", icon: Send, roles: [UserRole.TENANT] },
          { title: "nav.rentals.myRequests", href: "/dashboard/rentals/my-requests", icon: ListChecks, roles: [UserRole.TENANT] },
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
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.maintenance.all", href: "/dashboard/maintenance", icon: Wrench, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.maintenance.emergency", href: "/dashboard/maintenance/emergency", icon: Bell, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.maintenance.submit", href: "/dashboard/maintenance/new", icon: Wrench, roles: [UserRole.TENANT] },
          { title: "nav.maintenance.mine", href: "/dashboard/maintenance/my-requests", icon: Wrench, roles: [UserRole.TENANT] },
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
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.payments.all", href: "/dashboard/payments", icon: CreditCard, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.payments.overdue", href: "/dashboard/payments/overdue", icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.payments.payRent", href: "/dashboard/payments/pay-rent", icon: DollarSign, roles: [UserRole.TENANT] },
          { title: "nav.payments.history", href: "/dashboard/payments/history", icon: BarChart3, roles: [UserRole.TENANT] },
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
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER],
        children: [
          { title: "nav.analytics.financial", href: "/dashboard/analytics/financial", icon: DollarSign, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.analytics.occupancy", href: "/dashboard/analytics/occupancy", icon: Building2, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
          { title: "nav.analytics.maintenance", href: "/dashboard/analytics/maintenance", icon: Wrench, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
        ],
      },
    ],
  },
  {
    title: "nav.section.communication",
    items: [
      { title: "nav.messages", href: "/dashboard/messages", icon: MessageSquare, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
      {
        title: "nav.aiHelp",
        href: "/dashboard/ai-help",
        icon: Bot,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.aiHelp.luna", href: "/dashboard/ai-help?assistant=luna", icon: Bot, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
          { title: "nav.aiHelp.faq", href: "/dashboard/ai-help/faq", icon: HelpCircle, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
        ],
      },
    ],
  },
  {
    title: "nav.section.events",
    items: [
      { title: "nav.calendar", href: "/dashboard/calendar", icon: Calendar, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
    ],
  },
  {
    title: "nav.section.administration",
    items: [
      {
        title: "nav.admin",
        href: "/dashboard/admin",
        icon: Shield,
        roles: [UserRole.ADMIN],
        children: [
          { title: "nav.admin.overview", href: "/dashboard/admin", icon: Shield, roles: [UserRole.ADMIN] },
          { title: "nav.admin.users", href: "/dashboard/admin/users", icon: Users, roles: [UserRole.ADMIN] },
          { title: "nav.admin.users.new", href: "/dashboard/admin/users/new", icon: UserPlus, roles: [UserRole.ADMIN] },
          { title: "nav.admin.users.roles", href: "/dashboard/admin/users/roles", icon: Shield, roles: [UserRole.ADMIN] },
        ],
      },
      {
        title: "nav.settings",
        href: "/dashboard/settings",
        icon: Settings,
        roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT],
        children: [
          { title: "nav.settings.profile", href: "/dashboard/settings/profile", icon: User, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
          { title: "nav.settings.display", href: "/dashboard/settings/display", icon: Palette, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER] },
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
}: {
  item: NavItem;
  level: number;
  isCollapsed: boolean;
  pathname: string;
  userRole: UserRole;
  expandedItems: string[];
  toggleExpanded: (href: string) => void;
  t: (key: string) => string;
}) {
  const isActive = pathname === item.href;
  const hasChildren = item.children && item.children.length > 0;
  const filteredChildren = item.children?.filter((child) => child.roles.includes(userRole));
  const hasActiveChild = hasChildren && filteredChildren?.some((child) => pathname === child.href || pathname.startsWith(child.href + "/"));
  const isExpanded = expandedItems.includes(item.href) || hasActiveChild;
  const isParentActive = isActive || hasActiveChild;

  return (
    <div>
      <Link
        href={item.href}
        prefetch={true}
        onClick={(e) => {
          if (hasChildren && filteredChildren && filteredChildren.length > 0) {
            e.preventDefault();
            toggleExpanded(item.href);
          }
        }}
        className={cn(
          "relative flex items-center gap-2.5 rounded-lg transition-all duration-200",
          "select-none outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
          level === 0 && "px-3 py-2 text-sm",
          level > 0 && "ml-5 pl-3 pr-3 py-1.5 text-xs",
          /* default state */
          !isParentActive && "text-foreground/85 hover:text-foreground hover:bg-accent/60 active:bg-accent active:scale-[0.98]",
          /* active top-level */
          isParentActive && level === 0 && "text-primary bg-primary/8 font-semibold hover:bg-primary/12 active:bg-primary/16",
          /* active child */
          isActive && level > 0 && "text-primary bg-primary/8 font-semibold",
          /* non-active child */
          !isActive && level > 0 && "text-foreground/80 hover:text-foreground hover:bg-accent/50 active:scale-[0.98]",
          isCollapsed && level === 0 && "justify-center px-2",
        )}
      >
        {/* Active indicator bar */}
        {isParentActive && level === 0 && (
          <span className="nav-active-indicator" />
        )}

        <item.icon
          className={cn(
            "shrink-0 transition-transform duration-200",
            level === 0 ? "h-4 w-4" : "h-3.5 w-3.5",
            isParentActive && "text-primary",
          )}
        />

        {!isCollapsed && (
          <>
            <span className={cn("flex-1 truncate font-medium tracking-[-0.01em]")}>
              {t(item.title)}
            </span>
            {item.badge && (
              <span className="ml-auto flex h-4.5 min-w-[18px] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
            {hasChildren && filteredChildren && filteredChildren.length > 0 && (
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-foreground/40 transition-transform duration-250 ease-out",
                  isExpanded && "rotate-180",
                )}
              />
            )}
          </>
        )}
      </Link>

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [logoSrc, setLogoSrc] = useState("/images/logo-light.svg");
  const pathname = usePathname();
  const { avatarUrl } = useUserAvatar();
  const { data: session } = useSession();
  const { resolvedTheme } = useTheme();
  const { t } = useLocalizationContext();

  const userRole = session?.user?.role as UserRole;

  useEffect(() => {
    setLogoSrc(resolvedTheme === "dark" ? "/images/logo-dark.svg" : "/images/logo-light.svg");
  }, [resolvedTheme]);

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

  return (
    <aside
      className={cn(
        "flex flex-col h-[100dvh] md:h-full bg-card/95 border-r border-border/40",
        "w-64 transition-all duration-300 ease-out",
        "[font-family:var(--font-jakarta),var(--font-inter),system-ui,sans-serif]",
        isCollapsed && "w-16",
        className,
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-3 border-b border-border/40 shrink-0">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center opacity-90 hover:opacity-100 transition-opacity">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="SmartStartPM"
              className="h-7 w-auto max-w-[130px] object-contain"
              loading="eager"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "ml-auto h-7 w-7 shrink-0 text-foreground/40 hover:text-foreground/70 hover:bg-accent/60 transition-all duration-200",
            isCollapsed && "mx-auto",
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
      <nav className="flex-1 min-h-0 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-foreground/50">
                {t(section.title)}
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
                />
              ))}
            </div>
          </div>
        ))}
        <div className="h-4" />
      </nav>

      {/* User Profile */}
      {!isCollapsed && (
        <div className="px-3 py-3 border-t border-border/40 shrink-0">
          <div className="flex items-center gap-2.5 p-2 rounded-xl bg-accent/40 hover:bg-accent/60 transition-colors cursor-default">
            <Avatar className="h-7 w-7 shrink-0">
              <AvatarImage src={avatarUrl || session.user?.avatar || ""} alt={session.user?.firstName || ""} />
              <AvatarFallback className="text-[10px] font-medium">
                {session.user?.firstName?.[0]}
                {session.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate leading-tight">
                {session.user?.firstName} {session.user?.lastName}
              </p>
              <p className="text-[10px] text-foreground/40 truncate capitalize leading-tight mt-0.5">
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
