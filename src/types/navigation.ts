import type { LucideIcon } from "lucide-react";

export type MobileSlot = "home" | "cars" | "leads";

export type NavItem = {
  href: string;
  labelKey: string;
  icon: LucideIcon;
  mobile?: MobileSlot;
};

export type NavGroup = {
  id: string;
  labelKey?: string;
  items: NavItem[];
};
