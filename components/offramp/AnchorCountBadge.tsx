interface AnchorCountBadgeProps {
  responding: number;
  total: number;
}

/** "X of Y anchors responding" — green when all respond, amber when partial, red at zero. */
export function AnchorCountBadge({ responding, total }: AnchorCountBadgeProps) {
  if (total === 0) return null;

  const colorClass =
    responding === total
      ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
      : responding === 0
        ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';

  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
      {responding} of {total} anchors responding
    </span>
  );
}
