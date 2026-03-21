"use client";

import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { LocalizationProvider } from "@/components/providers/LocalizationProvider";
import { BrandingProvider } from "@/components/providers/BrandingProvider";
import { UserAvatarProvider } from "@/components/providers/UserAvatarProvider";
import { memo } from "react";

interface ProvidersProps {
  children: React.ReactNode;
}

export const Providers = memo(function Providers({ children }: ProvidersProps) {
  return (
    <SessionProvider
      basePath="/api/auth"
      refetchOnWindowFocus={false}
      refetchInterval={0}
    >
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        disableTransitionOnChange
      >
        <BrandingProvider>
          <LocalizationProvider>
            <UserAvatarProvider>{children}</UserAvatarProvider>
          </LocalizationProvider>
        </BrandingProvider>
      </ThemeProvider>
    </SessionProvider>
  );
});

export default Providers;
