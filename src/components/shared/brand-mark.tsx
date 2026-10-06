import Image from "next/image";

import { appConfig } from "@/config/app";
import { cn } from "@/lib/utils";

export function BrandMark({
  className,
  showName = true,
}: {
  className?: string;
  showName?: boolean;
}) {
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2", className)}>
      <Image
        src="/brand/logo-mark.png"
        alt=""
        width={32}
        height={32}
        priority
        className="size-8 shrink-0 rounded-lg"
      />
      {showName ? (
        <span className="truncate text-sm font-semibold tracking-tight">{appConfig.name}</span>
      ) : null}
    </span>
  );
}
