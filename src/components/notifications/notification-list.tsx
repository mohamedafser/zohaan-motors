"use client";

import { useLocale, useTranslations } from "next-intl";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";
import { useNotifications } from "@/components/providers/notification-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { appConfig, isAppLocale } from "@/config/app";
import { Link } from "@/lib/i18n/navigation";
import { formatRelativeTime } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

export function NotificationList() {
  const t = useTranslations();
  const localeValue = useLocale();
  const locale = isAppLocale(localeValue) ? localeValue : appConfig.defaultLocale;
  const { items, markRead, markAllRead, unreadCount } = useNotifications();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("modules.notifications.title")}
        description={t("modules.notifications.description")}
        actions={
          <Button variant="outline" onClick={markAllRead} disabled={unreadCount === 0}>
            {t("notifications.markAllRead")}
          </Button>
        }
      />
      <p className="text-muted-foreground text-sm">{t("notifications.sampleNote")}</p>
      {items.length === 0 ? (
        <EmptyState title={t("empty.notifications")} description={t("empty.notificationsHint")} />
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => (
            <li key={item.id}>
              <article className={cn("rounded-xl border bg-card p-4", !item.read && "border-brand/40")}>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-medium">{t(item.titleKey)}</h2>
                  <Badge variant="outline">{t("common.sample")}</Badge>
                </div>
                <p className="text-muted-foreground mt-1 text-sm">{t(item.bodyKey)}</p>
                <p className="text-muted-foreground mt-2 text-xs">
                  {formatRelativeTime(item.createdAt, locale)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!item.read ? (
                    <Button variant="outline" size="sm" onClick={() => markRead(item.id)}>
                      {t("notifications.markRead")}
                    </Button>
                  ) : null}
                  <Button
                    variant="ghost"
                    size="sm"
                    nativeButton={false}
                    render={<Link href={item.href} />}
                  >
                    {t("common.viewAll")}
                  </Button>
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
