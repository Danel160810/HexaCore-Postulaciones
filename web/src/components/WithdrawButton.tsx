"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export function WithdrawButton({ id }: { id: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function withdraw() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/applications/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (!res.ok) return setError(data.error ?? "No se pudo retirar.");
    router.refresh();
  }

  if (!confirming)
    return (
      <button className="btn-danger mt-4 w-full" onClick={() => setConfirming(true)}>
        Retirar postulación
      </button>
    );

  return (
    <div className="mt-4 space-y-2">
      <p className="text-sm">¿Seguro? Se cerrará y no podrás recuperarla.</p>
      <div className="flex gap-2">
        <button className="btn-danger flex-1" onClick={withdraw} disabled={loading}>
          {loading && <Loader2 className="size-4 animate-spin" />} Sí, retirar
        </button>
        <button className="btn-ghost flex-1" onClick={() => setConfirming(false)} disabled={loading}>
          Cancelar
        </button>
      </div>
      {error && <p className="text-sm text-ember">{error}</p>}
    </div>
  );
}
