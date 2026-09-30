import { getTranslations } from "next-intl/server";

import { EmptyState } from "@/components/feedback/empty-state";
import { PageHeader } from "@/components/layout/page-header";

export async function ModuleScreen({
  titleKey,
  descriptionKey,
  emptyTitleKey = "empty.moduleTitle",
  emptyDescriptionKey = "empty.moduleDescription",
  children,
}: {
  titleKey: string;
  descriptionKey: string;
  emptyTitleKey?: string;
  emptyDescriptionKey?: string;
  children?: React.ReactNode;
}) {
  const t = await getTranslations();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={t(titleKey as Parameters<typeof t>[0])}
        description={t(descriptionKey as Parameters<typeof t>[0])}
      />
      {children ?? (
        <EmptyState
          title={t(emptyTitleKey as Parameters<typeof t>[0])}
          description={t(emptyDescriptionKey as Parameters<typeof t>[0])}
        />
      )}
    </div>
  );
}
