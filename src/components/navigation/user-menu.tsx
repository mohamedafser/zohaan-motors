"use client";

import { LogOutIcon } from "lucide-react";
import { useTranslations } from "next-intl";

import { signOut } from "@/lib/auth/actions";
import { Link } from "@/lib/i18n/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AuthUser } from "@/types/auth";

export function UserMenu({ user }: { user: AuthUser }) {
  const t = useTranslations();
  const label = user.email ?? t("common.account");
  const initial = (user.email ?? "Z").slice(0, 1).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label={t("common.account")} />}
      >
        <Avatar className="size-7">
          <AvatarFallback>{initial}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="truncate font-normal">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem nativeButton={false} render={<Link href="/settings" />}>
          {t("nav.settings")}
        </DropdownMenuItem>
        <DropdownMenuItem nativeButton={false} render={<Link href="/mfa" />}>
          {t("auth.mfa.title")}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={() => signOut()}>
          <LogOutIcon />
          {t("common.signOut")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
