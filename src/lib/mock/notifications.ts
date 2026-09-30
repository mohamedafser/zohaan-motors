export type SampleNotification = {
  id: string;
  titleKey:
    | "notifications.items.lead.title"
    | "notifications.items.inspection.title"
    | "notifications.items.payment.title";
  bodyKey:
    | "notifications.items.lead.body"
    | "notifications.items.inspection.body"
    | "notifications.items.payment.body";
  href: string;
  createdAt: string;
  read: boolean;
  sample: true;
};

/** Sample notices for the notification UI. Not live events. */
export const sampleNotifications: SampleNotification[] = [
  {
    id: "n1",
    titleKey: "notifications.items.lead.title",
    bodyKey: "notifications.items.lead.body",
    href: "/leads",
    createdAt: "2026-09-30T06:00:00.000Z",
    read: false,
    sample: true,
  },
  {
    id: "n2",
    titleKey: "notifications.items.inspection.title",
    bodyKey: "notifications.items.inspection.body",
    href: "/inspections",
    createdAt: "2026-09-29T08:00:00.000Z",
    read: false,
    sample: true,
  },
  {
    id: "n3",
    titleKey: "notifications.items.payment.title",
    bodyKey: "notifications.items.payment.body",
    href: "/payments",
    createdAt: "2026-09-25T09:00:00.000Z",
    read: true,
    sample: true,
  },
];
