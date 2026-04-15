"use client";

import dynamic from "next/dynamic";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { useEffect, useState, useCallback, memo } from "react";
import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter, usePathname } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Search, Settings, LogOut, User, Menu, X, Sun, Moon, PlayCircle } from "lucide-react";
import { useUserAvatar } from "@/components/providers/UserAvatarProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { InlinePreloader } from "@/components/ui/preloader";
import {
  DashboardAppearanceProvider,
  useDashboardAppearance,
} from "@/components/providers/DashboardAppearanceProvider";
import {
  SidebarCollapseProvider,
  useSidebarCollapse,
} from "@/components/providers/SidebarCollapseProvider";

const HeroVideo = dynamic(() => import("@/components/landing/HeroVideo").then((m) => ({ default: m.HeroVideo })), {
  ssr: false,
});

const PwaInstallHint = dynamic(
  () => import("@/components/pwa/PwaInstallHint").then((m) => ({ default: m.PwaInstallHint })),
  { ssr: false }
);

const DemoGuide = dynamic(
  () => import("@/components/demo/DemoGuide").then((m) => ({ default: m.DemoGuide })),
  { ssr: false }
);

/** Base dim + vignette over HeroVideo — immersive / dark (lighter overlay = more video visible). */
const DASHBOARD_VIDEO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.46) 40%, rgba(0,0,0,0.80) 100%), rgba(0,0,0,0.26)";

const COLLAPSED_WIDTH = 56; // px — narrow icon rail, icons only

const SidebarColumn = memo(function SidebarColumn({
  isMobileMenuOpen,
  closeMobileMenu,
}: {
  isMobileMenuOpen: boolean;
  closeMobileMenu: () => void;
}) {
  const { isCollapsed } = useSidebarCollapse() ?? { isCollapsed: false };
  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 h-full overflow-hidden transition-[transform,width,min-width,max-width,flex-basis] duration-300 ease-out md:relative md:z-auto",
        "md:flex md:flex-none md:shrink-0 md:flex-col",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        !isCollapsed &&
          "w-[min(18rem,calc(100vw-0.75rem))] min-w-[min(18rem,calc(100vw-0.75rem))] max-w-[min(18rem,calc(100vw-0.75rem))] md:w-60 md:min-w-60 md:max-w-60"
      )}
      style={
        isCollapsed
          ? {
              width: COLLAPSED_WIDTH,
              minWidth: COLLAPSED_WIDTH,
              maxWidth: COLLAPSED_WIDTH,
              flexBasis: COLLAPSED_WIDTH,
            }
          : undefined
      }
    >
      <div onClick={closeMobileMenu} className="h-full w-full min-w-0 overflow-hidden">
        <Sidebar />
      </div>
    </div>
  );
});

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const MobileHeader = memo(function MobileHeader({
  user,
  avatarUrl,
  isMobileMenuOpen,
  setIsMobileMenuOpen,
  t,
  router,
  onToggleTour,
}: {
  user: any;
  avatarUrl: string | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  t: (key: string) => string;
  router: any;
  onToggleTour?: () => void;
}) {
  const { isLight, setAppearance } = useDashboardAppearance();

  return (
    <header
      className={cn(
        "dashboard-ui-surface sticky top-0 z-30 flex min-h-14 shrink-0 items-center justify-between gap-2 rounded-none border-x-0 border-t-0 border-b px-2 pt-[env(safe-area-inset-top,0px)] sm:px-3 md:px-6",
        isLight ? "text-slate-900" : "border-white/[0.14] text-white"
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 rounded-xl p-0 transition-all duration-300 md:hidden",
            isLight
              ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "text-white/75 hover:bg-white/[0.08] hover:text-white"
          )}
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="relative hidden sm:block">
          <Search
            className={cn(
              "absolute left-3 top-1/2 h-[1.125rem] w-[1.125rem] -translate-y-1/2",
              isLight ? "text-slate-400" : "text-white/55"
            )}
          />
          <input
            type="search"
            placeholder={t("header.search.placeholder")}
            aria-label={t("header.search.placeholder")}
            className="dashboard-hero-search w-44 rounded-2xl py-2 pl-10 pr-3 text-base transition-all duration-300 focus:outline-none md:w-60 lg:w-80"
          />
        </div>
      </div>

      <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-2 md:gap-3">
        {/* Tour Toggle Button */}
        <button
          onClick={onToggleTour}
          className={cn(
            "flex h-9 shrink-0 items-center justify-center gap-2 rounded-xl border px-3 transition-all duration-300 relative group",
            isLight
              ? "border-sky-100 bg-sky-50/50 text-sky-600 hover:bg-sky-100 hover:border-sky-200"
              : "border-white/20 bg-transparent text-white/85 hover:bg-white/10 hover:text-white"
          )}
          title="Demo For Verina & Marco"
        >
          <PlayCircle className="h-4 w-4 transition-transform group-hover:scale-110" />
          <span className="hidden lg:inline text-[11px] font-black uppercase tracking-[0.14em]">
            Demo For Verina & Marco
          </span>
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-sky-500 rounded-full border-2 border-white animate-pulse" />
        </button>

        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 rounded-xl p-0 transition-all duration-300",
              isLight
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                : "text-white/75 hover:bg-white/[0.08] hover:text-white"
            )}
            aria-label={t("header.search.placeholder")}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setAppearance(isLight ? "immersive" : "light")}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border transition-all duration-300 touch-manipulation",
            isLight
              ? "border-white/55 bg-white/35 text-slate-800 shadow-[0_2px_12px_rgb(15_23_42/0.06)] backdrop-blur-md hover:bg-white/50"
              : "border-white/20 bg-transparent text-white/85 hover:bg-white/10 hover:text-white"
          )}
          title={
            isLight
              ? t("header.appearance.toDark.title")
              : t("header.appearance.toLight.title")
          }
          aria-label={
            isLight
              ? t("header.appearance.toDark.aria")
              : t("header.appearance.toLight.aria")
          }
        >
          {isLight ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        </button>

        <LanguageSwitcher
          variant={isLight ? "light" : "dark"}
          align="right"
          compact
        />

        <div className={cn(isLight ? "text-slate-900" : "text-white")}>
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "relative h-8 w-8 rounded-xl transition-all duration-300",
                isLight
                  ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                  : "text-white/85 hover:bg-white/[0.1] hover:text-white"
              )}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || user?.avatar || ""} alt={user?.firstName || ""} />
                <AvatarFallback className="bg-violet-500 text-xs font-medium text-white">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium tracking-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
                <p className="text-xs font-normal capitalize text-muted-foreground">
                  {user?.role?.replace("_", " ")}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings/profile")}>
              <User className="mr-2 h-4 w-4" />
              <span>{t("header.menu.profile")}</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/settings/display")}>
              <Settings className="mr-2 h-4 w-4" />
              <span>{t("header.menu.settings")}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() =>
                signOut({ redirect: false }).then(() => {
                  window.location.href = "/";
                })
              }
            >
              <LogOut className="mr-2 h-4 w-4" />
              <span>{t("header.menu.logout")}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
});

function DashboardLayoutContent({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const { avatarUrl } = useUserAvatar();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const { t } = useLocalizationContext();
  const { isLight } = useDashboardAppearance();

  useEffect(() => {
    document.documentElement.classList.add("dashboard-layout");
    document.body.classList.add("dashboard-layout");
    return () => {
      document.documentElement.classList.remove("dashboard-layout");
      document.body.classList.remove("dashboard-layout");
    };
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileMenuOpen]);

  if (status === "loading") {
    return (
      <div
        className={cn(
          "relative flex h-screen items-center justify-center overflow-hidden",
          isLight ? "bg-transparent" : "bg-black"
        )}
      >
        {!isLight && (
          <>
            <HeroVideo />
            <div
              className="pointer-events-none fixed inset-0 z-[1]"
              style={{ background: DASHBOARD_VIDEO_OVERLAY }}
              aria-hidden
            />
          </>
        )}
        <div className="relative z-10">
          <InlinePreloader size="md" />
        </div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    const callbackUrl = pathname?.startsWith("/") ? pathname : "/dashboard";
    redirect(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`);
  }

  const user = session?.user;

  return (
    <div
      className={cn(
        "relative h-[100dvh] overflow-hidden",
        isLight ? "bg-transparent" : "bg-black"
      )}
    >
      {!isLight && (
        <>
          <HeroVideo />
          <div
            className="pointer-events-none fixed inset-0 z-[1]"
            style={{ background: DASHBOARD_VIDEO_OVERLAY }}
            aria-hidden
          />
        </>
      )}
      <SidebarCollapseProvider>
        <div className="relative z-10 flex h-full min-h-0 min-w-0 w-full overflow-hidden">
          {isMobileMenuOpen && (
            <div
              className={cn(
                "fixed inset-0 z-40 backdrop-blur-sm md:hidden",
                isLight ? "bg-slate-900/25" : "bg-black/75"
              )}
              onClick={closeMobileMenu}
            />
          )}

          <SidebarColumn
            isMobileMenuOpen={isMobileMenuOpen}
            closeMobileMenu={closeMobileMenu}
          />

          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader
            user={user}
            avatarUrl={avatarUrl}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            t={t}
            router={router}
            onToggleTour={() => setIsTourOpen(!isTourOpen)}
          />

          <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain scrollbar-thin bg-transparent">
            <div className="dashboard-main-typography mx-auto min-h-full w-full min-w-0 max-w-[1680px] animate-page-in overflow-x-hidden px-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-3 sm:px-4 sm:pb-4 sm:pt-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
      </SidebarCollapseProvider>

      <PwaInstallHint variant={isLight ? "light" : "dark"} />
      <DemoGuide externalOpen={isTourOpen} onOpenChange={setIsTourOpen} />
    </div>
  );
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <DashboardAppearanceProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </DashboardAppearanceProvider>
  );
}
