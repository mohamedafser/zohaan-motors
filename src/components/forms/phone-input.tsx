"use client";

import { appConfig } from "@/config/app";
import { nationalFromE164, normalizeUaePhone } from "@/lib/utils/phone";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function PhoneInput({
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
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
}) {
  const national = value ? nationalFromE164(value) : "";

  return (
    <div className="flex">
      <span className="border-input bg-muted text-muted-foreground inline-flex h-11 items-center rounded-s-lg border border-e-0 px-3 text-sm md:h-10">
        {appConfig.phone.dialCode}
      </span>
      <Input
        id={id}
        name={name}
        inputMode="tel"
        autoComplete="tel-national"
        disabled={disabled}
        value={national}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={cn("h-11 rounded-s-none md:h-10")}
        onBlur={onBlur}
        onChange={(event) => {
          const next = normalizeUaePhone(event.target.value);
          onChange(next ?? event.target.value.replace(/[^\d]/g, ""));
        }}
      />
    </div>
  );
}
