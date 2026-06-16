import { Suspense } from "react";
import { AdminTabs } from "@/components/admin/admin-tabs";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {/* Suspense requerido por useSearchParams() en AdminTabs */}
      <Suspense fallback={<TabsSkeleton />}>
        <AdminTabs />
      </Suspense>
      {children}
    </div>
  );
}

function TabsSkeleton() {
  return (
    <div className="mx-auto w-full max-w-md shrink-0 px-4 pb-3 pt-5">
      <div className="grid grid-cols-3 gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-xl bg-white/8" />
        ))}
      </div>
    </div>
  );
}
