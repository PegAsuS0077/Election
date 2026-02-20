import { type ReactNode } from "react";

/**
 * Lightweight tooltip using CSS only — no JS, no library.
 * Usage:
 *   <Tooltip text="Explanation here">
 *     <button>hover me</button>
 *   </Tooltip>
 */
export default function Tooltip({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) {
  return (
    <span className="relative group inline-flex">
      {children}
      <span
        role="tooltip"
        className="
          pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50
          w-max max-w-[220px] rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs text-white
          shadow-lg
          opacity-0 scale-95
          group-hover:opacity-100 group-hover:scale-100
          group-focus-within:opacity-100 group-focus-within:scale-100
          transition-all duration-150 origin-bottom
          dark:bg-slate-700
        "
      >
        {text}
        {/* Arrow */}
        <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-700" />
      </span>
    </span>
  );
}
