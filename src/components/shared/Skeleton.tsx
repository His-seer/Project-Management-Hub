'use client';

/**
 * Reusable shimmer loading skeletons.
 */

export function SkeletonLine({ width = '100%', height = '14px' }: { width?: string; height?: string }) {
  return (
    <div
      className="rounded-md bg-slate-200 dark:bg-slate-700 animate-pulse"
      style={{ width, height }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="pm-card p-5 space-y-3">
      <SkeletonLine width="60%" height="18px" />
      <SkeletonLine width="90%" />
      <SkeletonLine width="75%" />
      <div className="flex gap-2 pt-1">
        <SkeletonLine width="60px" height="22px" />
        <SkeletonLine width="80px" height="22px" />
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="pm-card overflow-hidden">
      {/* Header */}
      <div className="flex gap-4 px-5 py-3 border-b border-slate-200 dark:border-slate-700">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonLine key={i} width={`${20 + Math.random() * 15}%`} height="14px" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex gap-4 px-5 py-3 border-b border-slate-100 dark:border-slate-800 last:border-0">
          {Array.from({ length: cols }).map((_, c) => (
            <SkeletonLine key={c} width={`${25 + Math.random() * 20}%`} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="p-8 max-w-7xl mx-auto w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <SkeletonLine width="220px" height="28px" />
          <SkeletonLine width="160px" />
        </div>
        <div className="flex gap-2">
          <SkeletonLine width="120px" height="36px" />
          <SkeletonLine width="120px" height="36px" />
        </div>
      </div>
      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pm-card p-4 space-y-2">
            <SkeletonLine width="80px" />
            <SkeletonLine width="50px" height="28px" />
          </div>
        ))}
      </div>
      {/* Project cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

export function SkeletonProjectPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <SkeletonLine width="240px" height="28px" />
        <SkeletonLine width="80px" height="24px" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="pm-card p-4 space-y-2">
            <SkeletonLine width="80px" />
            <SkeletonLine width="50px" height="28px" />
          </div>
        ))}
      </div>
      <SkeletonTable rows={4} cols={5} />
    </div>
  );
}
