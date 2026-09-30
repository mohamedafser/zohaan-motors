"use client";

import { appConfig } from "@/config/app";
import { parseCurrencyInput } from "@/lib/utils/currency";
import { Input } from "@/components/ui/input";

export function CurrencyInput({
  id,
  name,
  value,
  onChange,
  onBlur,
  disabled,
  invalid,
  describedBy,
}: {
  id: string;
  name?: string;
  value: number | null;
  onChange: (value: number | null) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  return (
    <div className="flex">
      <span className="border-input bg-muted text-muted-foreground inline-flex h-11 items-center rounded-s-lg border border-e-0 px-3 text-sm md:h-10">
        {appConfig.currency}
      </span>
      <Input
        id={id}
        name={name}
        inputMode="decimal"
        disabled={disabled}
        value={value ?? ""}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="h-11 rounded-s-none md:h-10"
        onBlur={onBlur}
        onChange={(event) => onChange(parseCurrencyInput(event.target.value))}
      />
    </div>
  );
}
