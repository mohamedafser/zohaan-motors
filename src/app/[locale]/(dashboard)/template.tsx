// Templates remount on every navigation, so each route gets a fresh entrance.
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <div className="animate-page-in flex min-h-0 flex-1 flex-col">{children}</div>;
}
