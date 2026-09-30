"use client";

import { BellIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";

import { useNotifications } from "@/components/providers/notification-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { appConfig, isAppLocale } from "@/config/app";
import { Link } from "@/lib/i18n/navigation";
import { formatRelativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

export function NotificationMenu() {
  const t = useTranslations();
  const localeValue = useLocale();
  const locale = isAppLocale(localeValue) ? localeValue : appConfig.defaultLocale;
  const { items, unreadCount, markRead, markAllRead } = useNotifications();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="relative"
            aria-label={t("nav.notifications")}
          />
        }
      >
        <BellIcon />
        {unreadCount > 0 ? (
          <span className="bg-brand text-brand-foreground absolute end-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-semibold">
            {unreadCount}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <div className="flex items-center justify-between gap-3 border-b px-3 py-2">
          <div>
            <p className="text-sm font-medium">{t("notifications.title")}</p>
            <p className="text-muted-foreground text-xs">
              {t("notifications.unread", { count: unreadCount })}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={markAllRead} disabled={unreadCount === 0}>
            {t("notifications.markAllRead")}
          </Button>
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {items.length === 0 ? (
            <li className="text-muted-foreground px-3 py-6 text-center text-sm">
              {t("empty.notifications")}
            </li>
          ) : (
            items.map((item) => (
              <li key={item.id} className="border-b last:border-b-0">
                <Link
                  href={item.href}
                  onClick={() => markRead(item.id)}
                  className={cn(
                    "hover:bg-muted focus-visible:bg-muted block px-3 py-3 outline-none",
                    !item.read && "bg-brand/8",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-sm font-medium">{t(item.titleKey)}</span>
                    <Badge variant="outline">{t("common.sample")}</Badge>
                  </span>
                  <span className="text-muted-foreground mt-1 block text-xs">{t(item.bodyKey)}</span>
                  <span className="text-muted-foreground mt-1 block text-xs">
                    {formatRelativeTime(item.createdAt, locale)}
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
        <div className="border-t p-2">
          <Button
            variant="ghost"
            className="w-full"
            nativeButton={false}
            render={<Link href="/notifications" />}
          >
            {t("common.viewAll")}
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
