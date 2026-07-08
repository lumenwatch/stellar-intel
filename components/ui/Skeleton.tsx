import type { HTMLAttributes } from 'react';
import { clsx } from 'clsx';

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  rows?: number;
  columns?: number;
  variant?: 'block' | 'table';
  cellClassName?: string;
}

export function Skeleton({
  rows,
  columns = 5,
  variant,
  className,
  cellClassName,
  ...props
}: SkeletonProps) {
  const resolvedVariant = variant ?? (rows ? 'table' : 'block');

  if (resolvedVariant === 'table') {
    const rowCount = rows ?? 5;

    return (
      <table className="w-full text-sm">
        <tbody>
          {Array.from({ length: rowCount }).map((_, i) => (
            <tr key={i} className="border-t border-gray-200 dark:border-gray-700">
              {Array.from({ length: columns }).map((__, j) => (
                <td key={j} className="px-4 py-3">
                  <div
                    className={clsx(
                      'h-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700',
                      cellClassName
                    )}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <div
      aria-hidden="true"
      className={clsx('animate-pulse rounded-md bg-gray-200 dark:bg-gray-700', className)}
      {...props}
    />
  );
}
