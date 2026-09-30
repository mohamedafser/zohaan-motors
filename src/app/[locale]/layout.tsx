import type { Metadata, Viewport } from "next";
import { Geist_Mono, Noto_Sans_Arabic, Source_Sans_3 } from "next/font/google";
import { notFound } from "next/navigation";
import { hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";

import { AppProviders } from "@/components/providers/app-providers";
import { appConfig, directionFor, isAppLocale } from "@/config/app";
import { routing } from "@/lib/i18n/routing";

import "../globals.css";

const latin = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-latin",
  display: "swap",
});

const arabic = Noto_Sans_Arabic({
  subsets: ["arabic"],
  variable: "--font-arabic",
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
});

export const metadata: Metadata = {
  title: {
    default: appConfig.name,
    template: `%s · ${appConfig.name}`,
  },
  description: appConfig.description,
  applicationName: appConfig.name,
  appleWebApp: {
    capable: true,
    title: appConfig.shortName,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f1eb" },
    { media: "(prefers-color-scheme: dark)", color: "#1a2126" },
  ],
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale: localeParam } = await params;
  if (!hasLocale(routing.locales, localeParam) || !isAppLocale(localeParam)) {
    notFound();
  }

  setRequestLocale(localeParam);
  const messages = await getMessages();

  return (
    <html
      lang={localeParam}
      dir={directionFor(localeParam)}
      suppressHydrationWarning
      className={`${latin.variable} ${arabic.variable} ${mono.variable} h-full antialiased`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        <AppProviders locale={localeParam} direction={directionFor(localeParam)} messages={messages}>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
