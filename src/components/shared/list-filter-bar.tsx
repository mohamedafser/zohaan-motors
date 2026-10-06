"use client";

import { ListFilterIcon, XIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

import { FilterChip, FilterToolbar } from "@/components/shared/filter-controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type FilterChipItem = {
  key: string;
  label: string;
  value: string;
  onRemove: () => void;
};

/**
 * Compact list toolbar: basic filters + Filter button (right sheet) + optional actions (e.g. List/Grid).
 */
export function ListFilterBar({
  ariaLabel,
  basicFilters,
  chips,
  advancedCount,
  hasActiveFilters,
  onClear,
  drawerTitle,
  drawerDescription,
  drawerContent,
  actions,
  className,
}: {
  ariaLabel: string;
  basicFilters: React.ReactNode;
  chips: FilterChipItem[];
  advancedCount: number;
  hasActiveFilters: boolean;
  onClear: () => void;
  drawerTitle: string;
  drawerDescription?: string;
  drawerContent: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}) {
  const t = useTranslations("common");
  const [open, setOpen] = useState(false);

  return (
    <section
      className={cn("bg-card flex flex-col gap-3 rounded-xl border p-3 md:p-4", className)}
      aria-label={ariaLabel}
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
        <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 xl:grid-cols-[minmax(0,1.6fr)_repeat(2,minmax(0,1fr))]">
          {basicFilters}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2 lg:pt-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10 gap-1.5"
            aria-haspopup="dialog"
            aria-expanded={open}
            onClick={() => setOpen(true)}
          >
            <ListFilterIcon className="size-4" aria-hidden />
            <span>{t("filters")}</span>
            {advancedCount > 0 ? (
              <Badge variant="secondary" className="ms-0.5 tabular-nums">
                {advancedCount}
              </Badge>
            ) : null}
          </Button>
          {actions}
        </div>
      </div>

      {chips.length > 0 ? (
        <FilterToolbar>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {chips.map((chip) => (
              <FilterChip
                key={chip.key}
                label={chip.label}
                value={chip.value}
                onRemove={chip.onRemove}
              />
            ))}
          </div>
          {hasActiveFilters ? (
            <Button type="button" variant="ghost" size="sm" className="h-8 shrink-0" onClick={onClear}>
              <XIcon aria-hidden />
              {t("clearAll")}
            </Button>
          ) : null}
        </FilterToolbar>
      ) : null}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="right"
          className="w-full gap-0 overflow-hidden p-0 sm:max-w-md"
          showCloseButton
        >
          <SheetHeader className="border-b pe-12">
            <SheetTitle>{drawerTitle}</SheetTitle>
            {drawerDescription ? (
              <SheetDescription className="text-xs">{drawerDescription}</SheetDescription>
            ) : null}
          </SheetHeader>
          <div className="bg-muted/20 min-h-0 flex-1 overflow-y-auto px-3 py-3">
            {drawerContent}
          </div>
          <SheetFooter className="border-t bg-background sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={!hasActiveFilters}
              onClick={onClear}
            >
              {t("clearAll")}
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              {t("done")}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </section>
  );
}
