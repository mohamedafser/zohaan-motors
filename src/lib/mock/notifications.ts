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
export const sampleNotifications: SampleNotification[] = [];
