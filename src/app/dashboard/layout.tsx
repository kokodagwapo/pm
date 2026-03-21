"use client";

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
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Search, Settings, LogOut, User, Menu, X, Sun, Moon } from "lucide-react";
import { useUserAvatar } from "@/components/providers/UserAvatarProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { InlinePreloader } from "@/components/ui/preloader";
import { DemoGuide } from "@/components/demo/DemoGuide";
import { HeroVideo } from "@/components/landing/HeroVideo";
import {
  DashboardAppearanceProvider,
  useDashboardAppearance,
} from "@/components/providers/DashboardAppearanceProvider";

/** Base dim + vignette over HeroVideo — immersive / dark (lighter overlay = more video visible). */
const DASHBOARD_VIDEO_OVERLAY =
  "linear-gradient(to bottom, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.46) 40%, rgba(0,0,0,0.80) 100%), rgba(0,0,0,0.26)";

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
}: {
  user: any;
  avatarUrl: string | null;
  isMobileMenuOpen: boolean;
  setIsMobileMenuOpen: (open: boolean) => void;
  t: (key: string) => string;
  router: any;
}) {
  const { isLight, setAppearance } = useDashboardAppearance();

  return (
    <header
      className={cn(
        "dashboard-ui-surface sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between rounded-none border-x-0 border-t-0 border-b px-3 md:px-6",
        isLight ? "text-slate-900" : "border-white/[0.14] text-white"
      )}
    >
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-9 w-9 rounded-full p-0 transition-all duration-300 md:hidden",
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
            placeholder="Search..."
            className="dashboard-hero-search w-44 rounded-full py-2 pl-10 pr-3 text-base transition-all duration-300 focus:outline-none md:w-60 lg:w-80"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="sm:hidden">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-9 w-9 rounded-full p-0 transition-all duration-300",
              isLight
                ? "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                : "text-white/75 hover:bg-white/[0.08] hover:text-white"
            )}
          >
            <Search className="h-4 w-4" />
          </Button>
        </div>

        <button
          type="button"
          onClick={() => setAppearance(isLight ? "immersive" : "light")}
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition-all duration-300 touch-manipulation",
            isLight
              ? "border-white/55 bg-white/35 text-slate-800 shadow-[0_2px_12px_rgb(15_23_42/0.06)] backdrop-blur-md hover:bg-white/50"
              : "border-white/20 bg-transparent text-white/85 hover:bg-white/10 hover:text-white"
          )}
          title={isLight ? "Switch to immersive (dark) dashboard" : "Switch to light dashboard"}
          aria-label={isLight ? "Switch to immersive dark dashboard" : "Switch to light dashboard"}
        >
          {isLight ? <Moon className="h-4 w-4" aria-hidden /> : <Sun className="h-4 w-4" aria-hidden />}
        </button>

        <LanguageSwitcher variant={isLight ? "light" : "dark"} align="right" />

        <div className={cn(isLight ? "text-slate-900" : "text-white")}>
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "relative h-8 w-8 rounded-full transition-all duration-300",
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
                <p className="text-sm font-light tracking-tight">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-light text-muted-foreground">{user?.email}</p>
                <p className="text-xs font-light capitalize text-muted-foreground">
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
  const { data: session, status } = useSession();
  const { avatarUrl } = useUserAvatar();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
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
    redirect("/auth/signin");
  }

  const user = session?.user;

  return (
    <div
      className={cn(
        "relative flex h-[100dvh] overflow-hidden",
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
      <div className="relative z-10 flex h-full min-w-0 flex-1 overflow-hidden">
        {isMobileMenuOpen && (
          <div
            className={cn(
              "fixed inset-0 z-40 backdrop-blur-sm md:hidden",
              isLight ? "bg-slate-900/25" : "bg-black/75"
            )}
            onClick={closeMobileMenu}
          />
        )}

        <div
          className={cn(
            "fixed inset-y-0 left-0 z-50 h-full transition-transform duration-300 ease-out md:relative md:z-auto",
            "md:flex md:shrink-0 md:flex-col",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
          )}
        >
          <div onClick={closeMobileMenu} className="h-full">
            <Sidebar />
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <MobileHeader
            user={user}
            avatarUrl={avatarUrl}
            isMobileMenuOpen={isMobileMenuOpen}
            setIsMobileMenuOpen={setIsMobileMenuOpen}
            t={t}
            router={router}
          />

          <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain scrollbar-thin bg-transparent">
            <div className="dashboard-main-typography mx-auto min-h-full w-full max-w-[1680px] animate-page-in p-4 md:p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>

        <DemoGuide />
      </div>
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
