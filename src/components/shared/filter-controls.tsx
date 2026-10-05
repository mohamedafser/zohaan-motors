"use client";

import { XIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const DEBOUNCE_MS = 300;

/** Text input that commits to the URL ~300ms after the user stops typing. */
export function DebouncedFilterInput({
  value,
  onCommit,
  ...props
}: Omit<React.ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & {
  value: string;
  onCommit: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  const committed = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onCommitRef = useRef(onCommit);

  useEffect(() => {
    onCommitRef.current = onCommit;
  }, [onCommit]);

  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setDraft(value);
    }
  }, [value]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return (
    <Input
      {...props}
      value={draft}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => {
          const trimmed = next.trim();
          if (trimmed === committed.current) return;
          committed.current = trimmed;
          onCommitRef.current(trimmed);
        }, DEBOUNCE_MS);
      }}
    />
  );
}

export function FilterChip({
  label,
  value,
  onRemove,
}: {
  label: string;
  value: string;
  onRemove: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onRemove}
      className={cn(
        "border-border bg-muted/60 text-foreground hover:bg-muted inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs transition-colors",
      )}
      aria-label={`${label}: ${value}. Remove filter`}
    >
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="truncate font-medium">{value}</span>
      <XIcon className="text-muted-foreground size-3.5 shrink-0" aria-hidden />
    </button>
  );
}

export function FilterGroup({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">{title}</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </div>
  );
}

export function FilterToolbar({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
