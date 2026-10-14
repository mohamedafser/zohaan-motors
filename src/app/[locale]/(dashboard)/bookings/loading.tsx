import { FilterBarSkeleton, ListSkeleton, PageHeaderSkeleton, PageSkeleton } from "@/components/feedback/skeletons";

/** Header, the Active / Sold / Closed / All tabs with search, then the bookings. */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton actions={1} />
      <FilterBarSkeleton tabs={4} />
      <ListSkeleton columns={6} lead="none" />
    </PageSkeleton>
  );
}
