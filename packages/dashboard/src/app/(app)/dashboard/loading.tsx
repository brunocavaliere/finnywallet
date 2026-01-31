import { Skeleton } from "@/components/ui/skeleton";

function TableSkeleton() {
  return (
    <div className="rounded-md border border-border/40 bg-background/40">
      <div className="border-b border-border/50 px-4 py-3">
        <Skeleton className="h-4 w-40" />
      </div>
      <div className="space-y-3 px-4 py-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function LoadingDashboard() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-72" />
      </div>
      <TableSkeleton />
      <TableSkeleton />
    </div>
  );
}
