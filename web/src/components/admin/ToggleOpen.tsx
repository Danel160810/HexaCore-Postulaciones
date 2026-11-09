"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

/** Interruptor para abrir/cerrar temporalmente una categoría (con nota opcional al cerrar) */
export function ToggleOpen({ id, isOpen, closedNote }: { id: string; isOpen: boolean; closedNote: string | null }) {
  const router = useRouter();
  const [open, setOpen] = useState(isOpen);
  const [note, setNote] = useState(closedNote ?? "");
  const [askNote, setAskNote] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(nextOpen: boolean, nextNote: string) {
    setBusy(true);
    setError(null);
    const prev = open;
    setOpen(nextOpen);
    const res = await fetch(`/api/admin/forms/${id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isOpen: nextOpen, closedNote: nextNote.trim() || null }),
    });
    setBusy(false);
    if (!res.ok) {
      setOpen(prev);
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar.");
      return;
    }
    setAskNote(false);
    router.refresh();
  }

  return (
    <div className="relative md:w-64">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={open}
          aria-label={open ? "Cerrar postulaciones" : "Abrir postulaciones"}
          disabled={busy}
          onClick={() => (open ? setAskNote(true) : save(true, note))}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors ${
            open ? "border-acento/60 bg-acento/25" : "border-seam bg-slab"
          }`}
        >
          <motion.span
            initial={false}
            animate={{ x: open ? 20 : 0 }}
            transition={{ type: "spring", stiffness: 600, damping: 35 }}
            className={`hex absolute top-[3px] left-[3px] size-5 ${open ? "bg-acento" : "bg-fog/60"}`}
          />
        </button>
        <span className={`text-sm font-medium ${open ? "text-acento" : "text-fog"}`}>{open ? "Abierta" : "Cerrada"}</span>
      </div>

      <AnimatePresence>
        {askNote && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="mt-3 space-y-2 rounded-md border border-seam bg-slab p-3"
          >
            <label className="text-xs text-fog" htmlFor={`note-${id}`}>
              Mensaje para quien la vea cerrada (opcional)
            </label>
            <input
              id={`note-${id}`}
              className="field py-2 text-sm"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ej.: Volvemos a abrir en noviembre."
            />
            <div className="flex gap-2">
              <button className="btn-danger flex-1 py-1.5" disabled={busy} onClick={() => save(false, note)}>
                Cerrar ahora
              </button>
              <button className="btn-ghost flex-1 py-1.5" onClick={() => setAskNote(false)}>
                Cancelar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {error && <p className="mt-2 text-xs text-ember">{error}</p>}
    </div>
  );
}
