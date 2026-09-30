"use client";

import { DirectionProvider } from "@base-ui/react/direction-provider";
import { NextIntlClientProvider } from "next-intl";
import { ThemeProvider } from "next-themes";

import { QueryProvider } from "@/components/providers/query-provider";
import { ServiceWorkerRegister } from "@/components/providers/service-worker-register";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { appConfig, type AppLocale } from "@/config/app";

export function AppProviders({
  children,
  locale,
  direction,
  messages,
}: {
  children: React.ReactNode;
  locale: AppLocale;
  direction: "ltr" | "rtl";
  messages: Record<string, unknown>;
}) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <DirectionProvider direction={direction}>
        <NextIntlClientProvider locale={locale} messages={messages} timeZone={appConfig.timezone}>
          <QueryProvider>
            <TooltipProvider delay={300}>
              {children}
              <Toaster position={direction === "rtl" ? "top-left" : "top-right"} />
              <ServiceWorkerRegister />
            </TooltipProvider>
          </QueryProvider>
        </NextIntlClientProvider>
      </DirectionProvider>
    </ThemeProvider>
  );
}
