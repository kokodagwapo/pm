"use client";

import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";
import { useEffect, useState, useCallback, memo } from "react";
import { useSession, signOut } from "next-auth/react";
import { FlickeringGridBackground } from "@/components/ui/flickering-grid-background";
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
import { Search, Settings, LogOut, User, Menu, X } from "lucide-react";
import { useUserAvatar } from "@/components/providers/UserAvatarProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import { InlinePreloader } from "@/components/ui/preloader";
import { DemoGuide } from "@/components/demo/DemoGuide";

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
  return (
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border/30 bg-background/95 backdrop-blur-sm px-3 md:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-9 w-9 p-0 text-foreground hover:text-foreground"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
          <input
            type="search"
            placeholder="Search..."
            className="w-40 md:w-56 lg:w-72 rounded-lg border border-border bg-background text-foreground pl-9 pr-3 py-2 text-sm placeholder:text-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 transition-colors"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        <div className="sm:hidden">
          <Button variant="ghost" size="sm" className="h-9 w-9 p-0 text-foreground hover:text-foreground">
            <Search className="h-4 w-4" />
          </Button>
        </div>

        
        <LanguageSwitcher variant="light" align="right" />

        <div className="text-foreground">
          <NotificationBell />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-8 w-8 rounded-full">
              <Avatar className="h-8 w-8">
                <AvatarImage src={avatarUrl || user?.avatar || ""} alt={user?.firstName || ""} />
                <AvatarFallback className="text-xs">
                  {user?.firstName?.[0]}
                  {user?.lastName?.[0]}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground capitalize">
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
              className="text-red-600"
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

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { data: session, status } = useSession();
  const { avatarUrl } = useUserAvatar();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t } = useLocalizationContext();

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
      <div className="flex h-screen items-center justify-center bg-background">
        <InlinePreloader size="md" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    redirect("/auth/signin");
  }

  const user = session?.user;

  return (
    <div className="relative flex h-[100dvh] overflow-hidden">
      <FlickeringGridBackground />
      <div className="relative z-10 flex flex-1 min-w-0 h-full overflow-hidden">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden backdrop-blur-sm"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          "fixed md:relative inset-y-0 left-0 z-50 md:z-auto h-full",
          "transition-transform duration-300 ease-out",
          "md:flex md:flex-col md:shrink-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div onClick={closeMobileMenu} className="h-full">
          <Sidebar />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        <MobileHeader
          user={user}
          avatarUrl={avatarUrl}
          isMobileMenuOpen={isMobileMenuOpen}
          setIsMobileMenuOpen={setIsMobileMenuOpen}
          t={t}
          router={router}
        />

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto overscroll-contain">
          <div className="p-3 md:p-6 min-h-full">{children}</div>
        </main>
      </div>

      {/* Role-specific demo guide */}
      <DemoGuide />
      </div>
    </div>
  );
}
