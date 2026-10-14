import {
  FilterBarSkeleton,
  KpiRowSkeleton,
  ListSkeleton,
  PageHeaderSkeleton,
  PageSkeleton,
} from "@/components/feedback/skeletons";

/** Header, customer KPIs, the filter tabs with search, then the customers. */
export default function Loading() {
  return (
    <PageSkeleton>
      <PageHeaderSkeleton />
      <KpiRowSkeleton />
      <FilterBarSkeleton tabs={3} />
      <ListSkeleton columns={5} lead="avatar" />
    </PageSkeleton>
  );
}
