"use client";

import { ar, enUS } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useLocale } from "next-intl";

import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { appConfig, isAppLocale } from "@/config/app";
import { formatDate } from "@/lib/utils/date";
import { cn } from "@/lib/utils";

export function DateField({
  id,
  value,
  onChange,
  placeholder,
  disabled,
  invalid,
}: {
  id: string;
  value?: Date;
  onChange: (value?: Date) => void;
  placeholder: string;
  disabled?: boolean;
  invalid?: boolean;
}) {
  const localeValue = useLocale();
  const locale = isAppLocale(localeValue) ? localeValue : appConfig.defaultLocale;

  return (
    <Popover>
      <PopoverTrigger
        render={
          <Button
            id={id}
            type="button"
            variant="outline"
            disabled={disabled}
            aria-invalid={invalid || undefined}
            className={cn(
              "h-11 w-full justify-start px-3 font-normal md:h-10",
              !value && "text-muted-foreground",
            )}
          />
        }
      >
        <CalendarIcon />
        {value ? formatDate(value, locale, "medium") : placeholder}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          onSelect={onChange}
          locale={locale === "ar" ? ar : enUS}
        />
      </PopoverContent>
    </Popover>
  );
}
