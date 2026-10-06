"use client";

import { useCallback, useState } from "react";
import { useTranslations } from "next-intl";
import { Building2Icon, MailIcon, MapPinIcon, PhoneIcon } from "lucide-react";

import { CreateBranchDialog } from "@/components/branches/create-branch-dialog";
import { PageHeader } from "@/components/layout/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import type { BranchListItem } from "@/lib/branches/service";

type Props = {
  initialBranches: BranchListItem[];
  canCreate: boolean;
};

export function BranchesPageClient({ initialBranches, canCreate }: Props) {
  const t = useTranslations("modules.branches");
  const [branches, setBranches] = useState(initialBranches);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/branches", { credentials: "same-origin" });
    if (res.ok) setBranches(await res.json());
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t("title")}
        description={t("description")}
        actions={canCreate ? <CreateBranchDialog onSuccess={refresh} /> : null}
      />

      {branches.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border py-12 text-center">
          <Building2Icon className="text-muted-foreground size-8" />
          <p className="text-muted-foreground text-sm">{t("empty")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {branches.map((b) => (
            <article
              key={b.id}
              className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-semibold">{b.name}</h2>
                  <p className="text-muted-foreground font-mono text-xs">{b.code}</p>
                </div>
                <StatusBadge
                  status={b.isActive ? "active" : "archived"}
                  label={b.isActive ? t("active") : t("inactive")}
                />
              </div>

              <dl className="text-muted-foreground flex flex-col gap-1.5 text-sm">
                <div className="flex items-start gap-2">
                  <MapPinIcon className="mt-0.5 size-4 shrink-0" />
                  <dd>
                    {b.addressLine1}, {b.city} ·{" "}
                    {t(`emirates.${b.emirate}` as Parameters<typeof t>[0])}
                  </dd>
                </div>
                {b.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="size-4 shrink-0" />
                    <dd dir="ltr">{b.phone}</dd>
                  </div>
                )}
                {b.email && (
                  <div className="flex items-center gap-2">
                    <MailIcon className="size-4 shrink-0" />
                    <dd className="truncate">{b.email}</dd>
                  </div>
                )}
              </dl>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
