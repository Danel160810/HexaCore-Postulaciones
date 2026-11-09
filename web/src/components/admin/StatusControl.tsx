"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Loader2, RotateCcw, Search, X } from "lucide-react";
import type { AppStatus } from "@/lib/status";

type Target = "IN_REVIEW" | "APPROVED" | "REJECTED";

const OPTIONS: { value: Target; label: string; icon: typeof Check; active: string }[] = [
  { value: "IN_REVIEW", label: "En revisión", icon: Search, active: "border-sky bg-sky/15 text-sky" },
  { value: "APPROVED", label: "Aprobar", icon: Check, active: "border-acento bg-acento/15 text-acento" },
  { value: "REJECTED", label: "Rechazar", icon: X, active: "border-ember bg-ember/15 text-ember" },
];

export function StatusControl({
  applicationId,
  status,
  isAdmin,
  cooldownDays,
  givesRole,
  currentNote,
}: {
  applicationId: string;
  status: AppStatus;
  isAdmin: boolean;
  cooldownDays: number;
  givesRole: boolean;
  currentNote: string | null;
}) {
  const router = useRouter();
  const final = status === "APPROVED" || status === "REJECTED";
  const [target, setTarget] = useState<Target | null>(null);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "WITHDRAWN")
    return (
      <section className="rounded-lg border border-seam bg-deepslate p-5 text-sm text-fog">
        El postulante retiró esta postulación. No hay nada que decidir.
      </section>
    );

  if (final && !isAdmin)
    return (
      <section className="rounded-lg border border-seam bg-deepslate p-5">
        <h2 className="font-semibold">Decisión tomada</h2>
        <p className="mt-2 text-sm text-fog">Solo un Admin puede reabrirla o cambiar la decisión.</p>
        {currentNote && <p className="mt-3 border-l-2 border-seam pl-3 text-sm whitespace-pre-line">{currentNote}</p>}
      </section>
    );

  async function save() {
    if (!target) return;
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/admin/applications/${applicationId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: target, note: note.trim() || null }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) {
      setError(data.issues?.[0]?.message ?? data.error ?? "No se pudo guardar.");
      return;
    }
    setTarget(null);
    setNote("");
    router.refresh();
  }

  const options = OPTIONS.filter((o) => o.value !== status);
  const needsNote = target === "REJECTED";
  const showNote = target === "APPROVED" || target === "REJECTED";

  return (
    <section className="chamfer bg-seam p-px">
      <div className="chamfer bg-deepslate p-5">
        <h2 className="font-semibold">{final ? "Cambiar la decisión" : "Decidir"}</h2>
        {final && <p className="mt-1 text-xs text-fog">Eres Admin: puedes reabrirla o corregir la decisión.</p>}

        <div className={`mt-4 grid gap-2 ${options.length === 3 ? "grid-cols-3" : "grid-cols-2"}`} role="radiogroup" aria-label="Nuevo estado">
          {options.map((o) => {
            const Icon = final && o.value === "IN_REVIEW" ? RotateCcw : o.icon;
            const selected = target === o.value;
            return (
              <button
                key={o.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setTarget(selected ? null : o.value);
                  setError(null);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-md border px-2 py-3 text-xs font-semibold transition-colors ${
                  selected ? o.active : "border-seam bg-slab/60 text-fog hover:text-bone"
                }`}
              >
                <Icon className="size-4" />
                {final && o.value === "IN_REVIEW" ? "Reabrir" : o.label}
              </button>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {target && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="pt-4">
                {showNote && (
                  <>
                    <label htmlFor="note" className="label">
                      {needsNote ? "Motivo del rechazo" : "Mensaje de bienvenida (opcional)"}
                    </label>
                    <textarea
                      id="note"
                      className="field min-h-28 text-sm"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder={
                        needsNote
                          ? "Explica con respeto por qué no sigue adelante. Lo leerá el postulante."
                          : "Ej.: ¡Bienvenido! Te escribimos por Discord con los siguientes pasos."
                      }
                    />
                    <p className="hint">El postulante lo verá en la web y en el MD del bot.</p>
                  </>
                )}

                <ul className="mt-3 space-y-1 text-xs text-fog">
                  <li>Se enviará un MD al postulante con el nuevo estado.</li>
                  {target === "APPROVED" && givesRole && <li>El bot le dará el rol de este puesto.</li>}
                  {target === "REJECTED" && cooldownDays > 0 && (
                    <li>
                      No podrá volver a postular a este puesto durante {cooldownDays} {cooldownDays === 1 ? "día" : "días"}.
                    </li>
                  )}
                  {final && target === "IN_REVIEW" && <li>Se quitará la espera por rechazo si la había.</li>}
                </ul>

                {error && (
                  <p role="alert" className="mt-3 text-sm text-ember">
                    {error}
                  </p>
                )}

                <button
                  className={`${target === "REJECTED" ? "btn-danger" : "btn-primary"} mt-4 w-full`}
                  onClick={save}
                  disabled={loading || (needsNote && note.trim().length < 10)}
                >
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  {target === "APPROVED"
                    ? "Aprobar postulación"
                    : target === "REJECTED"
                      ? "Rechazar postulación"
                      : final
                        ? "Reabrir postulación"
                        : "Pasar a revisión"}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
