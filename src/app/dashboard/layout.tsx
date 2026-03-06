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
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Search, Settings, LogOut, User, Menu, X } from "lucide-react";
import { useUserAvatar } from "@/components/providers/UserAvatarProvider";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useLocalizationContext } from "@/components/providers/LocalizationProvider";
import { InlinePreloader } from "@/components/ui/preloader";

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
    <header className="flex h-14 md:h-16 items-center justify-between border-b border-border/40 bg-background/80 backdrop-blur-xl px-3 md:px-6 shrink-0 sticky top-0 z-30">
      <div className="flex items-center gap-2 md:gap-4">
        <Button
          variant="ghost"
          size="sm"
          className="md:hidden h-9 w-9 p-0 rounded-lg text-foreground/80 hover:text-foreground hover:bg-muted/60 transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        >
          {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>

        <div className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search..."
            className="w-40 md:w-56 lg:w-72 rounded-xl border border-border/60 bg-muted/30 text-foreground pl-9 pr-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/40 focus:bg-background transition-all duration-200"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex items-center gap-0.5 rounded-xl bg-muted/40 border border-border/50 px-1.5 py-1">
          <div className="sm:hidden">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground hover:bg-background/70 transition-colors">
              <Search className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center [&>button]:scale-90 [&>button]:origin-center">
            <ThemeToggle />
          </div>
          <div className="h-5 w-px bg-border/60 mx-0.5" />
          <div className="[&_button]:h-8 [&_button]:w-8 [&_button]:rounded-lg [&_button]:text-muted-foreground [&_button]:hover:text-foreground [&_button]:hover:bg-background/70">
            <NotificationBell />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0 ring-2 ring-border/40 hover:ring-primary/30 focus:ring-2 focus:ring-primary/40 transition-all duration-200 overflow-hidden">
              <Avatar className="h-8 w-8 ring-0">
                <AvatarImage src={avatarUrl || user?.avatar || ""} alt={user?.firstName || ""} />
                <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
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
            <DropdownMenuItem className="text-red-600" onClick={() => signOut({ callbackUrl: "/" })}>
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
    <div className="flex h-[100dvh] bg-background overflow-hidden">
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
    </div>
  );
}
