import React from 'react';

/**
 * Bazowy komponent szkieletu (Skeleton) z animacją pulsowania.
 */
export function Skeleton({ className = '', ...props }) {
  return (
    <div
      className={`animate-pulse bg-gray-200/80 rounded-md ${className}`}
      {...props}
    />
  );
}

/**
 * Szkielet wierszy tabeli (np. w OrdersPage).
 */
export function TableRowsSkeleton({ rows = 5, cols = 7 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, rIndex) => (
        <tr key={rIndex} className="border-b border-gray-100">
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-12" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-16" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-32" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-36" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-6 w-24 rounded-full" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-20" />
          </td>
          <td className="py-4 px-6">
            <Skeleton className="h-4 w-16" />
          </td>
        </tr>
      ))}
    </>
  );
}

/**
 * Szkielet karty klienta (w ClientsPage).
 */
export function ClientCardSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col h-full animate-pulse">
      <div className="flex items-center gap-4 mb-5">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>

      <div className="space-y-3 mb-6">
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <Skeleton className="h-3.5 w-44" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="w-4 h-4 rounded shrink-0" />
          <Skeleton className="h-3.5 w-28" />
        </div>
      </div>

      <div className="mt-auto pt-4 border-t border-gray-100 flex justify-between items-center">
        <Skeleton className="h-3 w-32" />
        <Skeleton className="h-4 w-8" />
      </div>
    </div>
  );
}

/**
 * Szkielet kart zleceń na urządzeniach mobilnych (w OrdersPage).
 */
export function MobileOrderCardsSkeleton({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3 animate-pulse">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-14" />
              <Skeleton className="h-5 w-20 rounded" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="space-y-1.5 pt-1">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-48" />
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-100">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * Pełny szkielet widoku Dashboardu (w DashboardPage).
 */
export function DashboardSkeleton() {
  return (
    <div className="px-4 sm:px-6 md:px-8 pb-8 relative">
      <div className="py-4 sm:py-6 mb-4 sm:mb-6">
        <Skeleton className="h-8 w-64 mb-2" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* 4 kafelki ze statystykami */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-9 w-20" />
            <Skeleton className="h-3 w-36" />
          </div>
        ))}
      </div>

      {/* Sekcja ostatnich zleceń */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 sm:p-6 shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>

        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center"
            >
              <div className="space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-4 w-16" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Szkielet widoku szczegółów klienta (w ClientDetailsPage).
 */
export function ClientDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Przycisk powrotu */}
      <div className="flex items-center mb-6">
        <Skeleton className="h-8 w-36 rounded-full" />
      </div>

      {/* Nagłówek klienta */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 mb-6 sm:mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-6">
          <Skeleton className="w-16 h-16 rounded-full shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <Skeleton className="h-4 w-60" />
          </div>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Skeleton className="h-10 w-28 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
      </div>

      {/* Sekcje rowerów i historii zleceń */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm space-y-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4 sm:p-6 shadow-sm space-y-4">
          <Skeleton className="h-6 w-40 mb-4" />
          <Skeleton className="h-20 w-full rounded-lg" />
          <Skeleton className="h-20 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}

/**
 * Szkielet widoku szczegółów zlecenia (w OrderDetailsPage).
 */
export function OrderDetailsSkeleton() {
  return (
    <div className="p-4 sm:p-6 md:p-8">
      {/* Przycisk powrotu */}
      <div className="flex items-center mb-6">
        <Skeleton className="h-8 w-28 rounded-full" />
      </div>

      {/* Karta nagłówkowa */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-44" />
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-10 w-44 rounded-md" />
      </div>

      {/* Kolumny szczegółów */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 flex flex-col sm:flex-row gap-8">
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-44" />
            </div>
            <div className="w-px bg-gray-200 hidden sm:block" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-28" />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-3">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-16 w-full rounded-md" />
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex justify-between items-center mb-2">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <div className="space-y-4 pl-4 border-l-2 border-gray-200">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-6 w-44" />
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-8 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Skeleton;
