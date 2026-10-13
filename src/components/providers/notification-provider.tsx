"use client";

import { createContext, useCallback, useContext, useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { AppNotification } from "@/types/notification";

type NotificationState = {
  items: AppNotification[];
  /** When the notifications were last loaded (ms); changes on every successful check. */
  updatedAt: number;
  unreadCount: number;
  markRead: (id: string) => void;
  markManyRead: (ids: string[]) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationState | null>(null);

const notificationKeys = { all: ["notifications"] as const };

type NotificationFeed = { items: AppNotification[]; nextCheckAt: string | null };

async function fetchNotifications(): Promise<NotificationFeed> {
  const res = await fetch("/api/notifications", { credentials: "same-origin", cache: "no-store" });
  const json = await res.json().catch(() => null);
  if (json?.status !== "success") throw new Error(json?.message ?? "Could not load notifications.");
  return json.data;
}

/** Re-check this long after a deadline passes, so the server has applied it. */
const DEADLINE_GRACE_MS = 1500;
/** Longer waits are left to the regular poll (and stay under setTimeout's limit). */
const MAX_SCHEDULE_MS = 60 * 60 * 1000;

async function patchRead(body: { ids: string[] } | { all: true }) {
  const res = await fetch("/api/notifications", {
    method: "PATCH",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error("Could not update notifications.");
}

export function NotificationProvider({
  enabled = true,
  children,
}: {
  /** Off for users without notification.view. */
  enabled?: boolean;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt, refetch } = useQuery({
    queryKey: notificationKeys.all,
    queryFn: fetchNotifications,
    enabled,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const items = useMemo(() => data?.items ?? [], [data]);

  // Check again the moment the next booking deadline passes, so its alert appears live.
  const nextCheckAt = data?.nextCheckAt ?? null;
  useEffect(() => {
    if (!enabled || !nextCheckAt) return;
    const wait = new Date(nextCheckAt).getTime() - Date.now() + DEADLINE_GRACE_MS;
    if (wait > MAX_SCHEDULE_MS) return;
    const timer = window.setTimeout(() => void refetch(), Math.max(wait, 0));
    return () => window.clearTimeout(timer);
  }, [enabled, nextCheckAt, refetch]);

  const { mutate } = useMutation({
    mutationFn: patchRead,
    onMutate: async (body) => {
      await queryClient.cancelQueries({ queryKey: notificationKeys.all });
      const previous = queryClient.getQueryData<NotificationFeed>(notificationKeys.all);
      const ids = "ids" in body ? new Set(body.ids) : null;
      queryClient.setQueryData<NotificationFeed>(notificationKeys.all, (current) =>
        current
          ? {
              ...current,
              items: current.items.map((item) => (!ids || ids.has(item.id) ? { ...item, read: true } : item)),
            }
          : current,
      );
      return { previous };
    },
    onError: (_error, _body, context) => {
      if (context?.previous) queryClient.setQueryData(notificationKeys.all, context.previous);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  });

  const markManyRead = useCallback(
    (ids: string[]) => {
      const unread = ids.filter((id) => items.some((item) => item.id === id && !item.read));
      if (unread.length > 0) mutate({ ids: unread });
    },
    [items, mutate],
  );

  const unreadCount = items.filter((item) => !item.read).length;

  const value = useMemo<NotificationState>(
    () => ({
      items,
      updatedAt: dataUpdatedAt,
      unreadCount,
      markRead: (id) => markManyRead([id]),
      markManyRead,
      markAllRead: () => {
        if (unreadCount > 0) mutate({ all: true });
      },
    }),
    [items, dataUpdatedAt, unreadCount, markManyRead, mutate],
  );

  return <NotificationContext.Provider value={value}>{children}</NotificationContext.Provider>;
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("Notifications are only available inside the workspace shell.");
  }
  return context;
}
