"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Trash2Icon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { UserListItem } from "@/lib/users/service";

type Props = {
  user: UserListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRemoved: (id: string) => void;
};

export function RemoveUserDialog({ user, open, onOpenChange, onRemoved }: Props) {
  const t = useTranslations("modules.users");
  const [loading, setLoading] = useState(false);

  async function handleConfirm() {
    if (!user) return;
    setLoading(true);

    const res = await fetch(`/api/users/${user.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    setLoading(false);

    if (res.ok) {
      toast.success(t("removeSuccess"));
      onOpenChange(false);
      onRemoved(user.id);
    } else {
      toast.error(t("errors.removeFailed"));
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !loading && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("removeTitle")}</DialogTitle>
          <DialogDescription>
            {user && <span className="font-medium text-foreground">{user.displayName}</span>}
            {user?.email && <span> ({user.email})</span>}
            <br />
            {t("removeDescription")}
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="mt-6" showCloseButton>
          <Button variant="destructive" onClick={handleConfirm} disabled={loading}>
            <Trash2Icon />
            {t("removeConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
