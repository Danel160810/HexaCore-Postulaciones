import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 pt-24 text-center sm:px-6">
      <p className="font-mono text-acento">404</p>
      <h1 className="mt-2 text-3xl font-extrabold">Aquí no hay nada</h1>
      <p className="mt-3 text-fog">La página no existe o ya no tienes acceso a ella.</p>
      <Link href="/" className="btn-ghost mt-8">
        Volver al inicio
      </Link>
    </div>
  );
}
