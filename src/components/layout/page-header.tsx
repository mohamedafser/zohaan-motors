import { AppBreadcrumbs } from "@/components/layout/breadcrumbs";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-3">
      {/* On desktop the breadcrumb trail lives in the top bar. */}
      <div className="md:hidden">
        <AppBreadcrumbs />
      </div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-balance sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="text-muted-foreground mt-1.5 max-w-2xl text-sm text-pretty sm:text-[0.9375rem]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}
