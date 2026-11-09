"use client";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 pt-24 text-center sm:px-6">
      <h1 className="text-3xl font-extrabold">Algo ha fallado al cargar esta página</h1>
      <p className="mt-3 text-fog">
        Prueba de nuevo. Si se repite, pasa este código al equipo: <span className="font-mono text-bone">{error.digest ?? "sin código"}</span>
      </p>
      <button onClick={reset} className="btn-primary mt-8">
        Reintentar
      </button>
    </div>
  );
}
