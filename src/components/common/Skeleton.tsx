import React from 'react';

// ============================================================================
// Core Reusable Skeleton Primitives
// ============================================================================

export interface SkeletonProps {
  className?: string;
  rounded?: string;
  shimmer?: boolean;
}

/**
 * Base atomic Skeleton block with smooth shimmer and pulse animation.
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = 'w-full h-4',
  rounded = 'rounded-lg',
  shimmer = true,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`bg-slate-200/70 animate-pulse ${rounded} ${
        shimmer ? 'skeleton-shimmer' : ''
      } ${className}`}
    />
  );
};

export interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineHeight?: string;
  lastLineWidth?: string;
}

/**
 * Realistic typography skeleton simulating one or multiple lines of text.
 */
export const SkeletonText: React.FC<SkeletonTextProps> = ({
  lines = 1,
  className = '',
  lineHeight = 'h-3.5',
  lastLineWidth = 'w-3/4',
}) => {
  if (lines === 1) {
    return <Skeleton className={`${lineHeight} ${className}`} />;
  }

  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, idx) => (
        <Skeleton
          key={idx}
          className={`${lineHeight} ${idx === lines - 1 ? lastLineWidth : 'w-full'}`}
        />
      ))}
    </div>
  );
};

export interface SkeletonAvatarProps {
  size?: string;
  className?: string;
  rounded?: string;
}

/**
 * Circular avatar or square icon placeholder.
 */
export const SkeletonAvatar: React.FC<SkeletonAvatarProps> = ({
  size = 'w-10 h-10',
  rounded = 'rounded-full',
  className = '',
}) => {
  return <Skeleton className={`${size} ${rounded} shrink-0 ${className}`} />;
};

export interface SkeletonBadgeProps {
  className?: string;
  width?: string;
  height?: string;
}

/**
 * Rounded pill tag/badge skeleton.
 */
export const SkeletonBadge: React.FC<SkeletonBadgeProps> = ({
  width = 'w-16',
  height = 'h-5',
  className = '',
}) => {
  return <Skeleton className={`${height} ${width} rounded-full ${className}`} />;
};

export interface SkeletonButtonProps {
  className?: string;
  height?: string;
  width?: string;
}

/**
 * Interactive button placeholder.
 */
export const SkeletonButton: React.FC<SkeletonButtonProps> = ({
  height = 'h-9',
  width = 'w-full',
  className = '',
}) => {
  return <Skeleton className={`${height} ${width} rounded-xl ${className}`} />;
};

export interface SkeletonCardProps {
  children?: React.ReactNode;
  className?: string;
}

/**
 * Card container matching the project's glassmorphism card style.
 */
export const SkeletonCard: React.FC<SkeletonCardProps> = ({
  children,
  className = '',
}) => {
  return (
    <div
      className={`bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  );
};

// ============================================================================
// Composed Dashboard Skeletons
// ============================================================================

/**
 * KPI Stat Cards Skeleton matching StatCards.tsx geometry.
 */
export const StatCardsSkeleton: React.FC = () => {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4" aria-busy="true" aria-label="Loading statistics">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between h-[116px]"
        >
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="w-7 h-7 rounded-xl" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-2.5 w-36 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Monthly Collection Health Donut Chart Skeleton matching CollectionDonutChart.tsx.
 */
export const CollectionDonutChartSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-[380px]"
      aria-busy="true"
      aria-label="Loading collection chart"
    >
      {/* Title */}
      <div className="border-b border-slate-100 pb-2.5 mb-2">
        <Skeleton className="h-4 w-44 rounded mb-1.5" />
        <Skeleton className="h-2.5 w-60 rounded" />
      </div>

      {/* Circular Donut Skeleton */}
      <div className="relative h-56 sm:h-64 w-full flex items-center justify-center my-1">
        <div className="w-44 h-44 sm:w-48 sm:h-48 rounded-full border-[18px] border-slate-200/80 animate-pulse skeleton-shimmer flex items-center justify-center">
          <div className="flex flex-col items-center space-y-1">
            <Skeleton className="h-7 w-14 rounded-lg" />
            <Skeleton className="h-2.5 w-12 rounded" />
          </div>
        </div>
      </div>

      {/* Legend Footer */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="flex items-center gap-2 justify-end">
          <Skeleton className="w-2.5 h-2.5 rounded-full" />
          <Skeleton className="h-3 w-24 rounded" />
        </div>
      </div>
    </div>
  );
};

/**
 * Cash Inflow vs Payouts Bar Chart Skeleton matching CashflowBarChart.tsx.
 */
export const CashflowBarChartSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs flex flex-col justify-between h-[380px]"
      aria-busy="true"
      aria-label="Loading cashflow chart"
    >
      {/* Title */}
      <div className="border-b border-slate-100 pb-2.5 mb-2 flex items-center justify-between">
        <div>
          <Skeleton className="h-4 w-48 rounded mb-1.5" />
          <Skeleton className="h-2.5 w-64 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
      </div>

      {/* Bar Chart Bars Placeholder */}
      <div className="h-60 sm:h-64 w-full flex items-end justify-around px-4 pb-4 pt-6 border-b border-slate-100">
        {[
          { h1: 'h-24', h2: 'h-16' },
          { h1: 'h-36', h2: 'h-28' },
          { h1: 'h-48', h2: 'h-32' },
          { h1: 'h-32', h2: 'h-20' },
          { h1: 'h-40', h2: 'h-24' },
          { h1: 'h-28', h2: 'h-16' },
        ].map((bar, idx) => (
          <div key={idx} className="flex flex-col items-center gap-2">
            <div className="flex items-end gap-1.5 h-44">
              <Skeleton className={`w-3.5 sm:w-5 ${bar.h1} rounded-t-md bg-forest-200/60`} />
              <Skeleton className={`w-3.5 sm:w-5 ${bar.h2} rounded-t-md bg-amber-200/60`} />
            </div>
            <Skeleton className="h-2.5 w-6 rounded" />
          </div>
        ))}
      </div>

      {/* Footnote */}
      <div className="pt-2 flex justify-between">
        <Skeleton className="h-2.5 w-28 rounded" />
        <Skeleton className="h-2.5 w-36 rounded" />
      </div>
    </div>
  );
};

/**
 * Defaulter Aging Buckets Skeleton matching DefaulterAgingBuckets.tsx.
 */
export const DefaulterAgingBucketsSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-4"
      aria-busy="true"
      aria-label="Loading defaulter buckets"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded" />
            <Skeleton className="h-4 w-48 rounded" />
          </div>
          <Skeleton className="h-2.5 w-72 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded" />
      </div>

      {/* 3 Risk Buckets */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[1, 2, 3].map((b) => (
          <div key={b} className="p-3.5 rounded-xl border border-slate-200/70 bg-slate-50/50 space-y-2">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="w-5 h-5 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24 rounded-lg" />
            <Skeleton className="h-2.5 w-32 rounded" />
          </div>
        ))}
      </div>

      {/* Member rows */}
      <div className="space-y-2 pt-2 border-t border-slate-100">
        <Skeleton className="h-3 w-32 rounded mb-2" />
        {[1, 2, 3].map((r) => (
          <div
            key={r}
            className="p-3 rounded-xl border border-slate-100 bg-slate-50/40 flex items-center justify-between"
          >
            <div className="space-y-1.5 flex-1">
              <div className="flex items-center gap-2">
                <Skeleton className="h-3.5 w-28 rounded" />
                <Skeleton className="h-4 w-16 rounded-full" />
              </div>
              <Skeleton className="h-2.5 w-40 rounded" />
            </div>
            <div className="flex items-center gap-3">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="h-7 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Active Chits Overview Skeleton matching ActiveChitsOverview.tsx.
 */
export const ActiveChitsOverviewSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      aria-busy="true"
      aria-label="Loading chit schemes"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="space-y-1">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-2.5 w-52 rounded" />
        </div>
        <Skeleton className="h-4 w-20 rounded" />
      </div>

      <div className="p-3 sm:p-4 space-y-3">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-20 rounded" />
                <Skeleton className="h-4 w-12 rounded-full" />
              </div>
              <Skeleton className="h-5 w-24 rounded" />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-12 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-14 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2.5 w-12 rounded" />
                <Skeleton className="h-3.5 w-14 rounded" />
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1">
              <div className="flex justify-between">
                <Skeleton className="h-2 w-20 rounded" />
                <Skeleton className="h-2 w-8 rounded" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Pending Collections List Skeleton matching PendingCollectionsList.tsx.
 */
export const PendingCollectionsListSkeleton: React.FC = () => {
  return (
    <div
      className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden"
      aria-busy="true"
      aria-label="Loading pending collections"
    >
      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-44 rounded" />
            <Skeleton className="h-4 w-6 rounded-full" />
          </div>
          <Skeleton className="h-2.5 w-64 rounded" />
        </div>
        <Skeleton className="h-4 w-16 rounded" />
      </div>

      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4].map((n) => (
          <div
            key={n}
            className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-3.5 w-28 rounded" />
                  <Skeleton className="h-3.5 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-32 rounded" />
                <div className="flex items-center gap-3 pt-0.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Composed Views Skeletons
// ============================================================================

/**
 * Chit Groups View Skeleton (3 scheme cards).
 */
export const ChitGroupsOverviewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading chit groups">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-48 rounded" />
          <Skeleton className="h-3 w-80 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Grid of 3 Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs flex flex-col justify-between space-y-4"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="space-y-1">
                  <Skeleton className="h-4 w-24 rounded" />
                  <Skeleton className="h-2.5 w-28 rounded" />
                </div>
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>

              {/* Pot value box */}
              <div className="my-3 p-3 rounded-xl bg-forest-50/60 border border-forest-100 space-y-1">
                <Skeleton className="h-2.5 w-20 rounded" />
                <Skeleton className="h-7 w-32 rounded-lg" />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-14 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-16 rounded" />
                  <Skeleton className="h-3.5 w-20 rounded" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-16 rounded" />
                  <Skeleton className="h-3.5 w-12 rounded" />
                </div>
                <div className="space-y-1">
                  <Skeleton className="h-2.5 w-20 rounded" />
                  <Skeleton className="h-3.5 w-14 rounded" />
                </div>
              </div>
            </div>

            <Skeleton className="h-9 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Chit Group Subscribers Drilldown Skeleton.
 */
export const ChitGroupSubscribersSkeleton: React.FC = () => {
  return (
    <div className="space-y-5 animate-in fade-in duration-150" aria-busy="true" aria-label="Loading group subscribers">
      {/* Top Nav */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-3">
          <Skeleton className="h-8 w-40 rounded-xl" />
          <Skeleton className="h-3 w-28 rounded hidden sm:block" />
        </div>
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-7 w-16 rounded-xl" />
          <Skeleton className="h-7 w-16 rounded-xl" />
          <Skeleton className="h-7 w-16 rounded-xl" />
        </div>
      </div>

      {/* Summary Card */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-7 w-32 rounded-lg" />
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>
            <Skeleton className="h-3 w-48 rounded" />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-forest-50/60 p-3 rounded-xl border border-forest-100">
            {[1, 2, 3, 4].map((m) => (
              <div key={m} className="space-y-1">
                <Skeleton className="h-2.5 w-14 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Subscribers Count */}
      <div className="bg-white/95 backdrop-blur-md p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <Skeleton className="h-8 w-full md:w-80 rounded-xl" />
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-7 w-28 rounded-xl" />
        </div>
      </div>

      {/* Grid of 6 Subscriber Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <div
            key={n}
            className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-2.5 w-20 rounded" />
                </div>
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>

            <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-2.5 w-24 rounded" />
                <Skeleton className="h-3 w-12 rounded" />
              </div>
              <div className="flex gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-md" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 p-2 rounded-xl bg-slate-50/60 border border-slate-100">
              <div className="space-y-1">
                <Skeleton className="h-2 w-14 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-2 w-14 rounded" />
                <Skeleton className="h-3.5 w-16 rounded" />
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Member Directory Skeleton matching MembersView.tsx.
 */
export const MembersViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading member directory">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-5 w-40 rounded" />
            <Skeleton className="h-5 w-20 rounded-full" />
          </div>
          <Skeleton className="h-3 w-72 rounded" />
        </div>
        <Skeleton className="h-9 w-32 rounded-xl" />
      </div>

      {/* Search Bar */}
      <Skeleton className="h-10 w-full rounded-2xl" />

      {/* Grid of 6 Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 shadow-xs space-y-3"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-4 w-32 rounded" />
                <div className="flex items-center gap-1.5">
                  <Skeleton className="h-5 w-24 rounded-lg" />
                  <Skeleton className="h-5 w-16 rounded-lg" />
                </div>
                <Skeleton className="h-2.5 w-40 rounded" />
              </div>
              <Skeleton className="h-5 w-14 rounded-full" />
            </div>

            <Skeleton className="h-3 w-36 rounded" />
            <Skeleton className="h-2.5 w-48 rounded" />

            <div className="pt-3 border-t border-slate-100 flex gap-2">
              <Skeleton className="h-8 flex-1 rounded-xl" />
              <Skeleton className="h-8 flex-1 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Monthly Payments View Skeleton matching PaymentsView.tsx.
 */
export const PaymentsViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading installment ledger">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-52 rounded" />
          <Skeleton className="h-3 w-80 rounded" />
        </div>
        <Skeleton className="h-9 w-36 rounded-xl" />
      </div>

      {/* Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Skeleton className="h-9 w-80 rounded-2xl" />
        <Skeleton className="h-9 w-60 rounded-xl" />
      </div>

      {/* Installment Rows */}
      <div className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 shadow-xs divide-y divide-slate-100 overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0 mt-0.5" />
              <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-4 w-16 rounded-full" />
                </div>
                <Skeleton className="h-2.5 w-36 rounded" />
                <div className="flex items-center gap-3 pt-0.5">
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Skeleton className="h-8 w-24 rounded-xl" />
              <Skeleton className="h-8 w-20 rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

/**
 * Auction Records View Skeleton matching AuctionsView.tsx.
 */
export const AuctionsViewSkeleton: React.FC = () => {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading auction records">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-64 rounded" />
          <Skeleton className="h-3 w-80 rounded" />
        </div>
        <Skeleton className="h-9 w-40 rounded-xl" />
      </div>

      {/* Auction Cards */}
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-44 rounded" />
                  <Skeleton className="h-2.5 w-32 rounded" />
                </div>
              </div>
              <Skeleton className="h-7 w-52 rounded-xl" />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-50/70 border border-slate-100">
              {[1, 2, 3, 4].map((m) => (
                <div key={m} className="space-y-1">
                  <Skeleton className="h-2.5 w-16 rounded" />
                  <Skeleton className="h-4 w-20 rounded" />
                </div>
              ))}
            </div>

            <div className="flex justify-between items-center pt-1">
              <Skeleton className="h-3 w-40 rounded" />
              <Skeleton className="h-3 w-36 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
