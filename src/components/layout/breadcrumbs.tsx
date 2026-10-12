"use client";

import { Fragment } from "react";
import { useTranslations } from "next-intl";

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { breadcrumbLabels, ownBreadcrumbLabels } from "@/config/routes";
import { useUserContext } from "@/hooks/use-permission";
import { canViewAllBookings } from "@/lib/permissions/roles";
import { decodeVehicleRef } from "@/lib/vehicles/routes";
import { Link, usePathname } from "@/lib/i18n/navigation";

export function AppBreadcrumbs() {
  const pathname = usePathname();
  const t = useTranslations();
  const { roles } = useUserContext();
  const ownOnly = !canViewAllBookings(roles);
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const href = `/${segments.slice(0, index + 1).join("/")}`;
    const key = (ownOnly && ownBreadcrumbLabels[segment]) || breadcrumbLabels[segment];
    const label = key ? t(key as Parameters<typeof t>[0]) : decodeVehicleRef(segment);
    return { href, label, current: index === segments.length - 1 };
  });

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {crumbs.map((crumb, index) => (
          <Fragment key={crumb.href}>
            {index > 0 ? <BreadcrumbSeparator /> : null}
            <BreadcrumbItem>
              {crumb.current ? (
                <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink render={<Link href={crumb.href} />}>{crumb.label}</BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
