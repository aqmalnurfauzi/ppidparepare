import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CardListSkeleton() {
  return (
    <div className="space-y-4 animate-in fade-in duration-500 w-full">
      {[1, 2, 3, 4].map((i) => (
        <div 
          key={i}
          className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row gap-6 items-start sm:items-center justify-between"
        >
          <div className="flex gap-4 items-start w-full">
            <Skeleton className="w-12 h-12 rounded-xl shrink-0" />
            <div className="space-y-3 w-full">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-16 rounded" />
                <Skeleton className="h-5 w-20 rounded" />
              </div>
              <Skeleton className="h-6 w-3/4 max-w-md" />
              <div className="flex flex-wrap gap-4 pt-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-4 w-24" />
              </div>
            </div>
          </div>
          
          <div className="w-full sm:w-auto mt-2 sm:mt-0 shrink-0">
            <Skeleton className="h-10 w-full sm:w-28 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}
