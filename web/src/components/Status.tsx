import { Check, Clock, Search, X, Undo2 } from "lucide-react";
import { STATUS, TONE, type AppStatus } from "@/lib/status";

export function StatusBadge({ status, className = "" }: { status: AppStatus; className?: string }) {
  const meta = STATUS[status];
  const tone = TONE[meta.tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone.text} ${tone.bg} ${tone.ring} ${className}`}
    >
      <span className={`size-1.5 rounded-full ${tone.dot}`} />
      {meta.label}
    </span>
  );
}

const ICON = { PENDING: Clock, IN_REVIEW: Search, APPROVED: Check, REJECTED: X, WITHDRAWN: Undo2 } as const;

/** Sello hexagonal grande con el estado: el elemento de identidad de la ficha */
export function StatusSeal({ status, size = 88 }: { status: AppStatus; size?: number }) {
  const Icon = ICON[status];
  const tone = TONE[STATUS[status].tone];
  return (
    <div className="relative shrink-0" style={{ width: size, height: size * 1.1547 }} aria-label={STATUS[status].label}>
      <div className={`hex absolute inset-0 ${tone.dot} opacity-25`} />
      <div className={`hex absolute inset-[3px] bg-deepslate`} />
      <div className={`hex absolute inset-[9px] ${tone.bg} flex items-center justify-center`}>
        <Icon className={`${tone.text}`} style={{ width: size * 0.36, height: size * 0.36 }} strokeWidth={2.4} />
      </div>
    </div>
  );
}
