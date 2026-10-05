import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function TableSkeleton() {
  return (
    <table className="w-full text-left border-collapse animate-in fade-in duration-500">
      <thead>
        <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
          {[1, 2, 3, 4, 5].map((i) => (
            <th key={i} className="px-6 py-4">
              <Skeleton className="h-4 w-20" />
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
        {[1, 2, 3, 4, 5].map((row) => (
          <tr key={row}>
            <td className="px-6 py-4"><Skeleton className="h-5 w-48 mb-1" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
            <td className="px-6 py-4"><Skeleton className="h-5 w-20 rounded-full" /></td>
            <td className="px-6 py-4"><Skeleton className="h-4 w-12 mx-auto" /></td>
            <td className="px-6 py-4">
              <div className="flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
                <Skeleton className="h-8 w-8 rounded" />
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
