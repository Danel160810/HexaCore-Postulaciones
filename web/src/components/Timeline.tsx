import { STATUS, TONE, type AppStatus } from "@/lib/status";
import { fmtDateTime } from "@/lib/format";

export type TimelineEvent = { id: string; status: AppStatus; createdAt: Date | string; actorName?: string | null; note?: string | null };

/** Cadena de hexágonos: cada cambio de estado es un eslabón */
export function Timeline({ events, showActor = false }: { events: TimelineEvent[]; showActor?: boolean }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const meta = STATUS[e.status];
        const tone = TONE[meta.tone];
        const last = i === events.length - 1;
        return (
          <li key={e.id} className="relative flex gap-4 pb-6 last:pb-0">
            {!last && <span className="absolute top-5 bottom-0 left-[9px] w-px bg-seam" aria-hidden />}
            <span className={`hex mt-1 size-[19px] shrink-0 ${last ? tone.dot : "bg-seam"} flex items-center justify-center`}>
              <span className={`hex size-[11px] ${last ? "bg-deepslate" : tone.dot}`} />
            </span>
            <div className="min-w-0">
              <p className="font-semibold">{meta.label}</p>
              <p className="text-sm text-fog">
                {fmtDateTime(e.createdAt)}
                {showActor && e.actorName ? ` por ${e.actorName}` : ""}
              </p>
              {!showActor && <p className="mt-0.5 text-sm text-fog">{meta.timeline}</p>}
              {showActor && e.note && <p className="mt-1 line-clamp-2 text-sm text-bone/80">“{e.note}”</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
