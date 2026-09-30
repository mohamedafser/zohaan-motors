"use client";

import { createContext, useContext, useMemo, useState } from "react";

import {
  sampleNotifications,
  type SampleNotification,
} from "@/lib/mock/notifications";

type NotificationState = {
  items: SampleNotification[];
  unreadCount: number;
  markRead: (id: string) => void;
  markAllRead: () => void;
};

const NotificationContext = createContext<NotificationState | null>(null);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState(sampleNotifications);
  const unreadCount = items.filter((item) => !item.read).length;

  const value = useMemo<NotificationState>(
    () => ({
      items,
      unreadCount,
      markRead: (id) => {
        setItems((current) =>
          current.map((item) => (item.id === id ? { ...item, read: true } : item)),
        );
      },
      markAllRead: () => {
        setItems((current) => current.map((item) => ({ ...item, read: true })));
      },
    }),
    [items, unreadCount],
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
