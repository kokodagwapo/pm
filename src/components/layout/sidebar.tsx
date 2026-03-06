/**
 * SmartStartPM - Optimized Sidebar Navigation
 * Mobile-first responsive design with performance optimizations
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
          { title: "nav.aiHelp.jack", href: "/dashboard/ai-help?assistant=jack", icon: Bot, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
          { title: "nav.aiHelp.heidi", href: "/dashboard/ai-help?assistant=heidi", icon: Bot, roles: [UserRole.ADMIN, UserRole.MANAGER, UserRole.OWNER, UserRole.TENANT] },
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
  const hasActiveChild = hasChildren && filteredChildren?.some((child) => pathname === child.href);
  const isExpanded = expandedItems.includes(item.href) || hasActiveChild;

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
          "flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors",
          "hover:bg-accent/50 active:bg-accent",
          isActive && level === 0 && "bg-primary/10 text-primary",
          hasActiveChild && level === 0 && "bg-primary/5 text-primary",
          isActive && level > 0 && "bg-primary/5 text-primary",
          level > 0 && "ml-6 text-xs py-1.5",
          isCollapsed && level === 0 && "justify-center px-2"
        )}
      >
        <item.icon className={cn("shrink-0", level === 0 ? "h-4 w-4" : "h-3.5 w-3.5")} />
        {!isCollapsed && (
          <>
            <span className="flex-1 truncate">{t(item.title)}</span>
            {item.badge && (
              <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-medium text-primary-foreground">
                {item.badge}
              </span>
            )}
            {hasChildren && filteredChildren && filteredChildren.length > 0 && (
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", isExpanded && "rotate-180")} />
            )}
          </>
        )}
      </Link>

      {!isCollapsed && hasChildren && isExpanded && filteredChildren && filteredChildren.length > 0 && (
        <div className="mt-1 space-y-0.5">
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
        "flex flex-col h-[100dvh] md:h-full bg-card border-r border-border/50",
        "w-64 transition-all duration-200",
        isCollapsed && "w-16",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center h-16 px-3 border-b border-border/50 shrink-0">
        {!isCollapsed && (
          <Link href="/dashboard" className="flex items-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoSrc}
              alt="SmartStartPM"
              className="h-8 w-auto max-w-[140px] object-contain"
              loading="eager"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn("ml-auto h-8 w-8 shrink-0", isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-2 space-y-4 scrollbar-thin">
        {filteredSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && !isCollapsed && (
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
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
        {/* Bottom padding for scroll */}
        <div className="h-4" />
      </nav>

      {/* User Profile */}
      {!isCollapsed && (
        <div className="p-3 border-t border-border/50 shrink-0">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl || session.user?.avatar || ""} alt={session.user?.firstName || ""} />
              <AvatarFallback className="text-xs">
                {session.user?.firstName?.[0]}
                {session.user?.lastName?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {session.user?.firstName} {session.user?.lastName}
              </p>
              <p className="text-xs text-muted-foreground truncate capitalize">
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
